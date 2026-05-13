// frontend/scripts/main.js

import { getState, setState, toggleTheme } from './state/appState.js';
import { loadData, getATSScore, uploadFile } from './api/apiService.js';
import { initClerk, AUTH_EVENTS, signOut, getUserEmail, getUserName, getUserAvatar } from './auth/clerk.js';
import { showAuthLoader, hideAuthLoader, renderLoginCard, renderUserPill, clearUserPill, transitionToApp, transitionToAuth } from './auth/authUI.js';
import { showToast } from './components/toast.js';
import { renderATSDashboard } from './components/atsDashboard.js';
import { initChatInterface } from './components/chatInterface.js';

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

  if (window.gsap) {
    gsap.from('#mainContent', { opacity: 0, y: 15, duration: 0.5, ease: 'power2.out', delay: 0.2 });
  }
}

// ── Sidebar Navigation ──
function initSidebar() {
  const navItems = document.querySelectorAll('.nav-item[data-view]');
  const views = document.querySelectorAll('.view');
  
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
      } 
      
      // Toggle Views (SaaS routing behavior)
      if (['ai', 'history', 'optimizer', 'settings', 'chat'].includes(targetView)) {
        views.forEach(v => v.style.display = 'none');
        const viewEl = document.getElementById(`view-${targetView}`);
        if (viewEl) viewEl.style.display = 'block';
        window.scrollTo({ top: 0 });
      } else {
        views.forEach(v => v.style.display = 'none');
        const viewEl = document.getElementById('view-dashboard');
        if (viewEl) viewEl.style.display = 'block';
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
      gsap.fromTo(overlay, { opacity: 0, backdropFilter: 'blur(0px)' }, { opacity: 1, backdropFilter: 'blur(12px)', duration: 0.4 });
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

    updateStep(2, 'Running keyword intelligence', 'Evaluating match, skills, and impact...');
    const atsData = await getATSScore(resumeText, jdText);

    updateStep(3, 'Generating AI recommendations', 'Extracting actionable career insights...');
    
    // Populate simple AI suggestions and History
    if (typeof _populateAISuggestions === 'function') _populateAISuggestions(atsData);
    if (typeof _populateHistory === 'function') _populateHistory(atsData);

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

// ── Dummy populator for views ──
function _populateAISuggestions(atsData) {
  const container = document.getElementById('aiSuggestionsContainer');
  if (!container || !atsData) return;
  
  const skills = atsData.missing_skills || [];
  let html = `<div class="ai-cards">`;
  
  if (skills.length) {
    html += `
      <div class="ai-card">
        <div class="ai-card__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div>
          <h4>Missing Core Keywords</h4>
          <p>Your resume is missing some crucial ATS keywords found in the Job Description.</p>
          <div class="ai-card__pills">
            ${skills.map(s => `<span class="ai-pill">${s}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
  }
  
  html += `
    <div class="ai-card">
      <div class="ai-card__icon" style="color:var(--accent2); background:rgba(var(--accent2-rgb),0.1)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      </div>
      <div>
        <h4>Actionable Insight</h4>
        <p>Consider re-writing your most recent role to focus more on quantifiable metrics rather than just responsibilities. ATS systems rank metric-driven bullet points higher.</p>
      </div>
    </div>
  </div>`;
  
  container.innerHTML = html;
}

function _populateHistory(atsData) {
  const list = document.getElementById('historyList');
  if (!list) return;
  
  const existing = list.querySelector('.empty-state') ? '' : list.innerHTML;
  
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const score = Math.round(atsData.score * 100);
  
  const html = `
    <div class="history-item">
      <div class="history-item__main">
        <div class="history-item__title">Software Engineer</div>
        <div class="history-item__date">${date}</div>
      </div>
      <div class="history-item__score">
        <span class="score-badge ${score >= 75 ? 'good' : 'warning'}">${score}/100</span>
      </div>
    </div>
  `;
  
  list.innerHTML = html + existing;
}