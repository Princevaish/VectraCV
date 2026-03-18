// frontend/scripts/api/apiService.js
// All HTTP communication with the FastAPI backend.
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

/* ── Endpoints ─────────────────────────────────────────────────────────────── */

/**
 * POST /load-data
 * @param {string} resume
 * @param {string} job_description
 */
export async function loadData(resume, job_description) {
  return request('/load-data', {
    method: 'POST',
    body: JSON.stringify({ resume, job_description }),
  });
}

/**
 * POST /analyze
 * @param {string} question
 */
export async function analyze(question) {
  return request('/analyze', {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
}

/**
 * GET /health — liveness probe
 */
export async function ping() {
  return request('/health', { method: 'GET' }, 0);
}

/* ── ApiError ──────────────────────────────────────────────────────────────── */

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name   = 'ApiError';
    this.status = status;
  }
}