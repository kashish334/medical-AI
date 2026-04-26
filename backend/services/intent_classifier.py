"""
backend/services/intent_classifier.py
--------------------------------------
Classifies a user question into: medical | off_topic | emergency
Uses a trained TF-IDF + Logistic Regression model.
"""

import os
import pickle
from functools import lru_cache
from enum import Enum

ROOT       = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS_DIR = os.path.join(ROOT, "models_saved")


class Intent(str, Enum):
    MEDICAL   = "medical"
    OFF_TOPIC = "off_topic"
    EMERGENCY = "emergency"


@lru_cache(maxsize=1)
def _load_models():
    vec_path = os.path.join(MODELS_DIR, "intent_vectorizer.pkl")
    clf_path = os.path.join(MODELS_DIR, "intent_classifier.pkl")
    le_path  = os.path.join(MODELS_DIR, "intent_label_encoder.pkl")

    for p in [vec_path, clf_path, le_path]:
        if not os.path.exists(p):
            return None, None, None

    with open(vec_path, "rb") as f: vectorizer = pickle.load(f)
    with open(clf_path, "rb") as f: clf        = pickle.load(f)
    with open(le_path,  "rb") as f: le         = pickle.load(f)
    return vectorizer, clf, le


def classify(question: str) -> tuple[Intent, float]:
    """
    Returns (Intent, confidence_score).
    Falls back to Intent.MEDICAL if model files are missing.
    """
    vectorizer, clf, le = _load_models()

    if clf is None:
        # Models not yet trained — default to medical
        return Intent.MEDICAL, 1.0

    X    = vectorizer.transform([question])
    proba = clf.predict_proba(X)[0]
    idx   = proba.argmax()
    label = le.inverse_transform([idx])[0]
    return Intent(label), float(proba[idx])
