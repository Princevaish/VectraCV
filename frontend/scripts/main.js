// frontend/scripts/main.js

import { CONFIG }                           from '../config/config.js';
import { IDS, EVENTS, DEMO_RESUME, DEMO_JOB } from './utils/constants.js';
import { wordCount, scrollTo, on }            from './utils/helpers.js';
import { getState, setState, addHistory, clearHistory, toggleTheme } from './state/appState.js';
import { loadData, analyze, ApiError }        from './api/apiService.js';

import { initClerk, AUTH_EVENTS, signOut, getUserEmail, getUserName, getUserAvatar } from './auth/clerk.js';
import { showAuthLoader, hideAuthLoader, renderLoginCard, renderUserPill, clearUserPill, transitionToApp, transitionToAuth } from './auth/authUI.js';

import { showToast }                  from './components/toast.js';
import { showLoader, hideLoader }     from './components/loader.js';
import { renderResult, clearResult }  from './components/resultCard.js';
import { renderHistory }              from './components/history.js';
import { setStep, bindStepNavigation } from './components/stepManager.js';

import {
  runPageEntrance, bindScrollRevealAnimations,
  bindButtonMicroInteractions, bindPillAnimations,
  animateResultReveal, animateChunkChips,
  shakeElement, animateStatusMessage,
} from './animations/gsapAnimations.js';
import { highlight } from './animations/transitions.js';

/* ── BOOT ─────────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
  if (window.gsap) gsap.registerPlugin(ScrollTrigger, TextPlugin);

  _bindAuthEvents();
  showAuthLoader();

  try {
    await initClerk();
  } catch (err) {
    console.error('[ResumeRAG] Clerk init error:', err);
    hideAuthLoader();
    _showAuthScreen();
    renderLoginCard();
  }
});

/* ── AUTH EVENT BINDINGS ──────────────────────────────────────────────────── */

function _bindAuthEvents() {
  window.addEventListener(AUTH_EVENTS.READY,      (e) => _onClerkReady(e.detail));
  window.addEventListener(AUTH_EVENTS.SIGNED_IN,  (e) => _onSignedIn(e.detail));
  window.addEventListener(AUTH_EVENTS.SIGNED_OUT, ()  => _onSignedOut());
}

function _onClerkReady({ user }) {
  hideAuthLoader();
  if (user) {
    _bootMainApp();
  } else {
    _showAuthScreen();
    renderLoginCard();
  }
}

function _onSignedIn({ user }) {
  const name = user?.firstName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'there';
  showToast(`Welcome, ${name}! 👋`, 'success', 4000);
  _bootMainApp();
}

function _onSignedOut() {
  clearUserPill();
  transitionToAuth();
  renderLoginCard();
  setState({ dataLoaded: false, loadStatus: 'idle' });
  setStep(1);
  clearResult();
}

/* ── HELPERS ──────────────────────────────────────────────────────────────── */

function _showAuthScreen() {
  const authScreen = document.getElementById('authScreen');
  if (authScreen) authScreen.style.display = 'flex';
}

/* ── MAIN APP BOOT ────────────────────────────────────────────────────────── */

function _bootMainApp() {
  transitionToApp();
  renderUserPill();
  initTheme();
  initTextareas();
  initLoadSection();
  initQuestionPills();
  initAnalyzeSection();
  initHistorySection();
  initStateListener();
  bindStepNavigation();

  setTimeout(() => {
    runPageEntrance();
    bindScrollRevealAnimations();
    requestAnimationFrame(() => {
      bindButtonMicroInteractions();
      bindPillAnimations();
    });
  }, 150);
}

/* ── THEME ────────────────────────────────────────────────────────────────── */

function initTheme() {
  const btn = document.getElementById(IDS.THEME_BTN);
  if (!btn) return;
  const sunIcon  = btn.querySelector('.icon-sun');
  const moonIcon = btn.querySelector('.icon-moon');

  function syncIcon() {
    const { theme } = getState();
    if (sunIcon)  sunIcon.style.display  = theme === 'dark' ? 'none' : '';
    if (moonIcon) moonIcon.style.display = theme === 'dark' ? ''     : 'none';
  }

  syncIcon();
  btn.addEventListener('click', () => {
    toggleTheme();
    syncIcon();
    if (window.gsap) gsap.from(btn, { rotation: 90, duration: 0.4, ease: 'back.out(1.5)' });
  });
}

/* ── TEXTAREAS ────────────────────────────────────────────────────────────── */

function initTextareas() {
  _bindWordCount(IDS.RESUME_TEXT, IDS.RESUME_COUNT);
  _bindWordCount(IDS.JOB_TEXT,    IDS.JOB_COUNT);

  document.getElementById(IDS.RESUME_CLEAR)?.addEventListener('click', () => {
    const el = document.getElementById(IDS.RESUME_TEXT);
    if (el) el.value = '';
    _updateCount(IDS.RESUME_TEXT, IDS.RESUME_COUNT);
  });

  document.getElementById(IDS.JOB_CLEAR)?.addEventListener('click', () => {
    const el = document.getElementById(IDS.JOB_TEXT);
    if (el) el.value = '';
    _updateCount(IDS.JOB_TEXT, IDS.JOB_COUNT);
  });
}

function _bindWordCount(textareaId, countId) {
  document.getElementById(textareaId)?.addEventListener('input', () => _updateCount(textareaId, countId));
}

function _updateCount(textareaId, countId) {
  const text  = document.getElementById(textareaId)?.value || '';
  const count = wordCount(text);
  const el    = document.getElementById(countId);
  if (!el) return;
  el.textContent = `${count} word${count !== 1 ? 's' : ''}`;
  el.classList.toggle('has-content', count > 0);
}

/* ── LOAD SECTION ─────────────────────────────────────────────────────────── */

function initLoadSection() {
  document.getElementById(IDS.LOAD_BTN)?.addEventListener('click',  handleLoadData);
  document.getElementById(IDS.DEMO_BTN)?.addEventListener('click',  fillDemoData);
  document.getElementById(IDS.CLEAR_ALL)?.addEventListener('click', handleClearAll);
}

async function handleLoadData() {
  const resume = document.getElementById(IDS.RESUME_TEXT)?.value.trim() || '';
  const job    = document.getElementById(IDS.JOB_TEXT)?.value.trim()    || '';

  if (!resume) {
    shakeElement(document.getElementById(IDS.RESUME_TEXT));
    showToast('Please enter your resume text.', 'error');
    return;
  }
  if (!job) {
    shakeElement(document.getElementById(IDS.JOB_TEXT));
    showToast('Please enter the job description.', 'error');
    return;
  }

  _setLoadBtnState('loading');
  _setLoadStatus('', '');

  try {
    const data = await loadData(resume, job);
    setState({ dataLoaded: true, loadStatus: 'success', resumeChunks: data.resume_chunks, jobChunks: data.job_chunks });
    _setLoadStatus(`✓ ${data.resume_chunks + data.job_chunks} chunks stored in Endee`, 'is-success');
    _renderChunkChips(data.resume_chunks, data.job_chunks);
    setStep(2);
    showToast(`Loaded — ${data.resume_chunks} resume + ${data.job_chunks} job chunks`, 'success');
    setTimeout(() => scrollTo(`#${IDS.ANALYZE_SECTION}`, 80), 300);
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : 'Network error — is the backend running?';
    _setLoadStatus(`✗ ${msg}`, 'is-error');
    setState({ loadStatus: 'error', error: msg });
    showToast(`Load failed: ${msg}`, 'error', 6000);
  } finally {
    _setLoadBtnState('idle');
  }
}

function _setLoadBtnState(state) {
  const btn = document.getElementById(IDS.LOAD_BTN);
  if (!btn) return;
  btn.disabled = state === 'loading';
  btn.innerHTML = state === 'loading'
    ? `<span class="btn-spinner"></span> Loading…`
    : `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M4 6l3 3 3-3M2 10v2a1 1 0 001 1h8a1 1 0 001-1v-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg> Load into Endee`;
}

function _setLoadStatus(text, cls) {
  const el = document.getElementById(IDS.LOAD_STATUS);
  if (!el) return;
  el.textContent = text;
  el.className   = `load-status ${cls}`.trim();
  if (text) animateStatusMessage(el);
}

function _renderChunkChips(resumeN, jobN) {
  const el = document.getElementById(IDS.CHUNK_CHIPS);
  if (!el) return;
  el.innerHTML = `
    <span class="chunk-chip chunk-chip--resume">${resumeN} resume chunks</span>
    <span class="chunk-chip chunk-chip--job">${jobN} job chunks</span>
  `;
  animateChunkChips();
}

function fillDemoData() {
  const rt = document.getElementById(IDS.RESUME_TEXT);
  const jt = document.getElementById(IDS.JOB_TEXT);
  if (rt) rt.value = DEMO_RESUME;
  if (jt) jt.value = DEMO_JOB;
  _updateCount(IDS.RESUME_TEXT, IDS.RESUME_COUNT);
  _updateCount(IDS.JOB_TEXT,    IDS.JOB_COUNT);
  showToast('Demo data loaded — click "Load into Endee" next.', 'info');
  if (window.gsap) {
    gsap.from(['#resumePanel', '#jobPanel'], { borderColor: 'var(--accent)', duration: 0.5, stagger: 0.1, ease: 'power2.out' });
  }
}

function handleClearAll() {
  const rt = document.getElementById(IDS.RESUME_TEXT);
  const jt = document.getElementById(IDS.JOB_TEXT);
  if (rt) rt.value = '';
  if (jt) jt.value = '';
  _updateCount(IDS.RESUME_TEXT, IDS.RESUME_COUNT);
  _updateCount(IDS.JOB_TEXT,    IDS.JOB_COUNT);
  const chips = document.getElementById(IDS.CHUNK_CHIPS);
  if (chips) chips.innerHTML = '';
  _setLoadStatus('', '');
  clearResult();
  setState({ dataLoaded: false, loadStatus: 'idle' });
  setStep(1);
  showToast('Cleared.', 'info', 2000);
}

/* ── QUESTION PILLS ───────────────────────────────────────────────────────── */

function initQuestionPills() {
  const container = document.getElementById(IDS.QUESTION_PILLS);
  if (!container) return;

  container.innerHTML = CONFIG.PRESET_QUESTIONS
    .map(({ label, q }) => `<button class="pill" data-q="${q}" type="button">${label}</button>`)
    .join('');

  container.addEventListener('click', e => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    container.querySelectorAll('.pill').forEach(p => p.classList.remove('is-active'));
    pill.classList.add('is-active');
    const qi = document.getElementById(IDS.QUESTION_INPUT);
    if (qi) qi.value = pill.dataset.q;
    _clearValidationError();
  });

  requestAnimationFrame(bindPillAnimations);
}

/* ── ANALYZE SECTION ──────────────────────────────────────────────────────── */

function initAnalyzeSection() {
  document.getElementById(IDS.ANALYZE_BTN)?.addEventListener('click', handleAnalyze);
  document.getElementById(IDS.QUESTION_INPUT)?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleAnalyze();
  });
  document.getElementById(IDS.QUESTION_INPUT)?.addEventListener('input', () => {
    if (document.getElementById(IDS.QUESTION_INPUT)?.value.trim()) _clearValidationError();
  });
}

async function handleAnalyze() {
  const question = document.getElementById(IDS.QUESTION_INPUT)?.value.trim() || '';

  if (!question) {
    _showValidationError('Please enter a question or pick one above.');
    shakeElement(document.getElementById(IDS.QUESTION_INPUT));
    return;
  }

  if (!getState().dataLoaded) {
    showToast('Tip: Load your data first for best results.', 'warning', 4000);
  }

  setState({ loading: true, analyzeStatus: 'idle' });
  _setAnalyzeBtnState('loading');
  showLoader();

  try {
    const data = await analyze(question);
    setState({ loading: false, analyzeStatus: 'success', lastQuestion: data.question, lastAnswer: data.answer, retrievedChunks: data.retrieved_chunks });
    addHistory({ question: data.question, answer: data.answer, chunks: data.retrieved_chunks });
    await hideLoader(true);
    renderResult(data.question, data.answer, data.retrieved_chunks);
    animateResultReveal();
    setStep(3);
    renderHistory();
    setTimeout(() => scrollTo(`#${IDS.RESULT_AREA}`, 70), 200);
    showToast('Analysis complete!', 'success');
  } catch (err) {
    setState({ loading: false, analyzeStatus: 'error' });
    const msg = err instanceof ApiError ? err.message : 'Network error — is the backend running?';
    await hideLoader(false);
    showToast(`Analysis failed: ${msg}`, 'error', 7000);
  } finally {
    _setAnalyzeBtnState('idle');
  }
}

function _setAnalyzeBtnState(state) {
  const btn = document.getElementById(IDS.ANALYZE_BTN);
  if (!btn) return;
  btn.disabled = state === 'loading';
  btn.innerHTML = state === 'loading'
    ? `<span class="btn-spinner"></span> Analyzing…`
    : `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M13 7A6 6 0 111 7a6 6 0 0112 0z" stroke="currentColor" stroke-width="1.5"/><path d="M7 4v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Analyze`;
}

function _showValidationError(msg) {
  const el = document.getElementById(IDS.QUESTION_VALID);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('is-visible');
}

function _clearValidationError() {
  const el = document.getElementById(IDS.QUESTION_VALID);
  if (!el) return;
  el.textContent = '';
  el.classList.remove('is-visible');
}

/* ── HISTORY ──────────────────────────────────────────────────────────────── */

function initHistorySection() {
  document.getElementById(IDS.CLEAR_HISTORY)?.addEventListener('click', () => {
    clearHistory();
    renderHistory();
    showToast('History cleared.', 'info', 2000);
  });
}

/* ── STATE LISTENER ───────────────────────────────────────────────────────── */

function initStateListener() {
  on(EVENTS.STATE_CHANGED, ({ detail }) => {
    const { changed, next } = detail;
    if (changed.includes('dataLoaded') && next.dataLoaded) {
      highlight(document.getElementById(IDS.STEP2));
    }
  });
}