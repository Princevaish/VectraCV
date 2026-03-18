// frontend/config/config.js
// Production configuration. No dev-facing UI — all settings live here.

export const CONFIG = {
  /** FastAPI backend base URL — change for staging/prod deploys */
  API_BASE_URL: 'http://localhost:8000',

  /**
   * Clerk publishable key.
   * Replace with your own key from https://dashboard.clerk.com
   * Format: pk_test_XXXXXXXX  or  pk_live_XXXXXXXX
   */
  CLERK_PUBLISHABLE_KEY: 'pk_test_c3BsZW5kaWQtc3RpbmdyYXktODkuY2xlcmsuYWNjb3VudHMuZGV2JA',

  /** Timeout for API calls (ms) */
  REQUEST_TIMEOUT_MS: 30_000,

  /** Cold-start warning threshold (ms) */
  COLD_START_THRESHOLD_MS: 3_000,

  /** Automatic retries on network failure */
  MAX_RETRIES: 1,

  /** Delay between retries (ms) */
  RETRY_DELAY_MS: 1_200,

  /** Maximum history items to retain */
  MAX_HISTORY: 12,

  /** Preset question pills */
  PRESET_QUESTIONS: [
    { label: 'Am I a good fit?',  q: 'Am I a good fit for this role?' },
    { label: 'Missing skills?',   q: 'What skills am I missing?' },
    { label: 'Improve resume',    q: 'How can I improve my resume?' },
    { label: 'My strengths',      q: 'What are my strongest matching qualifications?' },
    { label: 'Tailored summary',  q: 'Write a tailored professional summary for this job.' },
  ],

  /** Loader message cycling sequence (RAG overlay) */
  LOADER_MESSAGES: [
    'Initializing AI…',
    'Connecting to vector database…',
    'Retrieving semantic context…',
    'Assembling RAG prompt…',
    'Generating response…',
  ],

  /** Progress % per loader message step */
  LOADER_PROGRESS: [10, 30, 55, 75, 90],

  /** Auth loader message sequence */
  AUTH_LOADER_MESSAGES: [
    'Initializing session…',
    'Connecting identity…',
    'Verifying credentials…',
    'Preparing workspace…',
  ],
};