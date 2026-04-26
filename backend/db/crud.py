"""
backend/db/crud.py
-------------------
All database read / write operations in one place.
API routers import from here — never touch the ORM directly from routers.
"""

import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from .db_models import User, ChatMessage, Feedback
from passlib.context import CryptContext

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Users ──────────────────────────────────────────────────────────────────────

def get_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, username: str, email: str, password: str, is_admin: bool = False) -> User:
    user = User(
        username=username,
        email=email,
        hashed_password=pwd_ctx.hash(password),
        is_admin=is_admin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


# ── Chat history ───────────────────────────────────────────────────────────────

def save_message(
    db: Session,
    user_id: int,
    session_id: str,
    role: str,
    content: str,
    intent: str | None = None,
    category: str | None = None,
    confidence: float | None = None,
) -> ChatMessage:
    msg = ChatMessage(
        user_id=user_id,
        session_id=session_id,
        role=role,
        content=content,
        intent=intent,
        category=category,
        confidence=confidence,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def get_session_history(db: Session, user_id: int, session_id: str) -> list[ChatMessage]:
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == user_id, ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )


def get_all_sessions(db: Session, user_id: int) -> list[str]:
    rows = (
        db.query(ChatMessage.session_id, func.max(ChatMessage.created_at).label("last"))
        .filter(ChatMessage.user_id == user_id)
        .group_by(ChatMessage.session_id)
        .order_by(desc("last"))
        .all()
    )
    return [r.session_id for r in rows]


def delete_session(db: Session, user_id: int, session_id: str) -> int:
    deleted = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == user_id, ChatMessage.session_id == session_id)
        .delete()
    )
    db.commit()
    return deleted


# ── Feedback ───────────────────────────────────────────────────────────────────

def save_feedback(
    db: Session,
    user_id: int,
    session_id: str,
    rating: int,
    message_id: int | None = None,
    category: str | None = None,
) -> Feedback:
    fb = Feedback(
        user_id=user_id,
        session_id=session_id,
        message_id=message_id,
        rating=rating,
        category=category,
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return fb


# ── Admin metrics ──────────────────────────────────────────────────────────────

def get_total_queries(db: Session) -> int:
    return db.query(ChatMessage).filter(ChatMessage.role == "user").count()


def get_total_users(db: Session) -> int:
    return db.query(User).count()


def get_feedback_summary(db: Session) -> dict:
    total    = db.query(Feedback).count()
    positive = db.query(Feedback).filter(Feedback.rating == 1).count()
    negative = db.query(Feedback).filter(Feedback.rating == -1).count()
    return {"total": total, "positive": positive, "negative": negative}


def get_queries_per_day(db: Session, days: int = 14) -> list[dict]:
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=days)
    rows = (
        db.query(
            func.date(ChatMessage.created_at).label("date"),
            func.count().label("count"),
        )
        .filter(ChatMessage.role == "user", ChatMessage.created_at >= cutoff)
        .group_by(func.date(ChatMessage.created_at))
        .order_by("date")
        .all()
    )
    return [{"date": str(r.date), "count": r.count} for r in rows]


def get_category_distribution(db: Session) -> list[dict]:
    rows = (
        db.query(ChatMessage.category, func.count().label("count"))
        .filter(ChatMessage.role == "assistant", ChatMessage.category.isnot(None))
        .group_by(ChatMessage.category)
        .order_by(desc("count"))
        .all()
    )
    return [{"category": r.category, "count": r.count} for r in rows]


def get_avg_confidence(db: Session) -> float:
    result = db.query(func.avg(ChatMessage.confidence)).filter(
        ChatMessage.role == "assistant",
        ChatMessage.confidence.isnot(None),
    ).scalar()
    return round(float(result or 0), 4)


# ── Advanced Admin Analytics ───────────────────────────────────────────────────

def get_most_asked_diseases(db: Session, limit: int = 10) -> list[dict]:
    """Top N most asked disease categories across ALL users."""
    rows = (
        db.query(ChatMessage.category, func.count().label("count"))
        .filter(
            ChatMessage.role == "user",
            ChatMessage.category.isnot(None),
            ChatMessage.category.notin_(["off_topic", "emergency", "global"]),
        )
        .group_by(ChatMessage.category)
        .order_by(desc("count"))
        .limit(limit)
        .all()
    )
    return [{"category": r.category, "count": r.count} for r in rows]


def get_all_users_summary(db: Session) -> list[dict]:
    """
    Per-user summary: username, total queries, top disease category, last active.
    """
    users = db.query(User).filter(User.is_admin == False).all()
    result = []
    for user in users:
        # Total queries by this user
        total = (
            db.query(ChatMessage)
            .filter(ChatMessage.user_id == user.id, ChatMessage.role == "user")
            .count()
        )
        # Top disease category for this user
        top_cat_row = (
            db.query(ChatMessage.category, func.count().label("cnt"))
            .filter(
                ChatMessage.user_id == user.id,
                ChatMessage.role == "user",
                ChatMessage.category.isnot(None),
                ChatMessage.category.notin_(["off_topic", "emergency", "global"]),
            )
            .group_by(ChatMessage.category)
            .order_by(desc("cnt"))
            .first()
        )
        top_category = top_cat_row.category if top_cat_row else "—"

        # Last active timestamp
        last_msg = (
            db.query(ChatMessage.created_at)
            .filter(ChatMessage.user_id == user.id)
            .order_by(ChatMessage.created_at.desc())
            .first()
        )
        last_active = str(last_msg.created_at)[:16] if last_msg else "Never"

        # Report uploads count
        from .db_models import ReportUpload
        report_count = (
            db.query(ReportUpload)
            .filter(ReportUpload.user_id == user.id)
            .count()
        )

        result.append({
            "user_id":      user.id,
            "username":     user.username,
            "email":        user.email,
            "total_queries": total,
            "top_category": top_category,
            "last_active":  last_active,
            "report_uploads": report_count,
            "joined":       str(user.created_at)[:10],
        })

    # Sort by most active first
    result.sort(key=lambda x: x["total_queries"], reverse=True)
    return result


def get_user_disease_breakdown(db: Session, user_id: int) -> list[dict]:
    """All disease categories asked by a specific user with counts."""
    rows = (
        db.query(ChatMessage.category, func.count().label("count"))
        .filter(
            ChatMessage.user_id == user_id,
            ChatMessage.role == "user",
            ChatMessage.category.isnot(None),
            ChatMessage.category.notin_(["off_topic", "emergency", "global"]),
        )
        .group_by(ChatMessage.category)
        .order_by(desc("count"))
        .all()
    )
    return [{"category": r.category, "count": r.count} for r in rows]


def get_total_reports(db: Session) -> int:
    from .db_models import ReportUpload
    return db.query(ReportUpload).count()


def get_reports_per_day(db: Session, days: int = 14) -> list[dict]:
    from .db_models import ReportUpload
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=days)
    rows = (
        db.query(
            func.date(ReportUpload.created_at).label("date"),
            func.count().label("count"),
        )
        .filter(ReportUpload.created_at >= cutoff)
        .group_by(func.date(ReportUpload.created_at))
        .order_by("date")
        .all()
    )
    return [{"date": str(r.date), "count": r.count} for r in rows]
