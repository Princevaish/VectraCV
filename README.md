# AI Resume Analyser — FastAPI + Endee + Groq RAG Backend

## Project Structure

```
backend/
├── main.py                  # App entry point, lifespan, CORS
├── config.py                # .env loader + typed settings
├── requirements.txt
├── .env.example             # Copy to .env and fill in your keys
│
├── api/
│   └── routes.py            # POST /load-data, POST /analyze, GET /health
│
├── services/
│   ├── embedding_service.py # SentenceTransformer wrapper
│   ├── vector_service.py    # Endee vector DB integration
│   ├── rag_service.py       # RAG pipeline (retrieve → prompt → generate)
│   └── llm_service.py       # Groq API client (OpenAI-compatible)
│
├── models/
│   └── schema.py            # Pydantic request/response models
│
├── utils/
│   └── text_splitter.py     # Word-level chunker (250 words, 30 overlap)
│
└── core/
    └── logger.py            # Structured stdout logger
```

## Quick Start

### 1. Clone & install dependencies

```bash
pip install -r backend/requirements.txt
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set:
#   GROQ_API_KEY=gsk_...
#   MODEL_NAME=llama3-70b-8192
#   EMBEDDING_MODEL=all-MiniLM-L6-v2
```

### 3. Run the server

```bash
uvicorn backend.main:app --reload
```

The API will be available at **http://localhost:8000**
Interactive docs: **http://localhost:8000/docs**

---

## API Reference

### `GET /health`
Liveness probe.

```json
{ "status": "ok" }
```

---

### `POST /load-data`
Ingest resume and job description into Endee.

**Request:**
```json
{
  "resume": "Jane Doe | Senior Python Developer | 5 years FastAPI, AWS ...",
  "job_description": "We need a backend engineer with Python, AWS, Docker ..."
}
```

**Response (201):**
```json
{
  "status": "success",
  "resume_chunks": 2,
  "job_chunks": 1,
  "message": "Stored 2 resume chunk(s) and 1 job description chunk(s) in Endee."
}
```

---

### `POST /analyze`
Answer a question about the fit between the resume and job description.

**Request:**
```json
{ "question": "Am I a good fit for this role?" }
```

**Response (200):**
```json
{
  "question": "Am I a good fit for this role?",
  "answer": "## AI Resume Analysis\n\n**1. Match Analysis** ...",
  "retrieved_chunks": 5
}
```

Typical questions:
- `"Am I a good fit?"`
- `"What skills am I missing?"`
- `"How can I improve my resume?"`

---

## How It Works (RAG Flow)

```
POST /load-data
  └─► split_text()          (250-word chunks, 30-word overlap)
  └─► embed_texts()         (SentenceTransformer all-MiniLM-L6-v2)
  └─► Endee.insert()        (vectors + {type: "resume"/"job"} metadata)

POST /analyze
  └─► embed_text(question)
  └─► Endee.search(top_k=5) (cosine similarity)
  └─► assemble context      (labelled resume + job chunks)
  └─► RAG prompt
  └─► Groq LLM              (llama3-70b-8192)
  └─► structured answer
```

## Notes

- If Endee is not installed (`pip install endee`), the service falls back to an in-memory cosine-similarity store automatically — useful for local testing.
- If `GROQ_API_KEY` is missing, `llm_service` returns a clearly-labelled mock response so the pipeline never crashes.
- All secrets are loaded from `.env` via `python-dotenv`; no keys are hardcoded.