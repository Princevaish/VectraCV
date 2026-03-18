// frontend/scripts/animations/gsapAnimations.js
// All GSAP-driven animations: page entrance, scroll reveals,
// button micro-interactions, step transitions.

/**
 * Run the full page-load entrance sequence.
 * Called once on DOMContentLoaded.
 */
export function runPageEntrance() {
  if (!window.gsap) return;

  gsap.registerPlugin(ScrollTrigger);

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // Header slides down
  tl.from('#header', {
    y: -70,
    opacity: 0,
    duration: 0.55,
  });

  // Config bar
  tl.from('#configBar', {
    y: -20,
    opacity: 0,
    duration: 0.35,
  }, '-=0.2');

  // Hero eyebrow line expands
  tl.from('.hero__eyebrow-line', {
    scaleX: 0,
    transformOrigin: 'left center',
    duration: 0.5,
  }, '-=0.1');

  // Hero eyebrow text
  tl.from('.hero__eyebrow', {
    opacity: 0,
    x: -14,
    duration: 0.4,
  }, '<0.15');

  // Hero title — each word staggers in
  tl.from('.hero__title', {
    y: 40,
    opacity: 0,
    duration: 0.6,
    ease: 'back.out(1.2)',
  }, '-=0.2');

  // Hero subtitle
  tl.from('.hero__sub', {
    y: 20,
    opacity: 0,
    duration: 0.45,
  }, '-=0.35');

  // Steps bar
  tl.from('#stepsBar', {
    y: 14,
    opacity: 0,
    duration: 0.4,
  }, '-=0.2');

  // Step items stagger
  tl.from('.step', {
    opacity: 0,
    y: 10,
    stagger: 0.1,
    duration: 0.3,
  }, '-=0.3');

  // Panels stagger
  tl.from('.panel', {
    opacity: 0,
    y: 24,
    stagger: 0.15,
    duration: 0.5,
  }, '-=0.2');

  // Action bar
  tl.from('#loadBar', {
    opacity: 0,
    y: 12,
    duration: 0.35,
  }, '-=0.25');
}

/**
 * Set up ScrollTrigger-based reveal animations for sections
 * that appear below the fold.
 */
export function bindScrollRevealAnimations() {
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  // Analyze section
  gsap.from('#analyzeSection .analyze-section__header', {
    scrollTrigger: {
      trigger: '#analyzeSection',
      start: 'top 82%',
    },
    y: 22,
    opacity: 0,
    duration: 0.5,
    ease: 'power3.out',
  });

  gsap.from('#questionPills .pill', {
    scrollTrigger: {
      trigger: '#questionPills',
      start: 'top 85%',
    },
    opacity: 0,
    y: 10,
    scale: 0.92,
    stagger: 0.07,
    duration: 0.35,
    ease: 'back.out(1.4)',
  });

  gsap.from('.question-row', {
    scrollTrigger: {
      trigger: '.question-row',
      start: 'top 88%',
    },
    y: 16,
    opacity: 0,
    duration: 0.45,
    ease: 'power2.out',
  });

  // Footer
  gsap.from('.footer', {
    scrollTrigger: {
      trigger: '.footer',
      start: 'top 95%',
    },
    opacity: 0,
    y: 10,
    duration: 0.4,
    ease: 'power2.out',
  });
}

/**
 * Add GSAP micro-interactions to all .btn elements.
 * Call once after DOM is ready.
 */
export function bindButtonMicroInteractions() {
  if (!window.gsap) return;

  document.querySelectorAll('.btn').forEach(btn => {
    // Use event delegation style per-element
    btn.addEventListener('mouseenter', () => {
      if (btn.disabled) return;
      gsap.to(btn, { scale: 1.03, duration: 0.15, ease: 'power1.out' });
    });

    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { scale: 1, duration: 0.18, ease: 'power1.inOut' });
    });

    btn.addEventListener('mousedown', () => {
      if (btn.disabled) return;
      gsap.to(btn, { scale: 0.96, duration: 0.1, ease: 'power2.in' });
    });

    btn.addEventListener('mouseup', () => {
      gsap.to(btn, { scale: 1, duration: 0.18, ease: 'elastic.out(1, 0.5)' });
    });
  });
}

/**
 * Animate pill buttons on hover.
 */
export function bindPillAnimations() {
  if (!window.gsap) return;

  document.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('mouseenter', () => {
      gsap.to(pill, { y: -2, duration: 0.15, ease: 'power1.out' });
    });
    pill.addEventListener('mouseleave', () => {
      gsap.to(pill, { y: 0, duration: 0.18, ease: 'power1.inOut' });
    });
    pill.addEventListener('click', () => {
      gsap.timeline()
        .to(pill, { scale: 0.9, duration: 0.1, ease: 'power2.in' })
        .to(pill, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' });
    });
  });
}

/**
 * Animate the result area section into view after analysis completes.
 */
export function animateResultReveal() {
  if (!window.gsap) return;

  gsap.from('#resultArea', {
    opacity: 0,
    y: 20,
    duration: 0.5,
    ease: 'power3.out',
  });
}

/**
 * Animate chunk chips appearing after data load.
 */
export function animateChunkChips() {
  if (!window.gsap) return;

  const chips = document.querySelectorAll('.chunk-chip');
  gsap.from(chips, {
    scale: 0.7,
    opacity: 0,
    stagger: 0.1,
    duration: 0.35,
    ease: 'back.out(1.8)',
  });
}

/**
 * Shake animation for invalid input feedback.
 * @param {HTMLElement} el
 */
export function shakeElement(el) {
  if (!window.gsap) {
    el.classList.add('shake');
    el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });
    return;
  }

  gsap.timeline()
    .to(el, { x: -7, duration: 0.07, ease: 'power1.inOut' })
    .to(el, { x:  7, duration: 0.07, ease: 'power1.inOut' })
    .to(el, { x: -5, duration: 0.07, ease: 'power1.inOut' })
    .to(el, { x:  5, duration: 0.07, ease: 'power1.inOut' })
    .to(el, { x:  0, duration: 0.08, ease: 'power1.out'  });
}

/**
 * Animate the load-status message appearing.
 * @param {HTMLElement} el
 */
export function animateStatusMessage(el) {
  if (!window.gsap) return;
  gsap.from(el, { opacity: 0, x: -10, duration: 0.3, ease: 'power2.out' });
}