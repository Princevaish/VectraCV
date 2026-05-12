// frontend/scripts/components/scoreRing.js
// Animated SVG score ring with GSAP counter animation.
// Displays ATS score 0–100 with color-coded glow: red/yellow/green

/**
 * Score ring SVG circumference for r=90
 * C = 2πr = 2 * π * 90 ≈ 565.49
 */
const CIRCUMFERENCE = 2 * Math.PI * 90;

/**
 * @param {number} score  0–100
 * @returns {{ colorClass: string, gradientId: string, label: string }}
 */
function _scoreTheme(score) {
  if (score >= 75) return { colorClass: 'score--good',  glowClass: 'ring-glow--good', gradientId: 'ringGradGood', label: 'Excellent' };
  if (score >= 50) return { colorClass: 'score--avg',   glowClass: 'ring-glow--avg',  gradientId: 'ringGradAvg',  label: 'Average'   };
  return               { colorClass: 'score--bad',   glowClass: 'ring-glow--bad',  gradientId: 'ringGradBad',  label: 'Needs Work' };
}

/**
 * Render the SVG score ring into #scoreRingContainer.
 * @param {number} score
 */
export function renderScoreRing(score) {
  const container = document.getElementById('scoreRingContainer');
  if (!container) return;

  const theme = _scoreTheme(score);
  const dashArray = ((score / 100) * CIRCUMFERENCE).toFixed(2);
  const dashOffset = CIRCUMFERENCE.toFixed(2);

  container.innerHTML = `
    <div class="score-ring-card">
      <div class="score-ring-wrap">
        <svg class="score-ring-svg ${theme.glowClass}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <!-- Bad (red) gradient -->
            <linearGradient id="ringGradBad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stop-color="#ef4444"/>
              <stop offset="100%" stop-color="#f97316"/>
            </linearGradient>
            <!-- Average (yellow) gradient -->
            <linearGradient id="ringGradAvg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stop-color="#eab308"/>
              <stop offset="100%" stop-color="#f59e0b"/>
            </linearGradient>
            <!-- Good (green) gradient -->
            <linearGradient id="ringGradGood" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stop-color="#10b981"/>
              <stop offset="100%" stop-color="#06b6d4"/>
            </linearGradient>
          </defs>

          <!-- Track -->
          <circle
            class="score-ring-track"
            cx="100" cy="100" r="90"
          />

          <!-- Fill arc -->
          <circle
            id="scoreRingFill"
            class="score-ring-fill score-ring-fill--${theme.gradientId === 'ringGradBad' ? 'bad' : theme.gradientId === 'ringGradAvg' ? 'avg' : 'good'}"
            cx="100" cy="100" r="90"
            stroke="url(#${theme.gradientId})"
            stroke-dasharray="0 ${dashOffset}"
          />
        </svg>

        <!-- Center number -->
        <div class="score-ring-center">
          <div class="score-ring-number ${theme.colorClass}" id="scoreRingNumber">0</div>
          <div class="score-ring-label">ATS Score</div>
        </div>
      </div>

      <!-- Grade badge -->
      <div class="grade-badge grade-badge--${score >= 75 ? 'good' : score >= 50 ? 'avg' : 'bad'}" id="scoreBadge">
        <span>${score >= 75 ? '✦' : score >= 50 ? '◈' : '◇'}</span>
        ${theme.label}
      </div>

      <!-- Score context line -->
      <p class="score-ring-context" style="font-size:0.78rem;color:var(--ink-muted);text-align:center;max-width:180px;">
        ${_getScoreContext(score)}
      </p>
    </div>
  `;

  // Animate the ring fill and counter via GSAP
  _animateRing(score, dashArray);
}

function _getScoreContext(score) {
  if (score >= 85) return 'Outstanding match. You\'re highly competitive for this role.';
  if (score >= 75) return 'Strong match. Minor tweaks will make you a top candidate.';
  if (score >= 60) return 'Moderate match. Targeted improvements recommended.';
  if (score >= 40) return 'Weak match. Significant resume optimisation needed.';
  return 'Poor match. Consider targeting a more aligned role or upskilling first.';
}

function _animateRing(score, dashArray) {
  if (!window.gsap) {
    // CSS fallback
    const fill = document.getElementById('scoreRingFill');
    const num  = document.getElementById('scoreRingNumber');
    if (fill) fill.style.strokeDasharray = `${dashArray} ${CIRCUMFERENCE}`;
    if (num)  num.textContent = Math.round(score);
    return;
  }

  const fill = document.getElementById('scoreRingFill');
  const numEl = document.getElementById('scoreRingNumber');

  // Animate the ring fill
  if (fill) {
    gsap.to(fill, {
      attr: { 'stroke-dasharray': `${dashArray} ${CIRCUMFERENCE}` },
      duration: 1.6,
      ease: 'power3.out',
      delay: 0.3,
    });
  }

  // Animate the counter
  if (numEl) {
    const counter = { val: 0 };
    gsap.to(counter, {
      val: score,
      duration: 1.8,
      ease: 'power2.out',
      delay: 0.3,
      onUpdate() {
        numEl.textContent = Math.round(counter.val);
      },
    });
  }

  // Entrance animations
  gsap.from('.score-ring-card', {
    opacity: 0,
    scale: 0.9,
    duration: 0.6,
    ease: 'back.out(1.5)',
  });
}

/**
 * Reset the score ring to empty state.
 */
export function resetScoreRing() {
  const container = document.getElementById('scoreRingContainer');
  if (container) container.innerHTML = '';
}
