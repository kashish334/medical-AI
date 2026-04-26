"""
backend/services/rag_pipeline.py
---------------------------------
Orchestrates the full RAG pipeline:
  1. Classify intent (medical / off_topic / emergency)
  2. Route to correct category index
  3. Encode query → FAISS search → filter by score
  4. Inject top-3 contexts into Gemini prompt
  5. Return structured response

This is the single function called by the API router.
"""

from dataclasses import dataclass, field
from .intent_classifier import classify, Intent
from .category_router   import predict_category
from .embedder          import encode
from .retrieval         import search
from .gemini_client     import (
    generate_answer,
    generate_emergency_response,
    generate_off_topic_response,
)


@dataclass
class PipelineResponse:
    answer:         str
    intent:         str
    category:       str
    sources:        list[str]       = field(default_factory=list)
    scores:         list[float]     = field(default_factory=list)
    confidence:     float           = 1.0
    low_confidence: bool            = False


def run(
    question: str,
    conversation_history: list[dict] | None = None,
) -> PipelineResponse:
    """
    Full RAG pipeline entry point.

    Args:
        question             : raw user question
        conversation_history : list of {"role": "user"|"assistant", "content": str}
                               (pass last N turns for multi-turn context)

    Returns:
        PipelineResponse with the answer and all metadata.
    """

    # ── Step 1: Intent classification ─────────────────────────────────────────
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

    # If category search returns nothing, fallback to global
    if not results and category != "global":
        results = search(query_vec, topic="global", top_k=3)
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

    # ── Step 5: Generate grounded answer via Gemini ────────────────────────────
    contexts = [r.answer for r in results]
    answer   = generate_answer(question, contexts, conversation_history)

    return PipelineResponse(
        answer=answer,
        intent=intent.value,
        category=category,
        sources=contexts,
        scores=[r.score for r in results],
        confidence=results[0].score,
        low_confidence=results[0].score < 0.60,
    )
