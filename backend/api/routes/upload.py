"""
api/routes/upload.py — File upload endpoints for PDF and DOCX resume/JD parsing.

Endpoints:
  POST /api/upload/resume   — Upload and parse a resume file (PDF/DOCX).
  POST /api/upload/jd       — Upload and parse a job description file (PDF/DOCX).
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, status
from models.ats_models import UploadResponse
from utils.resume_parser import parse_file
from utils.text_cleaner import clean_text
from core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/upload", tags=["File Upload"])

SUPPORTED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


async def _process_upload(file: UploadFile, label: str) -> UploadResponse:
    """Shared upload processing logic."""
    # Validate content type
    if file.content_type and file.content_type not in SUPPORTED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {file.content_type}. Use PDF or DOCX.",
        )

    file_bytes = await file.read()

    # Validate size
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds 10MB limit.",
        )

    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    try:
        raw_text = parse_file(file.filename or f"{label}.pdf", file_bytes)
        cleaned = clean_text(raw_text)
        word_count = len(cleaned.split())
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=str(exc),
        ) from exc
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("File parsing error for %s: %s", file.filename, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse file: {str(exc)}",
        ) from exc

    logger.info("Uploaded %s: %s — %d words", label, file.filename, word_count)

    return UploadResponse(
        status="success",
        filename=file.filename or "unknown",
        extracted_text=cleaned,
        word_count=word_count,
        message=f"Successfully extracted {word_count} words from {file.filename}",
    )


@router.post(
    "/resume",
    response_model=UploadResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload a resume PDF or DOCX",
)
async def upload_resume(file: UploadFile = File(..., description="Resume file (PDF or DOCX)")) -> UploadResponse:
    """
    Upload and extract text from a resume file.
    Returns the extracted text ready to use in ATS scoring.
    """
    return await _process_upload(file, "resume")


@router.post(
    "/jd",
    response_model=UploadResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload a job description PDF or DOCX",
)
async def upload_jd(file: UploadFile = File(..., description="Job description file (PDF or DOCX)")) -> UploadResponse:
    """
    Upload and extract text from a job description file.
    Returns the extracted text ready to use in ATS scoring.
    """
    return await _process_upload(file, "jd")
