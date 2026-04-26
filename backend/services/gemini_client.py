"""
backend/services/gemini_client.py
----------------------------------
Wrapper around Gemini API for RAG-based answer generation.
Keeps prompt templates in one place.
"""

import os
from functools import lru_cache
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

GEMINI_MODEL = "gemini-2.5-flash"
MAX_CONTEXT_CHARS = 6000


@lru_cache(maxsize=1)
def _get_model():
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise EnvironmentError("GEMINI_API_KEY is not set in your .env file.")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(GEMINI_MODEL)


def generate_answer(
    question: str,
    retrieved_contexts: list[str],
    conversation_history: list[dict] | None = None,
) -> str:
    """
    Generate a grounded answer using retrieved context + optional chat history.

    Args:
        question             : the user's current question
        retrieved_contexts   : list of raw answers from FAISS (up to 3)
        conversation_history : list of {"role": "user"|"assistant", "content": str}

    Returns:
        Gemini's synthesised answer as a plain string.
    """
    model = _get_model()

    # Build the context block
    context_block = "\n\n---\n\n".join(
        f"Source {i+1}:\n{ctx[:MAX_CONTEXT_CHARS // len(retrieved_contexts)]}"
        for i, ctx in enumerate(retrieved_contexts)
    )

    # Build conversation history string
    history_str = ""
    if conversation_history:
        recent = conversation_history[-6:]          # last 3 turns
        lines  = []
        for msg in recent:
            role = "Patient" if msg["role"] == "user" else "Assistant"
            lines.append(f"{role}: {msg['content']}")
        history_str = "\n".join(lines)

    # Final prompt
    prompt = f"""You are a helpful, empathetic medical information assistant named MedAI.
Your answers are grounded ONLY in the provided medical knowledge below.
Do not invent information. If the knowledge base does not cover the question, say so clearly.

IMPORTANT FORMATTING RULES:
- NEVER mention "Source 1", "Source 2", "Source 3" or any source numbers in your response.
- Write in clear, plain language a patient can understand.
- Use bullet points when listing symptoms, steps, or multiple items.
- Keep tone warm, informative, and professional.
- End EVERY response with: "Please consult a qualified doctor for personal medical advice."

{'--- Previous conversation ---' if history_str else ''}
{history_str}

--- Medical Knowledge ---
{context_block}

--- Patient question ---
{question}

--- Your answer ---
Provide a clear, accurate, and well-structured answer. Do not reference source numbers anywhere."""

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"I'm sorry, I encountered an error generating the answer: {e}"


def generate_emergency_response() -> str:
    return (
        "⚠️ **This sounds like a medical emergency.**\n\n"
        "Please take one of these actions immediately:\n"
        "- **Call emergency services**: 112 (India) or your local emergency number\n"
        "- **Go to the nearest emergency room**\n"
        "- **Call a trusted person near you right now**\n\n"
        "I am an informational assistant and cannot provide emergency medical care. "
        "Please seek immediate professional help."
    )


def generate_off_topic_response(question: str) -> str:
    return (
        f"I'm a medical information assistant and can only help with health-related questions. "
        f"Your question — *\"{question}\"* — appears to be outside my area. "
        f"Please ask me about symptoms, diseases, treatments, or general health topics."
    )
