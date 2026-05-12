"""
models/ats_models.py — Pydantic request/response models for ATS scoring endpoints.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


# ── ATS Request Models ────────────────────────────────────────────────────────

class ATSScoreRequest(BaseModel):
    """Payload for POST /api/ats-score."""

    resume_text: str = Field(
        ...,
        min_length=20,
        description="Full text of the candidate's resume.",
    )
    job_description: str = Field(
        ...,
        min_length=20,
        description="Full text of the target job description.",
    )


# ── ATS Response Models ───────────────────────────────────────────────────────

class KeywordAnalysis(BaseModel):
    """Keyword matching breakdown."""
    matched_keywords: List[str] = []
    missing_keywords: List[str] = []
    match_percentage: float = 0.0


class ATSScoreResponse(BaseModel):
    """Full ATS scoring response."""

    ats_score: float = Field(..., description="Composite ATS score 0–100")
    semantic_similarity: float = Field(..., description="Semantic similarity score 0–100")
    keyword_match: float = Field(..., description="Keyword match percentage 0–100")
    skill_coverage: float = Field(..., description="Skill coverage percentage 0–100")
    action_verb_strength: float = Field(..., description="Action verb quality score 0–100")
    quantified_achievement_score: float = Field(..., description="Quantified achievements score 0–100")
    matched_keywords: List[str] = Field(default_factory=list)
    missing_keywords: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)


# ── Upload Response Models ────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    """Response after uploading a resume/JD file."""
    status: str
    filename: str
    extracted_text: str
    word_count: int
    message: str


# ── RAG Request/Response Models ───────────────────────────────────────────────

class LoadDataRequest(BaseModel):
    """Payload for POST /api/load-data."""
    resume: str = Field(..., min_length=20)
    job_description: str = Field(..., min_length=20)


class LoadDataResponse(BaseModel):
    """Response after embedding and storing data."""
    status: str
    resume_chunks: int
    job_chunks: int
    message: str


class AnalyzeRequest(BaseModel):
    """Payload for POST /api/analyze."""
    question: str = Field(..., min_length=5)


class AnalyzeResponse(BaseModel):
    """Response after RAG analysis."""
    question: str
    answer: str
    retrieved_chunks: int
