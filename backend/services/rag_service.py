"""
services/rag_service.py — Retrieval-Augmented Generation pipeline.

Steps:
  1. Embed the user's question.
  2. Retrieve top-k similar chunks from ChromaDB (resume + job description).
  3. Assemble a structured prompt using the retrieved context.
  4. Call the LLM and return the response.
"""

from typing import Dict, Any, List

from services.embedding_service import embed_text
from services.vector_service import vector_service
from services.llm_service import generate_response
from config import settings
from core.logger import get_logger

logger = get_logger(__name__)

# ── Prompt Template ───────────────────────────────────────────────────────────

RAG_PROMPT_TEMPLATE = """You are an expert AI career coach powered by VectraAI Pro.

Using ONLY the following context from the currently uploaded resume and job description:

{context}

Answer the question: {question}

IMPORTANT RULES:
- Answer ONLY using the provided resume and job description context.
- DO NOT invent or assume any skills, experiences, or technologies not present in the context.
- If the context lacks information to answer the question, state that clearly.
- Provide structured, actionable career intelligence.
- If asking about fit, base it solely on the provided text."""


def run_rag(question: str) -> Dict[str, Any]:
    """
    Execute the full RAG pipeline for *question*.

    Args:
        question: The user's natural-language query.

    Returns:
        A dict with keys:
          - ``answer``           (str) — LLM-generated response.
          - ``retrieved_chunks`` (int) — number of context chunks used.
    """
    logger.info("RAG pipeline started. Question: %s", question)

    # 1. Embed the question
    query_vector = embed_text(question)

    # 2. Retrieve similar chunks from ChromaDB (both collections)
    hits = vector_service.search(
        query_embedding=query_vector,
        top_k=settings.TOP_K,
    )

    if not hits:
        logger.warning("No chunks retrieved from vector store — check /api/load-data was called.")
        return {
            "answer": (
                "No resume or job description data found. "
                "Please load your data first using the Load Data step."
            ),
            "retrieved_chunks": 0,
        }

    # 3. Separate resume and job chunks for clear context labelling
    resume_chunks: List[str] = []
    job_chunks: List[str] = []

    for hit in hits:
        chunk_type = hit.get("metadata", {}).get("type", "unknown")
        doc = hit.get("document", "")
        if chunk_type == "job":
            job_chunks.append(doc)
        else:
            resume_chunks.append(doc)  # default to resume

    context_parts: List[str] = []
    if resume_chunks:
        context_parts.append("--- RESUME ---\n" + "\n\n".join(resume_chunks))
    if job_chunks:
        context_parts.append("--- JOB DESCRIPTION ---\n" + "\n\n".join(job_chunks))

    context = "\n\n".join(context_parts)

    # 4. Build prompt and call LLM
    prompt = RAG_PROMPT_TEMPLATE.format(context=context, question=question)
    logger.debug("RAG prompt assembled (%d chars).", len(prompt))

    answer = generate_response(prompt)

    logger.info("RAG pipeline complete. Retrieved %d chunks.", len(hits))
    return {
        "answer": answer,
        "retrieved_chunks": len(hits),
    }