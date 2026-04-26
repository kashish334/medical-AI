"""
backend/routers/report.py
--------------------------
POST /report/analyze  — upload a PDF or image medical report and get AI analysis
GET  /report/history  — list all reports uploaded by current user
"""

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..db.db_models import User, ReportUpload
from ..dependencies import get_current_user
from ..services.report_analyzer import analyze_pdf, analyze_image

router = APIRouter(prefix="/report", tags=["report"])

ALLOWED_MIME_TYPES = {
    "application/pdf":  "pdf",
    "image/jpeg":       "image",
    "image/jpg":        "image",
    "image/png":        "image",
    "image/webp":       "image",
}

MAX_FILE_SIZE_MB = 10


@router.post("/analyze")
async def analyze_report(
    file:         UploadFile = File(...),
    question:     str        = Form(default=""),
    db:           Session    = Depends(get_db),
    current_user: User       = Depends(get_current_user),
):
    """
    Upload a medical report (PDF or image) and receive an AI-powered explanation.

    - **file**     : PDF, PNG, JPG, or WEBP file
    - **question** : optional question about the report (e.g. "Is my cholesterol high?")
    """
    # Validate file type
    content_type = file.content_type or ""
    file_category = ALLOWED_MIME_TYPES.get(content_type)
    if not file_category:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {content_type}. Please upload PDF, PNG, JPG, or WEBP.",
        )

    # Read file bytes
    file_bytes = await file.read()

    # Check file size
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size_mb:.1f} MB). Maximum allowed is {MAX_FILE_SIZE_MB} MB.",
        )

    # Analyze based on type
    if file_category == "pdf":
        result = analyze_pdf(file_bytes, question)
    else:
        result = analyze_image(file_bytes, content_type, question)

    # Save to DB
    record = ReportUpload(
        user_id     = current_user.id,
        filename    = file.filename or "upload",
        file_type   = file_category,
        report_type = result.get("report_type", "unknown"),
        question    = question or None,
        analysis    = result["analysis"],
        char_count  = result.get("char_count", 0),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "id":           record.id,
        "filename":     record.filename,
        "file_type":    record.file_type,
        "analysis":     record.analysis,
        "question":     question,
        "uploaded_at":  str(record.created_at),
    }


@router.get("/history")
def report_history(
    db:           Annotated[Session, Depends(get_db)],
    current_user: Annotated[User,    Depends(get_current_user)],
):
    """Return all reports uploaded by the current user, newest first."""
    records = (
        db.query(ReportUpload)
        .filter(ReportUpload.user_id == current_user.id)
        .order_by(ReportUpload.created_at.desc())
        .all()
    )
    return [
        {
            "id":          r.id,
            "filename":    r.filename,
            "file_type":   r.file_type,
            "question":    r.question,
            "analysis":    r.analysis,
            "uploaded_at": str(r.created_at),
        }
        for r in records
    ]


@router.delete("/{report_id}")
def delete_report(
    report_id:    int,
    db:           Annotated[Session, Depends(get_db)],
    current_user: Annotated[User,    Depends(get_current_user)],
):
    """Delete a specific report upload."""
    record = db.query(ReportUpload).filter(
        ReportUpload.id == report_id,
        ReportUpload.user_id == current_user.id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Report not found.")
    db.delete(record)
    db.commit()
    return {"deleted": True, "id": report_id}
