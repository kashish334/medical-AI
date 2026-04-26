"""
tests/test_rag_pipeline.py
---------------------------
Unit tests for the full RAG pipeline.
All external calls (FAISS, Gemini, classifiers) are mocked.
"""

import pytest
from unittest.mock import patch, MagicMock
from backend.services.rag_pipeline import run, PipelineResponse
from backend.services.intent_classifier import Intent
from backend.services.retrieval import RetrievalResult


# ── Helpers ────────────────────────────────────────────────────────────────────

def mock_intent(intent: Intent, conf: float = 0.9):
    return patch(
        "backend.services.rag_pipeline.classify",
        return_value=(intent, conf),
    )

def mock_category(cat: str):
    return patch(
        "backend.services.rag_pipeline.predict_category",
        return_value=cat,
    )

def mock_encode():
    import numpy as np
    return patch(
        "backend.services.rag_pipeline.encode",
        return_value=np.zeros((1, 384), dtype="float32"),
    )

def mock_search(results):
    return patch(
        "backend.services.rag_pipeline.search",
        return_value=results,
    )

def mock_gemini(answer: str):
    return patch(
        "backend.services.rag_pipeline.generate_answer",
        return_value=answer,
    )


SAMPLE_RESULTS = [
    RetrievalResult(answer="Diabetes affects blood sugar.", score=0.87, category="Diabetes_Digestive_Kidney"),
    RetrievalResult(answer="Type 2 diabetes is the most common form.", score=0.75, category="Diabetes_Digestive_Kidney"),
]

# ── Tests ──────────────────────────────────────────────────────────────────────

def test_medical_question_returns_answer():
    with (
        mock_intent(Intent.MEDICAL),
        mock_category("Diabetes_Digestive_Kidney"),
        mock_encode(),
        mock_search(SAMPLE_RESULTS),
        mock_gemini("Diabetes is a chronic metabolic condition."),
    ):
        result = run("What is diabetes?")

    assert isinstance(result, PipelineResponse)
    assert result.intent == "medical"
    assert result.answer == "Diabetes is a chronic metabolic condition."
    assert result.category == "Diabetes_Digestive_Kidney"
    assert result.confidence == 0.87
    assert result.low_confidence is False


def test_emergency_question_skips_retrieval():
    with (
        mock_intent(Intent.EMERGENCY, 0.97),
        patch("backend.services.rag_pipeline.generate_emergency_response",
              return_value="Call 112 immediately."),
    ):
        result = run("I am having a heart attack")

    assert result.intent == "emergency"
    assert "112" in result.answer or "emergency" in result.answer.lower()
    assert result.sources == []


def test_off_topic_question_skips_retrieval():
    with (
        mock_intent(Intent.OFF_TOPIC, 0.88),
        patch("backend.services.rag_pipeline.generate_off_topic_response",
              return_value="I can only answer medical questions."),
    ):
        result = run("What is the weather today?")

    assert result.intent == "off_topic"
    assert result.sources == []


def test_no_results_returns_low_confidence_response():
    with (
        mock_intent(Intent.MEDICAL),
        mock_category("cancer"),
        mock_encode(),
        mock_search([]),   # empty results for both category and global
    ):
        result = run("Some very obscure question")

    assert result.low_confidence is True
    assert "don't have reliable information" in result.answer or result.answer != ""


def test_fallback_to_global_when_category_empty():
    call_count = {"n": 0}

    def search_side_effect(vec, topic, top_k=3):
        call_count["n"] += 1
        if topic != "global":
            return []                  # category search returns nothing
        return SAMPLE_RESULTS          # global search returns results

    with (
        mock_intent(Intent.MEDICAL),
        mock_category("cancer"),
        mock_encode(),
        patch("backend.services.rag_pipeline.search", side_effect=search_side_effect),
        mock_gemini("Cancer is characterized by uncontrolled cell growth."),
    ):
        result = run("What is cancer?")

    assert call_count["n"] == 2       # tried category then global
    assert result.category == "global"
    assert len(result.sources) > 0


def test_pipeline_passes_history_to_gemini():
    captured = {}

    def fake_generate(question, contexts, history):
        captured["history"] = history
        return "Answer with history context."

    history = [
        {"role": "user",      "content": "What is diabetes?"},
        {"role": "assistant", "content": "Diabetes affects blood sugar."},
    ]

    with (
        mock_intent(Intent.MEDICAL),
        mock_category("Diabetes_Digestive_Kidney"),
        mock_encode(),
        mock_search(SAMPLE_RESULTS),
        patch("backend.services.rag_pipeline.generate_answer", side_effect=fake_generate),
    ):
        run("How is it treated?", conversation_history=history)

    assert captured["history"] == history


def test_low_confidence_flag_when_score_below_threshold():
    low_score_results = [
        RetrievalResult(answer="Some answer.", score=0.50, category="Other"),
    ]
    with (
        mock_intent(Intent.MEDICAL),
        mock_category("Other"),
        mock_encode(),
        mock_search(low_score_results),
        mock_gemini("Here is a tentative answer."),
    ):
        result = run("Ambiguous question")

    assert result.low_confidence is True
