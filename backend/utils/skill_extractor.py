"""
utils/skill_extractor.py — Extracts technical and soft skills from text.
"""

import re
from typing import Set
from utils.constants import TECH_SKILLS
from utils.text_cleaner import normalize_for_comparison


def extract_skills(text: str) -> Set[str]:
    """
    Extract recognized skills from a block of text.
    Uses a multi-word aware scan so 'machine learning' matches correctly.

    Returns:
        Set of lowercase skill strings found in the text.
    """
    normalized = normalize_for_comparison(text)
    found: Set[str] = set()

    for skill in TECH_SKILLS:
        # Build a word-boundary-aware pattern for the skill phrase
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, normalized):
            found.add(skill)

    return found


def extract_skills_from_jd(jd_text: str) -> Set[str]:
    """
    Extract skills required/preferred by the job description.
    Focused scan — same as extract_skills but semantically labelled.
    """
    return extract_skills(jd_text)


def compute_skill_coverage(resume_skills: Set[str], jd_skills: Set[str]) -> tuple[float, Set[str]]:
    """
    Compute what fraction of JD-required skills appear in the resume.

    Returns:
        (coverage_pct: float 0-100, missing_skills: Set[str])
    """
    if not jd_skills:
        return 100.0, set()

    matched = resume_skills & jd_skills
    missing = jd_skills - resume_skills
    coverage = (len(matched) / len(jd_skills)) * 100.0
    return round(coverage, 2), missing
