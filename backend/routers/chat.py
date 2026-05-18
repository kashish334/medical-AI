"""
backend/routers/chat.py
------------------------
POST   /chat/ask               — non-streaming fallback (direct Gemini)
GET    /chat/history/{session} — return message history for a session
GET    /chat/sessions          — list all sessions for the current user
DELETE /chat/history/{session} — clear a session
POST   /chat/feedback          — submit thumbs up/down
"""

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from db import crud
from db.db_models import User, ChatMessage
from models.schemas import (
    AskRequest, AskResponse,
    HistoryResponse, SessionListResponse, SessionItem, MessageOut,
    FeedbackRequest, FeedbackResponse,
)
from dependencies import get_current_user
from services.gemini_client import generate_answer, generate_emergency_response, generate_off_topic_response
from services.intent_classifier import classify, Intent

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/ask", response_model=AskResponse)
def ask(
    payload:      AskRequest,
    db:           Annotated[Session, Depends(get_db)],
    current_user: Annotated[User,    Depends(get_current_user)],
):
    """Non-streaming fallback endpoint. Frontend uses /stream/ask for streaming."""
    history_rows = crud.get_session_history(db, current_user.id, payload.session_id)
    conversation_history = [
        {"role": row.role, "content": row.content}
        for row in history_rows[-10:]
    ]

    intent, _ = classify(payload.question)

    if intent == Intent.EMERGENCY:
        answer   = generate_emergency_response()
        category = "emergency"
    elif intent == Intent.OFF_TOPIC:
        answer   = generate_off_topic_response(payload.question)
        category = "off_topic"
    else:
        answer   = generate_answer(payload.question, [], conversation_history, getattr(payload, "language", "english"))
        category = "medical"

    crud.save_message(db, current_user.id, payload.session_id, role="user", content=payload.question)
    assistant_msg = crud.save_message(
        db, current_user.id, payload.session_id,
        role="assistant", content=answer,
        intent=intent.value, category=category, confidence=1.0,
    )

    return AskResponse(
        answer=answer,
        intent=intent.value,
        category=category,
        confidence=1.0,
        low_confidence=False,
        session_id=payload.session_id,
        message_id=assistant_msg.id,
    )


@router.get("/history/{session_id}", response_model=HistoryResponse)
def get_history(
    session_id:   str,
    db:           Annotated[Session, Depends(get_db)],
    current_user: Annotated[User,    Depends(get_current_user)],
):
    messages = crud.get_session_history(db, current_user.id, session_id)
    return HistoryResponse(
        session_id=session_id,
        messages=[MessageOut.model_validate(m) for m in messages],
    )


@router.get("/sessions", response_model=SessionListResponse)
def list_sessions(
    db:           Annotated[Session, Depends(get_db)],
    current_user: Annotated[User,    Depends(get_current_user)],
):
    sessions = crud.get_all_sessions(db, current_user.id)
    return SessionListResponse(sessions=sessions)


@router.delete("/history/{session_id}")
def delete_history(
    session_id:   str,
    db:           Annotated[Session, Depends(get_db)],
    current_user: Annotated[User,    Depends(get_current_user)],
):
    count = crud.delete_session(db, current_user.id, session_id)
    return {"deleted_messages": count, "session_id": session_id}


@router.post("/feedback", response_model=FeedbackResponse)
def feedback(
    payload:      FeedbackRequest,
    db:           Annotated[Session, Depends(get_db)],
    current_user: Annotated[User,    Depends(get_current_user)],
):
    category = None
    if payload.message_id:
        msg = db.query(ChatMessage).filter(ChatMessage.id == payload.message_id).first()
        if msg:
            category = msg.category

    crud.save_feedback(
        db,
        user_id=current_user.id,
        session_id=payload.session_id,
        rating=payload.rating,
        message_id=payload.message_id,
        category=category,
    )
    return FeedbackResponse(ok=True)