"""
services/parser_service.py — Parses structured resume data (sections, bullets).
Wraps resume_parser utility with section detection logic.
"""

from typing import Dict, List
import re
from utils.resume_parser import parse_file
from utils.text_cleaner import clean_text, extract_bullet_points
from core.logger import get_logger

logger = get_logger(__name__)

SECTION_HEADERS = [
    r'experience|work history|employment',
    r'education|academic|qualification',
    r'skills|technical skills|competencies|expertise',
    r'projects|portfolio|work samples',
    r'certifications?|licenses?|credentials',
    r'summary|objective|profile|about',
    r'awards?|achievements?|honors?',
    r'publications?|research',
]


def parse_resume_file(filename: str, file_bytes: bytes) -> Dict:
    """
    Parse a resume file and extract structured data.

    Returns:
        Dict with keys: raw_text, sections, bullet_points, word_count
    """
    raw_text = parse_file(filename, file_bytes)
    cleaned = clean_text(raw_text)
    bullets = extract_bullet_points(cleaned)
    sections = _detect_sections(cleaned)

    return {
        "raw_text": cleaned,
        "sections": sections,
        "bullet_points": bullets,
        "word_count": len(cleaned.split()),
    }


def _detect_sections(text: str) -> Dict[str, str]:
    """
    Detect standard resume sections by scanning for header keywords.

    Returns:
        Dict mapping section name to section content.
    """
    sections: Dict[str, str] = {}
    lines = text.split('\n')
    current_section = "header"
    current_content: List[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            current_content.append('')
            continue

        # Check if this line is a section header
        is_header = False
        for pattern in SECTION_HEADERS:
            if re.search(pattern, stripped.lower()) and len(stripped) < 60:
                # Save previous section
                if current_content:
                    sections[current_section] = '\n'.join(current_content).strip()
                current_section = re.sub(r'[^a-z]', '_', stripped.lower())[:30]
                current_content = []
                is_header = True
                break

        if not is_header:
            current_content.append(stripped)

    # Save last section
    if current_content:
        sections[current_section] = '\n'.join(current_content).strip()

    return sections
