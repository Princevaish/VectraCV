"""
utils/text_cleaner.py — Normalises raw text before analysis.
"""

import re
from typing import List


def clean_text(text: str) -> str:
    """
    Remove noise from raw resume/JD text while preserving structure.
    - Collapse excess whitespace
    - Remove non-printable characters
    - Normalise dashes and bullets
    """
    if not text:
        return ""
    # Normalise unicode dashes, bullets
    text = text.replace("\u2022", "-").replace("\u2013", "-").replace("\u2014", "-")
    # Remove non-printable chars (keep newlines)
    text = re.sub(r'[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]', ' ', text)
    # Collapse multiple spaces on same line
    text = re.sub(r'[ \t]+', ' ', text)
    # Collapse 3+ blank lines into 2
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def normalize_for_comparison(text: str) -> str:
    """Lowercase, remove punctuation, collapse whitespace — for keyword matching."""
    text = text.lower()
    text = re.sub(r'[^\w\s+#]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def extract_sentences(text: str) -> List[str]:
    """Split text into sentences for action-verb analysis."""
    text = clean_text(text)
    # Split on sentence-ending punctuation or newlines
    sentences = re.split(r'(?<=[.!?])\s+|\n', text)
    return [s.strip() for s in sentences if s.strip() and len(s.strip()) > 5]


def extract_bullet_points(text: str) -> List[str]:
    """Extract bullet-point lines from resume text."""
    lines = text.split('\n')
    bullets = []
    for line in lines:
        line = line.strip()
        # Detect bullet indicators
        if re.match(r'^[-•●▪◦*·]\s+', line) or re.match(r'^\d+[.)]\s+', line):
            cleaned = re.sub(r'^[-•●▪◦*·\d.)]+\s*', '', line).strip()
            if cleaned:
                bullets.append(cleaned)
        elif len(line) > 10 and not line.endswith(':'):
            # Non-header lines also likely bullet content
            bullets.append(line)
    return bullets
