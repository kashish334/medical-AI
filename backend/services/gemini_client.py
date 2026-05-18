"""
backend/services/gemini_client.py
----------------------------------
Wrapper around Gemini API with automatic multi-key rotation.

Reads up to 3 keys from env:
  GEMINI_API_KEY_1 / GEMINI_API_KEY_2 / GEMINI_API_KEY_3
Falls back to legacy GEMINI_API_KEY for single-key setups.

On TPM hit  → rotates to next key, retries once automatically.
On TPD hit  → marks key as day-exhausted, rotates, retries once.
"""

import logging
import google.generativeai as genai
from services.api_key_manager import get_key_manager, NoAvailableKeyError

logger = logging.getLogger(__name__)

GEMINI_MODEL      = "gemini-2.5-flash"
MAX_CONTEXT_CHARS = 6000


def _is_tpm_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(s in msg for s in [
        "resource_exhausted", "rate limit", "quota", "429",
        "tokens per minute", "tpm", "too many requests",
    ])

def _is_tpd_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(s in msg for s in [
        "daily limit", "tokens per day", "tpd", "daily quota",
        "per day", "exceeded your daily",
    ])


def _call_gemini(prompt: str, max_retries: int = 3) -> str:
    """Call Gemini with automatic key rotation on rate-limit errors."""
    manager  = get_key_manager("gemini")
    last_exc = None

    for attempt in range(max_retries):
        try:
            key = manager.get_active_key()
            genai.configure(api_key=key)
            model    = genai.GenerativeModel(GEMINI_MODEL)
            response = model.generate_content(prompt)
            manager.record_usage(key, tokens_used=len(prompt) // 4)
            return response.text.strip()

        except NoAvailableKeyError:
            raise

        except Exception as exc:
            last_exc = exc
            if _is_tpd_error(exc):
                logger.warning(f"[Gemini] TPD exceeded (attempt {attempt+1}), rotating key…")
                manager.mark_tpd_exceeded(key)
            elif _is_tpm_error(exc):
                logger.warning(f"[Gemini] TPM exceeded (attempt {attempt+1}), rotating key…")
                manager.mark_tpm_exceeded(key)
            else:
                raise

    raise last_exc or RuntimeError("Gemini: max retries exceeded")


def generate_answer(
    question: str,
    retrieved_contexts: list[str],
    conversation_history: list[dict] | None = None,
    language: str = 'english',
) -> str:

    lang_map = {
        'hindi': 'Hindi (हिंदी)', 'gujarati': 'Gujarati (ગુજરાતી)',
        'marathi': 'Marathi (मराठी)', 'tamil': 'Tamil (தமிழ்)',
        'bengali': 'Bengali (বাংলা)',
    }
    lang_line = f"- Respond ENTIRELY in {lang_map[language]}. Do not use English except for medical terms." if language in lang_map else ""

    context_block = "\n\n---\n\n".join(
        f"Source {i+1}:\n{ctx[:MAX_CONTEXT_CHARS // max(len(retrieved_contexts), 1)]}"
        for i, ctx in enumerate(retrieved_contexts)
    )

    history_str = ""
    if conversation_history:
        recent = conversation_history[-6:]
        lines  = []
        for msg in recent:
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

    try:
        return _call_gemini(prompt)
    except NoAvailableKeyError as e:
        return (
            "⚠️ I'm temporarily unable to generate a response — all API quota is exhausted. "
            "Please try again in a minute, or contact the administrator to add more API keys.\n\n"
            f"Details: {e}"
        )
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