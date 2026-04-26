"""
backend/main.py
---------------
FastAPI application entry point.

Run with:
    uvicorn backend.main:app --reload --port 8000

Swagger docs available at:
    http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db.database import engine, Base
from .db import db_models          # noqa: F401 — ensures models are registered
from .routers import auth, chat, admin, report

# Create all DB tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Medical Q&A Chatbot API",
    description="RAG-powered medical information chatbot using MedQuAD dataset + Gemini.",
    version="2.0.0",
)

# Allow Streamlit frontend to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(admin.router)
app.include_router(report.router)


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "service": "Medical Q&A API v2.0"}