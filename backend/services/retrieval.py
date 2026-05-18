"""
backend/services/retrieval.py
------------------------------
Loads FAISS indexes and performs semantic search with a confidence threshold.
"""

import os
import pickle
#import faiss
#import numpy as np
from functools import lru_cache
from dataclasses import dataclass

ROOT      = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
INDEX_DIR = os.path.join(ROOT, "indexes")

SCORE_THRESHOLD = 0.45      # cosine similarity — below this we say "I don't know"
TOP_K           = 3


@dataclass
class RetrievalResult:
    answer:   str
    score:    float
    category: str


@lru_cache(maxsize=16)
def _load_index(topic: str):
    """Cached loader for a FAISS index + its answer list."""
    idx_path = os.path.join(INDEX_DIR, f"{topic}.index")
    ans_path = os.path.join(INDEX_DIR, f"{topic}_answers.pkl")

    if not os.path.exists(idx_path):
        return None, None

    index = faiss.read_index(idx_path)
    with open(ans_path, "rb") as f:
        answers = pickle.load(f)
    return index, answers


def search(query_vec: np.ndarray, topic: str = "global", top_k: int = TOP_K) -> list[RetrievalResult]:
    """
    Search a topic-specific (or global) FAISS index.

    Args:
        query_vec : L2-normalised float32 array, shape (1, dim)
        topic     : index name — must match a file in indexes/
        top_k     : number of results to return

    Returns:
        List of RetrievalResult above the SCORE_THRESHOLD, best-first.
        Empty list if nothing passes the threshold.
    """
    index, answers = _load_index(topic)

    # Fallback to global if topic index missing
    if index is None:
        index, answers = _load_index("global")

    if index is None:
        raise FileNotFoundError(
            "No FAISS index found. Run  python ml/create_indexes.py  first."
        )

    scores, indices = index.search(query_vec, top_k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0 or idx >= len(answers):
            continue
        if float(score) < SCORE_THRESHOLD:
            continue
        results.append(
            RetrievalResult(
                answer=answers[idx],
                score=float(score),
                category=topic,
            )
        )
    return results
