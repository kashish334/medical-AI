"""
backend/routers/chat.py
------------------------
POST   /chat/ask               — run the full RAG pipeline
GET    /chat/history/{session} — return message history for a session
GET    /chat/sessions          — list all session IDs for the current user
DELETE /chat/history/{session} — clear a session
POST   /chat/feedback          — submit thumbs up/down
"""

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from db import crud
from db.db_models import User
from models.schemas import (
    AskRequest, AskResponse,
    HistoryResponse, SessionListResponse, SessionItem, MessageOut,
    FeedbackRequest, FeedbackResponse,
)
from dependencies import get_current_user
from services import rag_pipeline

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/ask", response_model=AskResponse)
def ask(
    payload:      AskRequest,
    db:           Annotated[Session, Depends(get_db)],
    current_user: Annotated[User,    Depends(get_current_user)],
):
    # Build conversation history for multi-turn context
    history_rows = crud.get_session_history(db, current_user.id, payload.session_id)
    conversation_history = [
        {"role": row.role, "content": row.content}
        for row in history_rows[-10:]          # last 5 turns
    ]

    # Run RAG pipeline
    result = rag_pipeline.run(payload.question, conversation_history, language=getattr(payload, 'language', 'english'))

    # Persist user message
    crud.save_message(
        db, current_user.id, payload.session_id,
        role="user", content=payload.question,
    )

    # Persist assistant message
    assistant_msg = crud.save_message(
        db, current_user.id, payload.session_id,
        role="assistant",
        content=result.answer,
        intent=result.intent,
        category=result.category,
        confidence=result.confidence,
    )

    return AskResponse(
        answer=result.answer,
        intent=result.intent,
        category=result.category,
        confidence=result.confidence,
        low_confidence=result.low_confidence,
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
    # Get category from the referenced message if available
    category = None
    if payload.message_id:
        from db.db_models import ChatMessage
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