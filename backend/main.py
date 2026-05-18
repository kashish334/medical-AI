"""
backend/main.py
---------------
FastAPI application entry point.

Run with:
    uvicorn backend.main:app --reload --port 8000

Swagger docs available at:
    http://localhost:8000/docs
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.database import engine, Base
from db import db_models          # noqa: F401 — ensures models are registered
from routers import auth, chat, admin, report, stream, drugs

# Create all DB tables on startup
Base.metadata.create_all(bind=engine)
from db.crud import get_user_by_username, create_user
from db.database import SessionLocal

def _seed_admin():
    db = SessionLocal()
    try:
        username = os.getenv("ADMIN_USERNAME", "admin")
        password = os.getenv("ADMIN_PASSWORD", "admin123")
        email    = f"{username}@medbot.local"
        if not get_user_by_username(db, username):
            create_user(db, username, email, password, is_admin=True)
            print(f"✅ Admin user '{username}' created")
    finally:
        db.close()

_seed_admin()
app = FastAPI(
    title="Medical Q&A Chatbot API",
    description="RAG-powered medical information chatbot using MedQuAD dataset + Gemini.",
    version="2.0.0",
)

import os

# CORS — explicitly list allowed origins
# When allow_credentials=True, wildcard "*" is not allowed by browsers
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://medical-ai-drab.vercel.app",   # your Vercel URL
]

# Also allow any extra origin set via environment variable on Railway
EXTRA_ORIGIN = os.getenv("ALLOWED_ORIGIN", "")
if EXTRA_ORIGIN:
    ALLOWED_ORIGINS.append(EXTRA_ORIGIN)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(admin.router)
app.include_router(report.router)
app.include_router(stream.router)
app.include_router(drugs.router)


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "service": "Medical Q&A API v2.0"}