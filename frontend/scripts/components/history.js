// frontend/scripts/components/history.js
// Renders the query history list and handles replay clicks.

import { $, escHtml, formatTime, scrollTo } from '../utils/helpers.js';
import { IDS } from '../utils/constants.js';
import { getState } from '../state/appState.js';
import { renderResult } from './resultCard.js';

/**
 * Re-render the full history list from current state.
 * Shows/hides the section based on whether history exists.
 */
export function renderHistory() {
  const { history } = getState();
  const section   = $(IDS.HISTORY_SECTION);
  const list      = $(IDS.HISTORY_LIST);
  const countEl   = $(IDS.HISTORY_COUNT);

  if (!history.length) {
    section.style.display = 'none';
    return;
  }

  section.style.display = '';
  countEl.textContent = history.length;

  list.innerHTML = history
    .map((item, i) => `
      <div class="history-item" role="listitem" data-index="${i}"
           tabindex="0" aria-label="${escHtml(item.question)}">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
             style="flex-shrink:0;color:var(--ink-muted)" aria-hidden="true">
          <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.3"/>
          <path d="M6.5 4v2.5l1.5 1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        <span class="history-item__q">${escHtml(item.question)}</span>
        <span class="history-item__time">${formatTime(item.time)}</span>
      </div>
    `)
    .join('');

  // Stagger entrance
  if (window.gsap) {
    gsap.from(list.querySelectorAll('.history-item'), {
      x: -12,
      opacity: 0,
      duration: 0.25,
      stagger: 0.06,
      ease: 'power2.out',
    });
  }

  // Bind clicks
  list.querySelectorAll('.history-item').forEach(item => {
    const handler = () => {
      const idx = parseInt(item.dataset.index, 10);
      replayHistoryItem(idx);
    };
    item.addEventListener('click', handler);
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
    });
  });
}

/**
 * Replay a history item — show its result without re-fetching.
 * @param {number} index
 */
function replayHistoryItem(index) {
  const { history } = getState();
  const item = history[index];
  if (!item) return;

  const questionInput = document.getElementById(IDS.QUESTION_INPUT);
  if (questionInput) questionInput.value = item.question;

  renderResult(item.question, item.answer, item.chunks);
  scrollTo(`#${IDS.RESULT_AREA}`, 80);
}