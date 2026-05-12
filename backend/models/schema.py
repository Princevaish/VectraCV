"""
models/schema.py — Legacy schema aliases (kept for RAG route backward-compat).
All new code should import from models.ats_models.
"""

from models.ats_models import (  # noqa: F401
    LoadDataRequest,
    LoadDataResponse,
    AnalyzeRequest,
    AnalyzeResponse,
)