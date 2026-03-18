// frontend/scripts/components/stepManager.js
// Controls the 3-step progress indicator in the steps bar.

import { $ } from '../utils/helpers.js';
import { IDS } from '../utils/constants.js';

const STEPS = [IDS.STEP1, IDS.STEP2, IDS.STEP3];

/**
 * Set the active step (1-indexed).
 * Steps < active become "done", step === active becomes "active",
 * steps > active have no special class.
 *
 * @param {1|2|3} stepNumber
 */
export function setStep(stepNumber) {
  STEPS.forEach((id, i) => {
    const el = $(id);
    const stepIndex = i + 1; // 1-indexed

    el.classList.remove('active', 'done');

    if (stepIndex < stepNumber) {
      el.classList.add('done');
      el.removeAttribute('aria-current');
    } else if (stepIndex === stepNumber) {
      el.classList.add('active');
      el.setAttribute('aria-current', 'step');
    } else {
      el.removeAttribute('aria-current');
    }

    // Animate the number circle
    if (window.gsap) {
      const num = el.querySelector('.step__num');
      if (num && stepIndex === stepNumber) {
        gsap.from(num, {
          scale: 1.4,
          duration: 0.35,
          ease: 'elastic.out(1, 0.5)',
        });
      }
    }
  });
}

/**
 * Get the current active step number (1-3).
 * @returns {number}
 */
export function getActiveStep() {
  for (let i = 0; i < STEPS.length; i++) {
    if ($(STEPS[i]).classList.contains('active')) return i + 1;
  }
  return 1;
}

/**
 * Bind step buttons to scroll to their target sections.
 */
export function bindStepNavigation() {
  STEPS.forEach(id => {
    const el = $(id);
    el.addEventListener('click', () => {
      const targetId = el.dataset.target;
      if (!targetId) return;
      const target = document.getElementById(targetId);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}