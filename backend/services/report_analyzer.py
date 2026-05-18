"""
backend/services/report_analyzer.py
-------------------------------------
Analyzes uploaded medical reports (PDF or image) using Gemini's vision capability.
Extracts text from PDF using PyMuPDF, sends images directly as base64 to Gemini.

Supported formats: PDF, PNG, JPG, JPEG, WEBP
"""

import base64
import io
import google.generativeai as genai
from dotenv import load_dotenv
from services.api_key_manager import get_key_manager, NoAvailableKeyError

load_dotenv()

GEMINI_MODEL = "gemini-2.5-flash"


def _get_model():
    """Always gets a fresh model configured with the current active key."""
    key = get_key_manager("gemini").get_active_key()
    genai.configure(api_key=key)
    return genai.GenerativeModel(GEMINI_MODEL), key


def _extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract all text from a PDF using PyMuPDF (fitz)."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text.strip()
    except ImportError:
        raise ImportError(
            "PyMuPDF not installed. Run: pip install pymupdf"
        )
    except Exception as e:
        raise ValueError(f"Could not extract text from PDF: {e}")


def _build_report_prompt(report_text: str, user_question: str = "") -> str:
    """Build Gemini prompt for report explanation."""
    question_part = (
        f"\n\nThe user also has this specific question about the report:\n{user_question}"
        if user_question.strip()
        else ""
    )
    return f"""You are a helpful medical assistant that explains medical reports to patients in simple, clear language.

You have been given the following medical report text extracted from a document uploaded by the patient:

--- MEDICAL REPORT ---
{report_text[:8000]}
--- END OF REPORT ---
{question_part}

Please analyze this report and provide:

1. **Report Type** — What kind of report is this? (e.g., blood test, X-ray report, prescription, discharge summary)

2. **Key Findings** — List the most important values, results, or observations found in the report. For each finding, explain what it means in simple language a patient can understand.

3. **What's Normal / Abnormal** — Clearly indicate which values are within normal range and which are outside normal range (if applicable).

4. **What This Means for the Patient** — Summarize in 2-3 plain sentences what this report is telling the patient about their health.

5. **Recommended Next Steps** — What should the patient discuss with their doctor based on these results?

⚠️ Important: End your response with this disclaimer:
"This explanation is for educational purposes only. Please consult your doctor or healthcare provider for a proper medical interpretation of your report and personalized medical advice."

If the uploaded document does not appear to be a medical report, politely inform the user and ask them to upload the correct document."""


def _build_image_prompt(user_question: str = "") -> str:
    """Build Gemini prompt for image-based report analysis."""
    question_part = (
        f"\n\nThe user also has this specific question: {user_question}"
        if user_question.strip()
        else ""
    )
    return f"""You are a helpful medical assistant that explains medical reports, prescriptions, and lab results to patients in simple language.

Please analyze the medical document shown in this image and provide:

1. **Document Type** — What kind of medical document is this?
2. **Key Information** — What are the most important details (values, medications, findings, instructions)?
3. **Plain Language Explanation** — Explain what this document means in simple terms a patient can understand.
4. **Action Items** — What should the patient do or ask their doctor about based on this document?
{question_part}

⚠️ Always end with: "This is for educational purposes only. Please consult your doctor for proper medical advice."

If this is not a medical document, let the user know."""


def analyze_pdf(file_bytes: bytes, user_question: str = "") -> dict:
    """
    Analyze a PDF medical report.

    Args:
        file_bytes    : raw bytes of the uploaded PDF
        user_question : optional follow-up question from the user

    Returns:
        dict with keys: analysis (str), report_type (str), char_count (int)
    """
    extracted_text = _extract_text_from_pdf(file_bytes)

    if len(extracted_text) < 20:
        return {
            "analysis": (
                "⚠️ Could not extract readable text from this PDF. "
                "It may be a scanned image-only PDF. "
                "Please try uploading it as an image (PNG/JPG) instead."
            ),
            "report_type": "unknown",
            "char_count": 0,
        }

    manager  = get_key_manager("gemini")
    prompt   = _build_report_prompt(extracted_text, user_question)
    analysis = "Error analyzing report: unknown error"

    for _ in range(3):
        try:
            model, key = _get_model()
            response   = model.generate_content(prompt)
            analysis   = response.text.strip()
            manager.record_usage(key, tokens_used=len(prompt) // 4)
            break
        except NoAvailableKeyError as e:
            analysis = f"⚠️ All API keys exhausted: {e}"
            break
        except Exception as e:
            msg = str(e).lower()
            if "daily" in msg or "per day" in msg:
                manager.mark_tpd_exceeded(key)
            elif "rate" in msg or "quota" in msg or "429" in msg:
                manager.mark_tpm_exceeded(key)
            else:
                analysis = f"Error analyzing report: {e}"
                break

    return {
        "analysis":    analysis,
        "report_type": "pdf",
        "char_count":  len(extracted_text),
    }


def analyze_image(file_bytes: bytes, mime_type: str, user_question: str = "") -> dict:
    """
    Analyze a medical report image using Gemini vision.

    Args:
        file_bytes    : raw bytes of the image
        mime_type     : e.g. "image/jpeg", "image/png"
        user_question : optional question from user

    Returns:
        dict with keys: analysis (str), report_type (str)
    """
    manager    = get_key_manager("gemini")
    prompt     = _build_image_prompt(user_question)
    image_part = {
        "mime_type": mime_type,
        "data":      base64.b64encode(file_bytes).decode("utf-8"),
    }
    analysis = "Error analyzing image: unknown error"

    for _ in range(3):
        try:
            model, key = _get_model()
            response   = model.generate_content([prompt, image_part])
            analysis   = response.text.strip()
            manager.record_usage(key, tokens_used=500)
            break
        except NoAvailableKeyError as e:
            analysis = f"⚠️ All API keys exhausted: {e}"
            break
        except Exception as e:
            msg = str(e).lower()
            if "daily" in msg or "per day" in msg:
                manager.mark_tpd_exceeded(key)
            elif "rate" in msg or "quota" in msg or "429" in msg:
                manager.mark_tpm_exceeded(key)
            else:
                analysis = f"Error analyzing image: {e}"
                break

    return {
        "analysis":    analysis,
        "report_type": "image",
        "char_count":  len(file_bytes),
    }