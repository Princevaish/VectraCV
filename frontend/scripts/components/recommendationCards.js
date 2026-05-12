// frontend/scripts/components/recommendationCards.js
// Renders AI-generated recommendation cards for the ATS dashboard.

const REC_ICONS = ['→', '◎', '▲', '⬡', '◈', '✦'];
const REC_PRIORITIES = ['Critical', 'High', 'High', 'Medium', 'Medium', 'Low'];
const PRIORITY_COLORS = {
  Critical: '#ef4444',
  High:     '#f97316',
  Medium:   '#eab308',
  Low:      '#10b981',
};

/**
 * Render recommendation cards list.
 * @param {string[]} recommendations
 * @returns {string} HTML string
 */
export function renderRecommendations(recommendations) {
  if (!recommendations || recommendations.length === 0) {
    return `
      <div class="recs-panel">
        <div class="recs-panel__title">
          <span>✦</span> AI Recommendations
        </div>
        <div class="ats-card" style="text-align:center;padding:2rem;color:var(--ink-muted);font-size:0.85rem;">
          No recommendations needed — your resume is well-optimized! 🎉
        </div>
      </div>
    `;
  }

  return `
    <div class="recs-panel">
      <div class="recs-panel__title">
        <span>✦</span>
        AI Recommendations
        <span class="grade-badge grade-badge--avg" style="margin-left:auto;font-size:0.68rem;padding:0.2rem 0.6rem;">
          ${recommendations.length} suggestions
        </span>
      </div>
      <div class="recs-list" id="recsList">
        ${recommendations.map((rec, i) => _renderRecCard(rec, i)).join('')}
      </div>
    </div>
  `;
}

function _renderRecCard(text, index) {
  const icon     = REC_ICONS[index % REC_ICONS.length];
  const priority = REC_PRIORITIES[index % REC_PRIORITIES.length];
  const color    = PRIORITY_COLORS[priority];

  return `
    <div class="rec-card gsap-slide-right" id="rec-${index}">
      <div class="rec-card__body">
        <div class="rec-card__icon" style="background:rgba(${_hexToRgb(color)},0.12);color:${color};">
          ${icon}
        </div>
        <div>
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;">
            <span style="font-size:0.68rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${color};">
              ${priority}
            </span>
          </div>
          <p class="rec-card__text">${text}</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Animate recommendation cards with GSAP stagger slide-in.
 */
export function animateRecommendations() {
  if (!window.gsap) return;

  const cards = document.querySelectorAll('#recsList .rec-card');
  if (!cards.length) return;

  gsap.fromTo(cards,
    { opacity: 0, x: -20 },
    {
      opacity: 1,
      x: 0,
      duration: 0.45,
      ease: 'power3.out',
      stagger: 0.09,
      delay: 0.9,
    }
  );

  cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      gsap.to(card, { x: 4, duration: 0.18, ease: 'power2.out' });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { x: 0, duration: 0.22, ease: 'power2.inOut' });
    });
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
    : '99,102,241';
}
