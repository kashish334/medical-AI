"""
backend/routers/drugs.py
-------------------------
POST /drugs/check  — full drug interaction check
GET  /drugs/search — autocomplete drug name search via RxNorm
GET  /drugs/info/{name} — single drug info from OpenFDA
"""

import asyncio
import logging
from typing import Annotated
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
import httpx

logger = logging.getLogger(__name__)

from db.db_models import User
from dependencies import get_current_user
from services.drug_checker import (
    normalize_drug, get_fda_label, get_rxnorm_interactions, gemini_analyze
)

router = APIRouter(prefix="/drugs", tags=["drugs"])

RXNORM_BASE = "https://rxnav.nlm.nih.gov/REST"


# ── Request / Response schemas ─────────────────────────────────────────────────

class DrugEntry(BaseModel):
    name:    str
    dosage:  str = ""   # e.g. "500mg twice daily"

class DrugCheckRequest(BaseModel):
    drugs:    list[DrugEntry]   # 1–5 drugs
    language: str = "english"

class DrugSearchResponse(BaseModel):
    suggestions: list[str]


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/check")
async def check_interactions(
    payload:      DrugCheckRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Full drug interaction analysis.
    1. Normalize drug names via RxNorm
    2. Fetch FDA label data for each drug
    3. Get RxNorm drug-drug interactions
    4. Synthesize analysis via Gemini
    """
    if not payload.drugs:
        return {"error": "Please enter at least one drug."}
    if len(payload.drugs) > 5:
        return {"error": "Maximum 5 drugs supported per check."}

    # Step 1: Normalize all drug names in parallel
    normalized = await asyncio.gather(*[
        normalize_drug(d.name) for d in payload.drugs
    ])

    # Build enriched drug list
    drugs_with_info = []
    for i, drug in enumerate(payload.drugs):
        norm = normalized[i]
        drugs_with_info.append({
            "name":    norm["name"] if norm["found"] else drug.name,
            "dosage":  drug.dosage,
            "rxcui":   norm.get("rxcui"),
            "found":   norm["found"],
        })

    # Step 2: Fetch FDA labels in parallel
    fda_results = await asyncio.gather(*[
        get_fda_label(d["name"]) for d in drugs_with_info
    ])

    # Step 3: RxNorm interaction check
    rxcuis = [d["rxcui"] for d in drugs_with_info if d.get("rxcui")]
    rxnorm_interactions = await get_rxnorm_interactions(rxcuis) if len(rxcuis) >= 2 else []

    # Step 4: Gemini synthesis
    analysis = gemini_analyze(
        drugs_with_info, list(fda_results), rxnorm_interactions, payload.language
    )

    return {
        "drugs":              drugs_with_info,
        "fda_data":           list(fda_results),
        "rxnorm_interactions": rxnorm_interactions,
        "analysis":           analysis,
    }


@router.get("/search")
async def search_drugs(
    q: str = Query(..., min_length=2),
):
    """
    Autocomplete drug name search using RxNorm approximateTerm API.
    Works with partial names like 'asp' → Aspirin, 'metf' → Metformin.
    No auth required so autocomplete works instantly.
    """
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            # Use approximateTerm for partial/prefix matching
            r = await client.get(
                f"{RXNORM_BASE}/approximateTerm.json",
                params={"term": q, "maxEntries": 8, "option": 1}
            )
            if r.status_code != 200:
                return {"suggestions": []}
            data = r.json()
            candidates = data.get("approximateGroup", {}).get("candidate", [])
            # Deduplicate case-insensitively, title-case the result
            seen = set()
            suggestions = []
            for c in candidates:
                name = c.get("name", "").strip()
                key  = name.lower()
                if name and key not in seen:
                    seen.add(key)
                    # Title-case for clean display (e.g. "AMOXICILLIN" → "Amoxicillin")
                    suggestions.append(name.title())
            return {"suggestions": suggestions[:8]}
    except Exception as e:
        logger.warning(f"Drug search error: {e}")
        return {"suggestions": []}


@router.get("/info/{drug_name}")
async def drug_info(
    drug_name:    str,
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Single drug info from OpenFDA."""
    normalized = await normalize_drug(drug_name)
    fda = await get_fda_label(normalized["name"] if normalized["found"] else drug_name)
    return {
        "normalized": normalized,
        "fda":        fda,
    }