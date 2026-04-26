"""
tests/test_intent_classifier.py
---------------------------------
Tests for the intent classifier.
Uses a mock model so no trained .pkl files are needed.
"""

import pytest
from unittest.mock import patch, MagicMock
import numpy as np


def make_mock_pipeline(predicted_label: str, confidence: float):
    mock_vec = MagicMock()
    mock_vec.transform.return_value = MagicMock()

    mock_clf = MagicMock()
    proba = {"medical": [0, 0, 0], "off_topic": [0, 0, 0], "emergency": [0, 0, 0]}
    # Set the predicted class to the given confidence
    classes = ["emergency", "medical", "off_topic"]
    proba_arr = np.array([[0.05, 0.05, 0.05]])
    idx = classes.index(predicted_label)
    proba_arr[0][idx] = confidence
    mock_clf.predict_proba.return_value = proba_arr

    mock_le = MagicMock()
    mock_le.inverse_transform.return_value = [predicted_label]

    return mock_vec, mock_clf, mock_le


# ── Tests ──────────────────────────────────────────────────────────────────────

def test_medical_intent():
    from backend.services.intent_classifier import classify, Intent

    vec, clf, le = make_mock_pipeline("medical", 0.91)
    with patch("backend.services.intent_classifier._load_models", return_value=(vec, clf, le)):
        intent, conf = classify("What are the symptoms of diabetes?")

    assert intent == Intent.MEDICAL
    assert conf > 0.5


def test_emergency_intent():
    from backend.services.intent_classifier import classify, Intent

    vec, clf, le = make_mock_pipeline("emergency", 0.95)
    with patch("backend.services.intent_classifier._load_models", return_value=(vec, clf, le)):
        intent, conf = classify("I am having a heart attack")

    assert intent == Intent.EMERGENCY


def test_off_topic_intent():
    from backend.services.intent_classifier import classify, Intent

    vec, clf, le = make_mock_pipeline("off_topic", 0.88)
    with patch("backend.services.intent_classifier._load_models", return_value=(vec, clf, le)):
        intent, conf = classify("What is the weather today?")

    assert intent == Intent.OFF_TOPIC


def test_fallback_when_model_missing():
    """When model files don't exist, should default to MEDICAL."""
    from backend.services.intent_classifier import classify, Intent

    with patch("backend.services.intent_classifier._load_models", return_value=(None, None, None)):
        intent, conf = classify("some question")

    assert intent == Intent.MEDICAL
    assert conf == 1.0
