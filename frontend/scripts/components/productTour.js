// frontend/scripts/components/productTour.js
// Reusable interactive onboarding tour using SVG masks and GSAP.

import { showToast } from './toast.js';

// Tour steps config matching spec
const TOUR_STEPS = [
  {
    title: "Welcome to VectraAI Pro",
    body: "VectraAI Pro is a premium AI-powered Resume Intelligence Platform. We help you optimize your resume for modern Applicant Tracking Systems (ATS) using semantic matching and semantic embeddings.",
    target: "[data-tour='hero-card']",
    placement: "bottom"
  },
  {
    title: "Resume Upload",
    body: "Upload your resume in PDF, DOCX, or TXT formats, or toggle to the 'Text' tab to paste your content. VectraAI will extract and analyze its structure.",
    target: "[data-tour='resume-card']",
    placement: "bottom"
  },
  {
    title: "Job Description Upload",
    body: "Upload or paste the target job description. VectraAI analyzes this text to identify critical requirements and semantic gaps.",
    target: "[data-tour='jd-card']",
    placement: "bottom"
  },
  {
    title: "Run Analysis",
    body: "Click 'Generate AI Insights' to compute your ATS compliance scorecard, semantic relevance, and extract key improvement suggestions.",
    target: "[data-tour='run-analysis']",
    placement: "top"
  },
  {
    title: "ATS Analysis Dashboard",
    body: "Review your overall ATS score, keyword alignment, and deep semantic matching scores to see exactly where you stand.",
    target: "[data-tour='ats-dashboard']",
    placement: "top",
    onEnter: () => {
      // Ensure we switch to dashboard first
      switchToView('dashboard');
      // Handle visibility of ATS Dashboard section during tour if no analysis run yet
      const atsSection = document.getElementById('atsDashboardSection');
      if (atsSection && atsSection.style.display === 'none') {
        atsSection.style.display = 'block';
        atsSection.dataset.tourTempVisible = "true";
      }
    },
    onLeave: () => {
      const atsSection = document.getElementById('atsDashboardSection');
      if (atsSection && atsSection.dataset.tourTempVisible === "true") {
        atsSection.style.display = 'none';
        delete atsSection.dataset.tourTempVisible;
      }
    }
  },
  {
    title: "AI Suggestions",
    body: "Unlock personalized, prioritised recommendations. Learn which keywords to incorporate and which impact metrics to highlight.",
    target: "[data-tour='nav-ai']",
    placement: "right",
    onEnter: () => {
      switchToView('ai');
    }
  },
  {
    title: "Conversational Copilot",
    body: "Chat directly with VectraAI about your resume. Ask questions like 'Am I a good fit for this role?' or get suggestions on rewriting specific bullet points.",
    target: "[data-tour='nav-chat']",
    placement: "right",
    onEnter: () => {
      switchToView('chat');
    }
  },
  {
    title: "AI Resume Optimizer",
    body: "Generate a tailored, optimized version of your resume. Select your target role, tone, and focus area to generate a drop-in replacement.",
    target: "[data-tour='nav-optimizer']",
    placement: "right",
    onEnter: () => {
      switchToView('optimizer');
    }
  },
  {
    title: "Analysis History",
    body: "Keep track of all your past resume runs. View previous optimization scores or delete individual analyses to clean up your workspace.",
    target: "[data-tour='nav-history']",
    placement: "right",
    onEnter: () => {
      switchToView('history');
    }
  },
  {
    title: "Ready to Land Your Dream Job?",
    body: "You're all set! Get started by uploading your documents to bypass ATS filters and land more interviews.",
    target: null, // centered
    placement: "center",
    onEnter: () => {
      switchToView('dashboard');
    }
  }
];

let currentStepIdx = 0;
let overlayEl = null;
let tooltipEl = null;
let currentTargetEl = null;
let resizeObserver = null;

/**
 * Switch view by programmatically clicking sidebar nav button.
 * @param {string} viewName 
 */
function switchToView(viewName) {
  const btn = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  if (btn) {
    btn.click();
  }
}

/**
 * Launch the product tour walkthrough overlay.
 */
export function startTour() {
  if (overlayEl) {
    endTour();
  }

  currentStepIdx = 0;
  createTourDOM();
  showStep(0);
  bindEvents();
}

/**
 * Creates and injects the tour elements into the DOM if not present.
 */
function createTourDOM() {
  // SVG overlay for backdrop & spotlight mask
  overlayEl = document.createElement('div');
  overlayEl.className = 'tour-overlay';
  overlayEl.innerHTML = `
    <div class="tour-overlay-bg"></div>
    <svg style="position: fixed; inset: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 9998;">
      <defs>
        <mask id="tour-spotlight-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect id="tour-spotlight-cutout" class="tour-spotlight-rect" x="0" y="0" width="0" height="0" rx="10" ry="10" fill="black" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="rgba(10, 10, 15, 0.55)" mask="url(#tour-spotlight-mask)" style="pointer-events: auto;" />
    </svg>
  `;
  document.body.appendChild(overlayEl);

  // Tooltip card
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'tour-tooltip';
  tooltipEl.innerHTML = `
    <div class="tour-tooltip__header">
      <span class="tour-tooltip__step-count"></span>
      <button class="tour-tooltip__close-btn" aria-label="Close tour">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <h4 class="tour-tooltip__title"></h4>
    <p class="tour-tooltip__body"></p>
    <div class="tour-tooltip__progress-bar">
      <div class="tour-tooltip__progress-fill"></div>
    </div>
    <div class="tour-tooltip__footer">
      <button class="tour-tooltip__skip-btn">Skip tour</button>
      <div class="tour-tooltip__nav-group">
        <button class="tour-tooltip__btn tour-tooltip__btn--prev">Back</button>
        <button class="tour-tooltip__btn tour-tooltip__btn--next">Next</button>
      </div>
    </div>
    <div class="tour-tooltip__arrow"></div>
  `;
  document.body.appendChild(tooltipEl);
}

/**
 * Display the step at the given index.
 * @param {number} idx 
 */
async function showStep(idx) {
  if (idx < 0 || idx >= TOUR_STEPS.length) return;

  // Run onLeave callback of previous step
  const prevStep = TOUR_STEPS[currentStepIdx];
  if (prevStep && prevStep.onLeave) {
    prevStep.onLeave();
  }

  currentStepIdx = idx;
  const step = TOUR_STEPS[idx];

  // Run onEnter callback of new step
  if (step.onEnter) {
    step.onEnter();
  }

  // Update tooltip content
  const stepCountEl = tooltipEl.querySelector('.tour-tooltip__step-count');
  const titleEl = tooltipEl.querySelector('.tour-tooltip__title');
  const bodyEl = tooltipEl.querySelector('.tour-tooltip__body');
  const progressFill = tooltipEl.querySelector('.tour-tooltip__progress-fill');
  const prevBtn = tooltipEl.querySelector('.tour-tooltip__btn--prev');
  const nextBtn = tooltipEl.querySelector('.tour-tooltip__btn--next');

  stepCountEl.textContent = `Step ${idx + 1} of ${TOUR_STEPS.length}`;
  titleEl.textContent = step.title;
  bodyEl.textContent = step.body;
  progressFill.style.width = `${((idx + 1) / TOUR_STEPS.length) * 100}%`;

  // Update button labels
  prevBtn.style.display = idx === 0 ? 'none' : '';
  nextBtn.textContent = idx === TOUR_STEPS.length - 1 ? 'Finish' : 'Next';

  // Target element highlighting
  const targetSelector = step.target;
  let targetEl = null;
  if (targetSelector) {
    targetEl = document.querySelector(targetSelector);
  }

  currentTargetEl = targetEl;

  if (targetEl) {
    // Scroll element into view smoothly if offscreen
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Wait for scroll completion
    await new Promise(r => setTimeout(r, 450));
    updateSpotlight(targetEl);
  } else {
    // Center spotlight in the center (hide it or make it empty)
    updateSpotlight(null);
  }

  // Position tooltip relative to spotlight
  updateTooltipPosition(targetEl, step.placement);

  // Micro-entrance animation on the tooltip
  if (window.gsap) {
    gsap.fromTo(tooltipEl, 
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }
    );
  }
}

/**
 * Updates the SVG cutout rect bounds.
 * @param {HTMLElement|null} target 
 */
function updateSpotlight(target) {
  const cutout = document.getElementById('tour-spotlight-cutout');
  if (!cutout) return;

  if (!target) {
    if (window.gsap) {
      gsap.to(cutout, {
        attr: { x: window.innerWidth / 2, y: window.innerHeight / 2, width: 0, height: 0 },
        duration: 0.35,
        ease: 'power2.out'
      });
    } else {
      cutout.setAttribute('x', '0');
      cutout.setAttribute('y', '0');
      cutout.setAttribute('width', '0');
      cutout.setAttribute('height', '0');
    }
    return;
  }

  const rect = target.getBoundingClientRect();
  const pad = 8;
  const bounds = {
    x: rect.left - pad,
    y: rect.top - pad,
    w: rect.width + pad * 2,
    h: rect.height + pad * 2
  };

  if (window.gsap) {
    gsap.to(cutout, {
      attr: { x: bounds.x, y: bounds.y, width: bounds.w, height: bounds.h },
      duration: 0.35,
      ease: 'power2.out'
    });
  } else {
    cutout.setAttribute('x', bounds.x.toString());
    cutout.setAttribute('y', bounds.y.toString());
    cutout.setAttribute('width', bounds.w.toString());
    cutout.setAttribute('height', bounds.h.toString());
  }
}

/**
 * Positions tooltip relative to target rect.
 * @param {HTMLElement|null} target 
 * @param {string} placement 
 */
function updateTooltipPosition(target, placement) {
  const tooltipRect = tooltipEl.getBoundingClientRect();
  const arrowEl = tooltipEl.querySelector('.tour-tooltip__arrow');
  const gap = 14;
  const pad = 8;

  let left = 0;
  let top = 0;

  if (!target || placement === 'center') {
    // Center of viewport
    left = (window.innerWidth - tooltipRect.width) / 2;
    top = (window.innerHeight - tooltipRect.height) / 2;
    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top = `${top}px`;
    if (arrowEl) arrowEl.style.display = 'none';
    return;
  }

  const rect = target.getBoundingClientRect();
  const tx = rect.left - pad;
  const ty = rect.top - pad;
  const tw = rect.width + pad * 2;
  const th = rect.height + pad * 2;

  if (arrowEl) arrowEl.style.display = '';

  // Standard placement offsets
  if (placement === 'bottom') {
    left = tx + (tw - tooltipRect.width) / 2;
    top = ty + th + gap;
    if (arrowEl) {
      arrowEl.style.top = '-6px';
      arrowEl.style.left = 'calc(50% - 6px)';
      arrowEl.style.borderLeft = '1px solid var(--glass-border)';
      arrowEl.style.borderTop = '1px solid var(--glass-border)';
      arrowEl.style.borderRight = 'none';
      arrowEl.style.borderBottom = 'none';
    }
  } else if (placement === 'top') {
    left = tx + (tw - tooltipRect.width) / 2;
    top = ty - tooltipRect.height - gap;
    if (arrowEl) {
      arrowEl.style.bottom = '-6px';
      arrowEl.style.top = 'auto';
      arrowEl.style.left = 'calc(50% - 6px)';
      arrowEl.style.borderRight = '1px solid var(--glass-border)';
      arrowEl.style.borderBottom = '1px solid var(--glass-border)';
      arrowEl.style.borderLeft = 'none';
      arrowEl.style.borderTop = 'none';
    }
  } else if (placement === 'left') {
    left = tx - tooltipRect.width - gap;
    top = ty + (th - tooltipRect.height) / 2;
    if (arrowEl) {
      arrowEl.style.right = '-6px';
      arrowEl.style.left = 'auto';
      arrowEl.style.top = 'calc(50% - 6px)';
      arrowEl.style.borderRight = '1px solid var(--glass-border)';
      arrowEl.style.borderTop = '1px solid var(--glass-border)';
      arrowEl.style.borderLeft = 'none';
      arrowEl.style.borderBottom = 'none';
    }
  } else if (placement === 'right') {
    left = tx + tw + gap;
    top = ty + (th - tooltipRect.height) / 2;
    if (arrowEl) {
      arrowEl.style.left = '-6px';
      arrowEl.style.right = 'auto';
      arrowEl.style.top = 'calc(50% - 6px)';
      arrowEl.style.borderLeft = '1px solid var(--glass-border)';
      arrowEl.style.borderBottom = '1px solid var(--glass-border)';
      arrowEl.style.borderRight = 'none';
      arrowEl.style.borderTop = 'none';
    }
  }

  // Safe clamping inside viewport boundaries
  const viewportPadding = 16;
  left = Math.max(viewportPadding, Math.min(window.innerWidth - tooltipRect.width - viewportPadding, left));
  top = Math.max(viewportPadding, Math.min(window.innerHeight - tooltipRect.height - viewportPadding, top));

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
}

/**
 * Bind tour interactions
 */
function bindEvents() {
  const closeBtn = tooltipEl.querySelector('.tour-tooltip__close-btn');
  const skipBtn = tooltipEl.querySelector('.tour-tooltip__skip-btn');
  const prevBtn = tooltipEl.querySelector('.tour-tooltip__btn--prev');
  const nextBtn = tooltipEl.querySelector('.tour-tooltip__btn--next');

  closeBtn.addEventListener('click', endTour);
  skipBtn.addEventListener('click', endTour);

  prevBtn.addEventListener('click', () => {
    if (currentStepIdx > 0) {
      showStep(currentStepIdx - 1);
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentStepIdx < TOUR_STEPS.length - 1) {
      showStep(currentStepIdx + 1);
    } else {
      endTour();
      showToast("Tour completed! Let's get hired. 🚀", 'success');
    }
  });

  // Keyboard navigation
  window.addEventListener('keydown', handleKeydown);

  // Resize listener
  window.addEventListener('resize', handleResize);

  // ResizeObserver for dynamic elements layout shifts
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      if (currentTargetEl) {
        updateSpotlight(currentTargetEl);
        updateTooltipPosition(currentTargetEl, TOUR_STEPS[currentStepIdx].placement);
      }
    });
    // Watch body/main content for height shifts
    const mainEl = document.getElementById('mainContent');
    if (mainEl) resizeObserver.observe(mainEl);
  }
}

/**
 * Handle keys
 */
function handleKeydown(e) {
  if (e.key === 'Escape') {
    endTour();
  } else if (e.key === 'ArrowRight') {
    const nextBtn = tooltipEl.querySelector('.tour-tooltip__btn--next');
    if (nextBtn) nextBtn.click();
  } else if (e.key === 'ArrowLeft') {
    const prevBtn = tooltipEl.querySelector('.tour-tooltip__btn--prev');
    if (prevBtn && prevBtn.style.display !== 'none') prevBtn.click();
  }
}

/**
 * Handle resizing
 */
function handleResize() {
  if (currentTargetEl) {
    updateSpotlight(currentTargetEl);
    updateTooltipPosition(currentTargetEl, TOUR_STEPS[currentStepIdx].placement);
  } else {
    updateTooltipPosition(null, 'center');
  }
}

/**
 * Terminate the tour and clean up the DOM elements.
 */
export function endTour() {
  // Trigger onLeave callback of current step
  const step = TOUR_STEPS[currentStepIdx];
  if (step && step.onLeave) {
    step.onLeave();
  }

  // Cleanup listeners
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', handleResize);
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  // Fade out and remove elements
  if (window.gsap) {
    gsap.to([overlayEl, tooltipEl], {
      opacity: 0,
      duration: 0.25,
      onComplete: () => {
        if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
        if (tooltipEl && tooltipEl.parentNode) tooltipEl.parentNode.removeChild(tooltipEl);
        overlayEl = null;
        tooltipEl = null;
        currentTargetEl = null;
      }
    });
  } else {
    if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
    if (tooltipEl && tooltipEl.parentNode) tooltipEl.parentNode.removeChild(tooltipEl);
    overlayEl = null;
    tooltipEl = null;
    currentTargetEl = null;
  }
}
