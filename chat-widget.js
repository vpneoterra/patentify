/* ═══════════════════════════════════════════════════════════════
   IPCo Agentic Chat Widget — Frontend Integration Layer
   Injected into the parent frame; communicates with FastAPI backend
   via port/8000. Provides floating chat, workflow status badges,
   and real-time event indicators across all 3 views.
   ═══════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  const API = 'port/8000';
  let currentView = 'dashboard';
  let chatOpen = false;
  let sessionId = 'sess-' + Math.random().toString(36).slice(2, 10);
  let chatHistory = [];
  let isStreaming = false;

  /* ── Inject Styles ── */
  const style = document.createElement('style');
  style.textContent = `
    /* Chat FAB */
    .ipco-chat-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #2E8B7A 0%, #1a6b5a 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(46,139,122,0.4);
      transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
    }
    .ipco-chat-fab:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 28px rgba(46,139,122,0.5);
    }
    .ipco-chat-fab:active { transform: scale(0.96); }
    .ipco-chat-fab svg { width: 24px; height: 24px; fill: white; }
    .ipco-chat-fab .badge {
      position: absolute; top: -2px; right: -2px;
      width: 16px; height: 16px; border-radius: 50%;
      background: #D4A017; border: 2px solid #000;
      font-size: 9px; color: #000; font-weight: 700;
      display: none; align-items: center; justify-content: center;
    }

    /* Chat Panel */
    .ipco-chat-panel {
      position: fixed;
      bottom: 92px;
      right: 24px;
      z-index: 9998;
      width: 420px;
      max-height: 600px;
      background: #0A0A0A;
      border: 1px solid rgba(148,163,184,0.12);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 12px 48px rgba(0,0,0,0.8);
      opacity: 0;
      transform: translateY(16px) scale(0.96);
      pointer-events: none;
      transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
    }
    .ipco-chat-panel.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: all;
    }

    /* Chat Header */
    .ipco-chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(148,163,184,0.10);
      background: #050505;
      border-radius: 16px 16px 0 0;
    }
    .ipco-chat-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .ipco-chat-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: linear-gradient(135deg, #2E8B7A 0%, #1a6b5a 100%);
      display: flex; align-items: center; justify-content: center;
    }
    .ipco-chat-avatar svg { width: 16px; height: 16px; fill: white; }
    .ipco-chat-title { font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; color: #F1F5F9; }
    .ipco-chat-subtitle { font-size: 11px; color: #64748B; margin-top: 1px; }
    .ipco-chat-close {
      width: 28px; height: 28px; border-radius: 6px;
      background: transparent; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #64748B; transition: all 0.15s;
    }
    .ipco-chat-close:hover { background: #1A1A1A; color: #F1F5F9; }

    /* Chat Messages */
    .ipco-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 400px;
      min-height: 200px;
      scrollbar-width: thin;
      scrollbar-color: #1A1A1A #0A0A0A;
    }
    .ipco-msg {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 12px;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      line-height: 1.55;
      color: #F1F5F9;
      word-wrap: break-word;
      white-space: pre-wrap;
    }
    .ipco-msg.user {
      align-self: flex-end;
      background: #1a3a33;
      border-bottom-right-radius: 4px;
    }
    .ipco-msg.assistant {
      align-self: flex-start;
      background: #141414;
      border: 1px solid rgba(148,163,184,0.08);
      border-bottom-left-radius: 4px;
    }
    .ipco-msg.system {
      align-self: center;
      background: transparent;
      color: #64748B;
      font-size: 11px;
      padding: 4px 12px;
    }
    .ipco-msg .tool-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(46,139,122,0.15);
      color: #2E8B7A;
      font-size: 10px;
      font-weight: 600;
      margin-top: 6px;
    }
    .ipco-msg-meta {
      font-size: 10px;
      color: #475569;
      margin-top: 4px;
    }

    /* Typing indicator */
    .ipco-typing {
      align-self: flex-start;
      display: flex; gap: 4px;
      padding: 12px 16px;
      background: #141414;
      border-radius: 12px;
      border-bottom-left-radius: 4px;
    }
    .ipco-typing span {
      width: 6px; height: 6px; border-radius: 50%;
      background: #2E8B7A; opacity: 0.4;
      animation: ipco-bounce 1.4s infinite;
    }
    .ipco-typing span:nth-child(2) { animation-delay: 0.2s; }
    .ipco-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes ipco-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-6px); opacity: 1; }
    }

    /* Chat Input */
    .ipco-chat-input-area {
      padding: 12px 16px;
      border-top: 1px solid rgba(148,163,184,0.10);
      display: flex;
      gap: 8px;
      align-items: flex-end;
      background: #050505;
      border-radius: 0 0 16px 16px;
    }
    .ipco-chat-input {
      flex: 1;
      min-height: 38px;
      max-height: 120px;
      padding: 9px 14px;
      background: #141414;
      border: 1px solid rgba(148,163,184,0.12);
      border-radius: 10px;
      color: #F1F5F9;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      resize: none;
      outline: none;
      transition: border-color 0.2s;
    }
    .ipco-chat-input::placeholder { color: #475569; }
    .ipco-chat-input:focus { border-color: #2E8B7A; }
    .ipco-chat-send {
      width: 38px; height: 38px; border-radius: 10px;
      background: #2E8B7A; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s; flex-shrink: 0;
    }
    .ipco-chat-send:hover { background: #36a08c; }
    .ipco-chat-send:disabled { opacity: 0.4; cursor: not-allowed; }
    .ipco-chat-send svg { width: 16px; height: 16px; fill: white; }

    /* Quick Actions bar */
    .ipco-quick-actions {
      display: flex; gap: 6px; flex-wrap: wrap;
      padding: 8px 16px;
      border-top: 1px solid rgba(148,163,184,0.06);
    }
    .ipco-quick-btn {
      padding: 5px 10px;
      border-radius: 8px;
      border: 1px solid rgba(148,163,184,0.12);
      background: #0A0A0A;
      color: #94A3B8;
      font-size: 11px;
      font-family: 'DM Sans', sans-serif;
      cursor: pointer;
      transition: all 0.15s;
    }
    .ipco-quick-btn:hover {
      background: #1A1A1A;
      color: #F1F5F9;
      border-color: #2E8B7A;
    }

    /* Status Indicator */
    .ipco-status-bar {
      position: fixed;
      bottom: 24px;
      left: 24px;
      z-index: 9997;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ipco-status-pill {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 20px;
      background: rgba(10,10,10,0.9);
      border: 1px solid rgba(148,163,184,0.10);
      font-family: 'DM Sans', sans-serif;
      font-size: 10px;
      color: #94A3B8;
      backdrop-filter: blur(8px);
    }
    .ipco-status-dot {
      width: 6px; height: 6px; border-radius: 50%;
    }
    .ipco-status-dot.green { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,0.5); }
    .ipco-status-dot.amber { background: #D4A017; box-shadow: 0 0 6px rgba(212,160,23,0.5); }
    .ipco-status-dot.red { background: #ef4444; }

    /* Responsive */
    @media (max-width: 480px) {
      .ipco-chat-panel {
        right: 8px; left: 8px; bottom: 80px;
        width: auto; max-height: 70vh;
      }
      .ipco-chat-fab { right: 16px; bottom: 16px; }
    }
  `;
  document.head.appendChild(style);

  /* ── Build Chat Widget DOM ── */

  // FAB button
  const fab = document.createElement('button');
  fab.className = 'ipco-chat-fab';
  fab.setAttribute('aria-label', 'Open AI Chat');
  fab.innerHTML = `
    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.82.5 3.53 1.36 5L2 22l5.16-1.28C8.54 21.52 10.22 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm-1 14h2v2h-2v-2zm0-10h2v8h-2V6z"/></svg>
    <div class="badge" id="chatBadge"></div>
  `;
  document.body.appendChild(fab);

  // Chat panel
  const panel = document.createElement('div');
  panel.className = 'ipco-chat-panel';
  panel.id = 'ipcoChatPanel';
  panel.innerHTML = `
    <div class="ipco-chat-header">
      <div class="ipco-chat-header-left">
        <div class="ipco-chat-avatar">
          <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <div>
          <div class="ipco-chat-title">IPCo AI Strategist</div>
          <div class="ipco-chat-subtitle" id="chatStatus">Claude Opus 4.6 — Ready</div>
        </div>
      </div>
      <button class="ipco-chat-close" id="chatCloseBtn">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    </div>
    <div class="ipco-chat-messages" id="chatMessages">
      <div class="ipco-msg system">IPCo IP Strategist — powered by Claude. Ask about whitespaces, patents, competitors, or trigger workflows.</div>
    </div>
    <div class="ipco-quick-actions" id="quickActions">
      <button class="ipco-quick-btn" data-msg="Summarize the top 5 whitespace opportunities">Top Whitespaces</button>
      <button class="ipco-quick-btn" data-msg="What are the latest landscape scan findings?">Landscape Scan</button>
      <button class="ipco-quick-btn" data-msg="Generate invention hypotheses for the highest-scored whitespace">Generate Ideas</button>
      <button class="ipco-quick-btn" data-msg="Show competitor analysis for solid-state electrolyte interface">Competitor Intel</button>
    </div>
    <div class="ipco-chat-input-area">
      <textarea class="ipco-chat-input" id="chatInput" placeholder="Ask about IP strategy, patents, whitespaces..." rows="1"></textarea>
      <button class="ipco-chat-send" id="chatSendBtn">
        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
  `;
  document.body.appendChild(panel);

  // Status bar
  const statusBar = document.createElement('div');
  statusBar.className = 'ipco-status-bar';
  statusBar.innerHTML = `
    <div class="ipco-status-pill" id="backendStatus">
      <span class="ipco-status-dot" id="statusDot"></span>
      <span id="statusText">Connecting...</span>
    </div>
  `;
  document.body.appendChild(statusBar);

  /* ── Event Handlers ── */

  fab.addEventListener('click', function() {
    chatOpen = !chatOpen;
    panel.classList.toggle('open', chatOpen);
    if (chatOpen) {
      document.getElementById('chatInput').focus();
      scrollToBottom();
    }
  });

  document.getElementById('chatCloseBtn').addEventListener('click', function() {
    chatOpen = false;
    panel.classList.remove('open');
  });

  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSendBtn');

  chatInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  chatInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  sendBtn.addEventListener('click', sendMessage);

  // Quick action buttons
  document.querySelectorAll('.ipco-quick-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      chatInput.value = btn.getAttribute('data-msg');
      sendMessage();
    });
  });

  /* ── Chat Functions ── */

  function addMessage(role, content, meta) {
    var msgs = document.getElementById('chatMessages');
    var div = document.createElement('div');
    div.className = 'ipco-msg ' + role;
    div.textContent = content;
    if (meta) {
      var metaSpan = document.createElement('div');
      metaSpan.className = 'ipco-msg-meta';
      metaSpan.textContent = meta;
      div.appendChild(metaSpan);
    }
    msgs.appendChild(div);
    scrollToBottom();
    return div;
  }

  function showTyping() {
    var msgs = document.getElementById('chatMessages');
    var div = document.createElement('div');
    div.className = 'ipco-typing';
    div.id = 'typingIndicator';
    div.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(div);
    scrollToBottom();
  }

  function hideTyping() {
    var el = document.getElementById('typingIndicator');
    if (el) el.remove();
  }

  function scrollToBottom() {
    var msgs = document.getElementById('chatMessages');
    requestAnimationFrame(function() {
      msgs.scrollTop = msgs.scrollHeight;
    });
  }

  function sendMessage() {
    var text = chatInput.value.trim();
    if (!text || isStreaming) return;

    addMessage('user', text);
    chatInput.value = '';
    chatInput.style.height = 'auto';
    isStreaming = true;
    sendBtn.disabled = true;
    document.getElementById('chatStatus').textContent = 'Thinking...';

    showTyping();

    fetch(API + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        session_id: sessionId,
        context_page: currentView,
        stream: false
      })
    })
    .then(function(r) {
      if (!r.ok) throw new Error('API error ' + r.status);
      return r.json();
    })
    .then(function(data) {
      hideTyping();
      var meta = '';
      if (data.tokens) meta += data.tokens.toLocaleString() + ' tokens';
      if (data.tool_calls > 0) meta += ' · ' + data.tool_calls + ' tool call' + (data.tool_calls > 1 ? 's' : '');
      addMessage('assistant', data.response, meta);
      sessionId = data.session_id || sessionId;
      document.getElementById('chatStatus').textContent = 'Claude Opus 4.6 — Ready';
    })
    .catch(function(err) {
      hideTyping();
      addMessage('system', 'Error: ' + err.message + '. Check that the backend is running.');
      document.getElementById('chatStatus').textContent = 'Error — Retrying...';
    })
    .finally(function() {
      isStreaming = false;
      sendBtn.disabled = false;
    });
  }

  /* ── Backend Health Check ── */

  function checkHealth() {
    fetch(API + '/api/health')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      document.getElementById('statusDot').className = 'ipco-status-dot green';
      document.getElementById('statusText').textContent = 'AI Backend Active';
    })
    .catch(function() {
      document.getElementById('statusDot').className = 'ipco-status-dot red';
      document.getElementById('statusText').textContent = 'Backend Offline';
    });
  }

  // Check health on load and every 30s
  checkHealth();
  setInterval(checkHealth, 30000);

  /* ── Listen for View Changes from Parent ── */

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'view-change') {
      currentView = e.data.view;
    }
  });

  /* ── Expose API for iframe communication ── */
  window.IPCoChat = {
    open: function() { chatOpen = true; panel.classList.add('open'); },
    close: function() { chatOpen = false; panel.classList.remove('open'); },
    send: function(msg) { chatInput.value = msg; sendMessage(); },
    setView: function(v) { currentView = v; }
  };

})();
