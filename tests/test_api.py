"""
tests/test_api.py
------------------
Integration tests for all FastAPI endpoints.
Uses the in-memory DB from conftest.py.
Mock RAG pipeline prevents real model calls.
"""

import pytest


# ── Auth endpoints ─────────────────────────────────────────────────────────────

class TestAuth:
    def test_register_success(self, client):
        resp = client.post("/auth/register", json={
            "username": "newuser1",
            "email":    "newuser1@test.com",
            "password": "password123",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert data["username"] == "newuser1"
        assert data["is_admin"] is False

    def test_register_duplicate_username(self, client):
        payload = {"username": "dupuser", "email": "dup@test.com", "password": "pass123"}
        client.post("/auth/register", json=payload)
        resp = client.post("/auth/register", json=payload)
        assert resp.status_code == 400
        assert "already taken" in resp.json()["detail"]

    def test_register_short_password(self, client):
        resp = client.post("/auth/register", json={
            "username": "shortpass",
            "email":    "short@test.com",
            "password": "abc",
        })
        assert resp.status_code == 422

    def test_login_success(self, client):
        client.post("/auth/register", json={
            "username": "logintest",
            "email":    "login@test.com",
            "password": "correctpass",
        })
        resp = client.post("/auth/login", json={
            "username": "logintest",
            "password": "correctpass",
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_login_wrong_password(self, client):
        client.post("/auth/register", json={
            "username": "wrongpass",
            "email":    "wrongpass@test.com",
            "password": "correctpass",
        })
        resp = client.post("/auth/login", json={
            "username": "wrongpass",
            "password": "wrongpassword",
        })
        assert resp.status_code == 401

    def test_login_unknown_user(self, client):
        resp = client.post("/auth/login", json={
            "username": "nobody",
            "password": "anything",
        })
        assert resp.status_code == 401


# ── Chat endpoints ─────────────────────────────────────────────────────────────

class TestChat:
    def test_ask_returns_answer(self, client, mock_rag):
        # Register + get token
        reg = client.post("/auth/register", json={
            "username": "chatuser1",
            "email":    "chatuser1@test.com",
            "password": "pass1234",
        })
        headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

        resp = client.post(
            "/chat/ask",
            json={"question": "What is diabetes?", "session_id": "sess_001"},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "answer" in data
        assert "intent" in data
        assert "category" in data
        assert "confidence" in data
        assert data["session_id"] == "sess_001"

    def test_ask_empty_question(self, client, mock_rag):
        reg = client.post("/auth/register", json={
            "username": "chatuser2",
            "email":    "chatuser2@test.com",
            "password": "pass1234",
        })
        headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

        resp = client.post(
            "/chat/ask",
            json={"question": "   ", "session_id": "sess_002"},
            headers=headers,
        )
        assert resp.status_code == 422

    def test_ask_requires_auth(self, client):
        resp = client.post(
            "/chat/ask",
            json={"question": "What is diabetes?", "session_id": "sess_003"},
        )
        assert resp.status_code == 401

    def test_history_empty_session(self, client, mock_rag):
        reg = client.post("/auth/register", json={
            "username": "histuser",
            "email":    "hist@test.com",
            "password": "pass1234",
        })
        headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

        resp = client.get("/chat/history/nonexistent_session", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["messages"] == []

    def test_session_list(self, client, mock_rag):
        reg = client.post("/auth/register", json={
            "username": "sessuser",
            "email":    "sess@test.com",
            "password": "pass1234",
        })
        headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

        # Ask a question to create a session
        client.post(
            "/chat/ask",
            json={"question": "What is cancer?", "session_id": "my_session"},
            headers=headers,
        )

        resp = client.get("/chat/sessions", headers=headers)
        assert resp.status_code == 200
        assert "my_session" in resp.json()["sessions"]

    def test_feedback_submission(self, client, mock_rag):
        reg = client.post("/auth/register", json={
            "username": "fbuser",
            "email":    "fb@test.com",
            "password": "pass1234",
        })
        headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

        # Ask to get a message_id
        ask_resp = client.post(
            "/chat/ask",
            json={"question": "What is hypertension?", "session_id": "fb_sess"},
            headers=headers,
        )
        msg_id = ask_resp.json().get("message_id")

        resp = client.post(
            "/chat/feedback",
            json={"session_id": "fb_sess", "message_id": msg_id, "rating": 1},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

    def test_delete_history(self, client, mock_rag):
        reg = client.post("/auth/register", json={
            "username": "deluser",
            "email":    "del@test.com",
            "password": "pass1234",
        })
        headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

        client.post(
            "/chat/ask",
            json={"question": "What is stroke?", "session_id": "del_sess"},
            headers=headers,
        )

        resp = client.delete("/chat/history/del_sess", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["deleted_messages"] > 0


# ── Health check ───────────────────────────────────────────────────────────────

def test_health_check(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
