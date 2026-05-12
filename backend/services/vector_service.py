"""
services/vector_service.py — ChromaDB persistent vector database integration.

Responsibilities:
  * Initialize ChromaDB persistent client on startup.
  * Manage two collections: 'resumes' and 'job_descriptions'.
  * Insert embedding vectors with metadata.
  * Perform top-k similarity search and return matching documents.
  * Clear collections on demand.

ChromaDB docs: https://docs.trychroma.com/
Install: pip install chromadb
"""

from typing import Any, Dict, List, Optional
import uuid
from pathlib import Path

from config import settings
from core.logger import get_logger

logger = get_logger(__name__)


class VectorService:
    """
    Persistent ChromaDB vector database wrapper.

    Provides two named collections (resumes / job_descriptions) and
    a unified insert + search API used by RAG and ATS pipelines.
    """

    def __init__(self) -> None:
        self._client: Any = None
        self._resume_collection: Any = None
        self._job_collection: Any = None
        self._fallback_store: List[Dict[str, Any]] = []
        self._chroma_available: bool = False

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    def initialize(self) -> None:
        """
        Connect to ChromaDB and ensure target collections exist.
        Called once during application startup (lifespan hook in main.py).
        Falls back to in-memory store if chromadb is not installed.
        """
        try:
            import chromadb
            from chromadb.config import Settings as ChromaSettings

            persist_dir = settings.CHROMA_PERSIST_DIR
            Path(persist_dir).mkdir(parents=True, exist_ok=True)

            logger.info("Initialising ChromaDB at: %s", persist_dir)
            self._client = chromadb.PersistentClient(
                path=persist_dir,
                settings=ChromaSettings(anonymized_telemetry=False),
            )

            self._resume_collection = self._client.get_or_create_collection(
                name=settings.CHROMA_RESUME_COLLECTION,
                metadata={"hnsw:space": "cosine"},
            )
            self._job_collection = self._client.get_or_create_collection(
                name=settings.CHROMA_JOB_COLLECTION,
                metadata={"hnsw:space": "cosine"},
            )

            self._chroma_available = True
            logger.info(
                "ChromaDB ready — resumes: %d docs, job_descriptions: %d docs",
                self._resume_collection.count(),
                self._job_collection.count(),
            )

        except ImportError:
            logger.warning(
                "chromadb package not found — using in-memory fallback. "
                "Install with: pip install chromadb"
            )
            self._chroma_available = False

        except Exception as exc:
            logger.error("ChromaDB init failed: %s — falling back to in-memory", exc)
            self._chroma_available = False

    # ── Private helpers ───────────────────────────────────────────────────────

    def _get_collection(self, collection_type: str) -> Any:
        """Return the correct ChromaDB collection handle."""
        if collection_type == "resume":
            return self._resume_collection
        elif collection_type == "job":
            return self._job_collection
        return None

    # ── Write ─────────────────────────────────────────────────────────────────

    def insert(
        self,
        texts: List[str],
        embeddings: List[List[float]],
        metadata: List[Dict[str, Any]],
    ) -> None:
        """
        Insert a batch of embedding vectors into the appropriate ChromaDB collection.

        Args:
            texts:      The original text chunks (stored as documents).
            embeddings: Corresponding dense vectors.
            metadata:   Per-chunk metadata dicts — must include ``{"type": "resume"|"job"}``.
        """
        if not texts:
            return

        ids = [str(uuid.uuid4()) for _ in texts]

        if not self._chroma_available:
            for i, (doc, emb, meta) in enumerate(zip(texts, embeddings, metadata)):
                self._fallback_store.append(
                    {"id": ids[i], "document": doc, "embedding": emb, "metadata": meta}
                )
            logger.debug("Fallback store: inserted %d records.", len(texts))
            return

        # Determine collection from first metadata entry
        doc_type = metadata[0].get("type", "resume") if metadata else "resume"
        collection = self._get_collection(doc_type)

        if collection is None:
            logger.warning("Unknown collection type '%s' — skipping insert.", doc_type)
            return

        collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadata,
        )
        logger.info(
            "ChromaDB: inserted %d vectors into '%s' collection.",
            len(texts),
            doc_type,
        )

    # ── Read ──────────────────────────────────────────────────────────────────

    def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        collection_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve the *top_k* most similar documents for *query_embedding*.

        Args:
            query_embedding: Dense query vector.
            top_k:           Number of results to return.
            collection_type: "resume", "job", or None (searches both merged).

        Returns:
            List of dicts with keys: ``document``, ``metadata``, ``distance``.
        """
        if not self._chroma_available:
            return self._fallback_search(query_embedding, top_k)

        hits: List[Dict[str, Any]] = []

        collections_to_search = []
        if collection_type == "resume":
            collections_to_search = [self._resume_collection]
        elif collection_type == "job":
            collections_to_search = [self._job_collection]
        else:
            # Search both and merge
            collections_to_search = [self._resume_collection, self._job_collection]

        for collection in collections_to_search:
            if collection is None or collection.count() == 0:
                continue
            try:
                k = min(top_k, collection.count())
                results = collection.query(
                    query_embeddings=[query_embedding],
                    n_results=k,
                    include=["documents", "metadatas", "distances"],
                )
                if results and results.get("documents"):
                    docs = results["documents"][0]
                    metas = results["metadatas"][0]
                    distances = results["distances"][0]
                    for doc, meta, dist in zip(docs, metas, distances):
                        hits.append({"document": doc, "metadata": meta, "distance": dist})
            except Exception as exc:
                logger.error("ChromaDB search error on %s: %s", collection.name, exc)

        # Sort by distance ascending (lower = more similar)
        hits.sort(key=lambda x: x["distance"])
        logger.debug("ChromaDB search returned %d hits.", len(hits))
        return hits[:top_k]

    def clear(self, collection_type: Optional[str] = None) -> None:
        """Remove all vectors from one or both collections."""
        if not self._chroma_available:
            self._fallback_store.clear()
            return

        collections = []
        if collection_type == "resume":
            collections = [self._resume_collection]
        elif collection_type == "job":
            collections = [self._job_collection]
        else:
            collections = [self._resume_collection, self._job_collection]

        for collection in collections:
            if collection is None:
                continue
            try:
                all_ids = collection.get()["ids"]
                if all_ids:
                    collection.delete(ids=all_ids)
                logger.info("ChromaDB collection '%s' cleared.", collection.name)
            except Exception as exc:
                logger.error("ChromaDB clear error: %s", exc)

    def get_collection_stats(self) -> Dict[str, int]:
        """Return document counts per collection."""
        if not self._chroma_available:
            return {"fallback": len(self._fallback_store)}
        return {
            "resumes": self._resume_collection.count() if self._resume_collection else 0,
            "job_descriptions": self._job_collection.count() if self._job_collection else 0,
        }

    # ── In-memory fallback ────────────────────────────────────────────────────

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