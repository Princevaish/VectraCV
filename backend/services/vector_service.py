"""
services/vector_service.py — Endee vector database integration.

Responsibilities:
  * Initialize the Endee collection on startup.
  * Insert embedding vectors with metadata.
  * Perform top-k similarity search and return matching documents.

Endee (https://endee.ai) is a lightweight, embeddable vector database.
Install: pip install endee
"""

from typing import Any, Dict, List
import uuid

# Endee imports — `pip install endee`
try:
    from endee import Client as EndeeClient  # type: ignore
    ENDEE_AVAILABLE = True
except ImportError:  # pragma: no cover
    ENDEE_AVAILABLE = False

from backend.config import settings
from backend.core.logger import get_logger

logger = get_logger(__name__)


class VectorService:
    """
    Thin wrapper around the Endee vector database.

    All insert and search operations are routed through this class so the
    rest of the application remains database-agnostic.
    """

    def __init__(self) -> None:
        self._client: Any = None
        self._collection_name: str = settings.ENDEE_COLLECTION
        self._collection: Any = None

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    def initialize(self) -> None:
        """
        Connect to Endee and ensure the target collection exists.

        Called once during application startup (lifespan hook in main.py).
        """
        if not ENDEE_AVAILABLE:
            logger.warning(
                "Endee package not found — vector operations will use "
                "in-memory fallback. Install with: pip install endee"
            )
            self._init_fallback()
            return

        logger.info("Initialising Endee vector database …")
        self._client = EndeeClient()  # Uses default local storage path

        # Create or retrieve the collection.
        # Endee uses cosine similarity by default; distance="cosine" is explicit.
        self._collection = self._client.get_or_create_collection(
            name=self._collection_name,
            metadata={"distance": "cosine"},
        )
        logger.info(
            "Endee collection '%s' ready. Current count: %d",
            self._collection_name,
            self._collection.count(),
        )

    # ── Write ─────────────────────────────────────────────────────────────────

    def insert(
        self,
        texts: List[str],
        embeddings: List[List[float]],
        metadata: List[Dict[str, Any]],
    ) -> None:
        """
        Insert a batch of embedding vectors into the Endee collection.

        Args:
            texts:      The original text chunks (stored as documents).
            embeddings: Corresponding dense vectors.
            metadata:   Per-chunk metadata dicts (e.g. {"type": "resume"}).
        """
        if not texts:
            return

        ids = [str(uuid.uuid4()) for _ in texts]

        if not ENDEE_AVAILABLE or self._collection is None:
            # Fallback: store in-memory list
            for i, (doc, emb, meta) in enumerate(zip(texts, embeddings, metadata)):
                self._fallback_store.append(
                    {"id": ids[i], "document": doc, "embedding": emb, "metadata": meta}
                )
            logger.debug("Fallback store: inserted %d records.", len(texts))
            return

        self._collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadata,
        )
        logger.info("Endee: inserted %d vectors into '%s'.", len(texts), self._collection_name)

    # ── Read ──────────────────────────────────────────────────────────────────

    def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve the *top_k* most similar documents for *query_embedding*.

        Args:
            query_embedding: Dense query vector.
            top_k:           Number of results to return.

        Returns:
            List of dicts with keys: ``document``, ``metadata``, ``distance``.
        """
        if not ENDEE_AVAILABLE or self._collection is None:
            return self._fallback_search(query_embedding, top_k)

        results = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, self._collection.count() or 1),
            include=["documents", "metadatas", "distances"],
        )

        hits: List[Dict[str, Any]] = []
        if results and results.get("documents"):
            docs = results["documents"][0]
            metas = results["metadatas"][0]
            distances = results["distances"][0]

            for doc, meta, dist in zip(docs, metas, distances):
                hits.append({"document": doc, "metadata": meta, "distance": dist})

        logger.debug("Endee search returned %d hits.", len(hits))
        return hits

    def clear(self) -> None:
        """Remove all vectors from the collection (useful for testing)."""
        if not ENDEE_AVAILABLE or self._collection is None:
            self._fallback_store.clear()
            return
        # Endee: delete all IDs to effectively reset the collection
        all_ids = self._collection.get()["ids"]
        if all_ids:
            self._collection.delete(ids=all_ids)
        logger.info("Endee collection '%s' cleared.", self._collection_name)

    # ── In-memory fallback (when Endee is not installed) ──────────────────────

    def _init_fallback(self) -> None:
        """Initialise a simple list-based in-memory store."""
        self._fallback_store: List[Dict[str, Any]] = []
        logger.info("In-memory vector fallback initialised.")

    def _fallback_search(
        self,
        query_embedding: List[float],
        top_k: int,
    ) -> List[Dict[str, Any]]:
        """Cosine-similarity search over the in-memory fallback store."""
        import math

        def cosine(a: List[float], b: List[float]) -> float:
            dot = sum(x * y for x, y in zip(a, b))
            mag_a = math.sqrt(sum(x * x for x in a))
            mag_b = math.sqrt(sum(x * x for x in b))
            if mag_a == 0 or mag_b == 0:
                return 0.0
            return dot / (mag_a * mag_b)

        scored = [
            {
                "document": item["document"],
                "metadata": item["metadata"],
                "distance": 1 - cosine(query_embedding, item["embedding"]),
            }
            for item in self._fallback_store
        ]
        scored.sort(key=lambda x: x["distance"])
        return scored[:top_k]


# Module-level singleton
vector_service = VectorService()