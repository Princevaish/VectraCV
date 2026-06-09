// frontend/scripts/api/apiService.js
// All HTTP communication with the FastAPI backend.

import { CONFIG } from '../../config/config.js';
import { sleep } from '../utils/helpers.js';

async function request(path, opts = {}, retries = CONFIG.MAX_RETRIES) {
  const url        = `${CONFIG.API_BASE_URL}${path}`;
  const controller = new AbortController();

  const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...opts,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try { const b = await res.json(); detail = b.detail || detail; } catch (_) {}
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

// ── Legacy RAG endpoints ──────────────────────────────────────────────────────

export async function loadData(resume, job_description) {
  return request('/load-data', {
    method: 'POST',
    body: JSON.stringify({ resume, job_description }),
  });
}

export async function analyze(question) {
  return request('/analyze', {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
}

export async function ping() {
  return request('/health', { method: 'GET' }, 0);
}

// ── ATS endpoint ──────────────────────────────────────────────────────────────

/**
 * POST /api/ats-score
 * @param {string} resume_text
 * @param {string} job_description
 * @returns {Promise<ATSResponse>}
 */
export async function getATSScore(resume_text, job_description) {
  return request('/api/ats-score', {
    method: 'POST',
    body: JSON.stringify({ resume_text, job_description }),
  });
}

// ── Optimizer endpoint ────────────────────────────────────────────────────────

/**
 * POST /api/optimize
 */
export async function optimizeResume(resume_text, job_description, target_role, tone, focus_area) {
  return request('/api/optimize', {
    method: 'POST',
    body: JSON.stringify({ resume_text, job_description, target_role, tone, focus_area }),
  });
}

// ── Upload endpoints (multipart) ──────────────────────────────────────────────

/**
 * Upload a file. Returns { status, filename, char_count, preview }.
 * @param {'resume'|'jd'} type
 * @param {File} file
 * @param {(pct: number) => void} onProgress
 */
export function uploadFile(type, file, onProgress) {
  return new Promise((resolve, reject) => {
    const url = `${CONFIG.API_BASE_URL}/api/upload/${type}`;
    const xhr  = new XMLHttpRequest();
    const form = new FormData();
    form.append('file', file);

    xhr.open('POST', url);

    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { resolve({ status: 'ok' }); }
      } else {
        try {
          const body = JSON.parse(xhr.responseText);
          reject(new ApiError(body.detail || `HTTP ${xhr.status}`, xhr.status));
        } catch {
          reject(new ApiError(`HTTP ${xhr.status}`, xhr.status));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new ApiError('Network error', 0)));
    xhr.addEventListener('abort', () => reject(new ApiError('Upload aborted', 0)));

    xhr.send(form);
  });
}

/**
 * GET /api/upload/status
 */
export async function getUploadStatus() {
  return request('/api/upload/status', { method: 'GET' }, 0);
}

/**
 * GET /api/ats-health
 */
export async function pingATS() {
  return request('/api/ats-health', { method: 'GET' }, 0);
}

/**
 * GET /api/stats
 */
export async function getStats() {
  return request('/api/stats', { method: 'GET' }, 0);
}

// ── Error class ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name   = 'ApiError';
    this.status = status;
  }
}