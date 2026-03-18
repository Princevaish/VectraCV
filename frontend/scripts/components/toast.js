// frontend/scripts/components/toast.js
// Self-contained toast notification system.

import { $ } from '../utils/helpers.js';
import { IDS } from '../utils/constants.js';

const ICONS = {
  success: `<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.4"/><path d="M4 6.5l1.8 1.8L9 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  error:   `<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.4"/><path d="M4.5 4.5l4 4M8.5 4.5l-4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  info:    `<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.4"/><path d="M6.5 4v3M6.5 8.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  warning: `<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 2L12 11H1L6.5 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M6.5 6v2M6.5 9.5v.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
};

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {number} duration - ms before auto-dismiss
 */
export function showToast(message, type = 'info', duration = 4000) {
  const container = $(IDS.TOAST_CONTAINER);

  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.setAttribute('role', 'alert');
  el.innerHTML = `
    <span class="toast__icon">${ICONS[type] || ICONS.info}</span>
    <span class="toast__text">${message}</span>
  `;

  container.appendChild(el);

  // GSAP entrance if available, else CSS animation handles it
  if (window.gsap) {
    gsap.from(el, {
      x: 60,
      opacity: 0,
      duration: 0.35,
      ease: 'back.out(1.4)',
    });
  }

  // Auto-dismiss
  setTimeout(() => dismissToast(el), duration);

  // Click to dismiss
  el.addEventListener('click', () => dismissToast(el), { once: true });
}

/**
 * Dismiss a toast element with exit animation.
 * @param {HTMLElement} el
 */
function dismissToast(el) {
  if (!el.isConnected) return;

  if (window.gsap) {
    gsap.to(el, {
      x: 60,
      opacity: 0,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: () => el.remove(),
    });
  } else {
    el.classList.add('is-exiting');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }
}