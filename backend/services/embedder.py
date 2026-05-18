"""
backend/services/embedder.py
----------------------------
Singleton wrapper around the PubMedBERT sentence encoder.
Loaded once at startup, reused everywhere.
"""

#import numpy as np
#from sentence_transformers import SentenceTransformer
from functools import lru_cache

MODEL_NAME = "pritamdeka/S-PubMedBert-MS-MARCO"


@lru_cache(maxsize=1)
def get_embedder() -> SentenceTransformer:
    """Returns a cached SentenceTransformer instance."""
    return SentenceTransformer(MODEL_NAME, device="cpu")


def encode(text: str) -> np.ndarray:
    """
    Encode a single string into an L2-normalised float32 vector.
    Returns shape (1, dim).
    """
    import faiss
    model = get_embedder()
    vec = model.encode([text], convert_to_numpy=True).astype("float32")
    faiss.normalize_L2(vec)
    return vec
