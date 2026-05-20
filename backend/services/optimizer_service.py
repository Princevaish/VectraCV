"""
services/optimizer_service.py — AI Resume Optimization pipeline.
"""
from typing import Dict, Any
from services.llm_service import generate_response
from core.logger import get_logger

logger = get_logger(__name__)

OPTIMIZE_PROMPT_TEMPLATE = """You are an expert AI Resume Writer and Career Coach powered by VectraAI Pro.

Your task is to optimize the provided resume against the given job description.

Target Role: {target_role}
Tone: {tone}
Focus Area: {focus_area}

--- RESUME ---
{resume}

--- JOB DESCRIPTION ---
{jd}

Instructions:
1. Rewrite the professional summary to be compelling and aligned with the job description.
2. Rewrite the experience bullet points using stronger action verbs and quantified achievements where possible, without inventing facts.
3. Optimize the skills section to include matching keywords from the job description.
4. Ensure the tone is '{tone}' and focus on '{focus_area}'.
5. Return the full optimized resume in Markdown format. Use clear headings (e.g., # Professional Summary, # Experience, # Skills). Do NOT add extra chat dialogue or explanations, just output the resume content.
"""

def optimize_resume(resume_text: str, jd_text: str, target_role: str, tone: str, focus_area: str) -> Dict[str, Any]:
    logger.info("Optimizer pipeline started. Target role: %s, Tone: %s, Focus: %s", target_role, tone, focus_area)
    
    prompt = OPTIMIZE_PROMPT_TEMPLATE.format(
        resume=resume_text,
        jd=jd_text,
        target_role=target_role or "The provided job description",
        tone=tone,
        focus_area=focus_area
    )
    
    answer = generate_response(prompt)
    
    logger.info("Optimizer pipeline complete.")
    return {
        "optimized_resume": answer
    }
