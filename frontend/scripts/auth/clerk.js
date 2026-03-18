// frontend/scripts/auth/clerk.js

import { CONFIG } from '../../config/config.js';

export const AUTH_EVENTS = {
  READY:      'auth:ready',
  SIGNED_IN:  'auth:signed-in',
  SIGNED_OUT: 'auth:signed-out',
};

// ── Emit on window so window.addEventListener in main.js picks it up ─────────
function emit(name, detail = {}) {
  console.log('[AUTH EVENT]', name, detail);
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

// ── Poll until window.Clerk exists (handles async CDN load) ──────────────────
function waitForClerk(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    if (window.Clerk) { resolve(); return; }

    const start    = Date.now();
    const interval = setInterval(() => {
      if (window.Clerk) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error('Clerk SDK did not load within ' + timeoutMs + 'ms'));
      }
    }, 50);
  });
}

// ── Internal state ────────────────────────────────────────────────────────────
let _currentUser = null;

// ── Main init ─────────────────────────────────────────────────────────────────
export async function initClerk() {
  const key         = CONFIG.CLERK_PUBLISHABLE_KEY;
  const isPlaceholder = !key || key.includes('REPLACE');

  if (isPlaceholder) {
    console.warn('[AUTH] No real Clerk key — starting DEMO MODE');
    _currentUser = null;
    emit(AUTH_EVENTS.READY, { user: null });
    return;
  }

  console.log('[AUTH] Waiting for Clerk SDK...');

  try {
    await waitForClerk();
  } catch (err) {
    console.warn('[AUTH] Clerk SDK not found on window — falling back to DEMO MODE:', err.message);
    _currentUser = null;
    emit(AUTH_EVENTS.READY, { user: null });
    return;
  }

  console.log('[AUTH] Clerk SDK found, calling load()...');

  try {
    await window.Clerk.load();
  } catch (err) {
    console.error('[AUTH] window.Clerk.load() failed:', err);
    _currentUser = null;
    emit(AUTH_EVENTS.READY, { user: null });
    return;
  }

  _currentUser = window.Clerk.user ?? null;

  console.log('[AUTH] Clerk loaded. Current user:', _currentUser);

  // Emit READY first so main.js can gate the UI
  emit(AUTH_EVENTS.READY, { user: _currentUser });

  // Then subscribe to future auth changes
  window.Clerk.addListener(({ user }) => {
    console.log('[AUTH] Clerk listener fired. User:', user);
    const prev    = _currentUser;
    _currentUser  = user ?? null;

    if (!prev && _currentUser) {
      emit(AUTH_EVENTS.SIGNED_IN,  { user: _currentUser });
    } else if (prev && !_currentUser) {
      emit(AUTH_EVENTS.SIGNED_OUT, {});
    }
  });
}

// ── Public helpers ────────────────────────────────────────────────────────────
export function isSignedIn()     { return _currentUser !== null; }
export function getCurrentUser() { return _currentUser; }

export function getUserEmail() {
  if (!_currentUser) return '';
  return (
    _currentUser.primaryEmailAddress?.emailAddress ||
    _currentUser.emailAddresses?.[0]?.emailAddress ||
    'user@example.com'
  );
}

export function getUserName() {
  if (!_currentUser) return '';
  return _currentUser.firstName || getUserEmail().split('@')[0];
}

export function getUserAvatar() {
  return _currentUser?.imageUrl ?? null;
}

export function openSignIn() {
  const container = document.getElementById('clerkSignInMount');
  if (!container || !window.Clerk) return;
  if (container.hasChildNodes()) return;

  window.Clerk.mountSignIn(container, {
    appearance: {
      variables: {
        colorPrimary:    '#d4522a',
        colorBackground: '#f5f2eb',
        colorText:       '#0a0a0f',
        fontFamily:      "'DM Mono', monospace",
        borderRadius:    '4px',
      },
    },
  });
}

export async function signOut() {
  if (window.Clerk?.signOut) {
    await window.Clerk.signOut();
  } else {
    demoSignOut();
  }
}

// ── Demo mode helpers (used when no real Clerk key) ───────────────────────────
export function demoSignIn(email = 'demo@resumerag.ai') {
  _currentUser = {
    id:                  'demo-user-001',
    primaryEmailAddress: { emailAddress: email },
    firstName:           email.split('@')[0],
    lastName:            '',
    imageUrl:            null,
  };
  emit(AUTH_EVENTS.SIGNED_IN, { user: _currentUser });
}

export function demoSignOut() {
  _currentUser = null;
  emit(AUTH_EVENTS.SIGNED_OUT, {});
}