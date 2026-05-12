"""
main.py — VectraAI Pro application entry point.

Boots the FastAPI app, registers the lifespan hook to initialise ChromaDB,
mounts the API router, and configures CORS + global exception handling.

Run with:
    cd backend
    uvicorn main:app --reload
"""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.routes import router
from services.vector_service import vector_service
from core.logger import get_logger

logger = get_logger(__name__)


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Initialise heavy resources on startup and clean up on shutdown."""
    logger.info("=== VectraAI Pro starting up ===")
    vector_service.initialize()
    logger.info("=== Startup complete ===")
    yield
    logger.info("=== Shutting down ===")


# ── App factory ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="VectraAI Pro",
    description=(
        "Production-grade AI Resume Intelligence Platform. "
        "ATS scoring engine powered by ChromaDB + SentenceTransformers + Groq LLM."
    ),
    version="2.0.0",
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

app.include_router(router)

# Legacy compatibility — mount old /load-data and /analyze at root too
from api.routes.rag import router as rag_router  # noqa: E402
app.include_router(rag_router)


# ── Dev entry-point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)