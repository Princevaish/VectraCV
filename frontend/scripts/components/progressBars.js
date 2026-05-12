// frontend/scripts/components/progressBars.js
// Animated progress bar components for metric score display.

/**
 * Get CSS class suffix based on score value.
 * @param {number} score
 * @returns {string}
 */
export function getScoreColorClass(score) {
  if (score >= 75) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

/**
 * Render an animated progress bar element.
 * @param {number} score  0–100
 * @param {string} [colorOverride]  CSS color class (green/yellow/red/blue/purple/accent)
 * @returns {string} HTML string
 */
export function renderProgressBar(score, colorOverride) {
  const color = colorOverride || getScoreColorClass(score);
  return `
    <div class="progress-bar" role="progressbar" aria-valuenow="${score}" aria-valuemin="0" aria-valuemax="100">
      <div class="progress-bar__fill progress-bar__fill--${color}" data-target-width="${score}%"></div>
    </div>
  `;
}

/**
 * Animate all progress bars in a given container using GSAP.
 * Call after rendering progress bar HTML into the DOM.
 * @param {HTMLElement} [container=document]
 * @param {number} [delay=0]  GSAP stagger delay
 */
export function animateProgressBars(container = document, delay = 0) {
  const fills = container.querySelectorAll('.progress-bar__fill[data-target-width]');
  if (!fills.length) return;

  if (!window.gsap) {
    // CSS fallback — just set widths directly
    fills.forEach(el => {
      el.style.width = el.dataset.targetWidth;
    });
    return;
  }

  fills.forEach((el, i) => {
    const targetWidth = el.dataset.targetWidth;
    gsap.fromTo(el,
      { width: '0%' },
      {
        width: targetWidth,
        duration: 1.2,
        ease: 'power3.out',
        delay: delay + i * 0.1,
      }
    );
  });
}

/**
 * Create a mini inline score bar (for use inside cards).
 * @param {number} score
 * @param {string} label
 * @param {string} [color]
 * @returns {string} HTML string
 */
export function renderMiniBar(score, label, color) {
  const c = color || getScoreColorClass(score);
  return `
    <div class="mini-bar-wrap">
      <div class="mini-bar-header">
        <span class="mini-bar-label">${label}</span>
        <span class="mini-bar-value" style="color: var(--${c === 'green' ? 'color-green' : c === 'yellow' ? 'color-yellow' : 'color-red'})">${Math.round(score)}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar__fill progress-bar__fill--${c}" data-target-width="${score}%"></div>
      </div>
    </div>
  `;
}
