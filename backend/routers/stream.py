"""
backend/routers/stream.py
--------------------------
POST /stream/ask         — SSE streaming endpoint (direct Gemini, no RAG)
POST /stream/suggestions — follow-up question suggestions
"""

import os
import json
import logging
from typing import Annotated

import google.generativeai as genai
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from db.database import get_db
from db import crud
from db.db_models import User
from models.schemas import AskRequest
from dependencies import get_current_user
from services.gemini_client import (
    generate_emergency_response,
    generate_off_topic_response,
    _is_tpm_error,
    _is_tpd_error,
)
from services.intent_classifier import classify, Intent
from services.api_key_manager import get_key_manager, NoAvailableKeyError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stream", tags=["stream"])

GEMINI_MODEL = "gemini-2.5-flash"

# SSE responses bypass FastAPI CORS middleware — headers must be added manually.
# IMPORTANT: must NOT use "*" when the request carries an Authorization header
# (browsers block credentialed requests with wildcard origin).
CORS_HEADERS = {
    "Cache-Control":                 "no-cache",
    "X-Accel-Buffering":             "no",
    "Access-Control-Allow-Origin":   os.getenv("ALLOWED_ORIGIN", "https://medical-ai-drab.vercel.app"),
    "Access-Control-Allow-Headers":  "Authorization, Content-Type",
    "Access-Control-Allow-Methods":  "POST, GET, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
}

LANG_MAP = {
    "hindi":    "Hindi (हिंदी)",
    "gujarati": "Gujarati (ગુજરાતી)",
    "marathi":  "Marathi (मराठी)",
    "tamil":    "Tamil (தமிழ்)",
    "bengali":  "Bengali (বাংলা)",
}


def _build_prompt(question: str, conversation_history: list[dict], language: str) -> str:
    """Build the Gemini prompt with conversation history and language instruction."""
    lang_line = (
        f"- Respond ENTIRELY in {LANG_MAP[language]}. Do not use English except for medical terms."
        if language in LANG_MAP else ""
    )

    history_str = ""
    if conversation_history:
        lines = []
        for msg in conversation_history[-6:]:
            role = "Patient" if msg["role"] == "user" else "Assistant"
            lines.append(f"{role}: {msg['content']}")
        history_str = "\n".join(lines)

    return f"""You are a helpful, empathetic medical information assistant named MedAI.
You have extensive medical knowledge and provide accurate, evidence-based information.
Always recommend consulting a qualified healthcare professional for personal medical advice.

IMPORTANT FORMATTING RULES:
- Write in clear, plain language a patient can understand.
- Use bullet points when listing symptoms, steps, or multiple items.
- Keep tone warm, informative, and professional.
- End EVERY response with: "Please consult a qualified doctor for personal medical advice."
{lang_line}

{'--- Previous conversation ---' if history_str else ''}
{history_str}

--- Patient question ---
{question}

--- Your answer ---
Provide a clear, accurate, and well-structured answer."""


def _stream_gemini(prompt: str):
    """
    Generator that yields text chunks from Gemini streaming API
    with automatic key rotation on rate-limit errors.
    """
    manager = get_key_manager("gemini")

    for attempt in range(3):
        try:
            key = manager.get_active_key()
            genai.configure(api_key=key)
            model = genai.GenerativeModel(GEMINI_MODEL)
            for chunk in model.generate_content(prompt, stream=True):
                if chunk.text:
                    yield chunk.text
            manager.record_usage(key, tokens_used=len(prompt) // 4)
            return

        except NoAvailableKeyError:
            yield "\n\n⚠️ All API keys are exhausted. Please try again in a minute."
            return

        except Exception as exc:
            if _is_tpd_error(exc):
                logger.warning(f"[stream] TPD exceeded (attempt {attempt + 1}), rotating key…")
                manager.mark_tpd_exceeded(key)
            elif _is_tpm_error(exc):
                logger.warning(f"[stream] TPM exceeded (attempt {attempt + 1}), rotating key…")
                manager.mark_tpm_exceeded(key)
            else:
                logger.error(f"[stream] Gemini error: {exc}")
                yield f"\n\n⚠️ Error generating response: {exc}"
                return

    yield "\n\n⚠️ Failed after 3 retries. Please try again."


@router.post("/ask")
async def stream_ask(
    payload:      AskRequest,
    db:           Annotated[Session, Depends(get_db)],
    current_user: Annotated[User,    Depends(get_current_user)],
):
    """
    SSE endpoint. Streams answer tokens as they arrive from Gemini.
    Final chunk is JSON with metadata: intent, category, confidence, message_id.

    No longer uses FAISS indexes or SentenceTransformer — calls Gemini directly.
    RAM usage: ~150 MB (vs ~650 MB with RAG pipeline).
    """
    # Build conversation history for context
    history_rows = crud.get_session_history(db, current_user.id, payload.session_id)
    conversation_history = [
        {"role": row.role, "content": row.content}
        for row in history_rows[-10:]
    ]

    # Intent classification (lightweight — no embedder needed)
    intent, intent_conf = classify(payload.question)

    # ── Emergency branch ───────────────────────────────────────────────────────
    if intent == Intent.EMERGENCY:
        answer = generate_emergency_response()
        crud.save_message(
            db, current_user.id, payload.session_id,
            role="user", content=payload.question,
        )
        msg = crud.save_message(
            db, current_user.id, payload.session_id,
            role="assistant", content=answer,
            intent="emergency", category="emergency", confidence=1.0,
        )

        def emergency_gen():
            yield f"data: {json.dumps({'token': answer})}\n\n"
            yield f"data: {json.dumps({'done': True, 'intent': 'emergency', 'category': 'emergency', 'confidence': 1.0, 'message_id': msg.id})}\n\n"

        return StreamingResponse(
            emergency_gen(),
            media_type="text/event-stream",
            headers=CORS_HEADERS,
        )

    # ── Off-topic branch ───────────────────────────────────────────────────────
    if intent == Intent.OFF_TOPIC:
        answer = generate_off_topic_response(payload.question)
        crud.save_message(
            db, current_user.id, payload.session_id,
            role="user", content=payload.question,
        )
        msg = crud.save_message(
            db, current_user.id, payload.session_id,
            role="assistant", content=answer,
            intent="off_topic", category="off_topic", confidence=1.0,
        )

        def off_topic_gen():
            yield f"data: {json.dumps({'token': answer})}\n\n"
            yield f"data: {json.dumps({'done': True, 'intent': 'off_topic', 'category': 'off_topic', 'confidence': 1.0, 'message_id': msg.id})}\n\n"

        return StreamingResponse(
            off_topic_gen(),
            media_type="text/event-stream",
            headers=CORS_HEADERS,
        )

    # ── Medical question — stream directly from Gemini ─────────────────────────
    prompt = _build_prompt(payload.question, conversation_history, payload.language)

    # Save user message before streaming starts
    crud.save_message(
        db, current_user.id, payload.session_id,
        role="user", content=payload.question,
    )

    # Extract plain values needed inside the generator.
    # Never access SQLAlchemy ORM objects inside a generator — the session
    # is closed by the time the generator executes (DetachedInstanceError).
    user_id      = current_user.id
    session_id   = payload.session_id
    intent_value = intent.value

    def generate():
        full_answer_parts = []

        for chunk in _stream_gemini(prompt):
            full_answer_parts.append(chunk)
            yield f"data: {json.dumps({'token': chunk})}\n\n"

        # Save full answer to DB
        full_answer = "".join(full_answer_parts)
        msg = crud.save_message(
            db, user_id, session_id,
            role="assistant", content=full_answer,
            intent=intent_value, category="medical", confidence=1.0,
        )

        yield f"data: {json.dumps({'done': True, 'intent': intent_value, 'category': 'medical', 'confidence': 1.0, 'low_confidence': False, 'message_id': msg.id})}\n\n"

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
    Returns 3 follow-up question suggestions for the given question.
    Called by the frontend after streaming completes.
    """
    manager = get_key_manager("gemini")
    try:
        key = manager.get_active_key()
        genai.configure(api_key=key)
        model = genai.GenerativeModel(GEMINI_MODEL)

        prompt = f"""Based on this medical question: "{payload.question}"
Generate exactly 3 short follow-up questions a patient might ask next.
Rules:
- Each question must be under 60 characters
- Medical and relevant to the topic
- Different angles: causes, treatment, prevention
- Return ONLY a JSON array of 3 strings. No other text. No markdown fences.
Example: ["What causes this?", "How is it treated?", "Can it be prevented?"]"""

        resp = model.generate_content(prompt)
        text = resp.text.strip().replace("```json", "").replace("```", "").strip()
        suggestions = json.loads(text)
        if isinstance(suggestions, list):
            return {"suggestions": suggestions[:3]}

    except Exception as e:
        logger.warning(f"[suggestions] Failed to generate suggestions: {e}")

    # Fallback suggestions
    last_word = payload.question.split()[-1] if payload.question else "this"
    return {"suggestions": [
        f"What causes {last_word}?",
        "What are the treatment options?",
        "How can this be prevented?",
    ]}