// frontend/scripts/components/resumeOptimizer.js
import { optimizeResume } from '../api/apiService.js';
import { getState } from '../state/appState.js';
import { showToast } from './toast.js';

export function initResumeOptimizer() {
  console.log('[ResumeOptimizer] Initializing...');
  const form = document.getElementById('optForm');
  const btn = document.getElementById('optBtn');
  const resultView = document.getElementById('optResultView');
  const loader = document.getElementById('optLoader');
  const origContent = document.getElementById('optOriginalContent');
  const aiContent = document.getElementById('optAiContent');
  const copyBtn = document.getElementById('optCopyBtn');
  
  if (!form || !btn) {
    console.error('[ResumeOptimizer] Failed to find form or btn', { form, btn });
    return;
  }

  console.log('[ResumeOptimizer] Successfully bound elements');

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    console.log('[ResumeOptimizer] Optimize button clicked');
    
    try {
      const state = getState();
      console.log('[ResumeOptimizer] Current state:', state);
      
      if (!state.resumeText || !state.jdText) {
        showToast('Please upload a resume and job description first.', 'error');
        return;
      }

      const targetRoleInput = document.getElementById('optTargetRole');
      const toneInput = document.getElementById('optTone');
      const focusAreaInput = document.getElementById('optFocus');

      const targetRole = targetRoleInput ? targetRoleInput.value : '';
      const tone = toneInput ? toneInput.value : 'professional';
      const focusArea = focusAreaInput ? focusAreaInput.value : 'ATS optimization';

      console.log('[ResumeOptimizer] Settings:', { targetRole, tone, focusArea });

      // Show loader, hide results
      form.style.opacity = '0.5';
      form.style.pointerEvents = 'none';
      btn.disabled = true;
      btn.innerHTML = 'Optimizing...';
      
      if (resultView) resultView.style.display = 'none';
      if (loader) loader.style.display = 'flex';
      
      // Simulate phases
      let phaseInterval = null;
      if (loader) {
        const loaderText = loader.querySelector('.opt-loader-text');
        if (loaderText) {
          const phases = [
            "Parsing resume & JD...",
            "Analyzing ATS gaps...",
            "Generating improvements...",
            "Optimizing semantic alignment...",
            "Finalizing optimized resume..."
          ];
          let phaseIdx = 0;
          phaseInterval = setInterval(() => {
            if(phaseIdx < phases.length) {
              loaderText.textContent = phases[phaseIdx];
              phaseIdx++;
            }
          }, 1500);
        }
      }

      console.log('[ResumeOptimizer] Calling backend API...');
      const response = await optimizeResume(state.resumeText, state.jdText, targetRole, tone, focusArea);
      console.log('[ResumeOptimizer] Backend response:', response);
      
      if (phaseInterval) clearInterval(phaseInterval);
      if (loader) loader.style.display = 'none';
      if (resultView) {
        resultView.style.display = 'grid';
        if (window.gsap) {
          gsap.fromTo(resultView, {opacity: 0, y: 20}, {opacity: 1, y: 0, duration: 0.5});
        }
      }
      
      if (origContent) origContent.textContent = state.resumeText;
      if (aiContent) aiContent.textContent = response.optimized_resume || response.answer || response;

      showToast('Resume optimized successfully!', 'success');
      
    } catch (err) {
      console.error('[ResumeOptimizer] Error during optimization:', err);
      if (loader) loader.style.display = 'none';
      showToast(err.message || 'Optimization failed', 'error');
    } finally {
      form.style.opacity = '1';
      form.style.pointerEvents = 'auto';
      btn.disabled = false;
      btn.innerHTML = '✨ Optimize Resume';
    }
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (aiContent && aiContent.textContent) {
        navigator.clipboard.writeText(aiContent.textContent).then(() => {
          showToast('Copied to clipboard', 'success');
          const origHtml = copyBtn.innerHTML;
          copyBtn.innerHTML = '✅ Copied!';
          setTimeout(() => copyBtn.innerHTML = origHtml, 2000);
        });
      }
    });
  }
}
