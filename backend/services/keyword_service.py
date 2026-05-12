"""
services/keyword_service.py — Keyword matching between resume and job description.

Extracts tech keywords from both documents and computes:
  - match percentage
  - matched keywords list
  - missing keywords list
"""

import re
from typing import Dict, List, Set, Tuple
from utils.constants import TECH_SKILLS
from utils.text_cleaner import normalize_for_comparison
from core.logger import get_logger

logger = get_logger(__name__)


def _extract_keywords(text: str) -> Set[str]:
    """
    Extract all recognized tech keywords and phrases from normalized text.

    Multi-word skills (e.g. 'github actions') are matched as phrases.
    """
    normalized = normalize_for_comparison(text)
    found: Set[str] = set()

    for skill in TECH_SKILLS:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, normalized):
            found.add(skill)

    return found


def analyze_keywords(
    resume_text: str,
    jd_text: str,
) -> Tuple[float, List[str], List[str]]:
    """
    Compare keywords present in resume vs those required by job description.

    Args:
        resume_text: Full resume text.
        jd_text:     Full job description text.

    Returns:
        Tuple of:
          - match_pct (float 0–100)
          - matched_keywords (List[str])
          - missing_keywords (List[str])
    """
    resume_keywords = _extract_keywords(resume_text)
    jd_keywords = _extract_keywords(jd_text)

    if not jd_keywords:
        logger.warning("No recognizable keywords found in JD — returning 50% match")
        return 50.0, list(resume_keywords), []

    matched = resume_keywords & jd_keywords
    missing = jd_keywords - resume_keywords

    match_pct = (len(matched) / len(jd_keywords)) * 100.0

    logger.info(
        "Keyword match: %d/%d (%.1f%%) — missing: %d",
        len(matched), len(jd_keywords), match_pct, len(missing),
    )

    return (
        round(match_pct, 2),
        sorted(matched),
        sorted(missing),
    )
