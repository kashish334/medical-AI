"""
backend/services/gemini_streamer.py
-------------------------------------
Streaming version of Gemini answer generation.
Yields text chunks as they arrive from the API.
Used by POST /chat/stream endpoint.
"""

import logging
import google.generativeai as genai
from .api_key_manager import get_key_manager, NoAvailableKeyError

logger = logging.getLogger(__name__)
GEMINI_MODEL      = "gemini-2.5-flash"
MAX_CONTEXT_CHARS = 6000


def stream_answer(
    question: str,
    retrieved_contexts: list[str],
    conversation_history: list[dict] | None = None,
    language: str = "english",
):
    """
    Generator that yields text chunks from Gemini streaming API.
    Caller wraps in StreamingResponse / SSE.
    """
    lang_map = {
        "hindi": "Hindi (हिंदी)", "gujarati": "Gujarati (ગુજરાતી)",
        "marathi": "Marathi (मराठी)", "tamil": "Tamil (தமிழ்)",
        "bengali": "Bengali (বাংলা)",
    }
    lang_line = (
        f"- Respond ENTIRELY in {lang_map[language]}. Do not use English except for medical terms."
        if language in lang_map else ""
    )

    context_block = "\n\n---\n\n".join(
        f"Source {i+1}:\n{ctx[:MAX_CONTEXT_CHARS // max(len(retrieved_contexts), 1)]}"
        for i, ctx in enumerate(retrieved_contexts)
    )

    history_str = ""
    if conversation_history:
        lines = []
        for msg in conversation_history[-6:]:
            role = "Patient" if msg["role"] == "user" else "Assistant"
            lines.append(f"{role}: {msg['content']}")
        history_str = "\n".join(lines)

    prompt = f"""You are a helpful, empathetic medical information assistant named MedAI.
Your answers are grounded ONLY in the provided medical knowledge below.
Do not invent information. If the knowledge base does not cover the question, say so clearly.

IMPORTANT FORMATTING RULES:
- NEVER mention "Source 1", "Source 2", "Source 3" or any source numbers in your response.
- Write in clear, plain language a patient can understand.
- Use bullet points when listing symptoms, steps, or multiple items.
- Keep tone warm, informative, and professional.
- End EVERY response with: "Please consult a qualified doctor for personal medical advice."
{lang_line}

{'--- Previous conversation ---' if history_str else ''}
{history_str}

--- Medical Knowledge ---
{context_block}

--- Patient question ---
{question}

--- Your answer ---
Provide a clear, accurate, and well-structured answer. Do not reference source numbers anywhere."""

    manager = get_key_manager("gemini")
    for attempt in range(3):
        try:
            key = manager.get_active_key()
            genai.configure(api_key=key)
            model = genai.GenerativeModel(GEMINI_MODEL)
            for chunk in model.generate_content(prompt, stream=True):
                if chunk.text:
                    yield chunk.text
            manager.record_usage(key, tokens_used=len(prompt) // 4)
            return
        except NoAvailableKeyError:
            yield "\n\n⚠️ All API keys are exhausted. Please try again in a minute."
            return
        except Exception as exc:
            msg = str(exc).lower()
            if "daily" in msg or "per day" in msg:
                manager.mark_tpd_exceeded(key)
            elif "rate" in msg or "quota" in msg or "429" in msg:
                manager.mark_tpm_exceeded(key)
            else:
                yield f"\n\n⚠️ Error: {exc}"
                return
    yield "\n\n⚠️ Failed after 3 retries. Please try again."