// frontend/scripts/components/resultCard.js
// Renders the analysis result card and drives the typewriter effect.

import { $, truncate } from '../utils/helpers.js';
import { IDS } from '../utils/constants.js';
import { renderMarkdown } from '../utils/markdown.js';

/**
 * Render the result card for a completed analysis.
 * Uses a typewriter effect (character-by-character) for the answer body.
 *
 * @param {string} question
 * @param {string} answer
 * @param {number} retrievedChunks
 */
export function renderResult(question, answer, retrievedChunks) {
  const container = $(IDS.RESULT_CARD);
  const emptyEl   = $(IDS.RESULT_EMPTY);

  // Hide empty state
  emptyEl.style.display = 'none';
  emptyEl.setAttribute('aria-hidden', 'true');

  // Build card HTML
  const cardHtml = `
    <div class="result-card result-card-enter" role="article" aria-label="Analysis result">
      <div class="result-card__header">
        <div class="result-card__title">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.4"/>
            <path d="M4 6.5l1.8 1.8L9 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
          Analysis Complete
        </div>
        <div class="result-card__meta">
          <span>${truncate(question, 48)}</span>
          <span>·</span>
          <span>${retrievedChunks} chunks</span>
        </div>
      </div>
      <div class="result-card__body" id="resultCardBody"></div>
    </div>
  `;

  container.innerHTML = cardHtml;

  // GSAP card entrance
  if (window.gsap) {
    const card = container.querySelector('.result-card');
    gsap.from(card, {
      y: 24,
      opacity: 0,
      scale: 0.97,
      duration: 0.5,
      ease: 'back.out(1.3)',
    });
  }

  // Typewriter render
  typewriteMarkdown(answer, document.getElementById('resultCardBody'));
}

/**
 * Clear the result card and show the empty state.
 */
export function clearResult() {
  const container = $(IDS.RESULT_CARD);
  const emptyEl   = $(IDS.RESULT_EMPTY);

  container.innerHTML = '';
  emptyEl.style.display = '';
  emptyEl.removeAttribute('aria-hidden');
}

/* ── Typewriter engine ───────────────────────────────────────────────────── */

/**
 * Type out markdown content into `container`, section by section.
 * Each section (split by double-newline) fades in then reveals character
 * by character for a flowing, live-generation feel.
 *
 * @param {string} markdown
 * @param {HTMLElement} container
 */
function typewriteMarkdown(markdown, container) {
  // Split into logical sections
  const sections = markdown.split(/\n{2,}/).filter(s => s.trim());
  let sectionIndex = 0;

  function nextSection() {
    if (sectionIndex >= sections.length) {
      // Remove any lingering cursor
      const cursor = container.querySelector('.typewriter-cursor');
      if (cursor) cursor.remove();
      return;
    }

    const sectionMd = sections[sectionIndex++];
    const sectionHtml = renderMarkdown(sectionMd);

    // Create a wrapper div for this section
    const wrapper = document.createElement('div');
    wrapper.style.opacity = '0';
    container.appendChild(wrapper);

    // GSAP fade-in for the section wrapper
    if (window.gsap) {
      gsap.to(wrapper, { opacity: 1, duration: 0.3, ease: 'power2.out' });
    } else {
      wrapper.style.opacity = '1';
    }

    // For plain paragraph sections, do character-level typewriting
    // For headings / lists, reveal the whole rendered HTML at once
    const isHeading = /^#{1,3} /.test(sectionMd.trim());
    const isList    = /^[-*+\d]/.test(sectionMd.trim());

    if (isHeading || isList) {
      wrapper.innerHTML = sectionHtml;
      setTimeout(nextSection, 120);
    } else {
      // Extract plain text from single paragraph for typewriter
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = sectionHtml;
      const plainText = tempDiv.textContent || tempDiv.innerText;

      const p = document.createElement('p');
      p.style.cssText = `
        font-family: var(--font-mono);
        font-size: 0.79rem;
        line-height: 1.76;
        color: var(--ink);
        margin-bottom: 12px;
      `;
      wrapper.appendChild(p);

      // Add cursor
      const cursor = document.createElement('span');
      cursor.className = 'typewriter-cursor';
      p.appendChild(cursor);

      let charIndex = 0;
      const CHAR_DELAY = 8; // ms per character — fast but visible

      function typeChar() {
        if (charIndex < plainText.length) {
          p.insertBefore(
            document.createTextNode(plainText[charIndex]),
            cursor
          );
          charIndex++;
          setTimeout(typeChar, CHAR_DELAY);
        } else {
          cursor.remove();
          setTimeout(nextSection, 80);
        }
      }

      typeChar();
    }
  }

  nextSection();
}