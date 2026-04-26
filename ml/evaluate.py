"""
ml/evaluate.py
--------------
Evaluates retrieval quality on a held-out set of QA pairs.
Metrics: Precision@1, Precision@3, MRR (Mean Reciprocal Rank)

Usage:
    python ml/evaluate.py
"""

import os
import sys
import pickle
import numpy as np
import pandas as pd
import faiss
from sentence_transformers import SentenceTransformer

ROOT      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_DIR = os.path.join(ROOT, "indexes")
DATA_DIR  = os.path.join(ROOT, "data")

MODEL_NAME = "pritamdeka/S-PubMedBert-MS-MARCO"
EVAL_SAMPLE = 200       # number of QA pairs to evaluate on
TOP_K       = 5


def load_global_index():
    idx_path = os.path.join(INDEX_DIR, "global.index")
    ans_path = os.path.join(INDEX_DIR, "global_answers.pkl")
    if not os.path.exists(idx_path):
        print("❌ global.index not found. Run ml/create_indexes.py first.")
        sys.exit(1)
    index = faiss.read_index(idx_path)
    with open(ans_path, "rb") as f:
        answers = pickle.load(f)
    return index, answers


def load_eval_data() -> pd.DataFrame:
    """Load a random sample from all CSVs as the evaluation set."""
    dfs = []
    for fname in os.listdir(DATA_DIR):
        if fname.endswith(".csv"):
            df = pd.read_csv(os.path.join(DATA_DIR, fname), usecols=["Question","Answer"])
            df = df.dropna()
            dfs.append(df)
    combined = pd.concat(dfs, ignore_index=True)
    return combined.sample(n=min(EVAL_SAMPLE, len(combined)), random_state=99)


def reciprocal_rank(retrieved_answers: list[str], ground_truth: str) -> float:
    for rank, ans in enumerate(retrieved_answers, start=1):
        if ans.strip() == ground_truth.strip():
            return 1.0 / rank
    return 0.0


def precision_at_k(retrieved_answers: list[str], ground_truth: str, k: int) -> float:
    return float(ground_truth.strip() in [a.strip() for a in retrieved_answers[:k]])


def main():
    print("Loading model and index…")
    embedder = SentenceTransformer(MODEL_NAME, device="cpu")
    index, answers = load_global_index()
    eval_df = load_eval_data()

    print(f"Evaluating on {len(eval_df)} QA pairs…\n")

    p1_scores, p3_scores, mrr_scores = [], [], []

    for _, row in eval_df.iterrows():
        q = row["Question"]
        a = row["Answer"]

        query_vec = embedder.encode([q], convert_to_numpy=True).astype("float32")
        faiss.normalize_L2(query_vec)
        _, indices = index.search(query_vec, TOP_K)
        retrieved = [answers[i] for i in indices[0] if i < len(answers)]

        p1_scores.append(precision_at_k(retrieved, a, 1))
        p3_scores.append(precision_at_k(retrieved, a, 3))
        mrr_scores.append(reciprocal_rank(retrieved, a))

    print("─" * 40)
    print(f"  Precision@1 : {np.mean(p1_scores):.4f}")
    print(f"  Precision@3 : {np.mean(p3_scores):.4f}")
    print(f"  MRR         : {np.mean(mrr_scores):.4f}")
    print("─" * 40)
    print(f"\nSample size: {len(eval_df)} | Top-K: {TOP_K}")


if __name__ == "__main__":
    main()
