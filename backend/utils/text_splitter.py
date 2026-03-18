"""
utils/text_splitter.py — Splits long text into overlapping word-level chunks.

Each chunk is 200-300 words with a small overlap so context is preserved
across boundaries.
"""

from typing import List
from backend.core.logger import get_logger

logger = get_logger(__name__)


def split_text(
    text: str,
    chunk_size: int = 250,
    overlap: int = 30,
) -> List[str]:
    """
    Split *text* into word-level chunks of approximately *chunk_size* words
    with *overlap* words carried over between consecutive chunks.

    Args:
        text:       The raw input string to split.
        chunk_size: Target number of words per chunk (default 250).
        overlap:    Number of words shared between adjacent chunks (default 30).

    Returns:
        A list of text chunks; empty list if text is blank.
    """
    if not text or not text.strip():
        logger.warning("split_text received empty input — returning []")
        return []

    words: List[str] = text.split()
    total_words = len(words)
    chunks: List[str] = []
    start = 0

    while start < total_words:
        end = min(start + chunk_size, total_words)
        chunk = " ".join(words[start:end])
        chunks.append(chunk)

        if end == total_words:
            break

        start += chunk_size - overlap  # slide forward with overlap

    logger.debug(
        "split_text: %d words → %d chunks (size=%d, overlap=%d)",
        total_words, len(chunks), chunk_size, overlap,
    )
    return chunks