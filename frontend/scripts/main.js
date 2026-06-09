// frontend/scripts/main.js

import { getState, setState, toggleTheme } from './state/appState.js';
import { loadData, getATSScore, uploadFile } from './api/apiService.js';
import { initClerk, AUTH_EVENTS, signOut, getUserEmail, getUserName, getUserAvatar } from './auth/clerk.js';
import { showAuthLoader, hideAuthLoader, renderLoginCard, renderUserPill, clearUserPill, transitionToApp, transitionToAuth } from './auth/authUI.js';
import { showToast } from './components/toast.js';
import { renderATSDashboard } from './components/atsDashboard.js';
import { initChatInterface } from './components/chatInterface.js';
import { renderAISuggestions } from './components/aiSuggestions.js';
import { initResumeOptimizer } from './components/resumeOptimizer.js';
import { startTour } from './components/productTour.js';

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
  initChatInterface();
  initResumeOptimizer();
  initHowItWorks();
  initHistoryView();

  if (window.gsap) {
    gsap.from('#mainContent', { opacity: 0, y: 15, duration: 0.5, ease: 'power2.out', delay: 0.2 });
  }
}

// ── Sidebar Navigation ──
const VIEW_TITLES = {
  dashboard: 'Dashboard',
  ats: 'ATS Analysis',
  ai: 'AI Suggestions',
  chat: 'Chat with AI',
  optimizer: 'Resume Optimizer',
  history: 'History',
  settings: 'Settings',
};

function initSidebar() {
  const navItems = document.querySelectorAll('.nav-item[data-view]');
  const views = document.querySelectorAll('.view');
  const topbarTitle = document.getElementById('topbarTitle');
  
  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-view');
      
      // Update topbar title
      if (topbarTitle) topbarTitle.textContent = VIEW_TITLES[targetView] || 'Dashboard';

      if (targetView === 'dashboard') {
        views.forEach(v => v.style.display = 'none');
        document.getElementById('view-dashboard').style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (targetView === 'ats') {
        const atsSection = document.getElementById('atsDashboardSection');
        if (atsSection && atsSection.style.display !== 'none') {
          views.forEach(v => v.style.display = 'none');
          document.getElementById('view-dashboard').style.display = 'block';
          setTimeout(() => atsSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        } else {
          showToast('Please upload documents and run analysis first.', 'info');
          return;
        }
      } else if (['ai', 'history', 'optimizer', 'settings', 'chat'].includes(targetView)) {
        views.forEach(v => v.style.display = 'none');
        const viewEl = document.getElementById(`view-${targetView}`);
        if (viewEl) viewEl.style.display = 'block';
        window.scrollTo({ top: 0 });
        if (targetView === 'history') {
          _renderHistoryList();
        }
      } else {
        views.forEach(v => v.style.display = 'none');
        document.getElementById('view-dashboard').style.display = 'block';
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

  window.addEventListener('app:themeChanged', () => {
    syncIcon();
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
  const removeBtn = document.getElementById(`${type}RemoveBtn`);
  
  const tabUpload = document.getElementById(`${type}TabUpload`);
  const tabPaste = document.getElementById(`${type}TabPaste`);
  const contentUpload = document.getElementById(`${type}ContentUpload`);
  const contentPaste = document.getElementById(`${type}ContentPaste`);
  const wordCount = document.getElementById(`${type}WordCount`);

  if (!card || !fileInput) return;

  // Tabs
  if (tabUpload && tabPaste) {
    tabUpload.addEventListener('click', (e) => {
      e.stopPropagation();
      tabUpload.classList.add('active');
      tabPaste.classList.remove('active');
      if (contentUpload) contentUpload.style.display = 'block';
      if (contentPaste) contentPaste.style.display = 'none';
    });
    tabPaste.addEventListener('click', (e) => {
      e.stopPropagation();
      tabPaste.classList.add('active');
      tabUpload.classList.remove('active');
      if (contentPaste) contentPaste.style.display = 'block';
      if (contentUpload) contentUpload.style.display = 'none';
      if (window.gsap && textarea) {
        gsap.fromTo(textarea, {opacity: 0, y: 5}, {opacity: 1, y: 0, duration: 0.3});
      }
      textarea?.focus();
    });
  }

  // Browse click
  card.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.tagName === 'TEXTAREA') return;
    if (tabUpload && !tabUpload.classList.contains('active')) return;
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
    if (tabUpload && tabUpload.classList.contains('active')) {
      card.classList.add('is-dragover');
    }
  });
  card.addEventListener('dragleave', () => card.classList.remove('is-dragover'));
  card.addEventListener('drop', (e) => {
    e.preventDefault();
    card.classList.remove('is-dragover');
    if (tabUpload && !tabUpload.classList.contains('active')) return;
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

  // Textarea input & resize
  if (textarea) {
    textarea.addEventListener('input', () => {
      _checkAnalyzeButton();
      // Auto resize
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
      
      if (wordCount) {
        const words = textarea.value.trim().split(/\s+/).filter(w => w.length > 0).length;
        wordCount.textContent = `${words} words`;
      }
    });
  }

  // Remove file
  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (textarea) textarea.value = '';
      if (wordCount) wordCount.textContent = '0 words';
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
  const wordCount = document.getElementById(`${type}WordCount`);

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
      if (wordCount) {
        const words = textarea.value.trim().split(/\s+/).filter(w => w.length > 0).length;
        wordCount.textContent = `${words} words`;
      }
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

// ── How It Works Tour ──
function initHowItWorks() {
  const btn = document.getElementById('viewDocsBtn');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      startTour();
    });
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
  const steps = document.querySelectorAll('.overlay__step');
  const progressFill = document.getElementById('overlayProgressFill');
  const msg = document.getElementById('overlayMsg');
  const sub = document.getElementById('overlaySub');
  
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
    if (window.gsap) {
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      gsap.set(steps, { opacity: 0.4, x: -10, color: 'var(--ink-muted)' });
      if (progressFill) gsap.set(progressFill, { width: '0%' });
    }
  }

  const updateStep = (idx, title, desc) => {
    if(msg) msg.textContent = title;
    if(sub) sub.textContent = desc;
    if(!window.gsap) return;
    
    if(idx > 0 && steps[idx-1]) {
      gsap.to(steps[idx-1], { color: 'var(--success)', opacity: 1, duration: 0.3 });
    }
    if(idx < steps.length && steps[idx]) {
      gsap.to(steps[idx], { color: 'var(--accent)', opacity: 1, x: 0, duration: 0.3 });
      if (progressFill) {
        gsap.to(progressFill, { width: `${(idx + 1) * 25}%`, duration: 0.6, ease: 'power2.out' });
      }
    }
  };

  try {
    updateStep(0, 'Initializing Engine', 'Preparing vector models and semantic space...');
    await new Promise(r => setTimeout(r, 600)); // UX delay

    updateStep(1, 'Computing semantic similarity', 'Storing vectors in ChromaDB...');
    await loadData(resumeText, jdText);
    setState({ dataLoaded: true, resumeText, jdText });

    updateStep(2, 'Running keyword intelligence', 'Evaluating match, skills, and impact...');
    const atsData = await getATSScore(resumeText, jdText);

    updateStep(3, 'Generating AI recommendations', 'Extracting actionable career insights...');
    
    // Store ATS data globally for cross-module access
    window.__vectraAtsData = atsData;

    // Populate AI Suggestions page
    const sugContainer = document.getElementById('aiSuggestionsContainer');
    if (sugContainer) renderAISuggestions(sugContainer, atsData);

    // Populate History
    _populateHistory(atsData);

    await new Promise(r => setTimeout(r, 700));

    const atsSection = document.getElementById('atsDashboardSection');
    const atsContainer = document.getElementById('atsDashboard');

    if (atsSection && atsContainer) {
      atsSection.style.display = 'block';
      renderATSDashboard(atsContainer, atsData);
      
      // Switch back to dashboard view if on another view
      document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
      document.getElementById('view-dashboard').style.display = 'block';
      
      // Update nav active state to ATS (which lives on Dashboard view currently)
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

// ── History populator ──

const HISTORY_STORAGE_KEY = 'vectra_analysis_history';

function _loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to parse history from localStorage', err);
    return [];
  }
}

function _saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (err) {
    console.error('Failed to save history to localStorage', err);
  }
}

function _populateHistory(atsData) {
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const score = Math.round(atsData.ats_score || 0);
  const semantic = Math.round((atsData.semantic_similarity || 0) * 100);

  const newItem = {
    id: Date.now().toString(),
    date,
    score,
    semantic,
    atsData
  };

  const history = _loadHistory();
  const updated = [newItem, ...history].slice(0, 50); // limit to 50
  _saveHistory(updated);

  _renderHistoryList();
}

function initHistoryView() {
  _initConfirmModal();

  const clearBtn = document.getElementById('clearHistoryBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      _promptClearAllHistory();
    });
  }

  // Populate initially
  _renderHistoryList();
}

function _renderHistoryList() {
  const list = document.getElementById('historyList');
  const clearBtn = document.getElementById('clearHistoryBtn');
  if (!list) return;

  const history = _loadHistory();

  if (history.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <p>No past analyses found.</p>
      </div>
    `;
    if (clearBtn) clearBtn.style.display = 'none';
    return;
  }

  if (clearBtn) clearBtn.style.display = 'flex';

  list.innerHTML = history.map((item, idx) => {
    return `
      <div class="history-item" data-id="${item.id}" data-index="${idx}" tabindex="0">
        <div class="history-item__main">
          <div class="history-item__title">Resume Analysis</div>
          <div class="history-item__date">${item.date}</div>
        </div>
        <div class="history-item__right" style="display:flex; align-items:center; gap:16px;">
          <div class="history-item__scores">
            <span class="score-badge ${item.score >= 75 ? 'good' : 'warning'}">ATS: ${item.score}</span>
            <span class="score-badge ${item.semantic >= 70 ? 'good' : 'warning'}">Sem: ${Math.round(item.semantic)}%</span>
          </div>
          <button class="history-item__delete-btn" aria-label="Delete history item" data-id="${item.id}" data-index="${idx}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Bind clicks to history items for replay/load
  list.querySelectorAll('.history-item').forEach(card => {
    card.addEventListener('click', (e) => {
      // If the delete button was clicked, don't trigger load
      if (e.target.closest('.history-item__delete-btn')) return;

      const idx = card.dataset.index;
      _loadHistoryItem(idx);
    });
  });

  // Bind clicks to delete buttons
  list.querySelectorAll('.history-item__delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const idx = btn.dataset.index;
      _promptDeleteHistoryItem(id, idx);
    });
  });
}

function _loadHistoryItem(index) {
  const history = _loadHistory();
  const item = history[index];
  if (!item || !item.atsData) return;

  // Store ATS data globally
  window.__vectraAtsData = item.atsData;

  // Render on Dashboard & Suggestions
  const atsContainer = document.getElementById('atsDashboard');
  if (atsContainer) {
    renderATSDashboard(atsContainer, item.atsData);
  }

  const sugContainer = document.getElementById('aiSuggestionsContainer');
  if (sugContainer) {
    renderAISuggestions(sugContainer, item.atsData);
  }

  // Show the section
  const atsSection = document.getElementById('atsDashboardSection');
  if (atsSection) {
    atsSection.style.display = 'block';
  }

  // Switch to dashboard view and scroll to ATS analysis
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  document.getElementById('view-dashboard').style.display = 'block';

  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  const atsNav = document.querySelector('.nav-item[data-view="ats"]');
  if(atsNav) atsNav.classList.add('active');

  const topbarTitle = document.getElementById('topbarTitle');
  if (topbarTitle) topbarTitle.textContent = 'ATS Analysis';

  setTimeout(() => {
    atsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 150);

  showToast(`Loaded analysis from ${item.date} 📊`, 'success');
}

// ── Confirmation Modal ──
let confirmCallback = null;

function _initConfirmModal() {
  const modal = document.getElementById('confirmModalOverlay');
  const cancelBtn = document.getElementById('confirmCancelBtn');
  const confirmBtn = document.getElementById('confirmConfirmBtn');

  if (!modal || !cancelBtn || !confirmBtn) return;

  const closeModal = () => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    confirmCallback = null;
  };

  cancelBtn.addEventListener('click', closeModal);
  
  // Close on clicking overlay background
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  confirmBtn.addEventListener('click', () => {
    if (confirmCallback) {
      confirmCallback();
    }
    closeModal();
  });
}

function _showConfirmModal(title, body, confirmText, callback) {
  const modal = document.getElementById('confirmModalOverlay');
  const titleEl = document.getElementById('confirmModalTitle');
  const bodyEl = document.getElementById('confirmModalBody');
  const confirmBtn = document.getElementById('confirmConfirmBtn');

  if (!modal || !titleEl || !bodyEl || !confirmBtn) return;

  titleEl.textContent = title;
  bodyEl.textContent = body;
  confirmBtn.textContent = confirmText;
  confirmCallback = callback;

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
}

function _promptDeleteHistoryItem(id, index) {
  _showConfirmModal(
    'Delete Analysis',
    'Are you sure you want to delete this analysis run? This action cannot be undone.',
    'Delete',
    () => _deleteHistoryItem(id, index)
  );
}

function _promptClearAllHistory() {
  _showConfirmModal(
    'Clear All History',
    'Are you sure you want to clear all analysis history? This action cannot be undone.',
    'Clear All',
    () => _clearAllHistory()
  );
}

function _deleteHistoryItem(id, index) {
  const history = _loadHistory();
  const card = document.querySelector(`.history-item[data-id="${id}"]`);

  const performDelete = () => {
    const updated = history.filter(item => item.id !== id);
    _saveHistory(updated);

    showToast('Analysis deleted from history.', 'success');
    _renderHistoryList();
  };

  if (card && window.gsap) {
    gsap.to(card, {
      opacity: 0,
      x: 30,
      height: 0,
      paddingTop: 0,
      paddingBottom: 0,
      marginTop: 0,
      marginBottom: 0,
      borderWidth: 0,
      duration: 0.35,
      ease: 'power2.inOut',
      onComplete: performDelete
    });
  } else {
    performDelete();
  }
}

function _clearAllHistory() {
  const list = document.getElementById('historyList');
  const cards = list ? list.querySelectorAll('.history-item') : [];

  const performClear = () => {
    _saveHistory([]);
    showToast('All analysis history cleared.', 'success');
    _renderHistoryList();
  };

  if (cards.length > 0 && window.gsap) {
    gsap.to(cards, {
      opacity: 0,
      x: -30,
      duration: 0.3,
      stagger: 0.05,
      ease: 'power2.in',
      onComplete: performClear
    });
  } else {
    performClear();
  }
}

function _resetUploadContext() {
  const resumeTextarea = document.getElementById('resumeTextarea');
  const jdTextarea = document.getElementById('jdTextarea');
  if (resumeTextarea) resumeTextarea.value = '';
  if (jdTextarea) jdTextarea.value = '';

  const resumeWordCount = document.getElementById('resumeWordCount');
  const jdWordCount = document.getElementById('jdWordCount');
  if (resumeWordCount) resumeWordCount.textContent = '0 words';
  if (jdWordCount) jdWordCount.textContent = '0 words';

  const resumeCard = document.getElementById('resumeUploadCard');
  const jdCard = document.getElementById('jdUploadCard');
  if (resumeCard) resumeCard.classList.remove('is-loaded', 'is-uploading', 'is-error');
  if (jdCard) jdCard.classList.remove('is-loaded', 'is-uploading', 'is-error');

  _checkAnalyzeButton();

  setState({ dataLoaded: false, resumeText: '', jdText: '' });
  window.__vectraAtsData = null;

  const atsSection = document.getElementById('atsDashboardSection');
  if (atsSection) atsSection.style.display = 'none';

  const sugContainer = document.getElementById('aiSuggestionsContainer');
  if (sugContainer) {
    sugContainer.innerHTML = `
      <div class="empty-state">
        <p>No suggestions available. Run an analysis first.</p>
      </div>
    `;
  }

  showToast('Upload context and active session reset.', 'success');
}

window.addEventListener('app:clearAllHistory', () => {
  _clearAllHistory();
});

window.addEventListener('app:resetContext', () => {
  _resetUploadContext();
});