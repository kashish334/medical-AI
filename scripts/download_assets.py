"""
scripts/download_assets.py
---------------------------
Checks whether indexes and model files exist.
If they don't, prints clear instructions for the user.

In a real deployment you'd download from HuggingFace Hub or S3.
For now this acts as a startup guard.

Usage:
    python scripts/download_assets.py
"""

import os
import sys

ROOT       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_DIR  = os.path.join(ROOT, "indexes")
MODELS_DIR = os.path.join(ROOT, "models_saved")

REQUIRED_INDEXES = ["global.index", "global_answers.pkl"]
REQUIRED_MODELS  = [
    "intent_vectorizer.pkl",
    "intent_classifier.pkl",
    "intent_label_encoder.pkl",
    "category_vectorizer.pkl",
    "category_classifier.pkl",
    "category_label_encoder.pkl",
]


def check_files(directory: str, filenames: list[str], label: str) -> bool:
    missing = [f for f in filenames if not os.path.exists(os.path.join(directory, f))]
    if missing:
        print(f"\n⚠️  Missing {label} files:")
        for f in missing:
            print(f"    {directory}/{f}")
        return False
    print(f"  ✅ {label} files OK")
    return True


def main():
    print("\nChecking required assets…\n")
    indexes_ok = check_files(INDEX_DIR,  REQUIRED_INDEXES, "FAISS index")
    models_ok  = check_files(MODELS_DIR, REQUIRED_MODELS,  "ML model")

    if not indexes_ok or not models_ok:
        print("\n" + "─"*55)
        print("  Run the following commands to build them:\n")
        if not indexes_ok:
            print("    python ml/create_indexes.py")
        if not models_ok:
            print("    python ml/train_classifiers.py")
        print("─"*55 + "\n")
        sys.exit(1)

    print("\nAll assets present. Ready to start.\n")


if __name__ == "__main__":
    main()
