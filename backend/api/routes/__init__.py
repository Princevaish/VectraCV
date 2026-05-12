"""
api/routes/__init__.py — Aggregates all sub-routers into one master router.
"""

from fastapi import APIRouter
from api.routes.ats import router as ats_router
from api.routes.rag import router as rag_router
from api.routes.upload import router as upload_router

router = APIRouter(prefix="/api")

router.include_router(ats_router)
router.include_router(rag_router)
router.include_router(upload_router)
