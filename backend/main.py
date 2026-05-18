"""
backend/main.py
---------------
FastAPI application entry point.

Start command on Railway (root set to backend/):
    uvicorn main:app --host 0.0.0.0 --port $PORT
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.database import engine, Base, SessionLocal
from db import db_models  # noqa: F401 — ensures models are registered

# ── Create all DB tables on startup ───────────────────────────────────────────
Base.metadata.create_all(bind=engine)


# ── Seed admin user on startup ────────────────────────────────────────────────
def _seed_admin():
    from db.crud import get_user_by_username, create_user
    db = SessionLocal()
    try:
        username = os.getenv("ADMIN_USERNAME", "admin")
        password = os.getenv("ADMIN_PASSWORD", "admin123")
        email    = f"{username}@medbot.local"
        if not get_user_by_username(db, username):
            create_user(db, username, email, password, is_admin=True)
            print(f"✅ Admin user '{username}' created")
        else:
            print(f"ℹ️  Admin user '{username}' already exists")
    finally:
        db.close()

_seed_admin()


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Medical Q&A Chatbot API",
    description="Medical information chatbot using Gemini.",
    version="2.0.0",
)


# ── CORS — must be added BEFORE routers are included ──────────────────────────
# When allow_credentials=True, wildcard "*" is not allowed by browsers.
# Always list origins explicitly.
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://medical-ai-drab.vercel.app",
]

# Allow additional origin via Railway env var (e.g. if Vercel URL changes)
EXTRA_ORIGIN = os.getenv("ALLOWED_ORIGIN", "").strip()
if EXTRA_ORIGIN and EXTRA_ORIGIN not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append(EXTRA_ORIGIN)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers — included AFTER middleware ────────────────────────────────────────
from routers import auth, chat, admin, report, stream, drugs

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(admin.router)
app.include_router(report.router)
app.include_router(stream.router)
app.include_router(drugs.router)


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "service": "Medical Q&A API v2.0"}