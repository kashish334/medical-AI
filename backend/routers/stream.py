"""
backend/routers/stream.py
--------------------------
POST /stream/ask  — SSE streaming endpoint
GET  /stream/suggestions — follow-up question suggestions
"""

import json
from typing import Annotated
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from db.database import get_db
from db import crud
from db.db_models import User
from models.schemas import AskRequest
from dependencies import get_current_user
from services import rag_pipeline
from services.gemini_streamer import stream_answer
from services.intent_classifier import classify, Intent
from services.category_router import predict_category
from services.embedder import encode
from services.retrieval import search
import google.generativeai as genai
from services.api_key_manager import get_key_manager
import os

router = APIRouter(prefix="/stream", tags=["stream"])

# SSE responses bypass FastAPI CORS middleware — must add headers manually
# backend/routers/stream.py
CORS_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
    "Access-Control-Allow-Origin": os.getenv("ALLOWED_ORIGIN", "https://medical-ai-drab.vercel.app"),
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Credentials": "true",   # ← add this too
}


@router.post("/ask")
async def stream_ask(
    payload:      AskRequest,
    db:           Annotated[Session, Depends(get_db)],
    current_user: Annotated[User,    Depends(get_current_user)],
):
    """
    SSE endpoint. Streams answer tokens as they arrive from Gemini.
    Final chunk is JSON with metadata: intent, category, confidence, message_id.
    """
    # Build conversation history
    history_rows = crud.get_session_history(db, current_user.id, payload.session_id)
    conversation_history = [
        {"role": row.role, "content": row.content}
        for row in history_rows[-10:]
    ]

    # Intent + category classification (fast, non-streaming)
    intent, intent_conf = classify(payload.question)

    if intent == Intent.EMERGENCY:
        from services.gemini_client import generate_emergency_response
        answer = generate_emergency_response()
        crud.save_message(db, current_user.id, payload.session_id, role="user", content=payload.question)
        msg = crud.save_message(db, current_user.id, payload.session_id, role="assistant",
                                content=answer, intent="emergency", category="emergency", confidence=1.0)
        def emergency_gen():
            yield f"data: {json.dumps({'token': answer})}\n\n"
            yield f"data: {json.dumps({'done': True, 'intent':'emergency','category':'emergency','confidence':1.0,'message_id':msg.id})}\n\n"
        return StreamingResponse(emergency_gen(), media_type="text/event-stream",
                                 headers=CORS_HEADERS)

    if intent == Intent.OFF_TOPIC:
        from services.gemini_client import generate_off_topic_response
        answer = generate_off_topic_response(payload.question)
        crud.save_message(db, current_user.id, payload.session_id, role="user", content=payload.question)
        msg = crud.save_message(db, current_user.id, payload.session_id, role="assistant",
                                content=answer, intent="off_topic", category="off_topic", confidence=1.0)
        def off_gen():
            yield f"data: {json.dumps({'token': answer})}\n\n"
            yield f"data: {json.dumps({'done': True, 'intent':'off_topic','category':'off_topic','confidence':1.0,'message_id':msg.id})}\n\n"
        return StreamingResponse(off_gen(), media_type="text/event-stream",
                                 headers=CORS_HEADERS)

    # RAG retrieval
    category = predict_category(payload.question)
    query_vec = encode(payload.question)
    results = search(query_vec, topic=category, top_k=3)
    if not results and category != "global":
        results = search(query_vec, topic="global", top_k=3)
        category = "global"

    confidence = results[0].score if results else 0.0
    low_conf   = confidence < 0.60

    # Save user message
    crud.save_message(db, current_user.id, payload.session_id, role="user", content=payload.question)

    # ── Extract all values needed inside generator BEFORE it runs ──────────────
    # Accessing SQLAlchemy ORM attributes inside a generator causes DetachedInstanceError
    # because the session is closed by the time the generator executes.
    user_id      = current_user.id
    session_id   = payload.session_id
    intent_value = intent.value

    # Collect full answer while streaming (for DB save)
    full_answer_parts = []
    contexts = [r.answer for r in results] if results else []

    def generate():
        nonlocal full_answer_parts
        if not results:
            fallback = ("I don't have reliable information in my knowledge base to answer that question. "
                        "Please consult a qualified healthcare professional.")
            yield f"data: {json.dumps({'token': fallback})}\n\n"
            full_answer_parts.append(fallback)
        else:
            for chunk in stream_answer(payload.question, contexts, conversation_history, payload.language):
                full_answer_parts.append(chunk)
                yield f"data: {json.dumps({'token': chunk})}\n\n"

        # Save full answer to DB using pre-extracted plain values (not ORM objects)
        full_answer = "".join(full_answer_parts)
        msg = crud.save_message(
            db, user_id, session_id,
            role="assistant", content=full_answer,
            intent=intent_value, category=category, confidence=confidence,
        )
        yield f"data: {json.dumps({'done': True, 'intent': intent_value, 'category': category, 'confidence': confidence, 'low_confidence': low_conf, 'message_id': msg.id})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers=CORS_HEADERS,
    )


@router.post("/suggestions")
async def get_suggestions(
    payload:      AskRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Returns 3 follow-up question suggestions for the given question/answer.
    Called after streaming completes.
    """
    key = get_key_manager("gemini").get_active_key()
    genai.configure(api_key=key)
    model = genai.GenerativeModel("gemini-2.5-flash")
    prompt = f"""Based on this medical question: "{payload.question}"
Generate exactly 3 short follow-up questions a patient might ask next.
Rules:
- Each question must be under 60 characters
- Medical and relevant to the topic
- Different angles: causes, treatment, prevention
- Return ONLY a JSON array of 3 strings. No other text.
Example: ["What causes this?", "How is it treated?", "Can it be prevented?"]"""
    try:
        resp = model.generate_content(prompt)
        text = resp.text.strip()
        # Strip markdown code fences if present
        text = text.replace("```json", "").replace("```", "").strip()
        suggestions = json.loads(text)
        if isinstance(suggestions, list):
            return {"suggestions": suggestions[:3]}
    except Exception as e:
        pass
    return {"suggestions": [
        f"What causes {payload.question.split()[-1] if payload.question else 'this'}?",
        "What are the treatment options?",
        "How can this be prevented?",
    ]}