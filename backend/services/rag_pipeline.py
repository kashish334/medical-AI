"""
backend/services/rag_pipeline.py
---------------------------------
Orchestrates the full RAG pipeline:
  1. Classify intent (medical / off_topic / emergency)
  2. Route to correct category index
  3. Encode query → FAISS search → filter by score
  4. Inject top-3 contexts into AI prompt
  5. Return structured response

AI provider is controlled by the AI_PROVIDER env var:
  AI_PROVIDER=gemini   (default) — uses Gemini with key rotation
  AI_PROVIDER=groq     — uses Groq  with key rotation
"""

import os
from dataclasses import dataclass, field
from dotenv import load_dotenv

from .intent_classifier import classify, Intent
from .category_router   import predict_category
from .embedder          import encode
from .retrieval         import search

load_dotenv()

# ── Provider selection ─────────────────────────────────────────────────────────

_PROVIDER = os.getenv("AI_PROVIDER", "gemini").lower()

if _PROVIDER == "gemini":
    from .gemini_client import (
        generate_answer,
        generate_emergency_response,
        generate_off_topic_response,
    )
    

# ── Response model ─────────────────────────────────────────────────────────────

@dataclass
class PipelineResponse:
    answer:         str
    intent:         str
    category:       str
    sources:        list[str]   = field(default_factory=list)
    scores:         list[float] = field(default_factory=list)
    confidence:     float       = 1.0
    low_confidence: bool        = False
    provider:       str         = _PROVIDER


# ── Main entry point ───────────────────────────────────────────────────────────

def run(
    question: str,
    conversation_history: list[dict] | None = None,
    language: str = 'english',
) -> PipelineResponse:
    """
    Full RAG pipeline entry point.

    Args:
        question             : raw user question
        conversation_history : list of {"role": "user"|"assistant", "content": str}
    Returns:
        PipelineResponse with the answer and all metadata.
    """

    # ── Step 1: Intent classification ──────────────────────────────────────────
    intent, intent_conf = classify(question)

    if intent == Intent.EMERGENCY:
        return PipelineResponse(
            answer=generate_emergency_response(),
            intent=intent.value,
            category="emergency",
            confidence=intent_conf,
        )

    if intent == Intent.OFF_TOPIC:
        return PipelineResponse(
            answer=generate_off_topic_response(question),
            intent=intent.value,
            category="off_topic",
            confidence=intent_conf,
        )

    # ── Step 2: Category routing ───────────────────────────────────────────────
    category = predict_category(question)

    # ── Step 3: Encode + FAISS search ─────────────────────────────────────────
    query_vec = encode(question)
    results   = search(query_vec, topic=category, top_k=3)

    if not results and category != "global":
        results  = search(query_vec, topic="global", top_k=3)
        category = "global"

    # ── Step 4: Handle no results ──────────────────────────────────────────────
    if not results:
        return PipelineResponse(
            answer=(
                "I don't have reliable information in my knowledge base to answer that question. "
                "Please consult a qualified healthcare professional for accurate medical advice."
            ),
            intent=intent.value,
            category=category,
            low_confidence=True,
        )

    # ── Step 5: Generate grounded answer ──────────────────────────────────────
    contexts = [r.answer for r in results]
    answer   = generate_answer(question, contexts, conversation_history, language=language)

    return PipelineResponse(
        answer=answer,
        intent=intent.value,
        category=category,
        sources=contexts,
        scores=[r.score for r in results],
        confidence=results[0].score,
        low_confidence=results[0].score < 0.60,
    )