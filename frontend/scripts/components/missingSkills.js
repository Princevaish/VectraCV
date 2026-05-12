// frontend/scripts/components/missingSkills.js
// Renders matched and missing skill chips with animated reveal.

/**
 * Render the keyword panels (matched + missing skills).
 * @param {string[]} matched
 * @param {string[]} missing
 * @returns {string} HTML string
 */
export function renderKeywordPanels(matched, missing) {
  return `
    <div class="keywords-grid">
      <!-- Matched Keywords -->
      <div class="ats-card keywords-panel gsap-fade-up">
        <div class="keywords-panel__title">
          <span class="keywords-panel__dot keywords-panel__dot--matched"></span>
          Matched Keywords
          <span class="grade-badge grade-badge--good" style="margin-left:auto; font-size:0.68rem; padding:0.2rem 0.6rem;">
            ${matched.length}
          </span>
        </div>
        <div class="skills-cloud" id="matchedSkillsCloud">
          ${matched.length > 0
            ? matched.map(k => _chip(k, 'matched')).join('')
            : '<span style="font-size:0.8rem;color:var(--ink-muted);">No keywords matched yet.</span>'
          }
        </div>
      </div>

      <!-- Missing Keywords -->
      <div class="ats-card keywords-panel gsap-fade-up">
        <div class="keywords-panel__title">
          <span class="keywords-panel__dot keywords-panel__dot--missing"></span>
          Missing Keywords
          <span class="grade-badge grade-badge--bad" style="margin-left:auto; font-size:0.68rem; padding:0.2rem 0.6rem;">
            ${missing.length}
          </span>
        </div>
        <div class="skills-cloud" id="missingSkillsCloud">
          ${missing.length > 0
            ? missing.map(k => _chip(k, 'missing')).join('')
            : '<span style="font-size:0.8rem;color:var(--ink-muted);">No critical gaps found! ✓</span>'
          }
        </div>
      </div>
    </div>
  `;
}

function _chip(keyword, type) {
  return `
    <span class="skill-chip skill-chip--${type} gsap-scale-in">
      ${type === 'matched' ? '✓' : '+'} ${keyword}
    </span>
  `;
}

/**
 * Animate skill chips with GSAP stagger.
 */
export function animateSkillChips() {
  if (!window.gsap) return;

  const matched = document.querySelectorAll('#matchedSkillsCloud .skill-chip');
  const missing = document.querySelectorAll('#missingSkillsCloud .skill-chip');

  const animate = (chips, delay = 0) => {
    if (!chips.length) return;
    gsap.fromTo(chips,
      { opacity: 0, scale: 0.75, y: 8 },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.35,
        ease: 'back.out(1.7)',
        stagger: 0.04,
        delay,
      }
    );

    // Hover microinteraction
    chips.forEach(chip => {
      chip.addEventListener('mouseenter', () => {
        gsap.to(chip, { scale: 1.08, duration: 0.15, ease: 'power2.out' });
      });
      chip.addEventListener('mouseleave', () => {
        gsap.to(chip, { scale: 1, duration: 0.2, ease: 'power2.inOut' });
      });
    });
  };

  animate(matched, 0.6);
  animate(missing, 0.8);
}
