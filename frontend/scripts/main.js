// frontend/scripts/main.js

import { getState, setState, toggleTheme } from './state/appState.js';
import { loadData, getATSScore, uploadFile } from './api/apiService.js';
import { initClerk, AUTH_EVENTS, signOut, getUserEmail, getUserName, getUserAvatar } from './auth/clerk.js';
import { showAuthLoader, hideAuthLoader, renderLoginCard, renderUserPill, clearUserPill, transitionToApp, transitionToAuth } from './auth/authUI.js';
import { showToast } from './components/toast.js';
import { renderATSDashboard } from './components/atsDashboard.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (window.gsap) gsap.registerPlugin(ScrollTrigger, TextPlugin);

  window.addEventListener(AUTH_EVENTS.READY, (e) => _onClerkReady(e.detail));
  window.addEventListener(AUTH_EVENTS.SIGNED_IN, (e) => _onSignedIn(e.detail));
  window.addEventListener(AUTH_EVENTS.SIGNED_OUT, () => _onSignedOut());

  showAuthLoader();
  try {
    await initClerk();
  } catch (err) {
    console.error('[VectraAI] Clerk init error:', err);
    hideAuthLoader();
    transitionToAuth();
    renderLoginCard();
  }
});

function _onClerkReady({ user }) {
  hideAuthLoader();
  if (user) {
    _bootMainApp();
  } else {
    transitionToAuth();
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
}

function _bootMainApp() {
  transitionToApp();
  renderUserPill();
  initSidebar();
  initTheme();
  initUploaders();
  initAnalysisFlow();

  if (window.gsap) {
    gsap.from('#mainContent', { opacity: 0, y: 15, duration: 0.5, ease: 'power2.out', delay: 0.2 });
  }
}

// ── Sidebar Navigation ──
function initSidebar() {
  const navItems = document.querySelectorAll('.nav-item[data-view]');
  
  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-view');
      
      if (targetView === 'dashboard') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (targetView === 'ats') {
        const atsSection = document.getElementById('atsDashboardSection');
        if (atsSection && atsSection.style.display !== 'none') {
           atsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
           showToast('Please upload documents and run analysis first.', 'info');
           return;
        }
      } else {
        showToast('This view is coming soon in VectraAI Pro.', 'info');
        return;
      }
      
      navItems.forEach(i => i.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// ── Theme ──
function initTheme() {
  const btn = document.getElementById('themeBtn');
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

// ── Upload Handlers ──
function initUploaders() {
  _bindUploader('resume');
  _bindUploader('jd');
}

function _bindUploader(type) {
  const card = document.getElementById(`${type}UploadCard`);
  const fileInput = document.getElementById(`${type}FileInput`);
  const browseBtn = document.getElementById(`${type}BrowseBtn`);
  const textarea = document.getElementById(`${type}Textarea`);
  const pasteToggle = document.getElementById(`${type}PasteToggle`);
  const removeBtn = document.getElementById(`${type}RemoveBtn`);

  if (!card || !fileInput) return;

  // Browse click
  card.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.tagName === 'TEXTAREA') return;
    fileInput.click();
  });
  if (browseBtn) {
    browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  // Drag and drop
  card.addEventListener('dragover', (e) => {
    e.preventDefault();
    card.classList.add('is-dragover');
  });
  card.addEventListener('dragleave', () => card.classList.remove('is-dragover'));
  card.addEventListener('drop', (e) => {
    e.preventDefault();
    card.classList.remove('is-dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      _handleFile(type, e.dataTransfer.files[0]);
    }
  });

  // File selection
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length) {
      _handleFile(type, e.target.files[0]);
    }
    fileInput.value = ''; // reset
  });

  // Paste toggle
  if (pasteToggle && textarea) {
    pasteToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      textarea.style.display = 'block';
      textarea.focus();
      pasteToggle.style.display = 'none';
      if (window.gsap) gsap.fromTo(textarea, {opacity: 0, y: -10}, {opacity: 1, y: 0, duration: 0.3});
    });
    textarea.addEventListener('input', _checkAnalyzeButton);
  }

  // Remove file
  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (textarea) textarea.value = '';
      card.classList.remove('is-loaded', 'is-uploading', 'is-error');
      _checkAnalyzeButton();
    });
  }
}

async function _handleFile(type, file) {
  const card = document.getElementById(`${type}UploadCard`);
  const fileName = document.getElementById(`${type}FileName`);
  const fileSize = document.getElementById(`${type}FileSize`);
  const progressFill = document.getElementById(`${type}ProgressFill`);
  const textarea = document.getElementById(`${type}Textarea`);

  if (card) {
    card.classList.remove('is-loaded', 'is-error');
    card.classList.add('is-uploading');
  }
  if (fileName) fileName.textContent = file.name;
  if (fileSize) fileSize.textContent = (file.size / 1024).toFixed(1) + ' KB';
  if (progressFill) progressFill.style.width = '0%';

  try {
    const res = await uploadFile(type, file, (pct) => {
      if (progressFill) progressFill.style.width = pct + '%';
    });

    if (textarea) {
      textarea.value = res.extracted_text || '';
    }

    if (card) {
      card.classList.remove('is-uploading');
      card.classList.add('is-loaded');
    }
    
    _checkAnalyzeButton();
  } catch (err) {
    console.error('Upload error', err);
    if (card) {
      card.classList.remove('is-uploading');
      card.classList.add('is-error');
    }
    showToast(`Failed to upload ${file.name}`, 'error');
  }
}

function _checkAnalyzeButton() {
  const resume = document.getElementById('resumeTextarea')?.value.trim();
  const jd = document.getElementById('jdTextarea')?.value.trim();
  const btn = document.getElementById('runAnalysisBtn');
  const startBtn = document.getElementById('startAnalysisBtn');
  const hint = document.getElementById('analyseCTAHint');

  const ready = !!(resume && jd);
  if (btn) btn.disabled = !ready;
  if (hint) hint.style.opacity = ready ? '0' : '1';
  
  if (startBtn) {
    startBtn.onclick = () => {
      if (ready) btn.click();
      else document.getElementById('uploadHeading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  }
}

// ── ATS Analysis Flow ──
function initAnalysisFlow() {
  const runBtn = document.getElementById('runAnalysisBtn');
  if (runBtn) runBtn.addEventListener('click', _runAnalysis);
  
  const startBtn = document.getElementById('startAnalysisBtn');
  if (startBtn) startBtn.addEventListener('click', () => {
     document.getElementById('uploadHeading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

async function _runAnalysis() {
  const resumeText = document.getElementById('resumeTextarea')?.value.trim();
  const jdText = document.getElementById('jdTextarea')?.value.trim();

  if (!resumeText || !jdText) {
    showToast('Please upload or paste both resume and job description.', 'error');
    return;
  }

  const overlay = document.getElementById('analyzeOverlay');
  const overlayMsg = document.getElementById('overlayMsg');
  const overlaySub = document.getElementById('overlaySub');
  
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
    if (window.gsap) gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3 });
  }

  try {
    if (overlayMsg) overlayMsg.textContent = 'Storing vectors in ChromaDB...';
    if (overlaySub) overlaySub.textContent = 'Preparing embeddings for semantic scoring';
    await loadData(resumeText, jdText);

    if (overlayMsg) overlayMsg.textContent = 'Running semantic ATS scoring...';
    if (overlaySub) overlaySub.textContent = 'Evaluating keyword match, skill coverage, and quantifiable impact';
    const atsData = await getATSScore(resumeText, jdText);

    const atsSection = document.getElementById('atsDashboardSection');
    const atsContainer = document.getElementById('atsDashboard');

    if (atsSection && atsContainer) {
      atsSection.style.display = 'block';
      renderATSDashboard(atsContainer, atsData);
      
      // Update nav active state to ATS
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      const atsNav = document.querySelector('.nav-item[data-view="ats"]');
      if(atsNav) atsNav.classList.add('active');

      setTimeout(() => {
        atsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    }
    
    showToast('Analysis complete!', 'success');

  } catch (err) {
    console.error('Analysis failed', err);
    showToast(err.message || 'Analysis failed', 'error');
  } finally {
    if (overlay) {
      if (window.gsap) {
        gsap.to(overlay, { opacity: 0, duration: 0.3, onComplete: () => {
          overlay.style.display = 'none';
          overlay.setAttribute('aria-hidden', 'true');
        }});
      } else {
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
      }
    }
  }
}