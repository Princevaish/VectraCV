"""
services/similarity_service.py — Semantic similarity scoring using SentenceTransformers.

Computes cosine similarity between full resume and job description embeddings
and normalises the result to a 0–100 score.
"""

from services.embedding_service import embed_text, compute_cosine_similarity
from core.logger import get_logger

logger = get_logger(__name__)


def compute_semantic_similarity(resume_text: str, jd_text: str) -> float:
    """
    Compute semantic similarity between a resume and job description.

    Uses SentenceTransformer (all-MiniLM-L6-v2) embeddings and
    cosine similarity, then normalises to 0–100.

    Args:
        resume_text: Full resume text.
        jd_text:     Full job description text.

    Returns:
        Semantic similarity score in range 0–100.
    """
    logger.debug("Computing semantic similarity …")

    resume_vec = embed_text(resume_text[:4096])  # truncate to safe length
    jd_vec = embed_text(jd_text[:4096])

    # Cosine returns [-1, 1]; clamp to [0, 1] then scale to [0, 100]
    raw_score = compute_cosine_similarity(resume_vec, jd_vec)
    score = max(0.0, min(1.0, raw_score)) * 100.0

    logger.info("Semantic similarity: %.2f", score)
    return round(score, 2)
