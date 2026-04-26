"""
backend/db/db_models.py
------------------------
SQLAlchemy ORM models for all three tables:
  - users
  - chat_history
  - feedback
"""

import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id           = Column(Integer, primary_key=True, index=True)
    username     = Column(String(50), unique=True, index=True, nullable=False)
    email        = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_admin     = Column(Boolean, default=False)
    created_at   = Column(DateTime, default=datetime.datetime.utcnow)

    messages = relationship("ChatMessage", back_populates="user", cascade="all, delete")
    feedbacks = relationship("Feedback", back_populates="user", cascade="all, delete")
    reports   = relationship("ReportUpload", back_populates="user", cascade="all, delete")


class ChatMessage(Base):
    __tablename__ = "chat_history"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(String(64), index=True, nullable=False)
    role       = Column(String(10), nullable=False)   # "user" or "assistant"
    content    = Column(Text, nullable=False)
    intent     = Column(String(20), nullable=True)
    category   = Column(String(60), nullable=True)
    confidence = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="messages")


class Feedback(Base):
    __tablename__ = "feedback"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(String(64), nullable=False)
    message_id = Column(Integer, ForeignKey("chat_history.id"), nullable=True)
    rating     = Column(Integer, nullable=False)   # 1 = thumbs up, -1 = thumbs down
    category   = Column(String(60), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="feedbacks")


class ReportUpload(Base):
    __tablename__ = "report_uploads"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename    = Column(String(255), nullable=False)
    file_type   = Column(String(10), nullable=False)
    report_type = Column(String(60), nullable=True)
    question    = Column(Text, nullable=True)
    analysis    = Column(Text, nullable=False)
    char_count  = Column(Integer, nullable=True)
    created_at  = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="reports")
