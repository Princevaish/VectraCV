// frontend/scripts/api/apiService.js
// All HTTP communication with the VectraAI Pro FastAPI backend.
// Uses CONFIG.API_BASE_URL — no runtime DOM reads, no dev UI dependency.

import { CONFIG } from '../../config/config.js';
import { sleep } from '../utils/helpers.js';

/**
 * Core fetch wrapper with timeout, retry, and structured error handling.
 * @param {string} path
 * @param {RequestInit} opts
 * @param {number} retries
 * @returns {Promise<any>}
 */
async function request(path, opts = {}, retries = CONFIG.MAX_RETRIES) {
  const url        = `${CONFIG.API_BASE_URL}${path}`;
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    CONFIG.REQUEST_TIMEOUT_MS
  );

  try {
    const res = await fetch(url, {
      ...opts,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const errBody = await res.json();
        detail = errBody.detail || detail;
      } catch (_) { /* ignore */ }
      throw new ApiError(detail, res.status);
    }

    return await res.json();

  } catch (err) {
    clearTimeout(timeout);

    if (retries > 0 && !(err instanceof ApiError)) {
      await sleep(CONFIG.RETRY_DELAY_MS);
      return request(path, opts, retries - 1);
    }

    throw err;
  }
}

/* ── RAG Endpoints ──────────────────────────────────────────────────────────── */

/**
 * POST /api/load-data — Ingest resume + JD into ChromaDB
 * @param {string} resume
 * @param {string} job_description
 */
export async function loadData(resume, job_description) {
  return request('/api/load-data', {
    method: 'POST',
    body: JSON.stringify({ resume, job_description }),
  });
}

/**
 * POST /api/analyze — RAG Q&A
 * @param {string} question
 */
export async function analyze(question) {
  return request('/api/analyze', {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
}

/* ── ATS Endpoints ──────────────────────────────────────────────────────────── */

/**
 * POST /api/ats-score — Full ATS scoring pipeline
 * @param {string} resume_text
 * @param {string} job_description
 * @returns {Promise<ATSScoreResponse>}
 */
export async function getATSScore(resume_text, job_description) {
  return request('/api/ats-score', {
    method: 'POST',
    body: JSON.stringify({ resume_text, job_description }),
  });
}

/* ── Upload Endpoints ───────────────────────────────────────────────────────── */

/**
 * POST /api/upload/resume — Upload PDF/DOCX resume
 * @param {File} file
 * @returns {Promise<UploadResponse>}
 */
export async function uploadResume(file) {
  return _uploadFile('/api/upload/resume', file);
}

/**
 * POST /api/upload/jd — Upload PDF/DOCX job description
 * @param {File} file
 * @returns {Promise<UploadResponse>}
 */
export async function uploadJD(file) {
  return _uploadFile('/api/upload/jd', file);
}

async function _uploadFile(path, file) {
  const url = `${CONFIG.API_BASE_URL}${path}`;
  const formData = new FormData();
  formData.append('file', file);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000); // 60s for uploads

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      // Do NOT set Content-Type — browser sets multipart/form-data with boundary
    });
    clearTimeout(timeout);

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const errBody = await res.json();
        detail = errBody.detail || detail;
      } catch (_) { /* ignore */ }
      throw new ApiError(detail, res.status);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/* ── Utility ────────────────────────────────────────────────────────────────── */

/**
 * GET /api/health — Liveness probe
 */
export async function ping() {
  return request('/api/health', { method: 'GET' }, 0);
}

/**
 * GET /api/stats — ChromaDB collection stats
 */
export async function getStats() {
  return request('/api/stats', { method: 'GET' }, 0);
}

/* ── ApiError ───────────────────────────────────────────────────────────────── */

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name   = 'ApiError';
    this.status = status;
  }
}