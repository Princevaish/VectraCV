"""
services/ats_service.py — Orchestrates the full ATS scoring pipeline.

Calls:
  1. similarity_service  → semantic similarity score
  2. keyword_service     → keyword match + matched/missing lists
  3. skill_extractor     → skill coverage score
  4. metrics_service     → action verb strength + quantified achievement
  5. scoring_service     → compute weighted final ATS score
  6. Generate recommendations based on weak areas
"""

from typing import Dict, Any, List
from services.similarity_service import compute_semantic_similarity
from services.keyword_service import analyze_keywords
from services.metrics_service import score_action_verbs, score_quantified_achievements
from services.scoring_service import compute_ats_score
from utils.skill_extractor import extract_skills, extract_skills_from_jd, compute_skill_coverage
from utils.text_cleaner import clean_text
from utils.constants import RECOMMENDATION_TEMPLATES
from core.logger import get_logger

logger = get_logger(__name__)


def run_ats_analysis(resume_text: str, jd_text: str) -> Dict[str, Any]:
    """
    Execute the complete ATS scoring pipeline.

    Args:
        resume_text: Full resume text (plain text).
        jd_text:     Full job description text (plain text).

    Returns:
        Dict matching ATSScoreResponse schema.
    """
    logger.info("=== ATS Analysis started ===")

    # Clean inputs
    resume_clean = clean_text(resume_text)
    jd_clean = clean_text(jd_text)

    # ── 1. Semantic Similarity ────────────────────────────────────────────────
    semantic_similarity = compute_semantic_similarity(resume_clean, jd_clean)

    # ── 2. Keyword Match ──────────────────────────────────────────────────────
    keyword_match_pct, matched_keywords, missing_keywords = analyze_keywords(
        resume_clean, jd_clean
    )

    # ── 3. Skill Coverage ─────────────────────────────────────────────────────
    resume_skills = extract_skills(resume_clean)
    jd_skills = extract_skills_from_jd(jd_clean)
    skill_coverage, missing_skills = compute_skill_coverage(resume_skills, jd_skills)

    # ── 4. Action Verb Strength ───────────────────────────────────────────────
    action_verb_strength = score_action_verbs(resume_clean)

    # ── 5. Quantified Achievements ────────────────────────────────────────────
    quantified_achievement = score_quantified_achievements(resume_clean)

    # ── 6. Composite ATS Score ────────────────────────────────────────────────
    ats_score = compute_ats_score(
        semantic_similarity=semantic_similarity,
        keyword_match=keyword_match_pct,
        skill_coverage=skill_coverage,
        quantified_achievement=quantified_achievement,
        action_verb_strength=action_verb_strength,
    )

    # ── 7. Generate Recommendations ───────────────────────────────────────────
    recommendations = _generate_recommendations(
        ats_score=ats_score,
        semantic_similarity=semantic_similarity,
        keyword_match_pct=keyword_match_pct,
        missing_keywords=missing_keywords,
        skill_coverage=skill_coverage,
        missing_skills=missing_skills,
        quantified_achievement=quantified_achievement,
        action_verb_strength=action_verb_strength,
        resume_skills=resume_skills,
    )

    result = {
        "ats_score": ats_score,
        "semantic_similarity": semantic_similarity,
        "keyword_match": keyword_match_pct,
        "skill_coverage": skill_coverage,
        "action_verb_strength": action_verb_strength,
        "quantified_achievement_score": quantified_achievement,
        "matched_keywords": matched_keywords[:30],  # cap for API response size
        "missing_keywords": list(missing_keywords)[:20],
        "recommendations": recommendations,
    }

    logger.info("=== ATS Analysis complete — Score: %.1f ===", ats_score)
    return result


def _generate_recommendations(
    ats_score: float,
    semantic_similarity: float,
    keyword_match_pct: float,
    missing_keywords: List[str],
    skill_coverage: float,
    missing_skills,
    quantified_achievement: float,
    action_verb_strength: float,
    resume_skills,
) -> List[str]:
    """Generate prioritized, actionable recommendations based on weak scores."""
    recommendations: List[str] = []

    # Semantic similarity — most important signal
    if semantic_similarity < 60:
        recommendations.append(RECOMMENDATION_TEMPLATES["low_semantic"])
    elif semantic_similarity < 75:
        recommendations.append(
            "Align your resume's language more closely with the job description. "
            "Use the same terminology for roles, responsibilities and technologies."
        )

    # Keyword match
    if keyword_match_pct < 50 and missing_keywords:
        top_missing = ", ".join(list(missing_keywords)[:8])
        recommendations.append(
            RECOMMENDATION_TEMPLATES["low_keyword"].format(missing=top_missing)
        )
    elif keyword_match_pct < 70 and missing_keywords:
        top_missing = ", ".join(list(missing_keywords)[:5])
        recommendations.append(f"Consider adding these keywords: {top_missing}.")

    # Skill coverage
    if skill_coverage < 50 and missing_skills:
        top_missing = ", ".join(sorted(missing_skills)[:6])
        recommendations.append(
            RECOMMENDATION_TEMPLATES["low_skill_coverage"].format(missing_skills=top_missing)
        )

    # Quantified achievements
    if quantified_achievement < 40:
        recommendations.append(RECOMMENDATION_TEMPLATES["low_quantified"])
    elif quantified_achievement < 65:
        recommendations.append(
            "Strengthen your impact statements — add specific numbers, "
            "percentages, or scale indicators to at least 60% of your bullet points."
        )

    # Action verbs
    if action_verb_strength < 55:
        recommendations.append(RECOMMENDATION_TEMPLATES["weak_verbs"])

    # Cloud — universal recommendation if missing
    cloud_skills = {"aws", "azure", "gcp", "google cloud"}
    if not (resume_skills & cloud_skills):
        recommendations.append(RECOMMENDATION_TEMPLATES["no_cloud"])

    # Docker
    if "docker" not in resume_skills and "kubernetes" not in resume_skills:
        recommendations.append(RECOMMENDATION_TEMPLATES["no_docker"])

    # If score is already excellent
    if ats_score >= 85 and not recommendations:
        recommendations.append(RECOMMENDATION_TEMPLATES["excellent"])

    # Cap at 6 recommendations to avoid overwhelming the user
    return recommendations[:6]
