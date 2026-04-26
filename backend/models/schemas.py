"""
backend/models/schemas.py
--------------------------
All Pydantic request/response schemas for the API.
"""

from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import datetime


# ── Auth ───────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v):
        if not v.replace("_", "").isalnum():
            raise ValueError("Username must be alphanumeric (underscores allowed)")
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        return v

    @field_validator("password")
    @classmethod
    def password_length(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    is_admin: bool


# ── Chat ───────────────────────────────────────────────────────────────────────

class AskRequest(BaseModel):
    question:   str
    session_id: str

    @field_validator("question")
    @classmethod
    def question_not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Question cannot be empty")
        if len(v) > 1000:
            raise ValueError("Question too long (max 1000 characters)")
        return v


class AskResponse(BaseModel):
    answer:         str
    intent:         str
    category:       str
    confidence:     float
    low_confidence: bool
    session_id:     str
    message_id:     Optional[int] = None


class MessageOut(BaseModel):
    id:         int
    role:       str
    content:    str
    intent:     Optional[str]
    category:   Optional[str]
    confidence: Optional[float]
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class HistoryResponse(BaseModel):
    session_id: str
    messages:   list[MessageOut]


class SessionListResponse(BaseModel):
    sessions: list[str]


# ── Feedback ───────────────────────────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    session_id: str
    message_id: Optional[int] = None
    rating:     int            # 1 or -1

    @field_validator("rating")
    @classmethod
    def rating_valid(cls, v):
        if v not in (1, -1):
            raise ValueError("Rating must be 1 (positive) or -1 (negative)")
        return v


class FeedbackResponse(BaseModel):
    ok: bool


# ── Admin ──────────────────────────────────────────────────────────────────────

class MetricsResponse(BaseModel):
    total_queries:      int
    total_users:        int
    avg_confidence:     float
    feedback_summary:   dict
    queries_per_day:    list[dict]
    category_distribution: list[dict]
