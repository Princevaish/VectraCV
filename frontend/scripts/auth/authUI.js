// frontend/scripts/auth/authUI.js
// Renders the authentication screen (login card, OTP, user profile pill).
// Matches the brutalist/editorial design language of the main app.

import {
  signOut, openSignIn,
  getUserEmail, getUserName, getUserAvatar,
  demoSignIn,
} from './clerk.js';
import { showToast } from '../components/toast.js';
import { CONFIG } from '../../config/config.js';

// ── DOM references ────────────────────────────────────────────────────────────
const authScreen  = () => document.getElementById('authScreen');
const mainApp     = () => document.getElementById('mainApp');
const authLoader  = () => document.getElementById('authLoader');

// ── Auth loader message cycling ───────────────────────────────────────────────
let _authMsgInterval = null;
let _authMsgIndex    = 0;

export function showAuthLoader() {
  const el = authLoader();
  if (!el) return;
  el.style.display = 'flex';

  if (window.gsap) {
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3 });
  }

  _authMsgIndex = 0;
  _updateAuthLoaderMsg();
  _authMsgInterval = setInterval(() => {
    _authMsgIndex = (_authMsgIndex + 1) % CONFIG.AUTH_LOADER_MESSAGES.length;
    _updateAuthLoaderMsg();
  }, 1200);
}

export function hideAuthLoader() {
  clearInterval(_authMsgInterval);
  const el = authLoader();
  if (!el) return;

  if (window.gsap) {
    gsap.to(el, {
      opacity: 0, duration: 0.25,
      onComplete: () => { el.style.display = 'none'; },
    });
  } else {
    el.style.display = 'none';
  }
}

function _updateAuthLoaderMsg() {
  const msgEl = document.getElementById('authLoaderMsg');
  if (!msgEl) return;
  const msg = CONFIG.AUTH_LOADER_MESSAGES[_authMsgIndex];

  if (window.gsap) {
    gsap.to(msgEl, {
      opacity: 0, y: -6, duration: 0.15,
      onComplete: () => {
        msgEl.textContent = msg;
        gsap.fromTo(msgEl, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.2 });
      },
    });
  } else {
    msgEl.textContent = msg;
  }
}

// ── Show / hide app sections ──────────────────────────────────────────────────

/**
 * Transition FROM auth screen TO main app.
 * Uses a cross-fade via GSAP.
 */
export function transitionToApp() {
  const auth = authScreen();
  const app  = mainApp();
  if (!auth || !app) return;

  if (window.gsap) {
    gsap.timeline()
      .to(auth, { opacity: 0, scale: 0.97, duration: 0.4, ease: 'power2.in',
        onComplete: () => { auth.style.display = 'none'; } })
      .set(app, { opacity: 0, y: 20, display: 'block' })
      .to(app, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
  } else {
    auth.style.display = 'none';
    app.style.display  = 'block';
  }
}

/**
 * Transition FROM main app BACK to auth screen (after sign-out).
 */
export function transitionToAuth() {
  const auth = authScreen();
  const app  = mainApp();
  if (!auth || !app) return;

  if (window.gsap) {
    gsap.timeline()
      .to(app, { opacity: 0, y: -12, duration: 0.3, ease: 'power2.in',
        onComplete: () => { app.style.display = 'none'; } })
      .set(auth, { opacity: 0, scale: 0.96, display: 'flex' })
      .to(auth, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.2)' });
  } else {
    app.style.display  = 'none';
    auth.style.display = 'flex';
  }

}

// ── Login card ────────────────────────────────────────────────────────────────

/**
 * Render the login card into #authScreen.
 * Called on app boot when user is not authenticated.
 */
export function renderLoginCard() {
  const screen = authScreen();
  if (!screen) return;

  screen.innerHTML = `
    <div class="auth-card" id="authCard" role="main" aria-label="Sign in">

      <!-- Brand -->
      <div class="auth-card__brand">
        <span class="auth-card__logo">Resume<em>RAG</em></span>
        <span class="auth-card__tagline">AI Career Intelligence</span>
      </div>

      <!-- Headline -->
      <div class="auth-card__header">
        <h1 class="auth-card__title">Sign in to<br/><em>your workspace</em></h1>
        <p class="auth-card__sub">
          Analyse your resume against any job description using RAG + Groq LLM.
        </p>
      </div>

      <!-- Clerk mount point (used when real key is set) -->
      <div id="clerkSignInMount" class="clerk-mount"></div>

      <!-- Demo / custom auth form (used when no Clerk key) -->
      <div class="auth-form" id="authForm">

        <!-- GitHub button -->
        <button class="btn btn--primary auth-btn auth-btn--github" id="githubSignIn" type="button">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
                     0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
                     -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66
                     .07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
                     -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27
                     .68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12
                     .51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48
                     0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          Continue with GitHub
        </button>

        <!-- Divider -->
        <div class="auth-divider">
          <span class="auth-divider__line"></span>
          <span class="auth-divider__text">or continue with email</span>
          <span class="auth-divider__line"></span>
        </div>

        <!-- Email form -->
        <div class="auth-email-form" id="authEmailForm">
          <div class="auth-field">
            <label class="auth-field__label" for="authEmail">Email address</label>
            <input
              class="auth-field__input"
              id="authEmail"
              type="email"
              placeholder="you@company.com"
              autocomplete="email"
              aria-label="Email address"
            />
            <span class="auth-field__error" id="authEmailError" aria-live="polite"></span>
          </div>
          <button class="btn btn--accent auth-btn auth-btn--email" id="emailSignInBtn" type="button">
            Send magic link
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2.5 6.5h8M7 3l3.5 3.5L7 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        <!-- OTP screen (initially hidden) -->
        <div class="auth-otp-form" id="authOtpForm" style="display:none;" aria-hidden="true">
          <div class="auth-otp__header">
            <p class="auth-otp__title">Check your inbox</p>
            <p class="auth-otp__sub">Enter the 6-digit code sent to <strong id="otpEmailDisplay"></strong></p>
          </div>
          <div class="auth-otp__inputs" id="otpInputs" role="group" aria-label="One-time password">
            ${Array.from({ length: 6 }, (_, i) =>
              `<input class="otp-input" type="text" inputmode="numeric" maxlength="1"
                      data-index="${i}" aria-label="Digit ${i + 1}" autocomplete="${i === 0 ? 'one-time-code' : 'off'}" />`
            ).join('')}
          </div>
          <button class="btn btn--accent auth-btn" id="verifyOtpBtn" type="button" disabled>
            Verify & sign in
          </button>
          <button class="auth-otp__back" id="otpBackBtn" type="button">← Back to email</button>
        </div>

      </div>

      <!-- Footer note -->
      <p class="auth-card__footer-note">
        By signing in you agree to our
        <a href="#" class="auth-link">Terms</a> &amp;
        <a href="#" class="auth-link">Privacy Policy</a>.
      </p>
    </div>
  `;

  // Animate card entrance
  _animateCardEntrance();

  // Bind events
  _bindLoginEvents();

  // If real Clerk key — mount Clerk component; otherwise demo form stays
  const hasClerK = CONFIG.CLERK_PUBLISHABLE_KEY && !CONFIG.CLERK_PUBLISHABLE_KEY.includes('REPLACE');
  if (hasClerK) {
    document.getElementById('authForm').style.display = 'none';
    openSignIn();
  }
}

function _animateCardEntrance() {
  if (!window.gsap) return;
  const card = document.getElementById('authCard');
  if (!card) return;

  gsap.timeline()
    .fromTo(card,
      { opacity: 0, y: 40, scale: 0.95 },
      { opacity: 1, y: 0,  scale: 1, duration: 0.6, ease: 'back.out(1.3)' }
    )
    .from('.auth-card__brand',    { opacity: 0, y: 10, duration: 0.3 }, '-=0.3')
    .from('.auth-card__title',    { opacity: 0, y: 16, duration: 0.35, ease: 'power3.out' }, '-=0.2')
    .from('.auth-card__sub',      { opacity: 0, y: 10, duration: 0.3 }, '-=0.25')
    .from('.auth-btn--github',    { opacity: 0, y: 8, duration: 0.25 }, '-=0.15')
    .from('.auth-divider',        { opacity: 0, duration: 0.2 }, '-=0.1')
    .from('.auth-email-form',     { opacity: 0, y: 8, duration: 0.25 }, '-=0.1')
    .from('.auth-card__footer-note', { opacity: 0, duration: 0.2 }, '-=0.1');
}

// ── Login event bindings ──────────────────────────────────────────────────────

function _bindLoginEvents() {
  // GitHub button
  const githubBtn = document.getElementById('githubSignIn');
  if (githubBtn) {
    githubBtn.addEventListener('click', _handleGithubSignIn);
    _bindBtnMicro(githubBtn);
  }

  // Email send
  const emailBtn = document.getElementById('emailSignInBtn');
  if (emailBtn) {
    emailBtn.addEventListener('click', _handleEmailSend);
    _bindBtnMicro(emailBtn);
  }

  // Email input — Enter key
  const emailInput = document.getElementById('authEmail');
  if (emailInput) {
    emailInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') _handleEmailSend();
    });
    emailInput.addEventListener('input', () => {
      document.getElementById('authEmailError').textContent = '';
      emailInput.classList.remove('is-error');
    });
  }

  // OTP inputs
  _bindOtpInputs();

  // Verify OTP
  const verifyBtn = document.getElementById('verifyOtpBtn');
  if (verifyBtn) verifyBtn.addEventListener('click', _handleOtpVerify);

  // Back button
  const backBtn = document.getElementById('otpBackBtn');
  if (backBtn) backBtn.addEventListener('click', _showEmailForm);
}

async function _handleGithubSignIn() {
  const btn = document.getElementById('githubSignIn');
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = `<span class="btn-spinner"></span> Connecting…`;

  // Real Clerk: use OAuth
  const clerk = (await import('./clerk.js')).getClerkInstance();
  if (clerk) {
    try {
      await clerk.redirectToOAuthCallback({
        redirectUrl: window.location.href,
        afterSignInUrl: window.location.href,
      });
    } catch {
      // fallback: demo mode
      setTimeout(() => demoSignIn('github-user@example.com'), 800);
    }
  } else {
    // Demo mode simulation
    setTimeout(() => {
      demoSignIn('github-user@example.com');
    }, 1200);
  }
}

async function _handleEmailSend() {
  const emailInput = document.getElementById('authEmail');
  const emailError = document.getElementById('authEmailError');
  const email = emailInput?.value.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailError.textContent = 'Please enter a valid email address.';
    emailInput.classList.add('is-error');
    if (window.gsap) {
      gsap.timeline()
        .to(emailInput, { x: -6, duration: 0.07 })
        .to(emailInput, { x:  6, duration: 0.07 })
        .to(emailInput, { x: -4, duration: 0.07 })
        .to(emailInput, { x:  0, duration: 0.07 });
    }
    return;
  }

  const btn = document.getElementById('emailSignInBtn');
  btn.disabled = true;
  btn.innerHTML = `<span class="btn-spinner"></span> Sending…`;

  // Demo mode: show OTP screen after short delay
  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = `Send magic link <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5h8M7 3l3.5 3.5L7 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    _showOtpScreen(email);
  }, 1000);
}

function _showOtpScreen(email) {
  const emailForm = document.getElementById('authEmailForm');
  const otpForm   = document.getElementById('authOtpForm');
  const otpEmailDisplay = document.getElementById('otpEmailDisplay');

  if (otpEmailDisplay) otpEmailDisplay.textContent = email;

  if (window.gsap) {
    gsap.to(emailForm, {
      opacity: 0, y: -10, duration: 0.2,
      onComplete: () => {
        emailForm.style.display = 'none';
        otpForm.style.display   = 'block';
        otpForm.removeAttribute('aria-hidden');
        gsap.fromTo(otpForm,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.35, ease: 'back.out(1.2)' }
        );
        // Stagger OTP inputs
        gsap.from('.otp-input', {
          scale: 0.7, opacity: 0, stagger: 0.07,
          duration: 0.3, ease: 'back.out(1.6)', delay: 0.1,
        });
        // Focus first input
        document.querySelector('.otp-input')?.focus();
      },
    });
  } else {
    emailForm.style.display = 'none';
    otpForm.style.display   = 'block';
  }
}

function _showEmailForm() {
  const emailForm = document.getElementById('authEmailForm');
  const otpForm   = document.getElementById('authOtpForm');

  if (window.gsap) {
    gsap.to(otpForm, {
      opacity: 0, y: 10, duration: 0.2,
      onComplete: () => {
        otpForm.style.display   = 'none';
        otpForm.setAttribute('aria-hidden', 'true');
        emailForm.style.display = 'block';
        gsap.fromTo(emailForm,
          { opacity: 0, y: -10 },
          { opacity: 1, y: 0, duration: 0.3 }
        );
        // Reset OTP inputs
        document.querySelectorAll('.otp-input').forEach(i => i.value = '');
        document.getElementById('verifyOtpBtn').disabled = true;
      },
    });
  } else {
    otpForm.style.display   = 'none';
    emailForm.style.display = 'block';
  }
}

function _bindOtpInputs() {
  const inputs = document.querySelectorAll('.otp-input');
  const verifyBtn = document.getElementById('verifyOtpBtn');

  inputs.forEach((input, i) => {
    input.addEventListener('input', e => {
      // Only allow digits
      input.value = input.value.replace(/\D/g, '').slice(0, 1);

      // Auto-advance
      if (input.value && i < inputs.length - 1) {
        inputs[i + 1].focus();
      }

      // Enable verify if all filled
      const allFilled = [...inputs].every(inp => inp.value.length === 1);
      if (verifyBtn) verifyBtn.disabled = !allFilled;

      // Animate filled input
      if (input.value && window.gsap) {
        gsap.from(input, { scale: 1.2, duration: 0.2, ease: 'back.out(2)' });
      }
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !input.value && i > 0) {
        inputs[i - 1].focus();
      }
    });

    // Paste handler for full code
    input.addEventListener('paste', e => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData)
        .getData('text').replace(/\D/g, '').slice(0, 6);
      pasted.split('').forEach((ch, idx) => {
        if (inputs[idx]) inputs[idx].value = ch;
      });
      if (verifyBtn) {
        verifyBtn.disabled = !([...inputs].every(inp => inp.value.length === 1));
      }
    });
  });
}

function _handleOtpVerify() {
  const inputs = document.querySelectorAll('.otp-input');
  const code   = [...inputs].map(i => i.value).join('');
  const btn    = document.getElementById('verifyOtpBtn');
  const email  = document.getElementById('otpEmailDisplay')?.textContent || 'user@example.com';

  btn.disabled = true;
  btn.innerHTML = `<span class="btn-spinner"></span> Verifying…`;

  // Demo mode: any 6-digit code succeeds
  setTimeout(() => {
    demoSignIn(email);
  }, 900);
}

function _bindBtnMicro(btn) {
  if (!window.gsap) return;
  btn.addEventListener('mouseenter', () => {
    if (!btn.disabled) gsap.to(btn, { scale: 1.02, duration: 0.14, ease: 'power1.out' });
  });
  btn.addEventListener('mouseleave', () => {
    gsap.to(btn, { scale: 1, duration: 0.16 });
  });
  btn.addEventListener('mousedown', () => {
    if (!btn.disabled) gsap.to(btn, { scale: 0.97, duration: 0.08 });
  });
  btn.addEventListener('mouseup', () => {
    gsap.to(btn, { scale: 1, duration: 0.2, ease: 'elastic.out(1,0.5)' });
  });
}

// ── User profile pill (rendered in header when signed in) ─────────────────────

/**
 * Render (or update) the user profile pill in the header.
 */
export function renderUserPill() {
  const container = document.getElementById('userPillContainer');
  if (!container) return;

  const email  = getUserEmail();
  const name   = getUserName();
  const avatar = getUserAvatar();

  container.innerHTML = `
    <div class="user-pill" id="userPill">
      <div class="user-pill__avatar">
        ${avatar
          ? `<img src="${avatar}" alt="${name}" class="user-pill__img" />`
          : `<span class="user-pill__initials">${name.charAt(0).toUpperCase()}</span>`
        }
      </div>
      <span class="user-pill__email">${email}</span>
      <button class="user-pill__logout btn btn--ghost btn--sm" id="signOutBtn" aria-label="Sign out">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M4.5 6h5M7.5 4l2 2-2 2M4.5 1.5H2A1.5 1.5 0 00.5 3v6A1.5 1.5 0 002 10.5h2.5"
                stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Sign out
      </button>
    </div>
  `;

  // Animate in
  if (window.gsap) {
    gsap.from('#userPill', {
      opacity: 0, x: 20, duration: 0.4, ease: 'back.out(1.3)',
    });
  }

  // Sign out handler
  document.getElementById('signOutBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('signOutBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Signing out…'; }
    await signOut();
  });
}

/**
 * Clear the user pill from the header.
 */
export function clearUserPill() {
  const container = document.getElementById('userPillContainer');
  if (!container) return;

  if (window.gsap) {
    gsap.to('#userPill', {
      opacity: 0, x: 16, duration: 0.25,
      onComplete: () => { container.innerHTML = ''; },
    });
  } else {
    container.innerHTML = '';
  }
}