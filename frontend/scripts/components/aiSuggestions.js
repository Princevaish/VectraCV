// frontend/scripts/components/aiSuggestions.js
// AI Suggestions workspace — renders categorized recommendations after ATS analysis.

import { showToast } from './toast.js';

/**
 * Render the full AI Suggestions page from ATS analysis data.
 * @param {HTMLElement} container  — #aiSuggestionsContainer
 * @param {Object}      atsData   — response from /api/ats-score
 */
export function renderAISuggestions(container, atsData) {
  if (!container || !atsData) return;
  container.innerHTML = '';

  const categories = buildCategories(atsData);
  if (!categories.length) {
    container.innerHTML = `<div class="empty-state"><p>No suggestions available. Run an analysis first.</p></div>`;
    return;
  }

  // Stats bar
  const statsBar = document.createElement('div');
  statsBar.className = 'sug-stats';
  const critical = categories.reduce((n, c) => n + c.items.filter(i => i.severity === 'critical').length, 0);
  const moderate = categories.reduce((n, c) => n + c.items.filter(i => i.severity === 'moderate').length, 0);
  const optional = categories.reduce((n, c) => n + c.items.filter(i => i.severity === 'optional').length, 0);
  const total = critical + moderate + optional;

  statsBar.innerHTML = `
    <div class="sug-stats__item">
      <span class="sug-stats__num">${total}</span>
      <span class="sug-stats__label">Total</span>
    </div>
    <div class="sug-stats__item sug-stats__item--critical">
      <span class="sug-stats__num">${critical}</span>
      <span class="sug-stats__label">Critical</span>
    </div>
    <div class="sug-stats__item sug-stats__item--moderate">
      <span class="sug-stats__num">${moderate}</span>
      <span class="sug-stats__label">Moderate</span>
    </div>
    <div class="sug-stats__item sug-stats__item--optional">
      <span class="sug-stats__num">${optional}</span>
      <span class="sug-stats__label">Optional</span>
    </div>
  `;
  container.appendChild(statsBar);

  // Render each category
  categories.forEach((cat, catIdx) => {
    const section = document.createElement('div');
    section.className = 'sug-category';
    section.innerHTML = `
      <div class="sug-category__header">
        <div class="sug-category__icon">${cat.icon}</div>
        <div class="sug-category__info">
          <h3 class="sug-category__title">${cat.title}</h3>
          <p class="sug-category__desc">${cat.description}</p>
        </div>
        <span class="sug-category__count">${cat.items.length}</span>
      </div>
      <div class="sug-category__items"></div>
    `;

    const itemsWrap = section.querySelector('.sug-category__items');

    cat.items.forEach((item, itemIdx) => {
      const card = document.createElement('div');
      card.className = `sug-card sug-card--${item.severity}`;
      card.innerHTML = `
        <div class="sug-card__top">
          <span class="sug-badge sug-badge--${item.severity}">${item.severity}</span>
          <button class="sug-card__toggle" aria-label="Expand" data-expanded="false">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <h4 class="sug-card__title">${item.title}</h4>
        <p class="sug-card__summary">${item.summary}</p>
        <div class="sug-card__detail" style="display:none;">
          ${item.detail}
          ${item.pills ? `<div class="sug-card__pills">${item.pills.map(p => `<span class="sug-pill">${p}</span>`).join('')}</div>` : ''}
        </div>
      `;

      // Expand/collapse
      const toggle = card.querySelector('.sug-card__toggle');
      const detail = card.querySelector('.sug-card__detail');
      toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('data-expanded') === 'true';
        toggle.setAttribute('data-expanded', String(!open));
        if (window.gsap) {
          if (!open) {
            detail.style.display = 'block';
            gsap.fromTo(detail, {height:0,opacity:0}, {height:'auto',opacity:1,duration:.3,ease:'power2.out'});
            gsap.to(toggle, {rotation:180,duration:.25});
          } else {
            gsap.to(detail, {height:0,opacity:0,duration:.25,ease:'power2.in',onComplete:()=>{detail.style.display='none';}});
            gsap.to(toggle, {rotation:0,duration:.25});
          }
        } else {
          detail.style.display = open ? 'none' : 'block';
        }
      });

      itemsWrap.appendChild(card);
    });

    container.appendChild(section);

    // GSAP stagger animation
    if (window.gsap) {
      gsap.fromTo(section,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, delay: catIdx * 0.12, ease: 'power2.out' }
      );
      const cards = itemsWrap.querySelectorAll('.sug-card');
      gsap.fromTo(cards,
        { opacity: 0, y: 15, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, stagger: 0.06, delay: catIdx * 0.12 + 0.2, ease: 'power2.out' }
      );
    }
  });
}

function buildCategories(data) {
  const cats = [];

  // 1. Missing Keywords
  const missing = data.missing_keywords || [];
  if (missing.length > 0) {
    cats.push({
      title: 'Missing Keywords',
      description: 'Critical keywords found in the JD but absent from your resume.',
      icon: keywordIcon,
      items: [{
        severity: missing.length > 5 ? 'critical' : 'moderate',
        title: `${missing.length} keywords missing from resume`,
        summary: `Your resume is missing important terms the ATS will scan for. Add these naturally throughout your experience.`,
        detail: `<p>Integrate these keywords into your bullet points and summary. Don't keyword-stuff — weave them into real accomplishments.</p>`,
        pills: missing.slice(0, 15),
      }]
    });
  }

  // 2. Semantic Alignment
  const sem = Math.round((data.semantic_similarity || 0) * 100) / 100;
  if (sem < 80) {
    const sev = sem < 50 ? 'critical' : sem < 65 ? 'moderate' : 'optional';
    cats.push({
      title: 'Semantic Alignment',
      description: 'How closely your resume\'s meaning aligns with the JD.',
      icon: semanticIcon,
      items: [{
        severity: sev,
        title: `Semantic similarity: ${sem.toFixed(1)}%`,
        summary: sem < 50
          ? 'Your resume language diverges significantly from the job description.'
          : 'There is room to improve alignment between your resume language and the JD.',
        detail: `<p>Mirror the JD's terminology — if they say "microservices," use "microservices" instead of "distributed systems." Use the same phrasing for technologies, methodologies, and outcomes.</p>`,
        pills: null,
      }]
    });
  }

  // 3. Keyword Match Rate
  const kwMatch = data.keyword_match || 0;
  if (kwMatch < 80) {
    cats.push({
      title: 'Keyword Density',
      description: 'Percentage of JD keywords found in your resume.',
      icon: densityIcon,
      items: [{
        severity: kwMatch < 40 ? 'critical' : kwMatch < 60 ? 'moderate' : 'optional',
        title: `Keyword match rate: ${kwMatch.toFixed(1)}%`,
        summary: 'Increase the number of JD-relevant keywords throughout your resume.',
        detail: `<p>Focus on your professional summary, skills section, and most recent role. Each bullet point should contain at least one relevant keyword from the job description.</p>`,
        pills: (data.matched_keywords || []).slice(0, 8),
      }]
    });
  }

  // 4. Action Verbs
  const av = data.action_verb_strength || 0;
  if (av < 80) {
    cats.push({
      title: 'Action Verb Strength',
      description: 'Strength and impact of your resume\'s action verbs.',
      icon: verbIcon,
      items: [{
        severity: av < 45 ? 'critical' : av < 65 ? 'moderate' : 'optional',
        title: `Action verb score: ${av.toFixed(1)}%`,
        summary: 'Use stronger, more impactful action verbs to begin your bullet points.',
        detail: `<p>Replace weak verbs like "helped," "worked on," "was responsible for" with power verbs:</p>`,
        pills: ['Engineered', 'Optimized', 'Orchestrated', 'Architected', 'Spearheaded', 'Delivered', 'Accelerated', 'Streamlined'],
      }]
    });
  }

  // 5. Quantified Achievements
  const qa = data.quantified_achievement_score || 0;
  if (qa < 80) {
    cats.push({
      title: 'Quantified Achievements',
      description: 'How well your resume uses metrics and numbers.',
      icon: metricsIcon,
      items: [{
        severity: qa < 40 ? 'critical' : qa < 60 ? 'moderate' : 'optional',
        title: `Achievement quantification: ${qa.toFixed(1)}%`,
        summary: 'Add specific numbers, percentages, and scale indicators to your bullet points.',
        detail: `<p>Transform generic statements into measurable impact. Examples:</p>
          <ul>
            <li>"Managed a team" → "Led a cross-functional team of 8 engineers"</li>
            <li>"Improved performance" → "Reduced API latency by 42% serving 2M daily requests"</li>
            <li>"Built features" → "Delivered 15 customer-facing features driving $2.1M ARR"</li>
          </ul>`,
        pills: null,
      }]
    });
  }

  // 6. Skill Coverage
  const sc = data.skill_coverage || 0;
  if (sc < 80) {
    cats.push({
      title: 'Skill Coverage',
      description: 'How well your listed skills match the JD requirements.',
      icon: skillIcon,
      items: [{
        severity: sc < 45 ? 'critical' : sc < 65 ? 'moderate' : 'optional',
        title: `Skill coverage: ${sc.toFixed(1)}%`,
        summary: 'Your skills section doesn\'t cover enough JD requirements.',
        detail: `<p>Add missing skills to your skills section. If you have experience with these technologies, list them explicitly — ATS systems match on exact skill names.</p>`,
        pills: null,
      }]
    });
  }

  // 7. Recommendations from backend
  const recs = data.recommendations || [];
  if (recs.length > 0) {
    cats.push({
      title: 'AI Recommendations',
      description: 'Personalized suggestions from the ATS analysis engine.',
      icon: aiIcon,
      items: recs.map((rec, i) => ({
        severity: i === 0 ? 'moderate' : 'optional',
        title: `Recommendation ${i + 1}`,
        summary: rec,
        detail: '',
        pills: null,
      }))
    });
  }

  return cats;
}

// SVG icons
const keywordIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" stroke-linecap="round"/></svg>`;
const semanticIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`;
const densityIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3" stroke-linecap="round"/></svg>`;
const verbIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const metricsIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const skillIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 15l2 2 4-4" stroke-linecap="round"/></svg>`;
const aiIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke-linecap="round"/></svg>`;
