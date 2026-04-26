"""
tests/test_retrieval.py
------------------------
Unit tests for FAISS retrieval + score threshold logic.
Uses mock FAISS index so no real data files are required.
"""

import numpy as np
import pytest
from unittest.mock import patch, MagicMock


def make_mock_index(scores, indices):
    """Creates a mock faiss index whose search() returns preset scores/indices."""
    mock_index = MagicMock()
    mock_index.search.return_value = (
        np.array([scores], dtype="float32"),
        np.array([indices], dtype="int64"),
    )
    return mock_index


MOCK_ANSWERS = [
    "Diabetes affects blood sugar.",
    "Cancer is a group of diseases.",
    "Heart disease is the leading cause of death.",
    "Hypertension is high blood pressure.",
    "Stroke affects the brain.",
]


# ── Tests ──────────────────────────────────────────────────────────────────────

def test_search_returns_results_above_threshold():
    from backend.services.retrieval import search, SCORE_THRESHOLD

    mock_index = make_mock_index([0.90, 0.75, 0.40], [0, 1, 2])

    with patch("backend.services.retrieval._load_index", return_value=(mock_index, MOCK_ANSWERS)):
        query_vec = np.random.rand(1, 384).astype("float32")
        results   = search(query_vec, topic="global")

    # Only scores >= SCORE_THRESHOLD should be returned
    assert all(r.score >= SCORE_THRESHOLD for r in results)


def test_search_empty_when_all_below_threshold():
    from backend.services.retrieval import search

    mock_index = make_mock_index([0.20, 0.15, 0.10], [0, 1, 2])

    with patch("backend.services.retrieval._load_index", return_value=(mock_index, MOCK_ANSWERS)):
        query_vec = np.random.rand(1, 384).astype("float32")
        results   = search(query_vec, topic="global")

    assert results == []


def test_search_falls_back_to_global_when_topic_missing():
    from backend.services.retrieval import search

    mock_index = make_mock_index([0.85], [0])

    def fake_load(topic):
        if topic == "missing_topic":
            return None, None
        return mock_index, MOCK_ANSWERS

    with patch("backend.services.retrieval._load_index", side_effect=fake_load):
        query_vec = np.random.rand(1, 384).astype("float32")
        results   = search(query_vec, topic="missing_topic")

    assert len(results) >= 1


def test_search_result_fields():
    from backend.services.retrieval import search

    mock_index = make_mock_index([0.88], [1])

    with patch("backend.services.retrieval._load_index", return_value=(mock_index, MOCK_ANSWERS)):
        query_vec = np.random.rand(1, 384).astype("float32")
        results   = search(query_vec, topic="cancer")

    assert len(results) == 1
    r = results[0]
    assert isinstance(r.answer, str)
    assert isinstance(r.score, float)
    assert r.category == "cancer"


def test_missing_index_raises():
    from backend.services.retrieval import search

    with patch("backend.services.retrieval._load_index", return_value=(None, None)):
        query_vec = np.random.rand(1, 384).astype("float32")
        with pytest.raises(FileNotFoundError):
            search(query_vec, topic="global")
