"""
ml/create_indexes.py
--------------------
Run this ONCE before starting the app.
Builds per-category FAISS indexes + a global fallback index.

Usage:
    python ml/create_indexes.py
"""

import os
import sys
import pickle
import numpy as np
import pandas as pd
import faiss
from sentence_transformers import SentenceTransformer

# ── paths ─────────────────────────────────────────────────────────────────────
ROOT       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR   = os.path.join(ROOT, "data")
INDEX_DIR  = os.path.join(ROOT, "indexes")
os.makedirs(INDEX_DIR, exist_ok=True)

MODEL_NAME = "pritamdeka/S-PubMedBert-MS-MARCO"   # domain-specific medical embedder
BATCH_SIZE = 64

# ── topic → filename map ───────────────────────────────────────────────────────
TOPIC_FILES = {
    "cancer":                        "CancerQA.csv",
    "Heart_Lung_Blood":              "Heart_Lung_and_BloodQA.csv",
    "Neurological_Disorders_Stroke": "Neurological_Disorders_and_StrokeQA.csv",
    "Diabetes_Digestive_Kidney":     "Diabetes_and_Digestive_and_Kidney_DiseasesQA.csv",
    "Genetic_and_Rare_Diseases":     "Genetic_and_Rare_DiseasesQA.csv",
    "SeniorHealth":                  "SeniorHealthQA.csv",
    "Disease_Control_Prevention":    "Disease_Control_and_PreventionQA.csv",
    "growth_hormone_receptor":       "growth_hormone_receptorQA.csv",
    "Other":                         "OtherQA.csv",
}


def load_csv(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    df = df.dropna(subset=["Question", "Answer"])
    df["Question"] = df["Question"].astype(str).str.strip()
    df["Answer"]   = df["Answer"].astype(str).str.strip()
    return df


def build_index(embeddings: np.ndarray) -> faiss.Index:
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)          # inner-product ≡ cosine after L2-norm
    faiss.normalize_L2(embeddings)
    index.add(embeddings)
    return index


def save_index(index: faiss.Index, answers: list, topic: str):
    idx_path = os.path.join(INDEX_DIR, f"{topic}.index")
    ans_path = os.path.join(INDEX_DIR, f"{topic}_answers.pkl")
    faiss.write_index(index, idx_path)
    with open(ans_path, "wb") as f:
        pickle.dump(answers, f)
    print(f"  ✅ saved  {idx_path}  ({index.ntotal} vectors)")


def main():
    print(f"\n{'─'*55}")
    print(f"  Loading embedder: {MODEL_NAME}")
    print(f"{'─'*55}\n")

    embedder = SentenceTransformer(MODEL_NAME, device="cpu")

    all_questions: list[str] = []
    all_answers:   list[str] = []

    # ── per-category indexes ─────────────────────────────────────────────────
    for topic, filename in TOPIC_FILES.items():
        fpath = os.path.join(DATA_DIR, filename)
        if not os.path.exists(fpath):
            print(f"  ⚠️  missing  {filename} — skipping")
            continue

        print(f"  📂  {topic}  ({filename})")
        df = load_csv(fpath)
        questions = df["Question"].tolist()
        answers   = df["Answer"].tolist()

        embeddings = embedder.encode(
            questions, batch_size=BATCH_SIZE,
            show_progress_bar=True, convert_to_numpy=True
        ).astype("float32")

        index = build_index(embeddings)
        save_index(index, answers, topic)

        all_questions.extend(questions)
        all_answers.extend(answers)

    # ── global fallback index ────────────────────────────────────────────────
    print(f"\n  🌍  Building global index  ({len(all_questions)} questions)…")
    global_emb = embedder.encode(
        all_questions, batch_size=BATCH_SIZE,
        show_progress_bar=True, convert_to_numpy=True
    ).astype("float32")

    global_index = build_index(global_emb)
    save_index(global_index, all_answers, "global")

    print(f"\n{'─'*55}")
    print("  All indexes built successfully.")
    print(f"{'─'*55}\n")


if __name__ == "__main__":
    main()
