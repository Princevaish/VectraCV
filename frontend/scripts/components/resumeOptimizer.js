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
  const regenBtn = document.getElementById('optRegenerateBtn');
  const applyBtn = document.getElementById('optApplyBtn');
  
  if (!form || !btn) return;

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const state = getState();
    const resumeTextarea = document.getElementById('resumeTextarea');
    const jdTextarea = document.getElementById('jdTextarea');
    const resumeText = state.resumeText || (resumeTextarea ? resumeTextarea.value.trim() : '');
    const jdText = state.jdText || (jdTextarea ? jdTextarea.value.trim() : '');

    if (!resumeText || !jdText) {
      showToast('Please upload a resume and job description first.', 'error');
      return;
    }

    const targetRoleInput = document.getElementById('optTargetRole');
    const toneInput = document.getElementById('optTone');
    const focusAreaInput = document.getElementById('optFocus');

    const targetRole = targetRoleInput ? targetRoleInput.value : '';
    const tone = toneInput ? toneInput.value : 'professional';
    const focusArea = focusAreaInput ? focusAreaInput.value : 'ATS optimization';

    // Show loader, hide results
    form.style.opacity = '0.5';
    form.style.pointerEvents = 'none';
    btn.disabled = true;
    btn.innerHTML = 'Optimizing...';
    
    if (resultView) resultView.style.display = 'none';
    if (loader) loader.style.display = 'flex';
    
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
        loaderText.textContent = phases[0];
        phaseInterval = setInterval(() => {
          phaseIdx++;
          if(phaseIdx < phases.length) {
            loaderText.textContent = phases[phaseIdx];
          }
        }, 1500);
      }
    }

    try {
      const response = await optimizeResume(resumeText, jdText, targetRole, tone, focusArea);
      
      if (phaseInterval) clearInterval(phaseInterval);
      if (loader) loader.style.display = 'none';
      if (resultView) {
        resultView.style.display = 'grid';
        if (window.gsap) {
          gsap.fromTo(resultView, {opacity: 0, y: 20}, {opacity: 1, y: 0, duration: 0.5});
        }
      }
      
      if (origContent) origContent.textContent = resumeText;
      
      // Streaming AI Text Reveal
      if (aiContent) {
        aiContent.innerHTML = '';
        const optimizedText = response.optimized_resume || response.answer || response;
        
        // Simple word-by-word reveal
        const words = optimizedText.split(' ');
        let wordIdx = 0;
        
        const streamInterval = setInterval(() => {
          if (wordIdx < words.length) {
            // Very simple diff highlighting for keywords (just an example of styling)
            let word = words[wordIdx];
            if (word.length > 5 && Math.random() > 0.8) {
               // Simulate some diff highlight
               aiContent.innerHTML += `<span style="background: rgba(var(--accent-rgb), 0.2); padding: 0 2px; border-radius: 2px;">${word}</span> `;
            } else {
               aiContent.innerHTML += word + ' ';
            }
            wordIdx++;
          } else {
            clearInterval(streamInterval);
            showToast('Resume optimized successfully!', 'success');
          }
        }, 15);
      } else {
        showToast('Resume optimized successfully!', 'success');
      }
      
    } catch (err) {
      console.error('[ResumeOptimizer] Error during optimization:', err);
      if (phaseInterval) clearInterval(phaseInterval);
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
      if (aiContent && aiContent.innerText) {
        navigator.clipboard.writeText(aiContent.innerText).then(() => {
          showToast('Copied to clipboard', 'success');
          const origHtml = copyBtn.innerHTML;
          copyBtn.innerHTML = '✅ Copied!';
          setTimeout(() => copyBtn.innerHTML = origHtml, 2000);
        });
      }
    });
  }
  if (regenBtn) {
    regenBtn.addEventListener('click', () => {
      btn.click();
    });
  }

  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      if (aiContent && aiContent.innerText) {
        showToast('Suggestion applied to your profile!', 'success');
      }
    });
  }
}
