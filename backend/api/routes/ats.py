"""
api/routes/ats.py — ATS Scoring Engine API endpoints.

Endpoints:
  POST /api/ats-score   — Analyse resume vs job description and return ATS score.
  GET  /api/ats-health  — Simple liveness probe for ATS service.
"""

from fastapi import APIRouter, HTTPException, status

from models.ats_models import ATSScoreRequest, ATSScoreResponse
from services.ats_service import run_ats_analysis
from core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(tags=["ATS Scoring"])


@router.get("/ats-health", summary="ATS service health check")
def ats_health() -> dict:
    """Liveness probe for the ATS scoring service."""
    return {"status": "ok", "service": "ats-scoring-engine"}


@router.post(
    "/ats-score",
    response_model=ATSScoreResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyse resume vs job description",
)
def ats_score(payload: ATSScoreRequest) -> ATSScoreResponse:
    """
    Run the full ATS scoring pipeline on a resume and job description.

    Returns a composite ATS score (0–100) with a detailed breakdown:
    - Semantic similarity (SentenceTransformers cosine)
    - Keyword match percentage
    - Skill coverage
    - Action verb strength
    - Quantified achievement score
    - Matched / missing keywords
    - Actionable recommendations
    """
    logger.info("POST /api/ats-score — resume: %d chars, JD: %d chars",
                len(payload.resume_text), len(payload.job_description))

    try:
        result = run_ats_analysis(
            resume_text=payload.resume_text,
            jd_text=payload.job_description,
        )
    except Exception as exc:
        logger.exception("ATS scoring error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ATS scoring failed: {str(exc)}",
        ) from exc

    return ATSScoreResponse(**result)
