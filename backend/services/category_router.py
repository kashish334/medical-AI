"""
backend/services/category_router.py
------------------------------------
Predicts which disease category a medical question belongs to,
so we search only the relevant FAISS sub-index (faster + more accurate).
"""

import os
import pickle
from functools import lru_cache

ROOT       = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS_DIR = os.path.join(ROOT, "models_saved")

# Map classifier output → index filename (without .index)
CATEGORY_TO_INDEX = {
    "cancer":                        "cancer",
    "Heart_Lung_Blood":              "Heart_Lung_Blood",
    "Neurological_Disorders_Stroke": "Neurological_Disorders_Stroke",
    "Diabetes_Digestive_Kidney":     "Diabetes_Digestive_Kidney",
    "Genetic_and_Rare_Diseases":     "Genetic_and_Rare_Diseases",
    "SeniorHealth":                  "SeniorHealth",
    "Disease_Control_Prevention":    "Disease_Control_Prevention",
    "growth_hormone_receptor":       "growth_hormone_receptor",
    "Other":                         "Other",
}


@lru_cache(maxsize=1)
def _load_models():
    vec_path = os.path.join(MODELS_DIR, "category_vectorizer.pkl")
    clf_path = os.path.join(MODELS_DIR, "category_classifier.pkl")
    le_path  = os.path.join(MODELS_DIR, "category_label_encoder.pkl")

    for p in [vec_path, clf_path, le_path]:
        if not os.path.exists(p):
            return None, None, None

    with open(vec_path, "rb") as f: vectorizer = pickle.load(f)
    with open(clf_path, "rb") as f: clf        = pickle.load(f)
    with open(le_path,  "rb") as f: le         = pickle.load(f)
    return vectorizer, clf, le


def predict_category(question: str) -> str:
    """
    Returns the index name to search (e.g. 'cancer').
    Falls back to 'global' if model files are missing or confidence is low.
    """
    vectorizer, clf, le = _load_models()

    if clf is None:
        return "global"

    X     = vectorizer.transform([question])
    proba = clf.predict_proba(X)[0]
    idx   = proba.argmax()
    confidence = float(proba[idx])

    if confidence < 0.40:           # low confidence → search everything
        return "global"

    label = le.inverse_transform([idx])[0]
    return CATEGORY_TO_INDEX.get(label, "global")
