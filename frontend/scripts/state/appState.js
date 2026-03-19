// frontend/scripts/state/appState.js
// Centralised reactive application state.
// Components read state via getState() and mutate via setState().
// Every mutation dispatches a STATE_CHANGED event so listeners re-render.

import { emit, on } from '../utils/helpers.js';
import { EVENTS } from '../utils/constants.js';
import { CONFIG } from '../../config/config.js';

/** @typedef {'idle'|'loading'|'success'|'error'} Status */

/**
 * @typedef {Object} AppStateShape
 * @property {boolean}   dataLoaded      - True after /load-data succeeds
 * @property {boolean}   loading         - True during any API call
 * @property {Status}    loadStatus      - State of the /load-data call
 * @property {Status}    analyzeStatus   - State of the /analyze call
 * @property {string|null} error         - Last error message
 * @property {number}    resumeChunks    - Chunks stored from resume
 * @property {number}    jobChunks       - Chunks stored from job desc
 * @property {string}    lastQuestion    - Most recent question asked
 * @property {string}    lastAnswer      - Most recent LLM answer
 * @property {number}    retrievedChunks - Chunks retrieved in last query
 * @property {Array}     history         - Query history array
 * @property {'light'|'dark'} theme      - Current colour theme
 */

/** @type {AppStateShape} */
let _state = {
  dataLoaded:      false,
  loading:         false,
  loadStatus:      'idle',
  analyzeStatus:   'idle',
  error:           null,
  resumeChunks:    0,
  jobChunks:       0,
  lastQuestion:    '',
  lastAnswer:      '',
  retrievedChunks: 0,
  history:         [],
  theme:           'light',
};

/**
 * Return a shallow copy of the current state (immutable read).
 * @returns {AppStateShape}
 */
export function getState() {
  return { ..._state };
}

/**
 * Merge updates into state and emit STATE_CHANGED.
 * @param {Partial<AppStateShape>} updates
 */
export function setState(updates) {
  const prev = { ..._state };
  _state = { ..._state, ...updates };
  emit(EVENTS.STATE_CHANGED, { prev, next: _state, changed: Object.keys(updates) });
}

/**
 * Add a history entry.
 * @param {{ question: string, answer: string, chunks: number }} entry
 */
export function addHistory(entry) {
  const history = [
    { ...entry, time: new Date() },
    ..._state.history,
  ].slice(0, CONFIG.MAX_HISTORY);

  setState({ history });
}

/**
 * Clear all history.
 */
export function clearHistory() {
  setState({ history: [] });
}

/**
 * Toggle theme between light/dark.
 */
export function toggleTheme() {
  const theme = _state.theme === 'light' ? 'dark' : 'light';
  setState({ theme });
  document.documentElement.setAttribute('data-theme', theme);
  document.body.setAttribute('data-theme', theme);
  emit(EVENTS.THEME_CHANGED, { theme });
}

// ── Initialise theme from localStorage ──────────────────────────────────────
const saved = localStorage.getItem('rr-theme');
if (saved === 'dark' || saved === 'light') {
  _state.theme = saved;
  document.body.setAttribute('data-theme', saved);
}

// Persist theme preference
on(EVENTS.THEME_CHANGED, ({ detail }) => {
  localStorage.setItem('rr-theme', detail.theme);
});