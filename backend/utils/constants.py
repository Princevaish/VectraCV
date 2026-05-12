"""
utils/constants.py — Central constants for ATS scoring engine.
"""

# ── Action Verb Lists ─────────────────────────────────────────────────────────

STRONG_ACTION_VERBS = {
    "architected", "automated", "built", "championed", "constructed",
    "created", "delivered", "deployed", "designed", "developed",
    "drove", "engineered", "established", "executed", "founded",
    "generated", "implemented", "improved", "innovated", "integrated",
    "launched", "led", "mentored", "modernized", "optimized",
    "orchestrated", "overhauled", "pioneered", "redesigned", "refactored",
    "scaled", "shipped", "spearheaded", "streamlined", "transformed",
    "accelerated", "achieved", "advanced", "boosted", "crafted",
    "cut", "decreased", "directed", "eliminated", "enabled",
    "expanded", "grew", "increased", "managed", "maximized",
    "migrated", "reduced", "resolved", "revamped", "secured",
    "unified", "upgraded",
}

WEAK_ACTION_VERBS = {
    "assisted", "contributed", "dealt", "did", "experienced",
    "handled", "helped", "involved", "participated", "responsible",
    "supported", "tasked", "tried", "used", "utilized",
    "worked", "was",
}

# ── Skill Taxonomy ────────────────────────────────────────────────────────────

TECH_SKILLS = {
    # Languages
    "python", "javascript", "typescript", "java", "kotlin", "swift",
    "c++", "c#", "go", "golang", "rust", "ruby", "php", "scala",
    "r", "matlab", "bash", "shell", "powershell", "sql",

    # Frameworks & Libraries
    "react", "vue", "angular", "svelte", "nextjs", "nuxtjs",
    "express", "fastapi", "flask", "django", "spring", "rails",
    "laravel", "nestjs", "graphql", "rest", "grpc",

    # AI / ML
    "pytorch", "tensorflow", "keras", "scikit-learn", "sklearn",
    "huggingface", "transformers", "langchain", "llm", "rag",
    "openai", "anthropic", "vertex ai", "sagemaker",
    "pandas", "numpy", "matplotlib", "seaborn", "plotly",

    # Cloud
    "aws", "azure", "gcp", "google cloud", "ec2", "s3", "lambda",
    "cloudfront", "rds", "dynamodb", "bigquery", "cloud run",
    "firebase", "heroku", "vercel", "netlify", "render", "railway",

    # DevOps / Infrastructure
    "docker", "kubernetes", "k8s", "terraform", "ansible", "jenkins",
    "github actions", "gitlab ci", "circleci", "helm", "argo",
    "prometheus", "grafana", "datadog", "new relic",

    # Databases
    "postgresql", "postgres", "mysql", "mongodb", "redis",
    "elasticsearch", "cassandra", "sqlite", "neo4j", "supabase",
    "pinecone", "chromadb", "faiss", "weaviate",

    # Tools
    "git", "github", "gitlab", "jira", "confluence", "notion",
    "figma", "sketch", "linear", "postman", "swagger",

    # Soft/leadership
    "agile", "scrum", "kanban", "ci/cd", "devops", "devsecops",
    "leadership", "mentoring", "cross-functional", "stakeholder",
}

# ── Quantification Patterns ───────────────────────────────────────────────────

import re  # noqa: E402

QUANTIFICATION_PATTERNS = [
    re.compile(r'\d+\s*%'),                          # 40%
    re.compile(r'\d+x\b', re.I),                     # 3x
    re.compile(r'\$\s*\d+[\d,km.]*', re.I),          # $1.2M / $500k
    re.compile(r'\d+[\d,]+\s*(users|customers|requests|transactions)', re.I),
    re.compile(r'(increased|improved|reduced|decreased|cut|boosted|grew|scaled)\s+(?:by\s+)?\d+', re.I),
    re.compile(r'\d+\s*(ms|seconds|minutes|hours)\s+(latency|response|throughput)', re.I),
    re.compile(r'top\s+\d+', re.I),                  # top 5
    re.compile(r'\d+\s*(million|billion|thousand|k)\b', re.I),
]

# ── Scoring Weights ───────────────────────────────────────────────────────────

ATS_WEIGHTS = {
    "semantic_similarity": 0.35,
    "keyword_match": 0.25,
    "skill_coverage": 0.15,
    "quantified_achievement": 0.15,
    "action_verb_strength": 0.10,
}

# ── Recommendation Templates ──────────────────────────────────────────────────

RECOMMENDATION_TEMPLATES = {
    "low_semantic": "Rewrite your resume summary to mirror the language and tone of the job description more closely.",
    "low_keyword": "Add these missing keywords naturally throughout your resume: {missing}.",
    "low_skill_coverage": "Highlight these required skills you may have but haven't mentioned: {missing_skills}.",
    "low_quantified": "Add measurable metrics to your achievements (e.g., 'reduced latency by 35%', 'grew user base to 50k').",
    "weak_verbs": "Replace weak verbs (worked on, helped, responsible for) with strong action verbs (engineered, optimized, scaled).",
    "no_docker": "Add Docker/containerization experience if you have it — it appears in most modern job descriptions.",
    "no_cloud": "Cloud platform experience (AWS/GCP/Azure) is expected — add it if applicable.",
    "no_tests": "Add testing frameworks (pytest, Jest, Cypress) to demonstrate engineering discipline.",
    "excellent": "Your resume is well-optimized for this role. Focus on quantifying more achievements.",
}
