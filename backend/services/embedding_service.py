"""
services/embedding_service.py — Wraps SentenceTransformer to produce
fixed-size dense embeddings for arbitrary text.
"""

from typing import List
from sentence_transformers import SentenceTransformer
from backend.config import settings
from backend.core.logger import get_logger

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