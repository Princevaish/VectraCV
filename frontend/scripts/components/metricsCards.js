// frontend/scripts/components/metricsCards.js
// Individual metric breakdown cards for the ATS dashboard.

import { renderProgressBar, getScoreColorClass } from './progressBars.js';

/**
 * Metric card configurations
 */
const METRIC_CONFIG = [
  {
    key: 'semantic_similarity',
    label: 'Semantic Similarity',
    icon: '◎',
    iconBg: 'rgba(99, 102, 241, 0.15)',
    iconColor: '#818cf8',
    color: 'blue',
    description: 'How closely your resume language matches the job description semantically.',
    tooltip: 'Uses SentenceTransformers all-MiniLM-L6-v2 cosine similarity',
  },
  {
    key: 'keyword_match',
    label: 'Keyword Match',
    icon: '⌖',
    iconBg: 'rgba(16, 185, 129, 0.15)',
    iconColor: '#34d399',
    color: 'accent',
    description: 'Percentage of JD-required keywords found in your resume.',
    tooltip: 'Detected across skills, frameworks, tools, databases and cloud tech',
  },
  {
    key: 'skill_coverage',
    label: 'Skill Coverage',
    icon: '◈',
    iconBg: 'rgba(139, 92, 246, 0.15)',
    iconColor: '#a78bfa',
    color: 'purple',
    description: 'Fraction of required technical skills present in your resume.',
    tooltip: 'Scans 150+ tech skills across languages, frameworks and tools',
  },
  {
    key: 'action_verb_strength',
    label: 'Action Verb Quality',
    icon: '▲',
    iconBg: 'rgba(234, 179, 8, 0.15)',
    iconColor: '#facc15',
    color: 'yellow',
    description: 'Strength of verbs used (architected > worked on).',
    tooltip: 'Strong: developed, engineered, scaled. Weak: helped, assisted, responsible for',
  },
  {
    key: 'quantified_achievement_score',
    label: 'Quantified Impact',
    icon: '⬡',
    iconBg: 'rgba(239, 68, 68, 0.15)',
    iconColor: '#f87171',
    color: 'red',
    description: 'How well your achievements are backed by numbers, %, and metrics.',
    tooltip: 'Detects percentages, multipliers ($M), counts, and KPI statements',
  },
];

/**
 * Render all five metric breakdown cards.
 * @param {object} data - ATS score response object
 * @returns {string} HTML string
 */
export function renderMetricsCards(data) {
  return `
    <div class="metrics-grid" id="metricsGrid">
      ${METRIC_CONFIG.map(cfg => _renderCard(cfg, data)).join('')}
    </div>
  `;
}

function _renderCard(cfg, data) {
  const score = Math.round(data[cfg.key] ?? 0);
  const colorClass = getScoreColorClass(score);

  return `
    <div class="metric-card gsap-fade-up" data-metric="${cfg.key}" data-tooltip="${cfg.tooltip}"
         style="--metric-accent: ${cfg.iconColor}">
      <div class="metric-card__header">
        <div>
          <div class="metric-card__score ${colorClass === 'green' ? 'score--good' : colorClass === 'yellow' ? 'score--avg' : 'score--bad'}">
            ${score}
          </div>
          <div class="metric-card__label">${cfg.label}</div>
        </div>
        <div class="metric-card__icon" style="background:${cfg.iconBg}; color:${cfg.iconColor};">
          ${cfg.icon}
        </div>
      </div>

      <div class="metric-card__progress">
        ${renderProgressBar(score, colorClass)}
      </div>

      <p class="metric-card__description">${cfg.description}</p>
    </div>
  `;
}

/**
 * Animate metric cards in with GSAP stagger.
 */
export function animateMetricCards() {
  if (!window.gsap) return;

  const cards = document.querySelectorAll('#metricsGrid .metric-card');
  if (!cards.length) return;

  gsap.fromTo(cards,
    { opacity: 0, y: 24, scale: 0.96 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.55,
      ease: 'power3.out',
      stagger: 0.08,
      delay: 0.4,
    }
  );

  // Bind hover microinteractions
  cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      gsap.to(card, { y: -4, duration: 0.2, ease: 'power2.out' });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { y: 0, duration: 0.25, ease: 'power2.inOut' });
    });
  });
}
