"""
api/routes/rag.py — RAG (Retrieval-Augmented Generation) API endpoints.

Endpoints:
  POST /api/load-data  — Ingest resume + job description into ChromaDB.
  POST /api/analyze    — Answer a natural-language question via RAG.
  GET  /api/health     — Simple liveness probe.
  GET  /api/stats      — Vector store stats.
"""

from fastapi import APIRouter, HTTPException, status

from models.ats_models import (
    AnalyzeRequest,
    AnalyzeResponse,
    LoadDataRequest,
    LoadDataResponse,
)
from services.embedding_service import embed_texts
from services.vector_service import vector_service
from services.rag_service import run_rag
from utils.text_splitter import split_text
from core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(tags=["RAG"])


@router.get("/health", summary="Service health check")
def health_check() -> dict:
    """Liveness probe — returns 200 when the service is up."""
    return {"status": "ok", "service": "VectraAI Pro"}


@router.get("/stats", summary="Vector store statistics")
def vector_stats() -> dict:
    """Return document counts for each ChromaDB collection."""
    return {
        "status": "ok",
        "collections": vector_service.get_collection_stats(),
    }


@router.post(
    "/load-data",
    response_model=LoadDataResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest resume and job description into ChromaDB",
)
def load_data(payload: LoadDataRequest) -> LoadDataResponse:
    """
    Split the resume and job description into chunks, generate embeddings,
    and store everything in ChromaDB with appropriate metadata tags.

    - ``type: resume`` for resume chunks (stored in 'resumes' collection)
    - ``type: job``    for JD chunks (stored in 'job_descriptions' collection)
    """
    logger.info("POST /api/load-data — ingesting resume + job description.")

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

        # --- Store in ChromaDB ---
        vector_service.insert(resume_chunks, resume_embeddings, resume_metadata)
        vector_service.insert(job_chunks, job_embeddings, job_metadata)

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error in /api/load-data: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load data: {str(exc)}",
        ) from exc

    logger.info(
        "Loaded %d resume chunks and %d job chunks into ChromaDB.",
        len(resume_chunks), len(job_chunks),
    )
    return LoadDataResponse(
        status="success",
        resume_chunks=len(resume_chunks),
        job_chunks=len(job_chunks),
        message=(
            f"Stored {len(resume_chunks)} resume chunk(s) and "
            f"{len(job_chunks)} job description chunk(s) in ChromaDB."
        ),
    )


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    summary="Answer a question about resume fit via RAG",
)
def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    """
    Retrieve semantically relevant chunks from ChromaDB and pass them through
    the RAG pipeline to answer the user's question.

    Typical questions:
    - "Am I a good fit for this role?"
    - "What skills am I missing?"
    - "How can I improve my resume?"
    """
    logger.info("POST /api/analyze — question: %s", payload.question)

    try:
        result = run_rag(payload.question)
    except Exception as exc:
        logger.exception("Error in /api/analyze: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(exc)}",
        ) from exc

    return AnalyzeResponse(
        question=payload.question,
        answer=result["answer"],
        retrieved_chunks=result["retrieved_chunks"],
    )
