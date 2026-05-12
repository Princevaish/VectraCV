"""
services/embedding_service.py — Wraps SentenceTransformer to produce
fixed-size dense embeddings for arbitrary text.

Model is lazy-loaded once and cached as a module-level singleton.
"""

from typing import List
from sentence_transformers import SentenceTransformer
from config import settings
from core.logger import get_logger

logger = get_logger(__name__)

# Module-level singleton — loaded once on first import.
_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    """Lazy-load and cache the SentenceTransformer model."""
    global _model
    if _model is None:
        logger.info("Loading SentenceTransformer model: %s", settings.EMBEDDING_MODEL)
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
        logger.info("Embedding model loaded successfully.")
    return _model


def embed_text(text: str) -> List[float]:
    """
    Generate a single embedding vector for *text*.

    Args:
        text: The input string to embed.

    Returns:
        A list of floats representing the embedding vector.
    """
    model = _get_model()
    vector = model.encode(text, convert_to_numpy=True)
    return vector.tolist()


def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Generate embedding vectors for a batch of texts.

    Args:
        texts: List of input strings.

    Returns:
        List of embedding vectors (list of floats per text).
    """
    if not texts:
        return []
    model = _get_model()
    vectors = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    logger.debug("Embedded %d text chunks.", len(texts))
    return [v.tolist() for v in vectors]


def compute_cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """
    Compute cosine similarity between two embedding vectors.

    Returns:
        Float in range [-1, 1]. Clipped to [0, 1] for scoring purposes.
    """
    import math
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    mag_a = math.sqrt(sum(a * a for a in vec_a))
    mag_b = math.sqrt(sum(b * b for b in vec_b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)