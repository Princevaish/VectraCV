// frontend/scripts/auth/authUI.js

import {
  signOut,
  getUserEmail, getUserName, getUserAvatar,
  demoSignIn,
} from './clerk.js';
import { CONFIG } from '../../config/config.js';

// ── DOM accessors ─────────────────────────────────────────────────────────────
const getAuthScreen = () => document.getElementById('authScreen');
const getMainApp    = () => document.getElementById('mainApp');
const getAuthLoader = () => document.getElementById('authLoader');

// ── Auth boot loader ──────────────────────────────────────────────────────────
let _authMsgInterval = null;
let _authMsgIdx      = 0;

export function showAuthLoader() {
  const el = getAuthLoader();
  if (!el) return;

  el.style.display       = 'flex';
  el.style.pointerEvents = 'all';

  if (window.gsap) gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3 });

  _authMsgIdx = 0;
  _updateAuthMsg();
  clearInterval(_authMsgInterval);
  _authMsgInterval = setInterval(() => {
    _authMsgIdx = (_authMsgIdx + 1) % CONFIG.AUTH_LOADER_MESSAGES.length;
    _updateAuthMsg();
  }, 1200);
}

export function hideAuthLoader() {
  clearInterval(_authMsgInterval);
  const el = getAuthLoader();
  if (!el) return;

  const _done = () => {
    el.style.display       = 'none';
    el.style.pointerEvents = 'none';
    el.style.opacity       = '';
  };

  if (window.gsap) {
    gsap.to(el, { opacity: 0, duration: 0.28, ease: 'power2.in', onComplete: _done });
  } else {
    _done();
  }
}

function _updateAuthMsg() {
  const msgEl = document.getElementById('authLoaderMsg');
  if (!msgEl) return;
  const msg = CONFIG.AUTH_LOADER_MESSAGES[_authMsgIdx];

  if (window.gsap) {
    gsap.to(msgEl, {
      opacity: 0, y: -5, duration: 0.13,
      onComplete: () => {
        msgEl.textContent = msg;
        gsap.fromTo(msgEl, { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: 0.16 });
      },
    });
  } else {
    msgEl.textContent = msg;
  }
}

// ── Transitions ───────────────────────────────────────────────────────────────
export function transitionToApp() {
  const auth = getAuthScreen();
  const app  = getMainApp();

  if (!app) { console.error('[AUTH UI] #mainApp not found'); return; }

  if (auth) auth.style.display = 'none';
  app.style.display = 'block';

  if (window.gsap) {
    gsap.fromTo(app,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.42, ease: 'power3.out' }
    );
  }

  console.log('[AUTH UI] → main app');
}

export function transitionToAuth() {
  const auth = getAuthScreen();
  const app  = getMainApp();

  if (app) app.style.display = 'none';

  if (auth) {
    auth.style.display = 'flex';
    if (window.gsap) {
      gsap.fromTo(auth,
        { opacity: 0, scale: 0.97 },
        { opacity: 1, scale: 1, duration: 0.38, ease: 'back.out(1.2)' }
      );
    }
  }

  console.log('[AUTH UI] → auth screen');
}

// ── Login card ────────────────────────────────────────────────────────────────
export function renderLoginCard() {
  const container = document.getElementById('authScreen');

  if (!container) {
    console.error('[AUTH UI] #authScreen not found in DOM');
    return;
  }

  console.log('[AUTH UI] Rendering login card');

  const hasRealClerk = Boolean(
    CONFIG.CLERK_PUBLISHABLE_KEY &&
    !CONFIG.CLERK_PUBLISHABLE_KEY.includes('REPLACE')
  );

  container.innerHTML = `
    <div class="auth-card" id="authCard" role="main" aria-label="Sign in">

      <!-- Brand header -->
      <div class="auth-header">
        <h1>Resume<em>RAG</em></h1>
        <p class="auth-sub">AI Career Intelligence</p>
      </div>

      <!-- Form body: Clerk or demo -->
      <div class="auth-body">
        ${hasRealClerk
          ? `<div id="clerk-root"></div>`

          : `<!-- Demo auth form -->
             <div class="auth-form" id="authForm">

               <button class="btn btn--primary auth-btn auth-btn--github" id="githubSignIn" type="button">
                 <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
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

               <div class="auth-divider">
                 <span class="auth-divider__line"></span>
                 <span class="auth-divider__text">or email</span>
                 <span class="auth-divider__line"></span>
               </div>

               <!-- Email form -->
               <div class="auth-email-form" id="authEmailForm">
                 <div class="auth-field">
                   <label class="auth-field__label" for="authEmail">Email address</label>
                   <input
                     class="auth-field__input" id="authEmail" type="email"
                     placeholder="you@company.com" autocomplete="email"
                     aria-label="Email address"
                   />
                   <span class="auth-field__error" id="authEmailError" aria-live="polite"></span>
                 </div>
                 <button class="btn btn--accent auth-btn auth-btn--email" id="emailSignInBtn" type="button">
                   Send magic link
                   <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
                     <path d="M2.5 6.5h8M7 3l3.5 3.5L7 10" stroke="currentColor"
                           stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                   </svg>
                 </button>
               </div>

               <!-- OTP screen -->
               <div class="auth-otp-form" id="authOtpForm" style="display:none;" aria-hidden="true">
                 <div class="auth-otp__header">
                   <p class="auth-otp__title">Check your inbox</p>
                   <p class="auth-otp__sub">
                     Enter the 6-digit code sent to <strong id="otpEmailDisplay"></strong>
                   </p>
                 </div>
                 <div class="auth-otp__inputs" id="otpInputs" role="group" aria-label="One-time password">
                   ${Array.from({ length: 6 }, (_, i) =>
                     `<input class="otp-input" type="text" inputmode="numeric" maxlength="1"
                             data-index="${i}" aria-label="Digit ${i + 1}"
                             autocomplete="${i === 0 ? 'one-time-code' : 'off'}" />`
                   ).join('')}
                 </div>
                 <button class="btn btn--accent auth-btn" id="verifyOtpBtn" type="button" disabled>
                   Verify &amp; sign in
                 </button>
                 <button class="auth-otp__back" id="otpBackBtn" type="button">← Back</button>
               </div>

             </div>`
        }
      </div>

      <!-- Footer note -->
      <p class="auth-card__footer-note">
        By signing in you agree to our
        <a href="#" class="auth-link">Terms</a> &amp;
        <a href="#" class="auth-link">Privacy Policy</a>.
      </p>
    </div>
  `;

  console.log('[AUTH UI] Login card rendered');

  // GSAP entrance
  if (window.gsap) {
    gsap.from('#authCard', {
      y: 28,
      opacity: 0,
      scale: 0.96,
      duration: 0.5,
      ease: 'power2.out',
    });

    gsap.from(['.auth-header', '.auth-body', '.auth-card__footer-note'], {
      opacity: 0,
      y: 10,
      duration: 0.35,
      stagger: 0.09,
      ease: 'power2.out',
      delay: 0.18,
    });
  }

  // Mount real Clerk or bind demo events
  if (hasRealClerk) {
    // Small delay so DOM is ready for Clerk to measure widths
    requestAnimationFrame(() => {
      openSignIn();
    });
  } else {
    _bindDemoFormEvents();
  }
}

// ── openSignIn — mounts Clerk into #clerk-root ─────────────────────────────
function openSignIn() {
  const container = document.getElementById('clerk-root');
  if (!container || !window.Clerk) return;
  if (container.hasChildNodes()) return;

  try {
    window.Clerk.mountSignIn(container, {
      appearance: {
        variables: {
          colorPrimary:    getComputedStyle(document.documentElement)
                             .getPropertyValue('--accent').trim() || '#d4522a',
          colorBackground: 'transparent',
          colorText:       getComputedStyle(document.documentElement)
                             .getPropertyValue('--ink').trim() || '#0a0a0f',
          fontFamily:      "'DM Mono', monospace",
          borderRadius:    '6px',
        },
      },
    });

    // Animate Clerk children after it renders (~150ms for DOM injection)
    if (window.gsap) {
      setTimeout(() => {
        const btns = document.querySelectorAll('.cl-socialButtonsBlockButton');
        const cta  = document.querySelector('.cl-formButtonPrimary');
        const inp  = document.querySelector('.cl-formFieldInput');

        if (btns.length) {
          gsap.from(btns, {
            opacity: 0,
            y: 10,
            stagger: 0.07,
            duration: 0.3,
            ease: 'power2.out',
          });
        }

        if (inp) {
          gsap.from(inp, {
            opacity: 0,
            y: 8,
            duration: 0.28,
            delay: 0.1,
            ease: 'power2.out',
          });
        }

        if (cta) {
          gsap.from(cta, {
            opacity: 0,
            y: 8,
            duration: 0.28,
            delay: 0.2,
            ease: 'power2.out',
          });
        }
      }, 180);
    }

  } catch (err) {
    console.error('[AUTH UI] Clerk.mountSignIn failed:', err);
  }
}

// ── Demo form event bindings ──────────────────────────────────────────────────
function _bindDemoFormEvents() {
  const githubBtn = document.getElementById('githubSignIn');
  if (githubBtn) {
    githubBtn.addEventListener('click', _handleGithubSignIn);
    _addBtnMicro(githubBtn);
  }

  const emailBtn = document.getElementById('emailSignInBtn');
  if (emailBtn) {
    emailBtn.addEventListener('click', _handleEmailSend);
    _addBtnMicro(emailBtn);
  }

  const emailInput = document.getElementById('authEmail');
  if (emailInput) {
    emailInput.addEventListener('keydown', e => { if (e.key === 'Enter') _handleEmailSend(); });
    emailInput.addEventListener('input', () => {
      const errEl = document.getElementById('authEmailError');
      if (errEl) errEl.textContent = '';
      emailInput.classList.remove('is-error');
    });
  }

  _bindOtpInputs();

  document.getElementById('verifyOtpBtn')?.addEventListener('click', _handleOtpVerify);
  document.getElementById('otpBackBtn')?.addEventListener('click',   _showEmailForm);
}

function _handleGithubSignIn() {
  const btn = document.getElementById('githubSignIn');
  if (!btn) return;
  btn.disabled  = true;
  btn.innerHTML = `<span class="btn-spinner"></span> Connecting…`;
  setTimeout(() => demoSignIn('github-user@example.com'), 1000);
}

function _handleEmailSend() {
  const emailInput = document.getElementById('authEmail');
  const emailError = document.getElementById('authEmailError');
  const email      = emailInput?.value.trim() || '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (emailError) emailError.textContent = 'Please enter a valid email address.';
    emailInput?.classList.add('is-error');
    if (window.gsap && emailInput) {
      gsap.timeline()
        .to(emailInput, { x: -6, duration: 0.07 })
        .to(emailInput, { x:  6, duration: 0.07 })
        .to(emailInput, { x: -4, duration: 0.07 })
        .to(emailInput, { x:  0, duration: 0.07 });
    }
    return;
  }

  const btn = document.getElementById('emailSignInBtn');
  if (!btn) return;
  btn.disabled  = true;
  btn.innerHTML = `<span class="btn-spinner"></span> Sending…`;

  setTimeout(() => {
    btn.disabled  = false;
    btn.innerHTML = `Send magic link <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5h8M7 3l3.5 3.5L7 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    _showOtpScreen(email);
  }, 900);
}

function _showOtpScreen(email) {
  const emailForm       = document.getElementById('authEmailForm');
  const otpForm         = document.getElementById('authOtpForm');
  const otpEmailDisplay = document.getElementById('otpEmailDisplay');

  if (otpEmailDisplay) otpEmailDisplay.textContent = email;

  const _reveal = () => {
    if (emailForm) emailForm.style.display = 'none';
    if (otpForm) {
      otpForm.style.display = 'block';
      otpForm.removeAttribute('aria-hidden');
      if (window.gsap) {
        gsap.fromTo(otpForm, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: 'back.out(1.2)' });
        gsap.from('.otp-input', { scale: 0.75, opacity: 0, stagger: 0.055, duration: 0.25, ease: 'back.out(1.6)', delay: 0.08 });
      }
      document.querySelector('.otp-input')?.focus();
    }
  };

  if (window.gsap && emailForm) {
    gsap.to(emailForm, { opacity: 0, y: -8, duration: 0.16, onComplete: _reveal });
  } else {
    _reveal();
  }
}

function _showEmailForm() {
  const emailForm = document.getElementById('authEmailForm');
  const otpForm   = document.getElementById('authOtpForm');

  const _reveal = () => {
    if (otpForm) { otpForm.style.display = 'none'; otpForm.setAttribute('aria-hidden', 'true'); }
    document.querySelectorAll('.otp-input').forEach(i => { i.value = ''; });
    const vBtn = document.getElementById('verifyOtpBtn');
    if (vBtn) vBtn.disabled = true;
    if (emailForm) {
      emailForm.style.display = 'block';
      if (window.gsap) gsap.fromTo(emailForm, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.26 });
    }
  };

  if (window.gsap && otpForm) {
    gsap.to(otpForm, { opacity: 0, y: 8, duration: 0.16, onComplete: _reveal });
  } else {
    _reveal();
  }
}

function _bindOtpInputs() {
  const inputs    = document.querySelectorAll('.otp-input');
  const verifyBtn = document.getElementById('verifyOtpBtn');
  if (!inputs.length) return;

  inputs.forEach((input, i) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 1);
      if (input.value && i < inputs.length - 1) inputs[i + 1].focus();
      if (verifyBtn) verifyBtn.disabled = ![...inputs].every(inp => inp.value.length === 1);
      if (input.value && window.gsap) gsap.from(input, { scale: 1.18, duration: 0.18, ease: 'back.out(2)' });
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !input.value && i > 0) inputs[i - 1].focus();
    });

    input.addEventListener('paste', e => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      pasted.split('').forEach((ch, idx) => { if (inputs[idx]) inputs[idx].value = ch; });
      if (verifyBtn) verifyBtn.disabled = ![...inputs].every(inp => inp.value.length === 1);
    });
  });
}

function _handleOtpVerify() {
  const btn   = document.getElementById('verifyOtpBtn');
  const email = document.getElementById('otpEmailDisplay')?.textContent || 'demo@resumerag.ai';
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="btn-spinner"></span> Verifying…`; }
  setTimeout(() => demoSignIn(email), 800);
}

function _addBtnMicro(btn) {
  if (!window.gsap) return;
  btn.addEventListener('mouseenter', () => { if (!btn.disabled) gsap.to(btn, { scale: 1.02, duration: 0.13 }); });
  btn.addEventListener('mouseleave', () => gsap.to(btn, { scale: 1, duration: 0.15 }));
  btn.addEventListener('mousedown',  () => { if (!btn.disabled) gsap.to(btn, { scale: 0.97, duration: 0.08 }); });
  btn.addEventListener('mouseup',    () => gsap.to(btn, { scale: 1, duration: 0.2, ease: 'elastic.out(1,0.5)' }));
}

// ── User pill ──────────────────────────────────────────────────────────────────
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

  if (window.gsap) gsap.from('#userPill', { opacity: 0, x: 18, duration: 0.38, ease: 'back.out(1.3)' });

  document.getElementById('signOutBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('signOutBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Signing out…'; }
    await signOut();
  });
}

export function clearUserPill() {
  const container = document.getElementById('userPillContainer');
  if (!container) return;

  if (window.gsap) {
    gsap.to('#userPill', {
      opacity: 0, x: 14, duration: 0.2,
      onComplete: () => { container.innerHTML = ''; },
    });
  } else {
    container.innerHTML = '';
  }
}