// frontend/scripts/components/atsDashboard.js
// Main ATS Intelligence Dashboard orchestrator.
// Renders all sub-components and manages dashboard state.

import { renderScoreRing, resetScoreRing }               from './scoreRing.js';
import { renderMetricsCards, animateMetricCards }         from './metricsCards.js';
import { renderKeywordPanels, animateSkillChips }         from './missingSkills.js';
import { renderRecommendations, animateRecommendations }  from './recommendationCards.js';
import { animateProgressBars }                            from './progressBars.js';

// ── State ─────────────────────────────────────────────────────────────────────

let _lastResult = null;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Render the full ATS dashboard with animation sequence.
 * @param {object} data - ATSScoreResponse from backend
 */
export function renderATSDashboard(data) {
  _lastResult = data;
  const container = document.getElementById('atsDashboard');
  if (!container) return;

  // Build the full dashboard HTML
  container.innerHTML = _buildDashboardHTML(data);
  container.classList.add('is-visible');

  // Kick off animation sequence
  _animateDashboard();
}

/**
 * Clear and hide the ATS dashboard.
 */
export function clearATSDashboard() {
  _lastResult = null;
  const container = document.getElementById('atsDashboard');
  if (!container) return;
  container.innerHTML = _buildEmptyState();
  container.classList.remove('is-visible');
  resetScoreRing();
}

/**
 * Show a loading skeleton while ATS is processing.
 */
export function showATSLoading() {
  const container = document.getElementById('atsDashboard');
  if (!container) return;
  container.innerHTML = `
    <div class="ats-loading">
      <div class="ats-loading__ring"></div>
      <p class="ats-loading__text">Analysing resume intelligence…</p>
      <div style="display:flex;gap:6px;margin-top:0.5rem;">
        <span class="loading-dot"></span>
        <span class="loading-dot"></span>
        <span class="loading-dot"></span>
      </div>
    </div>
    ${_buildSkeletonHTML()}
  `;
}

// ── HTML Builder ──────────────────────────────────────────────────────────────

function _buildDashboardHTML(data) {
  const atsScore = Math.round(data.ats_score ?? 0);
  const grade    = atsScore >= 75 ? 'good' : atsScore >= 50 ? 'avg' : 'bad';
  const gradeLabel = atsScore >= 75 ? 'Strong Match' : atsScore >= 50 ? 'Moderate Match' : 'Weak Match';

  return `
    <!-- Score Summary Row -->
    <div class="score-summary-row gsap-fade-up">
      <div class="score-summary-item">
        <div class="score-summary-item__value score--${grade}">${atsScore}</div>
        <div class="score-summary-item__label">ATS Score</div>
      </div>
      <div class="score-summary-item">
        <div class="score-summary-item__value">${Math.round(data.semantic_similarity ?? 0)}</div>
        <div class="score-summary-item__label">Semantic</div>
      </div>
      <div class="score-summary-item">
        <div class="score-summary-item__value">${Math.round(data.keyword_match ?? 0)}</div>
        <div class="score-summary-item__label">Keywords</div>
      </div>
      <div class="score-summary-item">
        <div class="score-summary-item__value">${Math.round(data.skill_coverage ?? 0)}</div>
        <div class="score-summary-item__label">Skills</div>
      </div>
      <div class="score-summary-item">
        <div class="score-summary-item__value">${Math.round(data.quantified_achievement_score ?? 0)}</div>
        <div class="score-summary-item__label">Impact</div>
      </div>
      <div class="score-summary-item">
        <div class="score-summary-item__value">${Math.round(data.action_verb_strength ?? 0)}</div>
        <div class="score-summary-item__label">Verbs</div>
      </div>
      <div>
        <span class="grade-badge grade-badge--${grade}">
          ${gradeLabel}
        </span>
      </div>
    </div>

    <!-- Main Grid: Score Ring + Metrics -->
    <div class="ats-dashboard-grid">
      <!-- Left: Score Ring -->
      <div id="scoreRingContainer" class="gsap-scale-in"></div>

      <!-- Right: Metric Cards -->
      <div>
        ${renderMetricsCards(data)}
      </div>
    </div>

    <!-- Keyword Panels -->
    ${renderKeywordPanels(data.matched_keywords || [], data.missing_keywords || [])}

    <!-- Recommendations -->
    ${renderRecommendations(data.recommendations || [])}
  `;
}

function _buildEmptyState() {
  return `
    <div class="ats-empty">
      <svg class="ats-empty__icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="48" height="48" rx="4" stroke="currentColor" stroke-width="2"/>
        <path d="M20 24h24M20 32h16M20 40h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="48" cy="48" r="12" fill="var(--bg)" stroke="currentColor" stroke-width="2"/>
        <path d="M44 48h8M48 44v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <h3 class="ats-empty__title">ATS Intelligence Ready</h3>
      <p class="ats-empty__desc">
        Paste your resume and job description above, then click
        <strong>Analyse ATS Score</strong> to get your full intelligence report.
      </p>
    </div>
  `;
}

function _buildSkeletonHTML() {
  return `
    <div style="display:grid;grid-template-columns:1fr 2fr;gap:1.5rem;margin-top:1.5rem;">
      <div class="skeleton" style="height:280px;border-radius:var(--radius-lg);"></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">
        ${Array(6).fill(0).map(() =>
          `<div class="skeleton" style="height:130px;border-radius:var(--radius-md);"></div>`
        ).join('')}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1.5rem;">
      <div class="skeleton" style="height:200px;border-radius:var(--radius-lg);"></div>
      <div class="skeleton" style="height:200px;border-radius:var(--radius-lg);"></div>
    </div>
  `;
}

// ── Animation Sequence ────────────────────────────────────────────────────────

function _animateDashboard() {
  // Render the score ring (handles its own GSAP)
  if (_lastResult) {
    renderScoreRing(Math.round(_lastResult.ats_score ?? 0));
  }

  if (!window.gsap) {
    animateProgressBars(document);
    return;
  }

  // Stagger in summary row
  gsap.from('.score-summary-row', {
    opacity: 0,
    y: -16,
    duration: 0.5,
    ease: 'power3.out',
  });

  // Score ring entrance
  gsap.from('#scoreRingContainer', {
    opacity: 0,
    scale: 0.88,
    duration: 0.6,
    ease: 'back.out(1.4)',
    delay: 0.15,
  });

  // Metrics cards
  animateMetricCards();

  // Progress bars
  setTimeout(() => animateProgressBars(document, 0.4), 500);

  // Keyword chips
  setTimeout(() => animateSkillChips(), 700);

  // Recommendations
  setTimeout(() => animateRecommendations(), 900);

  // Section reveal
  gsap.utils.toArray('.ats-card, .rec-card, .keywords-panel').forEach((el, i) => {
    gsap.fromTo(el,
      { opacity: 0, y: 20 },
      {
        scrollTrigger: {
          trigger: el,
          start: 'top 92%',
          toggleActions: 'play none none none',
        },
        opacity: 1,
        y: 0,
        duration: 0.5,
        delay: i * 0.03,
        ease: 'power3.out',
      }
    );
  });
}
