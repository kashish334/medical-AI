"""
backend/main.py
---------------
FastAPI application entry point.

Start command on Railway (root set to backend/):
    uvicorn main:app --host 0.0.0.0 --port $PORT
"""

import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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

# ── CORS origins ───────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://medical-ai-drab.vercel.app",
]

EXTRA_ORIGIN = os.getenv("ALLOWED_ORIGIN", "").strip()
if EXTRA_ORIGIN and EXTRA_ORIGIN not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append(EXTRA_ORIGIN)


# ── CORS middleware — MUST be added before routers ────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handler — ensures CORS headers on ALL error responses ────
# FastAPI's CORSMiddleware sometimes strips headers from 401/403/500 responses.
# This handler re-adds them so the browser never sees a CORS error on failures.
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    cors_origin = origin if origin in ALLOWED_ORIGINS else ALLOWED_ORIGINS[-1]
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin":      cors_origin,
            "Access-Control-Allow-Credentials": "true",
        },
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