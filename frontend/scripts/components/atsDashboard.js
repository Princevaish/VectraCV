// frontend/scripts/components/atsDashboard.js
// Renders the full ATS Intelligence Dashboard from API response data.

/**
 * @typedef {Object} ATSData
 * @property {number} ats_score
 * @property {number} semantic_similarity
 * @property {number} keyword_match
 * @property {number} skill_coverage
 * @property {number} action_verb_strength
 * @property {number} quantified_achievement_score
 * @property {string[]} matched_keywords
 * @property {string[]} missing_keywords
 * @property {string[]} matched_skills
 * @property {string[]} missing_skills
 * @property {string[]} strong_verbs_found
 * @property {string[]} weak_verbs_found
 * @property {string[]} quantification_examples
 * @property {string[]} recommendations
 * @property {string}   grade
 * @property {string}   ats_readiness
 */

/**
 * Render the ATS dashboard into the given container element.
 * @param {HTMLElement} container
 * @param {ATSData} data
 */
export function renderATSDashboard(container, data) {
  if (!container || !data) return;

  const score     = Math.round(data.ats_score ?? 0);
  const ringColor = _ringColor(score);
  const readiness = (data.ats_readiness || 'Fair').toLowerCase().replace(/\s+/, '-');

  container.innerHTML = `
    <div class="ats-dashboard" id="atsDashboardInner">

      <!-- TOP ROW: ring + weight breakdown -->
      <div class="ats-top-row">
        ${_scoreRingHTML(score, ringColor, data.grade, data.ats_readiness)}
        ${_gradeOverviewHTML(data)}
      </div>

      <!-- METRIC CARDS -->
      <div class="ats-metrics-grid" id="atsMetricsGrid">
        ${_metricCardHTML('Semantic Similarity',         data.semantic_similarity,         'blue',   _semanticIcon())}
        ${_metricCardHTML('Keyword Match',               data.keyword_match,               'orange', _keywordIcon())}
        ${_metricCardHTML('Skill Coverage',              data.skill_coverage,              'green',  _skillIcon())}
        ${_metricCardHTML('Action Verb Strength',        data.action_verb_strength,        'purple', _verbIcon())}
        ${_metricCardHTML('Quantified Achievements',     data.quantified_achievement_score,'yellow', _quantIcon())}
      </div>

      <!-- BOTTOM ROW: missing skills + recommendations -->
      <div class="ats-bottom-row">
        ${_missingSkillsHTML(data)}
        ${_recommendationsHTML(data)}
      </div>

      <!-- MATCHED KEYWORDS -->
      ${_matchedKeywordsHTML(data)}

    </div>
  `;

  // Animate after render
  _animateDashboard(score, data);
}

// ── HTML builders ─────────────────────────────────────────────────────────────

function _scoreRingHTML(score, color, grade, readiness) {
  const circumference = 408; // 2π × 65
  const pct           = Math.min(score / 100, 1);
  const offset        = circumference - pct * circumference;
  const readinessClass = (readiness || 'fair').toLowerCase().replace(/\s+/, '-');

  return `
    <div class="score-ring-card glass-card">
      <div class="score-ring-wrap">
        <svg class="score-ring-svg" viewBox="0 0 150 150">
          <circle class="score-ring-bg"   cx="75" cy="75" r="65"/>
          <circle class="score-ring-fill score-ring-fill--${color}"
                  id="scoreRingFill"
                  cx="75" cy="75" r="65"
                  stroke-dasharray="${circumference}"
                  stroke-dashoffset="${circumference}"/>
        </svg>
        <div class="score-ring-center">
          <span class="score-ring-number" id="scoreRingNumber">0</span>
          <span class="score-ring-label">ATS Score</span>
        </div>
      </div>
      <div class="score-ring-grade">${grade || 'B'} Grade</div>
      <div class="ats-readiness-badge ats-readiness-badge--${readinessClass}">
        ${readiness || 'Fair'}
      </div>
    </div>
  `;
}

function _gradeOverviewHTML(data) {
  const weights = [
    { label: 'Semantic Similarity (35%)', val: data.semantic_similarity, cls: 'primary' },
    { label: 'Keyword Match (25%)',        val: data.keyword_match,       cls: 'secondary' },
    { label: 'Skill Coverage (15%)',       val: data.skill_coverage,      cls: 'tertiary' },
    { label: 'Quantification (15%)',       val: data.quantified_achievement_score, cls: 'primary' },
    { label: 'Action Verbs (10%)',         val: data.action_verb_strength, cls: 'secondary' },
  ];

  return `
    <div class="grade-overview-card glass-card">
      <div>
        <div class="grade-overview-card__title">Score Breakdown</div>
        <div class="grade-overview-card__subtitle">
          Weighted analysis across 5 ATS intelligence dimensions.
          Higher semantic alignment drives the most impact.
        </div>
      </div>
      <div class="grade-weight-list">
        ${weights.map((w, i) => `
          <div class="grade-weight-row">
            <div class="grade-weight-label">${w.label}</div>
            <div class="grade-weight-bar-wrap">
              <div class="grade-weight-bar grade-weight-bar--${w.cls}"
                   data-target="${Math.round(w.val)}"
                   style="width:0%"></div>
            </div>
            <div class="grade-weight-pct">${Math.round(w.val)}%</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function _metricCardHTML(label, value, colorCls, iconSvg) {
  const v = Math.round(value ?? 0);
  return `
    <div class="metric-card glass-card">
      <div class="metric-card__header">
        <div class="metric-card__icon metric-card__icon--${colorCls}">${iconSvg}</div>
        <div class="metric-card__label">${label}</div>
      </div>
      <div class="metric-card__value" data-target="${v}">
        0<span class="metric-card__suffix">%</span>
      </div>
      <div class="metric-card__bar-wrap">
        <div class="metric-card__bar metric-card__bar--${colorCls}" data-target="${v}" style="width:0%"></div>
      </div>
    </div>
  `;
}

function _missingSkillsHTML(data) {
  const missing = data.missing_skills || data.missing_keywords || [];
  const matched = data.matched_skills || [];

  return `
    <div class="missing-skills-card glass-card">
      <div class="missing-skills-card__header">
        <div class="missing-skills-card__title">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="8" cy="8" r="7"/>
            <path d="M8 5v4M8 11v.5" stroke-linecap="round"/>
          </svg>
          Missing Skills
          <span class="missing-skills-card__count">${missing.length}</span>
        </div>
      </div>
      <div class="skills-chip-grid" id="missingSkillsGrid">
        ${missing.length
          ? missing.map(s => `<span class="skill-chip skill-chip--missing">${_esc(s)}</span>`).join('')
          : '<span style="font-family:var(--font-mono);font-size:.69rem;color:var(--ink-muted)">No critical gaps found 🎉</span>'
        }
      </div>
      ${matched.length ? `
        <div style="margin-top:14px;">
          <div class="missing-skills-card__title" style="font-size:.76rem;margin-bottom:10px;opacity:.7">
            Matched Skills (${matched.length})
          </div>
          <div class="skills-chip-grid">
            ${matched.slice(0, 12).map(s => `<span class="skill-chip skill-chip--matched">${_esc(s)}</span>`).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function _recommendationsHTML(data) {
  const recs = data.recommendations || [];

  return `
    <div class="recommendations-card glass-card">
      <div class="recommendations-card__title">
        <div class="recommendations-card__icon">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4">
            <path d="M6 1L7.5 4.5H11L8 7l1 4L6 9l-3 2 1-4-3-2.5h3.5L6 1z"/>
          </svg>
        </div>
        AI Recommendations
      </div>
      <div class="rec-list" id="recList">
        ${recs.length
          ? recs.map((r, i) => `
            <div class="rec-item">
              <span class="rec-item__num">${String(i + 1).padStart(2, '0')}.</span>
              <span class="rec-item__text">${_esc(r)}</span>
            </div>
          `).join('')
          : '<div class="rec-item is-visible"><span class="rec-item__text" style="color:var(--ink-muted)">Your resume is well-optimised — no critical recommendations.</span></div>'
        }
      </div>
    </div>
  `;
}

function _matchedKeywordsHTML(data) {
  const keywords = data.matched_keywords || [];
  if (!keywords.length) return '';

  return `
    <div class="keywords-card glass-card">
      <div class="keywords-card__title">Matched Keywords (${keywords.length})</div>
      <div class="skills-chip-grid">
        ${keywords.slice(0, 20).map(k => `<span class="skill-chip skill-chip--keyword">${_esc(k)}</span>`).join('')}
      </div>
    </div>
  `;
}

// ── Animations ────────────────────────────────────────────────────────────────

function _animateDashboard(score, data) {
  if (!window.gsap) { _showAllStatic(); return; }

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // Stagger cards in
  tl.from('.score-ring-card, .grade-overview-card', {
    opacity: 0, y: 24, duration: 0.5, stagger: 0.1,
  });

  tl.from('.metric-card', {
    opacity: 0, y: 18, duration: 0.4, stagger: 0.08,
  }, '-=0.3');

  tl.from('.missing-skills-card, .recommendations-card, .keywords-card', {
    opacity: 0, y: 16, duration: 0.4, stagger: 0.1,
  }, '-=0.2');

  // Animated number counter for score ring
  const ringFill   = document.getElementById('scoreRingFill');
  const ringNumber = document.getElementById('scoreRingNumber');

  if (ringFill) {
    const circumference = 408;
    const targetOffset  = circumference - (score / 100) * circumference;
    gsap.to(ringFill, { strokeDashoffset: targetOffset, duration: 1.6, ease: 'power2.out', delay: 0.4 });
  }

  if (ringNumber) {
    const obj = { val: 0 };
    gsap.to(obj, {
      val: score, duration: 1.6, ease: 'power2.out', delay: 0.4,
      onUpdate: () => { ringNumber.textContent = Math.round(obj.val); },
    });
  }

  // Metric bars + counters
  document.querySelectorAll('.metric-card__bar[data-target]').forEach(bar => {
    gsap.to(bar, { width: bar.dataset.target + '%', duration: 1.3, ease: 'power2.out', delay: 0.5 });
  });

  document.querySelectorAll('.metric-card__value[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.querySelector('.metric-card__suffix')?.outerHTML || '%';
    const obj = { val: 0 };
    gsap.to(obj, {
      val: target, duration: 1.3, ease: 'power2.out', delay: 0.5,
      onUpdate: () => { el.innerHTML = Math.round(obj.val) + suffix; },
    });
  });

  // Grade weight bars
  document.querySelectorAll('.grade-weight-bar[data-target]').forEach((bar, i) => {
    gsap.to(bar, { width: bar.dataset.target + '%', duration: 1.1, ease: 'power2.out', delay: 0.3 + i * 0.08 });
  });

  // Skill chips stagger
  setTimeout(() => {
    document.querySelectorAll('.skill-chip').forEach((chip, i) => {
      setTimeout(() => chip.classList.add('is-visible'), i * 45);
    });
  }, 700);

  // Recommendation items stagger
  setTimeout(() => {
    document.querySelectorAll('.rec-item').forEach((item, i) => {
      setTimeout(() => item.classList.add('is-visible'), i * 80);
    });
  }, 900);
}

function _showAllStatic() {
  // No GSAP — show everything immediately
  document.querySelectorAll('.metric-card__bar[data-target]').forEach(b => {
    b.style.width = b.dataset.target + '%';
  });
  document.querySelectorAll('.grade-weight-bar[data-target]').forEach(b => {
    b.style.width = b.dataset.target + '%';
  });
  document.querySelectorAll('.skill-chip, .rec-item').forEach(el => {
    el.classList.add('is-visible');
  });
  const ringFill = document.getElementById('scoreRingFill');
  if (ringFill) {
    const target = ringFill.dataset ? 0 : 0;
    // Set via stroke-dashoffset directly
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _ringColor(score) {
  if (score >= 70) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

function _esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function _semanticIcon() {
  return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
    <circle cx="7" cy="7" r="6"/><path d="M4 7h6M7 4v6" stroke-linecap="round"/>
  </svg>`;
}

function _keywordIcon() {
  return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
    <path d="M2 4h10M2 7h7M2 10h5" stroke-linecap="round"/>
  </svg>`;
}

function _skillIcon() {
  return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
    <path d="M5 7l2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="7" cy="7" r="6"/>
  </svg>`;
}

function _verbIcon() {
  return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
    <path d="M3 10L7 3l4 7" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M4.5 7.5h5" stroke-linecap="round"/>
  </svg>`;
}

function _quantIcon() {
  return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
    <rect x="2" y="8" width="2.5" height="4" rx="1"/>
    <rect x="5.75" y="5" width="2.5" height="7" rx="1"/>
    <rect x="9.5" y="2" width="2.5" height="10" rx="1"/>
  </svg>`;
}