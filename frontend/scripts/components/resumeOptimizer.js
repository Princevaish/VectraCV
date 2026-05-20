// frontend/scripts/components/resumeOptimizer.js
import { optimizeResume } from '../api/apiService.js';
import { getState } from '../state/appState.js';
import { showToast } from './toast.js';

export function initResumeOptimizer() {
  const form = document.getElementById('optForm');
  const btn = document.getElementById('optBtn');
  const resultView = document.getElementById('optResultView');
  const loader = document.getElementById('optLoader');
  const origContent = document.getElementById('optOriginalContent');
  const aiContent = document.getElementById('optAiContent');
  const copyBtn = document.getElementById('optCopyBtn');
  
  if (!form || !btn) return;

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const state = getState();
    if (!state.resumeText || !state.jdText) {
      showToast('Please upload a resume and job description first.', 'error');
      return;
    }

    const targetRole = document.getElementById('optTargetRole').value;
    const tone = document.getElementById('optTone').value;
    const focusArea = document.getElementById('optFocus').value;

    // Show loader, hide results
    form.style.opacity = '0.5';
    form.style.pointerEvents = 'none';
    btn.disabled = true;
    btn.innerHTML = 'Optimizing...';
    
    resultView.style.display = 'none';
    loader.style.display = 'flex';
    
    // Simulate phases
    const loaderText = loader.querySelector('.opt-loader-text');
    const phases = [
      "Parsing resume & JD...",
      "Analyzing ATS gaps...",
      "Generating improvements...",
      "Optimizing semantic alignment...",
      "Finalizing optimized resume..."
    ];
    let phaseIdx = 0;
    const phaseInterval = setInterval(() => {
      if(phaseIdx < phases.length) {
        loaderText.textContent = phases[phaseIdx];
        phaseIdx++;
      }
    }, 1500);

    try {
      const response = await optimizeResume(state.resumeText, state.jdText, targetRole, tone, focusArea);
      
      clearInterval(phaseInterval);
      loader.style.display = 'none';
      resultView.style.display = 'grid';
      
      origContent.textContent = state.resumeText;
      aiContent.textContent = response.optimized_resume;

      if(window.gsap) {
        gsap.fromTo(resultView, {opacity: 0, y: 20}, {opacity: 1, y: 0, duration: 0.5});
      }

      showToast('Resume optimized successfully!', 'success');
      
    } catch (err) {
      clearInterval(phaseInterval);
      loader.style.display = 'none';
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
      if (aiContent.textContent) {
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
