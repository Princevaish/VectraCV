"""
models/schema.py — Pydantic request / response models for all API endpoints.
"""

from pydantic import BaseModel, Field


# ── Request Models ─────────────────────────────────────────────────────────────

class LoadDataRequest(BaseModel):
    """Payload for POST /load-data."""

    resume: str = Field(
        ...,
        min_length=20,
        description="Full text of the candidate's resume.",
        examples=["John Doe | Software Engineer | Python, FastAPI, AWS …"],
    )
    job_description: str = Field(
        ...,
        min_length=20,
        description="Full text of the target job description.",
        examples=["We are looking for a Python backend engineer with …"],
    )


class AnalyzeRequest(BaseModel):
    """Payload for POST /analyze."""

    question: str = Field(
        ...,
        min_length=5,
        description="Natural-language question to answer using the loaded data.",
        examples=[
            "Am I a good fit for this role?",
            "What skills am I missing?",
            "How can I improve my resume?",
        ],
    )


# ── Response Models ────────────────────────────────────────────────────────────

class LoadDataResponse(BaseModel):
    """Response returned after embedding and storing data."""

    status: str
    resume_chunks: int
    job_chunks: int
    message: str


class AnalyzeResponse(BaseModel):
    """Response returned after RAG analysis."""

    question: str
    answer: str
    retrieved_chunks: int