"""
config.py — Loads environment variables from .env and exposes typed settings.
"""

from dotenv import load_dotenv
import os

# Load .env file at import time
load_dotenv()


class Settings:
    """Central configuration object for the application."""

    # LLM
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "llama3.3-70b-8192")

    # Embeddings
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

    # Endee vector database — collection name used across the app
    ENDEE_COLLECTION: str = "resume_analyzer"

    # Retrieval
    TOP_K: int = 5

    def validate(self) -> None:
        """Raise an error if required secrets are missing."""
        if not self.GROQ_API_KEY:
            raise EnvironmentError(
                "GROQ_API_KEY is not set. "
                "Add it to your .env file or environment."
            )


settings = Settings()