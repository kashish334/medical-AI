"""
backend/routers/admin.py
-------------------------
GET /admin/metrics           — full dashboard metrics (admin only)
GET /admin/diseases          — most asked diseases across all users
GET /admin/users             — all users summary with top disease + query count
GET /admin/users/{user_id}/diseases  — specific user's disease breakdown
"""

import os
from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..db import crud
from ..db.db_models import User
from ..dependencies import get_admin_user
from ..services.api_key_manager import get_key_manager

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/metrics")
def get_metrics(
    db:     Annotated[Session, Depends(get_db)],
    _admin: Annotated[User,    Depends(get_admin_user)],
):
    return {
        "total_queries":         crud.get_total_queries(db),
        "total_users":           crud.get_total_users(db),
        "total_reports":         crud.get_total_reports(db),
        "avg_confidence":        crud.get_avg_confidence(db),
        "feedback_summary":      crud.get_feedback_summary(db),
        "queries_per_day":       crud.get_queries_per_day(db, days=14),
        "reports_per_day":       crud.get_reports_per_day(db, days=14),
        "category_distribution": crud.get_category_distribution(db),
        "most_asked_diseases":   crud.get_most_asked_diseases(db, limit=10),
    }


@router.get("/diseases")
def get_most_asked_diseases(
    db:     Annotated[Session, Depends(get_db)],
    _admin: Annotated[User,    Depends(get_admin_user)],
    limit:  int = 10,
):
    return crud.get_most_asked_diseases(db, limit=limit)


@router.get("/users")
def get_users_summary(
    db:     Annotated[Session, Depends(get_db)],
    _admin: Annotated[User,    Depends(get_admin_user)],
):
    return crud.get_all_users_summary(db)


@router.get("/users/{user_id}/diseases")
def get_user_diseases(
    user_id: int,
    db:      Annotated[Session, Depends(get_db)],
    _admin:  Annotated[User,    Depends(get_admin_user)],
):
    return crud.get_user_disease_breakdown(db, user_id)


@router.get("/api-keys/status")
def get_api_key_status(
    _admin: Annotated[User, Depends(get_admin_user)],
):
    """
    Returns the current status of all configured API keys for each provider.
    Shows which keys are active, TPM/TPD status, and token counters.
    Admin only.
    """
    result = {}
    provider = os.getenv("AI_PROVIDER", "gemini").lower()
    try:
        result[provider] = get_key_manager(provider).status()
    except Exception as e:
        result[provider] = {"error": str(e)}
    return {
        "active_provider": provider,
        "keys": result,
    }
