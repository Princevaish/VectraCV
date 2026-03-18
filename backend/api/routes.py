"""
api/routes.py — FastAPI router for all resume-analyser endpoints.

Endpoints:
  POST /load-data  — Ingest resume + job description into the vector store.
  POST /analyze    — Answer a natural-language question via RAG.
  GET  /health     — Simple liveness probe.
"""

from fastapi import APIRouter, HTTPException, status

from backend.models.schema import (
    AnalyzeRequest,
    AnalyzeResponse,
    LoadDataRequest,
    LoadDataResponse,
)
from backend.services.embedding_service import embed_texts
from backend.services.vector_service import vector_service
from backend.services.rag_service import run_rag
from backend.utils.text_splitter import split_text
from backend.core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


# ── Health ────────────────────────────────────────────────────────────────────

@router.get("/health", tags=["Utility"])
def health_check() -> dict:
    """Liveness probe — returns 200 when the service is up."""
    return {"status": "ok"}


# ── Load Data ─────────────────────────────────────────────────────────────────

@router.post(
    "/load-data",
    response_model=LoadDataResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest resume and job description",
    tags=["Data"],
)
def load_data(payload: LoadDataRequest) -> LoadDataResponse:
    """
    Split the resume and job description into chunks, generate embeddings,
    and store everything in Endee with appropriate metadata tags.

    - ``type: resume`` for resume chunks
    - ``type: job``    for job-description chunks
    """
    logger.info("POST /load-data — ingesting resume + job description.")

    try:
        # --- Resume ---
        resume_chunks = split_text(payload.resume)
        if not resume_chunks:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Resume text produced no chunks after splitting.",
            )
        resume_embeddings = embed_texts(resume_chunks)
        resume_metadata = [{"type": "resume"} for _ in resume_chunks]

        # --- Job Description ---
        job_chunks = split_text(payload.job_description)
        if not job_chunks:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Job description produced no chunks after splitting.",
            )
        job_embeddings = embed_texts(job_chunks)
        job_metadata = [{"type": "job"} for _ in job_chunks]

        # --- Store in Endee ---
        vector_service.insert(resume_chunks, resume_embeddings, resume_metadata)
        vector_service.insert(job_chunks, job_embeddings, job_metadata)

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error in /load-data: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load data: {str(exc)}",
        ) from exc

    logger.info(
        "Loaded %d resume chunks and %d job chunks.",
        len(resume_chunks), len(job_chunks),
    )
    return LoadDataResponse(
        status="success",
        resume_chunks=len(resume_chunks),
        job_chunks=len(job_chunks),
        message=(
            f"Stored {len(resume_chunks)} resume chunk(s) and "
            f"{len(job_chunks)} job description chunk(s) in Endee."
        ),
    )


# ── Analyze ───────────────────────────────────────────────────────────────────

@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    summary="Answer a question about resume fit",
    tags=["Analysis"],
)
def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    """
    Retrieve semantically relevant chunks from Endee and pass them through
    the RAG pipeline to answer the user's question.

    Typical questions:
    - "Am I a good fit for this role?"
    - "What skills am I missing?"
    - "How can I improve my resume?"
    """
    logger.info("POST /analyze — question: %s", payload.question)

    try:
        result = run_rag(payload.question)
    except Exception as exc:
        logger.exception("Error in /analyze: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(exc)}",
        ) from exc

    return AnalyzeResponse(
        question=payload.question,
        answer=result["answer"],
        retrieved_chunks=result["retrieved_chunks"],
    )