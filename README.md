# 💊 Medical Q&A Chatbot v2

A production-grade **Retrieval-Augmented Generation (RAG)** medical chatbot built on the MedQuAD dataset.
Upgraded from a simple FAISS search script to a full multi-service system with FastAPI, authentication, analytics, and CI/CD.

---

## Architecture

```
User (Browser)
    │
    ▼
Streamlit Frontend  (port 8501)
    │  REST API calls
    ▼
FastAPI Backend     (port 8000)
    ├── /auth      → JWT register/login
    ├── /chat/ask  → RAG pipeline
    │       ├── Intent Classifier (medical / off_topic / emergency)
    │       ├── Category Router   (9 disease sub-indexes)
    │       ├── PubMedBERT FAISS  (semantic search, score threshold)
    │       └── Gemini 2.5 Flash  (grounded answer generation)
    ├── /chat/feedback  → thumbs up/down logging
    └── /admin/metrics  → analytics dashboard data
    │
    ▼
SQLite DB   (users · chat_history · feedback)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Streamlit, Plotly |
| Backend API | FastAPI, Uvicorn |
| Auth | JWT (python-jose), bcrypt (passlib) |
| Embeddings | `pritamdeka/S-PubMedBert-MS-MARCO` |
| Vector Search | FAISS (IndexFlatIP, cosine similarity) |
| Classifiers | TF-IDF + Logistic Regression (scikit-learn) |
| LLM | Google Gemini 2.5 Flash |
| Database | SQLite + SQLAlchemy ORM |
| Tests | Pytest, FastAPI TestClient |
| DevOps | Docker, Docker Compose, GitHub Actions |

---

## Project Structure

```
medical-chatbot/
├── backend/
│   ├── main.py                  ← FastAPI app entry point
│   ├── dependencies.py          ← JWT auth dependency
│   ├── routers/
│   │   ├── auth.py              ← POST /auth/register, /auth/login
│   │   ├── chat.py              ← POST /chat/ask, GET /chat/history, etc.
│   │   └── admin.py             ← GET /admin/metrics
│   ├── services/
│   │   ├── rag_pipeline.py      ← Main orchestrator
│   │   ├── retrieval.py         ← FAISS search + score filter
│   │   ├── embedder.py          ← PubMedBERT encoder
│   │   ├── intent_classifier.py ← medical/off_topic/emergency
│   │   ├── category_router.py   ← Routes to correct sub-index
│   │   └── gemini_client.py     ← Gemini RAG prompt + API call
│   ├── models/
│   │   └── schemas.py           ← Pydantic request/response models
│   └── db/
│       ├── database.py          ← SQLAlchemy engine + session
│       ├── db_models.py         ← User, ChatMessage, Feedback tables
│       └── crud.py              ← All DB read/write operations
│
├── frontend/
│   ├── app.py                   ← Streamlit entry point + routing
│   ├── auth_page.py             ← Login / register UI
│   ├── pages/
│   │   ├── chat.py              ← Chat interface
│   │   └── admin.py             ← Analytics dashboard
│   └── components/
│       ├── chat_bubble.py       ← Message bubble renderer
│       └── feedback_buttons.py  ← 👍/👎 widget
│
├── ml/
│   ├── create_indexes.py        ← Builds all 9 FAISS sub-indexes
│   ├── train_classifiers.py     ← Trains intent + category models
│   └── evaluate.py              ← Precision@k, MRR evaluation
│
├── tests/
│   ├── conftest.py              ← Fixtures (test DB, mock RAG)
│   ├── test_retrieval.py
│   ├── test_intent_classifier.py
│   ├── test_rag_pipeline.py
│   └── test_api.py              ← Full endpoint integration tests
│
├── scripts/
│   ├── seed_db.py               ← Creates tables + admin user
│   └── download_assets.py       ← Checks for required model files
│
├── indexes/                     ← FAISS index files (git-ignored)
├── models_saved/                ← Trained .pkl files (git-ignored)
├── data/                        ← CSV datasets (git-ignored)
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
├── .github/workflows/ci.yml
├── requirements.backend.txt
├── requirements.frontend.txt
└── .env.example
```

---

## Setup & Run (Local)

### 1. Clone and configure

```bash
git clone https://github.com/your-username/medical-chatbot.git
cd medical-chatbot

cp .env.example .env
# Edit .env — add your GEMINI_API_KEY and change SECRET_KEY
```

### 2. Install dependencies

```bash
pip install -r requirements.backend.txt
pip install -r requirements.frontend.txt
```

### 3. Add your data

Copy your MedQuAD CSV files into the `data/` folder:
```
data/CancerQA.csv
data/Heart_Lung_and_BloodQA.csv
... (all 9 files)
```

### 4. Build ML artifacts (one-time, ~10–30 min depending on your machine)

```bash
# Build FAISS indexes for all 9 disease categories + global fallback
python ml/create_indexes.py

# Train intent classifier (medical/off_topic/emergency)
# and category router classifier
python ml/train_classifiers.py
```

### 5. Seed the database

```bash
python scripts/seed_db.py
```

### 6. Start the backend

```bash
uvicorn backend.main:app --reload --port 8000
```
API docs available at: http://localhost:8000/docs

### 7. Start the frontend (new terminal)

```bash
streamlit run frontend/app.py
```
App available at: http://localhost:8501

---

## Run with Docker

```bash
# Make sure indexes/ and models_saved/ are populated first (steps 4 above)
docker-compose up --build
```

- Frontend: http://localhost:8501
- Backend API: http://localhost:8000/docs

---

## Run Tests

```bash
pytest tests/ -v
```

Run with coverage:
```bash
pytest tests/ --cov=backend --cov-report=term-missing
```

---

## Default Admin Credentials

Set in `.env`:
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```
Log in as admin to access the Analytics Dashboard.

---

## Dataset

MedQuAD (Medical Question Answering Dataset) from Kaggle.
Sources: NIH, National Cancer Institute, CDC, NHBLI, and more.
**For educational purposes only. Not a substitute for professional medical advice.**
