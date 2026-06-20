// frontend/scripts/components/settings.js
// Settings workspace component — controls theme, AI preferences, data resets, and system status checks.

import { toggleTheme, getState } from '../state/appState.js';
import { ping, pingATS, getStats } from '../api/apiService.js';
import { showToast } from './toast.js';
import { emit } from '../utils/helpers.js';

// ── Module-level confirm state (avoids listener stacking) ──
let _confirmCleanup = null;

export function initSettings() {
  const darkModeToggle = document.getElementById('settingsDarkModeToggle');
  const animationsToggle = document.getElementById('settingsAnimationsToggle');
  const responseLengthSelect = document.getElementById('settingsResponseLength');
  const streamingToggle = document.getElementById('settingsStreamingToggle');

  const clearChatBtn = document.getElementById('settingsClearChatBtn');
  const clearHistoryBtn = document.getElementById('settingsClearHistoryBtn');
  const clearContextBtn = document.getElementById('settingsClearContextBtn');

  const viewSettings = document.getElementById('view-settings');

  // Gracefully handle missing elements — log a warning instead of silently exiting
  if (!darkModeToggle || !animationsToggle || !responseLengthSelect || !streamingToggle) {
    console.warn('[Settings] One or more settings controls not found in DOM — skipping init.');
    return;
  }

  // ── 1. Load preferences from localStorage ──

  // Theme sync
  const syncThemeCheckbox = () => {
    const { theme } = getState();
    darkModeToggle.checked = (theme === 'dark');
  };
  syncThemeCheckbox();

  // Animations
  const animsEnabled = localStorage.getItem('vectra_animations_enabled') !== 'false';
  animationsToggle.checked = animsEnabled;
  window.__vectraAnimationsEnabled = animsEnabled;

  // AI Response Length
  const respLength = localStorage.getItem('vectra_ai_response_length') || 'medium';
  responseLengthSelect.value = respLength;

  // AI Streaming
  const streamingEnabled = localStorage.getItem('vectra_ai_streaming_enabled') !== 'false';
  streamingToggle.checked = streamingEnabled;

  // ── 2. Event Listeners for Preferences ──

  darkModeToggle.addEventListener('change', () => {
    toggleTheme();
    showToast(`Theme switched to ${getState().theme}.`, 'success');
  });

  window.addEventListener('app:themeChanged', () => {
    syncThemeCheckbox();
  });

  animationsToggle.addEventListener('change', () => {
    const enabled = animationsToggle.checked;
    localStorage.setItem('vectra_animations_enabled', String(enabled));
    window.__vectraAnimationsEnabled = enabled;
    showToast(enabled ? 'Animations enabled.' : 'Animations disabled.', 'success');
  });

  responseLengthSelect.addEventListener('change', () => {
    const val = responseLengthSelect.value;
    localStorage.setItem('vectra_ai_response_length', val);
    showToast(`AI response length set to ${val}.`, 'success');
  });

  streamingToggle.addEventListener('change', () => {
    const enabled = streamingToggle.checked;
    localStorage.setItem('vectra_ai_streaming_enabled', String(enabled));
    showToast(enabled ? 'Streaming response enabled.' : 'Streaming response disabled.', 'success');
  });

  // ── 3. Data & Privacy Resets ──

  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', (e) => {
      e.preventDefault();
      _showSettingsConfirm(
        'Clear Chat History',
        'Are you sure you want to clear all message logs with the Copilot? This action cannot be undone.',
        'Clear Chat',
        () => {
          emit('app:clearChat');
          showToast('Chat history cleared.', 'success');
        }
      );
    });
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', (e) => {
      e.preventDefault();
      _showSettingsConfirm(
        'Clear Analysis History',
        'Are you sure you want to clear all past ATS score history logs? This action cannot be undone.',
        'Clear Runs',
        () => {
          emit('app:clearAllHistory');
          showToast('Analysis history cleared.', 'success');
        }
      );
    });
  }

  if (clearContextBtn) {
    clearContextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      _showSettingsConfirm(
        'Reset Upload Context',
        'Are you sure you want to erase the uploaded resume and job description? This resets all active dashboard context.',
        'Reset Context',
        () => {
          emit('app:resetContext');
          // Toast is already fired by _resetUploadContext in main.js
        }
      );
    });
  }

  // ── 4. System Status Checks ──

  const _setStatus = (elementId, isActive, text) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.className = `status-indicator status-indicator--${isActive ? 'active' : 'inactive'}`;
    const dot = el.querySelector('.status-dot');
    const textEl = el.querySelector('.status-text');
    if (dot) dot.className = 'status-dot'; // reset before re-applying parent class styles
    if (textEl) textEl.textContent = text || (isActive ? 'Active' : 'Offline');
  };

  const checkConnection = () => {
    const online = navigator.onLine;
    _setStatus('statusConnection', online, online ? 'Online' : 'Offline');
  };

  const checkServices = async () => {
    // Backend API health
    try {
      await ping();
      _setStatus('statusBackend', true, 'Active');
    } catch {
      _setStatus('statusBackend', false, 'Offline');
    }

    // ChromaDB / Vector Store health via stats endpoint
    try {
      const stats = await getStats();
      _setStatus('statusVectorDb', true, 'Active');

      // Update model info if returned from stats
      const modelEl = document.getElementById('statusModelInfo');
      if (modelEl && stats && stats.model) {
        modelEl.textContent = stats.model;
      }
    } catch {
      _setStatus('statusVectorDb', false, 'Offline');
    }
  };

  // Listen to network changes
  window.addEventListener('online', checkConnection);
  window.addEventListener('offline', checkConnection);

  // Initial checks
  checkConnection();
  checkServices();

  // Polling every 30 seconds (reduced from 15s to be less aggressive)
  let statusInterval = setInterval(() => {
    checkConnection();
    checkServices();
  }, 30000);

  // Run fresh status check when settings view is shown
  if (viewSettings) {
    new MutationObserver(() => {
      if (viewSettings.style.display !== 'none') {
        checkConnection();
        checkServices();

        // GSAP animate settings cards entrance
        if (window.gsap && window.__vectraAnimationsEnabled !== false) {
          gsap.fromTo(viewSettings.querySelectorAll('.settings-card'),
            { opacity: 0, y: 15, scale: 0.98 },
            { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.08, ease: 'power2.out' }
          );
        }
      }
    }).observe(viewSettings, { attributes: true, attributeFilter: ['style'] });
  }

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    clearInterval(statusInterval);
  });

  console.log('[Settings] Initialized successfully.');
}

// ── Private Confirm Modal Controller ──
// Uses a cleanup-based pattern to prevent listener stacking.
function _showSettingsConfirm(title, body, confirmText, onConfirm) {
  const modal = document.getElementById('confirmModalOverlay');
  const titleEl = document.getElementById('confirmModalTitle');
  const bodyEl = document.getElementById('confirmModalBody');
  const cancelBtn = document.getElementById('confirmCancelBtn');
  const confirmBtn = document.getElementById('confirmConfirmBtn');

  if (!modal || !titleEl || !bodyEl || !cancelBtn || !confirmBtn) {
    console.warn('[Settings] Confirm modal elements not found.');
    return;
  }

  // Clean up any previous settings-initiated confirm listeners
  if (_confirmCleanup) {
    _confirmCleanup();
    _confirmCleanup = null;
  }

  titleEl.textContent = title;
  bodyEl.textContent = body;
  confirmBtn.textContent = confirmText;

  const close = () => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    // Remove listeners
    confirmBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click', handleCancel);
    modal.removeEventListener('click', handleOverlayClick);
    _confirmCleanup = null;
  };

  const handleConfirm = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onConfirm();
    close();
  };

  const handleCancel = (e) => {
    e.preventDefault();
    close();
  };

  const handleOverlayClick = (e) => {
    if (e.target === modal) close();
  };

  // Store cleanup function so future calls can tear down stale listeners
  _confirmCleanup = () => {
    confirmBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click', handleCancel);
    modal.removeEventListener('click', handleOverlayClick);
  };

  confirmBtn.addEventListener('click', handleConfirm);
  cancelBtn.addEventListener('click', handleCancel);
  modal.addEventListener('click', handleOverlayClick);

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
}
