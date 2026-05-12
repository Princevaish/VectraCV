"""
services/metrics_service.py — Action verb and quantified achievement scoring.
"""

import re
from typing import Tuple
from utils.constants import STRONG_ACTION_VERBS, WEAK_ACTION_VERBS, QUANTIFICATION_PATTERNS
from utils.text_cleaner import extract_sentences
from core.logger import get_logger

logger = get_logger(__name__)


def score_action_verbs(resume_text: str) -> float:
    """
    Score the strength of action verbs used in the resume.

    Algorithm:
      1. Extract all sentences/bullets.
      2. Detect strong vs weak action verbs at the start of each line.
      3. Score = strong_ratio × 100, penalised for weak verb presence.

    Returns:
        Action verb strength score 0–100.
    """
    sentences = extract_sentences(resume_text)
    if not sentences:
        return 50.0

    strong_count = 0
    weak_count = 0

    for sentence in sentences:
        # Get first word of each line (action verb position)
        first_word = sentence.strip().split()[0].lower().rstrip('.,;:') if sentence.strip() else ""

        if first_word in STRONG_ACTION_VERBS:
            strong_count += 1
        elif first_word in WEAK_ACTION_VERBS:
            weak_count += 1

        # Also scan for weak phrases mid-sentence
        lower = sentence.lower()
        if re.search(r'\b(responsible for|worked on|helped with|assisted in)\b', lower):
            weak_count += 1

    total_scored = strong_count + weak_count
    if total_scored == 0:
        # No identifiable verbs — give a neutral score
        return 55.0

    ratio = strong_count / total_scored
    # Apply slight bonus for many strong verbs (volume matters)
    volume_bonus = min(10.0, strong_count * 0.5)
    score = (ratio * 90.0) + volume_bonus

    logger.info(
        "Action verbs — strong: %d, weak: %d → score: %.1f",
        strong_count, weak_count, score,
    )
    return round(min(score, 100.0), 2)


def score_quantified_achievements(resume_text: str) -> float:
    """
    Score how well the resume quantifies achievements with metrics.

    Looks for:
    - Percentages (40%, 3x)
    - Dollar amounts ($1.2M)
    - User/customer counts
    - Improvement statements with numbers
    - Latency/throughput metrics

    Returns:
        Quantification score 0–100.
    """
    sentences = extract_sentences(resume_text)
    if not sentences:
        return 30.0

    quantified_sentences = 0
    total_matches = 0

    for sentence in sentences:
        for pattern in QUANTIFICATION_PATTERNS:
            if pattern.search(sentence):
                quantified_sentences += 1
                total_matches += len(pattern.findall(sentence))
                break  # count sentence once even if multiple patterns match

    if not sentences:
        return 30.0

    # Base score from ratio of quantified sentences
    ratio = quantified_sentences / len(sentences)
    base_score = ratio * 70.0  # max 70 from ratio

    # Bonus for total quantity of metrics found
    metric_bonus = min(30.0, total_matches * 4.0)
    score = base_score + metric_bonus

    logger.info(
        "Quantification — %d/%d sentences quantified, %d total metrics → score: %.1f",
        quantified_sentences, len(sentences), total_matches, score,
    )
    return round(min(score, 100.0), 2)
