"""
main.py — Application entry point.

Boots the FastAPI app, registers the lifespan hook to initialise Endee,
mounts the API router, and configures CORS + global exception handling.

Run with:
    uvicorn backend.main:app --reload
"""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api.routes import router
from backend.services.vector_service import vector_service
from backend.core.logger import get_logger

logger = get_logger(__name__)


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Initialise heavy resources on startup and clean up on shutdown."""
    logger.info("=== AI Resume Analyser starting up ===")
    vector_service.initialize()
    logger.info("=== Startup complete ===")
    yield
    logger.info("=== Shutting down ===")


# ── App factory ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="AI Resume Analyser",
    description=(
        "Accepts a resume and job description, stores them in Endee vector DB, "
        "and answers natural-language questions via RAG + Groq LLM."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ── Middleware ────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handler ──────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected internal error occurred."},
    )


# ── Router ────────────────────────────────────────────────────────────────────

app.include_router(router, prefix="")


# ── Dev entry-point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)