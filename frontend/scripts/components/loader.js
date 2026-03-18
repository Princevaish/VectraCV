// frontend/scripts/components/loader.js
// Full-screen overlay loader for the Analyze flow.
// Manages: message cycling, cold-start warning, progress bar, GSAP animations.

import { $, sleep } from '../utils/helpers.js';
import { IDS } from '../utils/constants.js';
import Config from '../../config/config.js';

let _coldStartTimer    = null;
let _messageInterval   = null;
let _progressAnimation = null;
let _messageIndex      = 0;

const overlay  = () => $(IDS.OVERLAY);
const msgEl    = () => $(IDS.OVERLAY_MSG);
const coldEl   = () => $(IDS.OVERLAY_COLD);
const progress = () => $(IDS.OVERLAY_PROGRESS);

/**
 * Show the full-screen loader overlay.
 * Starts message cycling and cold-start warning.
 */
export function showLoader() {
  const el = overlay();
  el.setAttribute('aria-hidden', 'false');
  el.classList.add('is-visible');

  // Reset state
  _messageIndex = 0;
  coldEl().classList.remove('is-visible');
  progress().style.width = '0%';
  updateMessage(0);

  // GSAP entrance
  if (window.gsap) {
    const inner = el.querySelector('.overlay__inner');
    gsap.fromTo(
      el,
      { opacity: 0 },
      { opacity: 1, duration: 0.3, ease: 'power2.out' }
    );
    gsap.fromTo(
      inner,
      { y: 30, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.4)', delay: 0.1 }
    );

    // Animate the logo mark inside the ring
    const logo = el.querySelector('.overlay__logo');
    if (logo) {
      gsap.fromTo(logo,
        { scale: 0.7, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: 'elastic.out(1,0.5)', delay: 0.2 }
      );
    }
  }

  // Cycle messages
  _messageInterval = setInterval(() => {
    _messageIndex = (_messageIndex + 1) % Config.LOADER_MESSAGES.length;
    updateMessage(_messageIndex);
  }, 1800);

  // Cold-start warning after threshold
  _coldStartTimer = setTimeout(() => {
    coldEl().classList.add('is-visible');
    if (window.gsap) {
      gsap.from(coldEl(), { opacity: 0, y: 8, duration: 0.4, ease: 'power2.out' });
    }
  }, Config.COLD_START_THRESHOLD_MS);

  // Animate progress bar to 90% over ~15s (indeterminate feel)
  animateProgressIndeterminate();
}

/**
 * Hide the loader overlay with exit animation.
 * @param {boolean} success - if true, progress completes to 100%
 */
export async function hideLoader(success = true) {
  clearInterval(_messageInterval);
  clearTimeout(_coldStartTimer);
  _messageInterval = null;
  _coldStartTimer  = null;

  if (success) {
    progress().style.width = '100%';
    await sleep(300);
  }

  const el = overlay();

  if (window.gsap) {
    await new Promise(resolve => {
      gsap.to(el, {
        opacity: 0,
        duration: 0.35,
        ease: 'power2.in',
        onComplete: resolve,
      });
    });
  }

  el.classList.remove('is-visible');
  el.setAttribute('aria-hidden', 'true');
  progress().style.width = '0%';
  coldEl().classList.remove('is-visible');

  if (_progressAnimation) {
    _progressAnimation.kill();
    _progressAnimation = null;
  }
}

/* ── Private helpers ─────────────────────────────────────────────────────── */

function updateMessage(index) {
  const el = msgEl();
  const msg = Config.LOADER_MESSAGES[index];

  if (window.gsap) {
    gsap.to(el, {
      opacity: 0,
      y: -8,
      duration: 0.18,
      onComplete: () => {
        el.textContent = msg;
        gsap.fromTo(el, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25 });
      },
    });
  } else {
    el.textContent = msg;
  }

  // Update progress bar to matching step
  const pct = Config.LOADER_PROGRESS[index] ?? 85;
  progress().style.width = `${pct}%`;
}

function animateProgressIndeterminate() {
  if (!window.gsap) return;

  _progressAnimation = gsap.to(progress(), {
    width:    '88%',
    duration: 18,
    ease:     'power1.out',
  });
}