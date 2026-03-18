// frontend/scripts/utils/constants.js
// Shared string constants and DOM element IDs.
// Dev-facing IDs (ping, apiBase, configBar) removed — config lives in config.js.

export const IDS = {
  // Auth
  AUTH_LOADER:      'authLoader',
  AUTH_LOADER_MSG:  'authLoaderMsg',
  AUTH_SCREEN:      'authScreen',
  MAIN_APP:         'mainApp',
  USER_PILL_WRAP:   'userPillContainer',

  // Overlay (RAG analyze)
  OVERLAY:          'analyzeOverlay',
  OVERLAY_MSG:      'overlayMsg',
  OVERLAY_COLD:     'overlayCold',
  OVERLAY_PROGRESS: 'overlayProgressBar',

  // Header
  THEME_BTN: 'themeBtn',

  // Steps
  STEP1: 'step1',
  STEP2: 'step2',
  STEP3: 'step3',

  // Input section
  RESUME_TEXT:  'resumeText',
  JOB_TEXT:     'jobText',
  RESUME_COUNT: 'resumeCount',
  JOB_COUNT:    'jobCount',
  RESUME_CLEAR: 'resumeClear',
  JOB_CLEAR:    'jobClear',

  // Action bar
  LOAD_BTN:    'loadBtn',
  DEMO_BTN:    'demoBtn',
  CLEAR_ALL:   'clearAllBtn',
  LOAD_STATUS: 'loadStatus',
  CHUNK_CHIPS: 'chunkChips',

  // Analyze
  QUESTION_INPUT:   'questionInput',
  QUESTION_PILLS:   'questionPills',
  QUESTION_VALID:   'questionValidation',
  ANALYZE_BTN:      'analyzeBtn',
  ANALYZE_SECTION:  'analyzeSection',

  // Results
  RESULT_EMPTY: 'resultEmpty',
  RESULT_CARD:  'resultCard',
  RESULT_AREA:  'resultArea',

  // History
  HISTORY_SECTION: 'historySection',
  HISTORY_LIST:    'historyList',
  HISTORY_COUNT:   'historyCount',
  CLEAR_HISTORY:   'clearHistoryBtn',

  // Toast
  TOAST_CONTAINER: 'toastContainer',
};

export const EVENTS = {
  DATA_LOADED:   'app:dataLoaded',
  ANALYZE_START: 'app:analyzeStart',
  ANALYZE_DONE:  'app:analyzeDone',
  ANALYZE_ERROR: 'app:analyzeError',
  STATE_CHANGED: 'app:stateChanged',
  THEME_CHANGED: 'app:themeChanged',
};

export const DEMO_RESUME = `Jane Doe — Senior Python Developer
Email: jane@example.com | GitHub: github.com/janedoe

SUMMARY
Backend engineer with 5 years of experience building scalable Python APIs using FastAPI and Django. Proficient in PostgreSQL, Redis, and REST API design. Some exposure to machine learning pipelines.

SKILLS
Languages: Python, SQL, JavaScript (basic)
Frameworks: FastAPI, Django, Flask
Databases: PostgreSQL, Redis, SQLite
Tools: Git, Docker, GitHub Actions, Postman
Cloud: AWS (EC2, S3, Lambda) — limited experience

EXPERIENCE
Senior Backend Developer — TechCorp (2021–Present)
- Designed and maintained 12 REST APIs serving 50k daily active users.
- Reduced average API response time by 38% through Redis caching.
- Led migration from Flask to FastAPI, improving developer velocity.

Backend Developer — StartupXYZ (2019–2021)
- Built data ingestion pipelines for analytics dashboards using Python + Celery.
- Implemented JWT-based auth across 3 microservices.

EDUCATION
B.Sc. Computer Science — State University, 2019

PROJECTS
- OpenSourceLib: Python library for CSV data normalisation (240 GitHub stars)`;

export const DEMO_JOB = `Senior Backend Engineer — AI Products Team
Company: NeuralStack Inc. | Location: Remote

ABOUT THE ROLE
We are building next-generation AI-powered SaaS products. We're looking for a backend engineer who thrives at the intersection of ML systems and scalable infrastructure.

RESPONSIBILITIES
- Design and maintain high-performance Python microservices (FastAPI preferred).
- Build and optimise RAG pipelines using vector databases (Pinecone, Qdrant, or similar).
- Integrate LLM APIs (OpenAI, Anthropic, Groq) into production workflows.
- Collaborate closely with the ML team to productionise models.
- Own CI/CD pipelines and container orchestration on AWS.

REQUIREMENTS
- 4+ years Python backend development experience.
- Strong expertise in FastAPI or Django REST Framework.
- Experience with vector databases and embedding models.
- Hands-on knowledge of Docker and Kubernetes.
- Familiarity with LLM APIs and prompt engineering.
- AWS experience: ECS, RDS, S3, Lambda.

NICE TO HAVE
- Contributions to open-source ML or backend projects.
- Experience with streaming APIs and WebSockets.
- Knowledge of MLOps tools (MLflow, Weights & Biases).`;