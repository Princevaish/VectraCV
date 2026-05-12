"""
services/scoring_service.py — Computes the final weighted ATS score.

Formula:
    ATS_SCORE = 0.35 × semantic_similarity
              + 0.25 × keyword_match
              + 0.15 × skill_coverage
              + 0.15 × quantified_achievement
              + 0.10 × action_verb_strength

All inputs are 0–100. Output is clamped to 0–100.
"""

from utils.constants import ATS_WEIGHTS
from core.logger import get_logger

logger = get_logger(__name__)


def compute_ats_score(
    semantic_similarity: float,
    keyword_match: float,
    skill_coverage: float,
    quantified_achievement: float,
    action_verb_strength: float,
) -> float:
    """
    Compute the composite ATS score using the weighted formula.

    All inputs should be in range 0–100.

    Returns:
        Final ATS score, clamped to [0, 100], rounded to 1 decimal place.
    """
    raw_score = (
        ATS_WEIGHTS["semantic_similarity"]  * semantic_similarity
        + ATS_WEIGHTS["keyword_match"]        * keyword_match
        + ATS_WEIGHTS["skill_coverage"]       * skill_coverage
        + ATS_WEIGHTS["quantified_achievement"] * quantified_achievement
        + ATS_WEIGHTS["action_verb_strength"] * action_verb_strength
    )

    final_score = round(max(0.0, min(100.0, raw_score)), 1)

    logger.info(
        "ATS Score: %.1f  (sem=%.1f, kw=%.1f, skill=%.1f, quant=%.1f, verb=%.1f)",
        final_score,
        semantic_similarity,
        keyword_match,
        skill_coverage,
        quantified_achievement,
        action_verb_strength,
    )

    return final_score
