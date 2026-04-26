"""
ml/train_classifiers.py
-----------------------
Trains two lightweight classifiers:
  1. Intent Classifier   → medical | off_topic | emergency
  2. Category Classifier → which disease category (9 classes)

Run AFTER create_indexes.py.

Usage:
    python ml/train_classifiers.py
"""

import os
import sys
import pickle
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

ROOT       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR   = os.path.join(ROOT, "data")
MODELS_DIR = os.path.join(ROOT, "models_saved")
os.makedirs(MODELS_DIR, exist_ok=True)

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

# ── synthetic off-topic & emergency examples ──────────────────────────────────
OFF_TOPIC_QUESTIONS = [
    "What is the weather today?",
    "Who won the cricket match?",
    "Tell me a joke",
    "What is the capital of France?",
    "How do I cook pasta?",
    "What movies are playing tonight?",
    "Write me a poem",
    "How do I fix my laptop?",
    "What is the stock market doing?",
    "How do I learn Python?",
    "What is the best phone to buy?",
    "Can you help me with my homework?",
    "What is the latest news?",
    "How do I make money online?",
    "What time is it?",
]

EMERGENCY_QUESTIONS = [
    "I am having a heart attack right now",
    "I want to kill myself",
    "I am thinking about suicide",
    "I am having trouble breathing right now",
    "I feel severe chest pain",
    "I took too many pills",
    "I am having a seizure",
    "Someone is unconscious please help",
    "I am bleeding heavily",
    "I overdosed on medication",
    "I feel like ending my life",
    "I have severe allergic reaction and cannot breathe",
    "My child stopped breathing",
    "I am having a stroke right now",
    "Please help me I am dying",
]


def load_all_medical() -> pd.DataFrame:
    dfs = []
    for topic, filename in TOPIC_FILES.items():
        path = os.path.join(DATA_DIR, filename)
        if not os.path.exists(path):
            print(f"  ⚠️  {filename} not found — skipping")
            continue
        df = pd.read_csv(path, usecols=["Question", "topic"])
        df = df.dropna()
        dfs.append(df)
    return pd.concat(dfs, ignore_index=True)


def train_intent_classifier(medical_df: pd.DataFrame):
    print("\n── Intent Classifier ─────────────────────────────────")

    # Build dataset: sample medical questions + synthetic off-topic + emergency
    med_sample = medical_df.sample(n=min(2000, len(medical_df)), random_state=42)
    
    questions = (
        med_sample["Question"].tolist() +
        OFF_TOPIC_QUESTIONS * 10 +      # oversample synthetic classes
        EMERGENCY_QUESTIONS * 10
    )
    labels = (
        ["medical"] * len(med_sample) +
        ["off_topic"] * (len(OFF_TOPIC_QUESTIONS) * 10) +
        ["emergency"] * (len(EMERGENCY_QUESTIONS) * 10)
    )

    vectorizer = TfidfVectorizer(max_features=10000, ngram_range=(1, 2))
    X = vectorizer.fit_transform(questions)

    le = LabelEncoder()
    y  = le.fit_transform(labels)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    clf = LogisticRegression(max_iter=500, C=1.0)
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # Save
    for obj, name in [
        (vectorizer, "intent_vectorizer.pkl"),
        (clf,        "intent_classifier.pkl"),
        (le,         "intent_label_encoder.pkl"),
    ]:
        with open(os.path.join(MODELS_DIR, name), "wb") as f:
            pickle.dump(obj, f)
        print(f"  ✅ saved {name}")


def train_category_classifier(medical_df: pd.DataFrame):
    print("\n── Category Classifier ───────────────────────────────")

    questions = medical_df["Question"].tolist()
    labels    = medical_df["topic"].tolist()

    vectorizer = TfidfVectorizer(max_features=15000, ngram_range=(1, 2))
    X = vectorizer.fit_transform(questions)

    le = LabelEncoder()
    y  = le.fit_transform(labels)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    clf = LogisticRegression(max_iter=500, C=2.0, multi_class="multinomial")
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    for obj, name in [
        (vectorizer, "category_vectorizer.pkl"),
        (clf,        "category_classifier.pkl"),
        (le,         "category_label_encoder.pkl"),
    ]:
        with open(os.path.join(MODELS_DIR, name), "wb") as f:
            pickle.dump(obj, f)
        print(f"  ✅ saved {name}")


def main():
    print("Loading medical data…")
    medical_df = load_all_medical()
    print(f"  Total rows: {len(medical_df)}")
    print(f"  Topics:     {sorted(medical_df['topic'].unique())}")

    train_intent_classifier(medical_df)
    train_category_classifier(medical_df)

    print("\n✅ Both classifiers trained and saved to models_saved/\n")


if __name__ == "__main__":
    main()
