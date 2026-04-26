"""
tests/conftest.py
-----------------
Shared pytest fixtures:
  - in-memory SQLite DB
  - FastAPI test client with auth headers
  - mock RAG pipeline (no real FAISS/Gemini needed for API tests)
"""

import os
import sys
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure project root is on path
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from backend.db.database import Base, get_db
from backend.db import db_models  # noqa: registers ORM models
from backend.main import app

# ── In-memory test database ────────────────────────────────────────────────────
TEST_DATABASE_URL = "sqlite://"   # in-memory

test_engine       = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal  = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── FastAPI test client ────────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def client():
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ── Register + login helpers ───────────────────────────────────────────────────
@pytest.fixture
def registered_user(client):
    resp = client.post("/auth/register", json={
        "username": "testuser",
        "email":    "test@test.com",
        "password": "testpass123",
    })
    assert resp.status_code == 201
    return resp.json()


@pytest.fixture
def auth_headers(registered_user):
    return {"Authorization": f"Bearer {registered_user['access_token']}"}


# ── Mock RAG pipeline ──────────────────────────────────────────────────────────
@pytest.fixture
def mock_rag(monkeypatch):
    """Prevents real FAISS/Gemini calls during API tests."""
    from backend.services.rag_pipeline import PipelineResponse
    mock_response = PipelineResponse(
        answer="Diabetes is a chronic condition affecting blood sugar levels.",
        intent="medical",
        category="Diabetes_Digestive_Kidney",
        sources=["Source text here"],
        scores=[0.82],
        confidence=0.82,
        low_confidence=False,
    )
    monkeypatch.setattr(
        "backend.routers.chat.rag_pipeline.run",
        lambda *args, **kwargs: mock_response,
    )
    return mock_response
