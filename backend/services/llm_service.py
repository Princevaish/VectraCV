"""
services/llm_service.py — Sends prompts to the Groq LLM API
(OpenAI-compatible endpoint) and returns the generated text.

Environment variables consumed:
  GROQ_API_KEY  — Groq secret key
  MODEL_NAME    — e.g. llama3-70b-8192
"""

import httpx
from backend.config import settings
from backend.core.logger import get_logger

logger = get_logger(__name__)

# Groq uses an OpenAI-compatible REST API.
GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions"


def generate_response(prompt: str) -> str:
    """
    Send *prompt* to the configured LLM and return the generated text.

    Falls back to a structured mock response if the API is unreachable or
    the key is missing — so the rest of the pipeline always gets a string.

    Args:
        prompt: The fully-assembled RAG prompt to send to the model.

    Returns:
        The model's text response as a plain string.
    """
    if not settings.GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set — returning mock response.")
        return _mock_response(prompt)

    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": settings.MODEL_NAME,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an expert AI career coach. "
                    "Provide structured, actionable, and honest feedback."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 1024,
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(GROQ_BASE_URL, headers=headers, json=payload)
            response.raise_for_status()

        data = response.json()
        text: str = data["choices"][0]["message"]["content"]
        logger.info("LLM response received (%d chars).", len(text))
        return text

    except httpx.HTTPStatusError as exc:
        logger.error(
            "Groq API HTTP error %s: %s",
            exc.response.status_code,
            exc.response.text,
        )
        return _mock_response(prompt, error=str(exc))

    except httpx.RequestError as exc:
        logger.error("Groq API request error: %s", exc)
        return _mock_response(prompt, error=str(exc))

    except Exception as exc:  # noqa: BLE001
        logger.exception("Unexpected error calling LLM: %s", exc)
        return _mock_response(prompt, error=str(exc))


# ── Fallback ──────────────────────────────────────────────────────────────────

def _mock_response(prompt: str, error: str = "") -> str:
    """Return a clearly-labelled mock analysis when the real API is unavailable."""
    note = f"\n\n⚠️  Mock response (API error: {error})" if error else "\n\n⚠️  Mock response (API key not set)"
    return (
        "## AI Resume Analysis (Mock)\n\n"
        "**1. Match Analysis**\n"
        "Based on the provided resume and job description, the candidate shows "
        "partial alignment with the role requirements. Core technical skills overlap "
        "in several areas, but gaps exist in specific technologies mentioned in the JD.\n\n"
        "**2. Missing Skills**\n"
        "- Cloud infrastructure experience (AWS / GCP / Azure) not clearly demonstrated.\n"
        "- Containerisation tools (Docker, Kubernetes) not mentioned in resume.\n"
        "- Leadership or mentoring experience not evidenced.\n\n"
        "**3. Improvement Suggestions**\n"
        "- Add quantified achievements (e.g., 'reduced latency by 40%').\n"
        "- Include certifications relevant to the target role.\n"
        "- Tailor the summary section to mirror keywords from the job description.\n"
        "- List open-source contributions or personal projects to fill skill gaps.\n\n"
        "**4. Final Verdict**\n"
        "Moderate fit. With targeted upskilling and resume refinement the candidate "
        "could become a strong applicant within 2–3 months."
        + note
    )