"""
backend/services/drug_checker.py
----------------------------------
Drug Interaction Checker using:
  1. OpenFDA API  — free, no key needed, official FDA drug data
  2. RxNorm API   — free, NLM drug normalization
  3. Gemini AI    — synthesizes interaction analysis from retrieved drug data

Flow:
  1. Normalize each drug name via RxNorm → get standard name + RxCUI
  2. Fetch drug label/warnings from OpenFDA for each drug
  3. Send all drug data + dosages to Gemini for interaction analysis
  4. Return structured result: interactions, side effects, warnings, severity
"""

import httpx
import logging
import json
from .api_key_manager import get_key_manager, NoAvailableKeyError
from .gemini_client import _is_tpm_error, _is_tpd_error  # ← shared error helpers
import google.generativeai as genai

logger = logging.getLogger(__name__)

RXNORM_BASE  = "https://rxnav.nlm.nih.gov/REST"
OPENFDA_BASE = "https://api.fda.gov/drug/label.json"
GEMINI_MODEL = "gemini-2.5-flash"

# ── RxNorm: normalize drug name → standard name + RxCUI ───────────────────────

async def normalize_drug(name: str) -> dict:
    """
    Call RxNorm API to get the standard drug name and RxCUI identifier.
    Returns { "name": str, "rxcui": str, "found": bool }
    """
    url = f"{RXNORM_BASE}/rxcui.json"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url, params={"name": name.strip(), "search": 1})
            data = r.json()
            ids = data.get("idGroup", {}).get("rxnormId", [])
            if not ids:
                return {"name": name, "rxcui": None, "found": False}
            rxcui = ids[0]
            # Get display name
            r2 = await client.get(f"{RXNORM_BASE}/rxcui/{rxcui}/property.json",
                                   params={"propName": "RxNorm Name"})
            d2 = r2.json()
            props = d2.get("propConceptGroup", {}).get("propConcept", [])
            std_name = props[0].get("propValue", name) if props else name
            return {"name": std_name, "rxcui": rxcui, "found": True}
    except Exception as e:
        logger.warning(f"RxNorm lookup failed for '{name}': {e}")
        return {"name": name, "rxcui": None, "found": False}


# ── OpenFDA: get drug label data ───────────────────────────────────────────────

async def get_fda_label(drug_name: str) -> dict:
    """
    Fetch drug label from OpenFDA.
    Returns key fields: warnings, drug_interactions, adverse_reactions, dosage.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(OPENFDA_BASE, params={
                "search": f'openfda.brand_name:"{drug_name}" OR openfda.generic_name:"{drug_name}"',
                "limit": 1,
            })
            if r.status_code != 200:
                # Try broader search
                r = await client.get(OPENFDA_BASE, params={
                    "search": f'openfda.substance_name:"{drug_name}"',
                    "limit": 1,
                })
            if r.status_code != 200:
                return {"found": False, "drug": drug_name}

            results = r.json().get("results", [])
            if not results:
                return {"found": False, "drug": drug_name}

            label = results[0]
            def first(key): return (label.get(key) or [""])[0][:600]

            return {
                "found":              True,
                "drug":               drug_name,
                "brand_name":         (label.get("openfda", {}).get("brand_name") or [drug_name])[0],
                "generic_name":       (label.get("openfda", {}).get("generic_name") or [drug_name])[0],
                "warnings":           first("warnings"),
                "drug_interactions":  first("drug_interactions"),
                "adverse_reactions":  first("adverse_reactions"),
                "dosage_admin":       first("dosage_and_administration"),
                "contraindications":  first("contraindications"),
                "boxed_warning":      first("boxed_warning"),
            }
    except Exception as e:
        logger.warning(f"OpenFDA lookup failed for '{drug_name}': {e}")
        return {"found": False, "drug": drug_name}


# ── RxNorm: direct drug-drug interaction check ─────────────────────────────────

async def get_rxnorm_interactions(rxcuis: list[str]) -> list[dict]:
    """
    Use RxNorm interaction API to get known drug-drug interactions.
    """
    if len(rxcuis) < 2:
        return []
    interactions = []
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            params = {"rxcuis": "+".join(rxcuis)}
            r = await client.get(f"{RXNORM_BASE}/interaction/list.json", params=params)
            if r.status_code != 200:
                return []
            data = r.json()
            full_pairs = data.get("fullInteractionTypeGroup", [])
            for group in full_pairs:
                for itype in group.get("fullInteractionType", []):
                    for pair in itype.get("interactionPair", []):
                        severity = pair.get("severity", "unknown")
                        desc     = pair.get("description", "")
                        drugs    = [c.get("name","") for c in pair.get("interactionConcept",[])]
                        interactions.append({
                            "drugs":       drugs,
                            "severity":    severity,
                            "description": desc[:400],
                        })
    except Exception as e:
        logger.warning(f"RxNorm interaction check failed: {e}")
    return interactions


# ── Gemini: synthesize full analysis ──────────────────────────────────────────

def gemini_analyze(
    drugs_input: list[dict],
    fda_data:    list[dict],
    rxnorm_interactions: list[dict],
    language: str = "english",
) -> dict:
    """
    Send all collected data to Gemini for a comprehensive, readable analysis.
    Uses full key rotation + retry — same pattern as gemini_client._call_gemini().
    Returns { summary, interactions, side_effects, warnings, recommendations, severity_level }
    """
    lang_map = {
        "hindi": "Hindi (हिंदी)", "gujarati": "Gujarati (ગુજરાતી)",
        "marathi": "Marathi (मराठी)", "tamil": "Tamil (தமிழ்)", "bengali": "Bengali (বাংলা)",
    }
    lang_line = f"Respond entirely in {lang_map[language]}." if language in lang_map else ""

    drugs_text = "\n".join([
        f"- {d['name']}" + (f" ({d['dosage']})" if d.get('dosage') else "")
        for d in drugs_input
    ])

    fda_text = ""
    for f in fda_data:
        if f.get("found"):
            fda_text += f"\n\n=== {f['brand_name']} ({f['generic_name']}) ===\n"
            if f.get("boxed_warning"):
                fda_text += f"⚠️ BOXED WARNING: {f['boxed_warning']}\n"
            if f.get("warnings"):
                fda_text += f"Warnings: {f['warnings']}\n"
            if f.get("drug_interactions"):
                fda_text += f"Drug Interactions: {f['drug_interactions']}\n"
            if f.get("adverse_reactions"):
                fda_text += f"Adverse Reactions: {f['adverse_reactions']}\n"
            if f.get("contraindications"):
                fda_text += f"Contraindications: {f['contraindications']}\n"

    rxnorm_text = ""
    if rxnorm_interactions:
        rxnorm_text = "\n\n=== KNOWN DRUG-DRUG INTERACTIONS (RxNorm) ===\n"
        for ix in rxnorm_interactions[:5]:
            rxnorm_text += f"• {' + '.join(ix['drugs'])}: [{ix['severity'].upper()}] {ix['description']}\n"

    prompt = f"""You are a clinical pharmacist AI assistant. Analyze the following drug combination and provide a comprehensive interaction report.

DRUGS ENTERED BY USER:
{drugs_text}

FDA LABEL DATA:
{fda_text if fda_text else "No FDA data found for these drugs."}
{rxnorm_text}

TASK: Generate a structured drug interaction analysis report. Be clinically accurate but understandable to a patient.
{lang_line}

Return ONLY a valid JSON object with exactly these fields:
{{
  "severity_level": "SAFE" | "MODERATE" | "MAJOR" | "CONTRAINDICATED",
  "severity_color": "green" | "yellow" | "orange" | "red",
  "summary": "2-3 sentence overall assessment",
  "interactions": [
    {{"drugs": ["Drug A", "Drug B"], "severity": "moderate", "effect": "description", "mechanism": "why this happens"}}
  ],
  "side_effects": {{
    "Drug A": ["side effect 1", "side effect 2"],
    "Drug B": ["side effect 1"]
  }},
  "warnings": ["warning 1", "warning 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "disclaimer": "Always consult your doctor or pharmacist before taking these medications."
}}

If no interactions found, set severity_level to "SAFE" and interactions to [].
Return ONLY the JSON, no markdown, no extra text."""

    # ── FIX: full key rotation + retry (was a single call with no rotation) ────
    manager  = get_key_manager("gemini")
    last_exc = None

    for attempt in range(3):
        try:
            key = manager.get_active_key()
            genai.configure(api_key=key)
            model = genai.GenerativeModel(GEMINI_MODEL)
            resp  = model.generate_content(prompt)
            text  = resp.text.strip().replace("```json", "").replace("```", "").strip()
            result = json.loads(text)
            manager.record_usage(key, tokens_used=len(prompt) // 4)
            return result

        except NoAvailableKeyError:
            logger.error("Gemini drug analysis: all API keys exhausted")
            return _fallback_result(drugs_input)

        except json.JSONDecodeError as e:
            # Bad JSON from Gemini — not a rate-limit, don't retry
            logger.error(f"Gemini returned invalid JSON: {e}")
            return _fallback_result(drugs_input)

        except Exception as exc:
            last_exc = exc
            if _is_tpd_error(exc):
                logger.warning(f"[Gemini drug] TPD exceeded (attempt {attempt+1}), rotating key…")
                manager.mark_tpd_exceeded(key)
            elif _is_tpm_error(exc):
                logger.warning(f"[Gemini drug] TPM exceeded (attempt {attempt+1}), rotating key…")
                manager.mark_tpm_exceeded(key)
            else:
                # Non-rate-limit error — log and bail immediately
                logger.error(f"Gemini drug analysis failed: {exc}")
                return _fallback_result(drugs_input)

    logger.error(f"Gemini drug analysis failed after 3 retries: {last_exc}")
    return _fallback_result(drugs_input)


def _fallback_result(drugs_input):
    return {
        "severity_level": "UNKNOWN",
        "severity_color": "yellow",
        "summary": "Could not complete automated analysis. Please consult a pharmacist.",
        "interactions": [],
        "side_effects": {},
        "warnings": ["Automated analysis unavailable. Manual review required."],
        "recommendations": ["Consult your doctor or pharmacist with this drug list."],
        "disclaimer": "Always consult your doctor or pharmacist before taking these medications.",
    }