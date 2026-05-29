// frontend/scripts/components/chatInterface.js
// Production-grade AI chat — ChatGPT/Claude-level UX.

import { analyze } from '../api/apiService.js';
import { showToast } from './toast.js';
import { getState } from '../state/appState.js';

let isGenerating = false;

export function initChatInterface() {
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSendBtn');
  const msgs = document.getElementById('chatMessages');
  const chips = document.querySelectorAll('.chat-chip');
  if (!input || !sendBtn || !msgs) return;

  // ── Initialize chat ──
  renderInit();

  window.addEventListener('app:stateChanged', (e) => {
    if (e.detail?.changed?.includes('dataLoaded')) renderInit();
  });

  function renderInit() {
    const s = getState();
    msgs.innerHTML = '';
    if (s.dataLoaded) {
      enableInput();
      addMsg("Hello! I'm your AI Career Copilot. I've analyzed your resume against the job description. What would you like to know?", 'ai');
    } else {
      disableInput();
      msgs.innerHTML = `<div class="chat-empty-state">
        <div class="chat-empty-state__icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <h3>AI Copilot Ready</h3>
        <p>Upload documents and run analysis to start chatting.</p>
      </div>`;
    }
  }

  function enableInput() {
    input.disabled = false;
    input.removeAttribute('disabled');
    input.placeholder = 'Ask about your resume fit, missing skills, or ATS optimization…';
    input.style.pointerEvents = 'auto';
    input.style.cursor = 'text';
    input.tabIndex = 0;
    input.tabIndex = 0;
  }

  function disableInput() {
    input.disabled = true;
    input.placeholder = 'Run analysis first to enable AI chat…';
    sendBtn.disabled = true;
  }

  // ── Input handling ──
  function onInput() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
    const has = input.value.trim().length > 0;
    sendBtn.disabled = !has || isGenerating;
    sendBtn.classList.toggle('chat-send-btn--active', has && !isGenerating);
  }

  input.addEventListener('input', onInput);
  input.addEventListener('keyup', onInput);
  input.addEventListener('paste', () => requestAnimationFrame(onInput));

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      if (!isGenerating && input.value.trim().length > 0) doSend();
    }
  });

  sendBtn.addEventListener('click', (e) => { e.preventDefault(); doSend(); });

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      if (isGenerating) return;
      if (!getState().dataLoaded) { showToast('Please run analysis first.', 'info'); return; }
      input.value = chip.textContent;
      onInput();
      doSend();
    });
  });

  // Focus on view switch
  const cv = document.getElementById('view-chat');
  if (cv) {
    new MutationObserver(() => {
      if (cv.style.display !== 'none' && getState().dataLoaded)
        requestAnimationFrame(() => input.focus());
    }).observe(cv, { attributes: true, attributeFilter: ['style'] });
  }

  // ── Send ──
  async function doSend() {
    if (!getState().dataLoaded) { showToast('Please run analysis first.', 'info'); return; }
    const text = input.value.trim();
    if (!text || isGenerating) return;

    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;
    sendBtn.classList.remove('chat-send-btn--active');

    addMsg(text, 'user');
    isGenerating = true;
    const typing = addTyping();
    scrollBot();

    try {
      const res = await analyze(text);
      rmEl(typing);
      const answer = res.answer || "I couldn't generate a response from your resume context.";
      await streamMsg(answer);
    } catch (err) {
      console.error('[Chat]', err);
      rmEl(typing);
      addMsg("Error processing request. Ensure resume & JD are uploaded.", 'ai');
      showToast('Chat request failed', 'error');
    } finally {
      isGenerating = false;
      sendBtn.disabled = input.value.trim().length === 0;
      input.focus();
      scrollBot();
    }
  }

  function addMsg(text, role) {
    const d = document.createElement('div');
    d.className = `chat-message chat-message--${role}`;
    d.innerHTML = `
      <div class="chat-message__avatar">${role === 'ai' ? aiSvg : userSvg}</div>
      <div class="chat-message__content">
        <div class="chat-message__body">${fmtMd(text)}</div>
        ${role === 'ai' ? copyBtn() : ''}
      </div>`;
    bindCopy(d, text);
    msgs.appendChild(d);
    if (window.gsap) gsap.fromTo(d, {opacity:0,y:12,scale:.98},{opacity:1,y:0,scale:1,duration:.35,ease:'power2.out'});
    scrollBot();
  }

  function addTyping() {
    const d = document.createElement('div');
    d.className = 'chat-message chat-message--ai chat-message--typing';
    d.innerHTML = `<div class="chat-message__avatar">${aiSvg}</div>
      <div class="chat-message__content"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
    msgs.appendChild(d);
    return d;
  }

  function rmEl(el) {
    if (!el?.parentNode) return;
    if (window.gsap) gsap.to(el, {opacity:0,y:-5,duration:.2,onComplete:()=>el.remove()});
    else el.remove();
  }

  async function streamMsg(fullText) {
    const d = document.createElement('div');
    d.className = 'chat-message chat-message--ai';
    d.innerHTML = `<div class="chat-message__avatar">${aiSvg}</div>
      <div class="chat-message__content"><div class="chat-message__body"></div><div class="chat-message__cursor"></div></div>`;
    msgs.appendChild(d);
    if (window.gsap) gsap.fromTo(d, {opacity:0,y:10},{opacity:1,y:0,duration:.3});

    const body = d.querySelector('.chat-message__body');
    const cur = d.querySelector('.chat-message__cursor');
    const words = fullText.split(' ');
    let acc = '';

    for (let i = 0; i < words.length; i++) {
      acc += (i > 0 ? ' ' : '') + words[i];
      body.innerHTML = fmtMd(acc);
      scrollBot();
      let dl = 12 + Math.random() * 25;
      if (/[.!?]$/.test(words[i])) dl += 50;
      if (/[,:;]$/.test(words[i])) dl += 25;
      await new Promise(r => setTimeout(r, dl));
    }

    if (cur) cur.remove();
    const acts = document.createElement('div');
    acts.className = 'chat-message__actions';
    acts.innerHTML = copyBtn();
    d.querySelector('.chat-message__content').appendChild(acts);
    bindCopy(acts, fullText);
    if (window.gsap) gsap.fromTo(acts,{opacity:0},{opacity:1,duration:.3,delay:.2});
    scrollBot();
  }

  function scrollBot() {
    requestAnimationFrame(() => { msgs.scrollTop = msgs.scrollHeight; });
  }
}


function fmtMd(t) {
  return t.replace(/```(\w*)\n?([\s\S]*?)```/g,'<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,'<em>$1</em>')
    .replace(/^[-•]\s+(.+)/gm,'<li>$1</li>')
    .replace(/\n\n/g,'</p><p>')
    .replace(/\n/g,'<br>');
}

function copyBtn() {
  return `<button class="chat-action-btn" data-action="copy" title="Copy"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>`;
}

function bindCopy(el, text) {
  const btn = el.querySelector('[data-action="copy"]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(text).then(() => {
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`;
      setTimeout(() => { btn.innerHTML = copyBtn().match(/<svg[\s\S]*<\/svg>/)[0]; }, 2000);
    });
  });
}

const aiSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`;
const userSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/></svg>`;
