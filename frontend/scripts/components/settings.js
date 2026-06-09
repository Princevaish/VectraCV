// frontend/scripts/components/settings.js
// Settings workspace component — controls theme, AI preferences, data resets, and system status checks.

import { toggleTheme, getState } from '../state/appState.js';
import { ping, getStats } from '../api/apiService.js';
import { showToast } from './toast.js';
import { emit } from '../utils/helpers.js';

export function initSettings() {
  const darkModeToggle = document.getElementById('settingsDarkModeToggle');
  const animationsToggle = document.getElementById('settingsAnimationsToggle');
  const responseLengthSelect = document.getElementById('settingsResponseLength');
  const streamingToggle = document.getElementById('settingsStreamingToggle');

  const clearChatBtn = document.getElementById('settingsClearChatBtn');
  const clearHistoryBtn = document.getElementById('settingsClearHistoryBtn');
  const clearContextBtn = document.getElementById('settingsClearContextBtn');

  const viewSettings = document.getElementById('view-settings');

  if (!darkModeToggle || !animationsToggle || !responseLengthSelect || !streamingToggle) return;

  // ── 1. Load preferences from localStorage ──
  
  // Theme check
  const syncThemeCheckbox = () => {
    const { theme } = getState();
    darkModeToggle.checked = (theme === 'dark');
  };
  syncThemeCheckbox();

  // Animations check
  const animsEnabled = localStorage.getItem('vectra_animations_enabled') !== 'false';
  animationsToggle.checked = animsEnabled;
  window.__vectraAnimationsEnabled = animsEnabled;

  // AI Response Length
  const respLength = localStorage.getItem('vectra_ai_response_length') || 'medium';
  responseLengthSelect.value = respLength;

  // AI Streaming check
  const streamingEnabled = localStorage.getItem('vectra_ai_streaming_enabled') !== 'false';
  streamingToggle.checked = streamingEnabled;

  // ── 2. Event Listeners for Preferences ──

  // Theme Changed
  darkModeToggle.addEventListener('change', () => {
    toggleTheme();
    showToast(`Theme switched to ${getState().theme}.`, 'success');
  });

  // Sync if theme changed from header button
  window.addEventListener('app:themeChanged', () => {
    syncThemeCheckbox();
  });

  // Animations Changed
  animationsToggle.addEventListener('change', () => {
    const enabled = animationsToggle.checked;
    localStorage.setItem('vectra_animations_enabled', String(enabled));
    window.__vectraAnimationsEnabled = enabled;
    showToast(enabled ? 'Animations enabled.' : 'Animations disabled.', 'success');
  });

  // AI Response Length Changed
  responseLengthSelect.addEventListener('change', () => {
    const val = responseLengthSelect.value;
    localStorage.setItem('vectra_ai_response_length', val);
    showToast(`AI response length set to ${val}.`, 'success');
  });

  // AI Streaming Changed
  streamingToggle.addEventListener('change', () => {
    const enabled = streamingToggle.checked;
    localStorage.setItem('vectra_ai_streaming_enabled', String(enabled));
    showToast(enabled ? 'Streaming response enabled.' : 'Streaming response disabled.', 'success');
  });

  // ── 3. Data & Privacy Resets ──

  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showConfirm(
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
      showConfirm(
        'Clear Analysis History',
        'Are you sure you want to clear all past ATS score history logs? This action cannot be undone.',
        'Clear Runs',
        () => {
          emit('app:clearAllHistory');
        }
      );
    });
  }

  if (clearContextBtn) {
    clearContextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showConfirm(
        'Reset Upload Context',
        'Are you sure you want to erase the uploaded resume and job description? This resets all active dashboard context.',
        'Reset Context',
        () => {
          emit('app:resetContext');
        }
      );
    });
  }

  // ── 4. System Status Checks ──

  const updateStatusIndicator = (elementId, isActive, text) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.className = `status-indicator status-indicator--${isActive ? 'active' : 'inactive'}`;
    const textEl = el.querySelector('.status-text');
    if (textEl) textEl.textContent = text || (isActive ? 'Active' : 'Offline');
  };

  const checkConnection = () => {
    const online = navigator.onLine;
    updateStatusIndicator('statusConnection', online, online ? 'Online' : 'Offline');
  };

  const checkServices = async () => {
    // Check Backend
    try {
      await ping();
      updateStatusIndicator('statusBackend', true, 'Active');
    } catch (err) {
      updateStatusIndicator('statusBackend', false, 'Offline');
    }

    // Check ChromaDB stats
    try {
      await getStats();
      updateStatusIndicator('statusVectorDb', true, 'Active');
    } catch (err) {
      updateStatusIndicator('statusVectorDb', false, 'Offline');
    }
  };

  // Listen to network changes
  window.addEventListener('online', checkConnection);
  window.addEventListener('offline', checkConnection);

  // Initial and periodic checks
  checkConnection();
  checkServices();

  // Polling every 15 seconds
  const statusInterval = setInterval(() => {
    checkConnection();
    checkServices();
  }, 15000);

  // Run status check when view settings is shown
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

  // Clean up interval if needed on unload (though not strictly necessary in SPA lifetime)
  window.addEventListener('beforeunload', () => {
    clearInterval(statusInterval);
  });
}

// ── Reusable Confirm Modal Controller for settings ──
function showConfirm(title, body, confirmText, onConfirm) {
  const modal = document.getElementById('confirmModalOverlay');
  const titleEl = document.getElementById('confirmModalTitle');
  const bodyEl = document.getElementById('confirmModalBody');
  const cancelBtn = document.getElementById('confirmCancelBtn');
  const confirmBtn = document.getElementById('confirmConfirmBtn');

  if (!modal || !titleEl || !bodyEl || !cancelBtn || !confirmBtn) return;

  titleEl.textContent = title;
  bodyEl.textContent = body;
  confirmBtn.textContent = confirmText;

  const close = () => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    confirmBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click', close);
    modal.removeEventListener('click', handleOverlayClick);
  };

  const handleConfirm = (e) => {
    e.preventDefault();
    onConfirm();
    close();
  };

  const handleOverlayClick = (e) => {
    if (e.target === modal) close();
  };

  confirmBtn.addEventListener('click', handleConfirm);
  cancelBtn.addEventListener('click', close);
  modal.addEventListener('click', handleOverlayClick);

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
}
