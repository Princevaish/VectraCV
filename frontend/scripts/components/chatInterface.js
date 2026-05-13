import { analyze } from '../api/apiService.js';
import { showToast } from './toast.js';
import { getState } from '../state/appState.js';

let isGenerating = false;

export function initChatInterface() {
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSendBtn');
  const messagesContainer = document.getElementById('chatMessages');
  const chips = document.querySelectorAll('.chat-chip');

  if (!input || !sendBtn || !messagesContainer) return;

  // Render initial state
  renderInitialState();

  // Listen to state changes to enable chat
  window.addEventListener('STATE_CHANGED', (e) => {
    if (e.detail?.changed?.includes('dataLoaded')) {
      renderInitialState();
    }
  });

  function renderInitialState() {
    const state = getState();
    messagesContainer.innerHTML = ''; // clear

    if (state.dataLoaded) {
      input.disabled = false;
      input.placeholder = "Ask VectraAI about your resume... (Shift+Enter for newline)";
      appendMessage("Hello! I am your AI Career Copilot. I've analyzed your resume against the job description. What would you like to know?", "ai");
    } else {
      input.disabled = true;
      input.placeholder = "Context needed...";
      
      const div = document.createElement('div');
      div.className = "empty-state";
      div.innerHTML = "<p>Upload a resume and job description to start AI analysis.</p>";
      messagesContainer.appendChild(div);
    }
  }

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
    sendBtn.disabled = input.value.trim().length === 0;
  });

  // Handle Enter to send (Shift+Enter for newline)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  sendBtn.addEventListener('click', handleSend);

  // Handle suggestion chips
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      if (isGenerating) return;
      input.value = chip.textContent;
      input.dispatchEvent(new Event('input'));
      handleSend();
    });
  });

  async function handleSend() {
    const state = getState();
    if (!state.dataLoaded) {
      showToast('Please run analysis first.', 'info');
      return;
    }

    const text = input.value.trim();
    if (!text || isGenerating) return;

    // Reset input
    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;

    // Add user message
    appendMessage(text, 'user');

    // Add loading indicator
    isGenerating = true;
    const typingIndicatorId = appendTypingIndicator();
    scrollToBottom();

    try {
      // Call backend
      const res = await analyze(text);
      removeMessage(typingIndicatorId);
      
      // Stream the response
      await streamResponse(res.answer || "I couldn't generate a response. Please try again.");
    } catch (err) {
      console.error(err);
      removeMessage(typingIndicatorId);
      appendMessage("Sorry, I encountered an error. Have you loaded a resume and job description first?", 'ai');
      showToast('Chat analysis failed', 'error');
    } finally {
      isGenerating = false;
      scrollToBottom();
    }
  }

  function appendMessage(text, role) {
    const div = document.createElement('div');
    div.className = `chat-message chat-message--${role}`;
    
    // Convert basic markdown
    const formattedText = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/```([\s\S]*?)```/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');

    div.innerHTML = `
      <div class="chat-message__avatar">
        ${role === 'ai' 
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
             </svg>` 
          : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
             </svg>`}
      </div>
      <div class="chat-message__content">
        <p>${formattedText}</p>
      </div>
    `;

    messagesContainer.appendChild(div);
    if (window.gsap) {
      gsap.fromTo(div, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 });
    }
    scrollToBottom();
  }

  function appendTypingIndicator() {
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.className = 'chat-message chat-message--ai';
    div.id = id;
    
    div.innerHTML = `
      <div class="chat-message__avatar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div class="chat-message__content" style="display:flex; align-items:center;">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    messagesContainer.appendChild(div);
    return id;
  }

  function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  async function streamResponse(fullText) {
    const div = document.createElement('div');
    div.className = 'chat-message chat-message--ai';
    
    div.innerHTML = `
      <div class="chat-message__avatar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div class="chat-message__content">
        <p></p>
      </div>
    `;
    
    messagesContainer.appendChild(div);
    const contentEl = div.querySelector('p');
    
    // Simulated chunk streaming
    const chunks = fullText.split(' ');
    let currentText = '';
    
    for (let i = 0; i < chunks.length; i++) {
      currentText += chunks[i] + ' ';
      
      // Basic markdown applied per chunk
      const formattedText = currentText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/```([\s\S]*?)```/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
        
      contentEl.innerHTML = formattedText;
      scrollToBottom();
      
      // Small random delay for realistic typing feel (10-40ms)
      await new Promise(r => setTimeout(r, 10 + Math.random() * 30));
    }
  }

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}
