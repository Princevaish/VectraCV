from fastapi import APIRouter, HTTPException, status
from models.optimizer_models import OptimizeRequest, OptimizeResponse
from services.optimizer_service import optimize_resume
from core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(tags=["Optimizer"])

@router.post(
    "/optimize",
    response_model=OptimizeResponse,
    status_code=status.HTTP_200_OK,
    summary="Optimize resume against job description",
)
def optimize(payload: OptimizeRequest) -> OptimizeResponse:
    logger.info("POST /api/optimize — resume: %d chars, JD: %d chars",
                len(payload.resume_text), len(payload.job_description))

    try:
        result = optimize_resume(
            resume_text=payload.resume_text,
            jd_text=payload.job_description,
            target_role=payload.target_role,
            tone=payload.tone,
            focus_area=payload.focus_area
        )
    except Exception as exc:
        logger.exception("Optimizer error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Optimization failed: {str(exc)}",
        ) from exc

    return OptimizeResponse(**result)
