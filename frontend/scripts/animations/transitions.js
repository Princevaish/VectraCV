// frontend/scripts/animations/transitions.js
// Section-level transitions and utility GSAP helpers.

/**
 * Smoothly reveal an element (fade + slide up).
 * @param {HTMLElement|string} target - element or CSS selector
 * @param {object} opts
 */
export function reveal(target, opts = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el || !window.gsap) return;

  const { delay = 0, duration = 0.45, y = 18 } = opts;

  gsap.fromTo(
    el,
    { opacity: 0, y },
    { opacity: 1, y: 0, duration, delay, ease: 'power3.out' }
  );
}

/**
 * Smoothly hide an element (fade + slide down).
 * @param {HTMLElement|string} target
 * @param {object} opts
 * @returns {Promise<void>}
 */
export function conceal(target, opts = {}) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el || !window.gsap) return Promise.resolve();

  const { duration = 0.28 } = opts;

  return new Promise(resolve => {
    gsap.to(el, {
      opacity: 0,
      y: 10,
      duration,
      ease: 'power2.in',
      onComplete: resolve,
    });
  });
}

/**
 * Cross-fade between two elements.
 * @param {HTMLElement} outEl - element to hide
 * @param {HTMLElement} inEl  - element to show
 */
export async function crossFade(outEl, inEl) {
  if (!window.gsap) {
    outEl.style.display = 'none';
    inEl.style.display  = '';
    return;
  }

  await conceal(outEl);
  outEl.style.display = 'none';
  inEl.style.display  = '';
  reveal(inEl);
}

/**
 * Stagger-reveal a list of elements.
 * @param {NodeList|HTMLElement[]} elements
 * @param {object} opts
 */
export function staggerReveal(elements, opts = {}) {
  if (!window.gsap || !elements.length) return;

  const { stagger = 0.08, y = 14, duration = 0.35, delay = 0 } = opts;

  gsap.fromTo(
    elements,
    { opacity: 0, y },
    { opacity: 1, y: 0, duration, stagger, delay, ease: 'power2.out' }
  );
}

/**
 * Animate a number counting up from 0 to value.
 * @param {HTMLElement} el
 * @param {number} value
 * @param {string} suffix
 */
export function countUp(el, value, suffix = '') {
  if (!window.gsap) {
    el.textContent = value + suffix;
    return;
  }

  const obj = { val: 0 };
  gsap.to(obj, {
    val: value,
    duration: 0.8,
    ease: 'power2.out',
    onUpdate: () => {
      el.textContent = Math.round(obj.val) + suffix;
    },
  });
}

/**
 * Pulse highlight an element briefly (draws attention).
 * @param {HTMLElement} el
 */
export function highlight(el) {
  if (!window.gsap) return;

  gsap.timeline()
    .to(el, {
      boxShadow: '0 0 0 4px var(--accent)',
      duration: 0.2,
      ease: 'power2.out',
    })
    .to(el, {
      boxShadow: 'none',
      duration: 0.6,
      ease: 'power2.inOut',
    });
}