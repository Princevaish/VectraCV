// frontend/scripts/utils/helpers.js
// Pure utility functions with no side effects.

/**
 * Get element by ID, throw if missing.
 * @param {string} id
 * @returns {HTMLElement}
 */
export function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el;
}

/**
 * Count words in a string.
 * @param {string} text
 * @returns {number}
 */
export function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Format a Date to HH:MM.
 * @param {Date} d
 * @returns {string}
 */
export function formatTime(d) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Escape HTML special characters.
 * @param {string} s
 * @returns {string}
 */
export function escHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

/**
 * Debounce a function.
 * @param {Function} fn
 * @param {number} delay - ms
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Smooth-scroll to an element.
 * @param {HTMLElement|string} target - element or selector
 * @param {number} offset - px offset from top
 */
export function scrollTo(target, offset = 80) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: 'smooth' });
}

/**
 * Sleep for ms milliseconds (returns a Promise).
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Truncate text with ellipsis at maxLen characters.
 */
export function truncate(text, maxLen = 60) {
  return text.length <= maxLen ? text : text.slice(0, maxLen - 1) + '…';
}

/**
 * Dispatch a custom event on the document.
 * @param {string} name
 * @param {any} detail
 */
export function emit(name, detail) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

/**
 * Listen for a custom event on the document.
 * @param {string} name
 * @param {Function} handler
 */
export function on(name, handler) {
  document.addEventListener(name, handler);
}