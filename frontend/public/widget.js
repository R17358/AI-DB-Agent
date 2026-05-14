(function () {
  'use strict';

  // ── Config from script tag ────────────────────────────────────────────────
  var currentScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var BACKEND  = currentScript.getAttribute('data-backend')  || 'http://localhost:8000';
  var POSITION = currentScript.getAttribute('data-position') || 'bottom-right';
  var THEME    = currentScript.getAttribute('data-theme')    || 'dark';
  var TITLE    = currentScript.getAttribute('data-title')    || 'DB AI Agent';
  var ACCENT   = currentScript.getAttribute('data-accent')   || '#7c6fff';

  // Prevent double-init
  if (window.__QueryMindWidget) return;
  window.__QueryMindWidget = true;

  // ── Session ID ────────────────────────────────────────────────────────────
  var sessionId = 'wgt-' + Math.random().toString(36).slice(2) + Date.now().toString(36);

  // ── Inject styles ─────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '@import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono&display=swap");',

    ':root {',
    '  --qm-accent: ' + ACCENT + ';',
    '  --qm-accent-dim: ' + ACCENT + '33;',
    '  --qm-accent-glow: ' + ACCENT + '22;',
    '}',

    /* Dark */
    '.qm-dark {',
    '  --qm-bg: #0d0d14;',
    '  --qm-bg2: #13131c;',
    '  --qm-bg3: #1a1a26;',
    '  --qm-card: #16161f;',
    '  --qm-border: #2a2a3a;',
    '  --qm-text: #f0f0f8;',
    '  --qm-text2: #9898b0;',
    '  --qm-muted: #5a5a70;',
    '  --qm-user-bg: var(--qm-accent);',
    '  --qm-user-text: #fff;',
    '  --qm-shadow: 0 20px 60px rgba(0,0,0,0.7);',
    '}',

    /* Light */
    '.qm-light {',
    '  --qm-bg: #f5f5fc;',
    '  --qm-bg2: #eeeef8;',
    '  --qm-bg3: #e4e4f0;',
    '  --qm-card: #fff;',
    '  --qm-border: #d8d8ee;',
    '  --qm-text: #111128;',
    '  --qm-text2: #4a4a68;',
    '  --qm-muted: #8888a8;',
    '  --qm-user-bg: var(--qm-accent);',
    '  --qm-user-text: #fff;',
    '  --qm-shadow: 0 20px 60px rgba(0,0,0,0.15);',
    '}',

    /* FAB */
    '#qm-fab {',
    '  position: fixed;',
    '  width: 56px; height: 56px;',
    '  border-radius: 50%;',
    '  background: var(--qm-accent);',
    '  border: none;',
    '  cursor: pointer;',
    '  display: flex; align-items: center; justify-content: center;',
    '  font-size: 24px;',
    '  box-shadow: 0 4px 20px ' + ACCENT + '55;',
    '  z-index: 999998;',
    '  transition: transform 0.2s, box-shadow 0.2s;',
    '  color: #fff;',
    '}',
    '#qm-fab:hover { transform: scale(1.08); box-shadow: 0 6px 28px ' + ACCENT + '77; }',

    /* Position variants */
    '#qm-fab.qm-bottom-right  { bottom: 24px; right: 24px; }',
    '#qm-fab.qm-bottom-left   { bottom: 24px; left: 24px; }',
    '#qm-fab.qm-top-right     { top: 24px; right: 24px; }',
    '#qm-fab.qm-top-left      { top: 24px; left: 24px; }',

    /* Window */
    '#qm-window {',
    '  position: fixed;',
    '  width: 380px;',
    '  height: 580px;',
    '  border-radius: 18px;',
    '  overflow: hidden;',
    '  display: flex; flex-direction: column;',
    '  font-family: "DM Sans", sans-serif;',
    '  font-size: 14px;',
    '  line-height: 1.6;',
    '  background: var(--qm-bg);',
    '  border: 1px solid var(--qm-border);',
    '  box-shadow: var(--qm-shadow);',
    '  z-index: 999999;',
    '  transform-origin: bottom right;',
    '  transition: transform 0.25s cubic-bezier(.4,0,.2,1), opacity 0.25s;',
    '}',
    '#qm-window.qm-bottom-right { bottom: 90px; right: 24px; transform-origin: bottom right; }',
    '#qm-window.qm-bottom-left  { bottom: 90px; left: 24px;  transform-origin: bottom left; }',
    '#qm-window.qm-top-right    { top: 90px;    right: 24px; transform-origin: top right; }',
    '#qm-window.qm-top-left     { top: 90px;    left: 24px;  transform-origin: top left; }',
    '#qm-window.qm-hidden { transform: scale(0.85); opacity: 0; pointer-events: none; }',

    /* Mobile fullscreen */
    '@media (max-width: 440px) {',
    '  #qm-window { width: 100vw; height: 100dvh; border-radius: 0;',
    '    bottom: 0 !important; right: 0 !important; left: 0 !important; top: 0 !important; }',
    '  #qm-fab { bottom: 16px !important; right: 16px !important; left: auto !important; top: auto !important; }',
    '}',

    /* Header */
    '#qm-header {',
    '  padding: 14px 16px;',
    '  background: var(--qm-bg2);',
    '  border-bottom: 1px solid var(--qm-border);',
    '  display: flex; align-items: center; justify-content: space-between;',
    '  flex-shrink: 0;',
    '}',
    '.qm-header-left { display: flex; align-items: center; gap: 10px; }',
    '.qm-logo {',
    '  width: 30px; height: 30px;',
    '  border-radius: 8px;',
    '  background: linear-gradient(135deg, var(--qm-accent), #22d3ee);',
    '  display: flex; align-items: center; justify-content: center;',
    '  font-size: 15px;',
    '}',
    '.qm-title { font-weight: 700; font-size: 14px; color: var(--qm-text); }',
    '.qm-subtitle { font-size: 11px; color: var(--qm-muted); }',
    '.qm-header-actions { display: flex; gap: 6px; }',
    '.qm-icon-btn {',
    '  width: 30px; height: 30px;',
    '  border-radius: 6px;',
    '  background: transparent;',
    '  border: 1px solid var(--qm-border);',
    '  color: var(--qm-text2);',
    '  cursor: pointer;',
    '  display: flex; align-items: center; justify-content: center;',
    '  font-size: 13px;',
    '  transition: background 0.15s;',
    '}',
    '.qm-icon-btn:hover { background: var(--qm-bg3); }',

    /* Messages */
    '#qm-messages {',
    '  flex: 1;',
    '  overflow-y: auto;',
    '  padding: 14px 12px;',
    '  display: flex; flex-direction: column; gap: 12px;',
    '  scroll-behavior: smooth;',
    '}',
    '#qm-messages::-webkit-scrollbar { width: 4px; }',
    '#qm-messages::-webkit-scrollbar-thumb { background: var(--qm-border); border-radius: 2px; }',

    '.qm-msg-wrap { display: flex; flex-direction: column; gap: 3px; animation: qmFadeIn 0.25s ease; }',
    '@keyframes qmFadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }',
    '.qm-msg-wrap.qm-user  { align-items: flex-end; }',
    '.qm-msg-wrap.qm-assistant { align-items: flex-start; }',

    '.qm-meta { font-size: 10px; color: var(--qm-muted); padding: 0 3px; }',

    '.qm-bubble {',
    '  max-width: 85%;',
    '  padding: 9px 13px;',
    '  border-radius: 14px;',
    '  font-size: 13px;',
    '  line-height: 1.6;',
    '  word-break: break-word;',
    '}',
    '.qm-bubble.qm-user {',
    '  background: var(--qm-accent);',
    '  color: var(--qm-user-text);',
    '  border-bottom-right-radius: 3px;',
    '}',
    '.qm-bubble.qm-assistant {',
    '  background: var(--qm-card);',
    '  color: var(--qm-text);',
    '  border: 1px solid var(--qm-border);',
    '  border-bottom-left-radius: 3px;',
    '}',

    /* Query pill */
    '.qm-query-pill {',
    '  margin-top: 7px;',
    '  padding: 7px 10px;',
    '  background: var(--qm-bg2);',
    '  border: 1px solid var(--qm-border);',
    '  border-radius: 8px;',
    '  font-family: "Space Mono", monospace;',
    '  font-size: 10px;',
    '  color: #22d3ee;',
    '  white-space: pre-wrap;',
    '  word-break: break-word;',
    '  max-height: 120px;',
    '  overflow-y: auto;',
    '}',
    '.qm-query-label {',
    '  font-family: "DM Sans", sans-serif;',
    '  font-size: 10px;',
    '  color: var(--qm-muted);',
    '  margin-bottom: 4px;',
    '  display: flex; align-items: center; gap: 5px;',
    '}',
    '.qm-safe-tag {',
    '  padding: 1px 6px; border-radius: 10px; font-size: 9px; font-weight: 600;',
    '  background: rgba(74,222,128,0.12); color: #4ade80;',
    '  border: 1px solid rgba(74,222,128,0.2);',
    '}',

    /* Simple table */
    '.qm-table-wrap { margin-top: 8px; overflow-x: auto; border-radius: 8px; border: 1px solid var(--qm-border); }',
    '.qm-table { width: 100%; border-collapse: collapse; font-size: 11px; }',
    '.qm-table th { padding: 6px 10px; background: var(--qm-bg2); color: var(--qm-muted); text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; white-space: nowrap; border-bottom: 1px solid var(--qm-border); }',
    '.qm-table td { padding: 6px 10px; color: var(--qm-text2); border-bottom: 1px solid var(--qm-border); white-space: nowrap; max-width: 160px; overflow: hidden; text-overflow: ellipsis; }',
    '.qm-table tr:last-child td { border-bottom: none; }',
    '.qm-rows-label { font-size: 10px; color: var(--qm-muted); margin-top: 5px; font-family: "Space Mono", monospace; }',

    /* Error */
    '.qm-error {',
    '  margin-top: 7px; padding: 8px 10px;',
    '  background: rgba(248,113,113,0.08);',
    '  border: 1px solid rgba(248,113,113,0.25);',
    '  border-radius: 8px; font-size: 12px; color: #f87171;',
    '}',

    /* Status / thinking */
    '.qm-thinking {',
    '  display: flex; align-items: center; gap: 8px;',
    '  padding: 9px 13px;',
    '  background: var(--qm-card);',
    '  border: 1px solid var(--qm-border);',
    '  border-radius: 14px; border-bottom-left-radius: 3px;',
    '  font-size: 12px; color: var(--qm-muted);',
    '  max-width: 85%;',
    '}',
    '.qm-spinner {',
    '  width: 12px; height: 12px;',
    '  border: 2px solid var(--qm-border);',
    '  border-top-color: var(--qm-accent);',
    '  border-radius: 50%;',
    '  animation: qmSpin 0.7s linear infinite;',
    '  flex-shrink: 0;',
    '}',
    '@keyframes qmSpin { to { transform: rotate(360deg); } }',
    '.qm-dots { display:flex; gap:3px; }',
    '.qm-dot { width:5px; height:5px; border-radius:50%; background:var(--qm-accent); animation:qmBounce 1.2s ease infinite; }',
    '.qm-dot:nth-child(2){animation-delay:.2s} .qm-dot:nth-child(3){animation-delay:.4s}',
    '@keyframes qmBounce { 0%,60%,100%{transform:translateY(0);opacity:.5} 30%{transform:translateY(-5px);opacity:1} }',

    /* Input */
    '#qm-input-area {',
    '  padding: 10px 12px;',
    '  border-top: 1px solid var(--qm-border);',
    '  background: var(--qm-bg2);',
    '  flex-shrink: 0;',
    '}',
    '#qm-input-wrap {',
    '  display: flex; gap: 8px; align-items: flex-end;',
    '  background: var(--qm-card);',
    '  border: 1px solid var(--qm-border);',
    '  border-radius: 20px;',
    '  padding: 8px 8px 8px 14px;',
    '  transition: border-color .2s, box-shadow .2s;',
    '}',
    '#qm-input-wrap:focus-within {',
    '  border-color: var(--qm-accent);',
    '  box-shadow: 0 0 0 3px var(--qm-accent-glow);',
    '}',
    '#qm-textarea {',
    '  flex: 1; background: transparent; border: none; outline: none;',
    '  color: var(--qm-text); font-family: "DM Sans",sans-serif; font-size: 13px;',
    '  resize: none; min-height: 20px; max-height: 100px; line-height: 1.5;',
    '}',
    '#qm-textarea::placeholder { color: var(--qm-muted); }',
    '#qm-send {',
    '  width: 32px; height: 32px; border-radius: 50%;',
    '  background: var(--qm-accent); border: none; color: #fff;',
    '  cursor: pointer; display: flex; align-items: center; justify-content: center;',
    '  font-size: 15px; flex-shrink: 0; transition: transform .15s, background .15s;',
    '}',
    '#qm-send:hover:not(:disabled) { transform: scale(1.08); }',
    '#qm-send:disabled { opacity: .4; cursor: not-allowed; }',

    /* Hint chips */
    '#qm-hints { display:flex; gap:5px; flex-wrap:wrap; padding-top:7px; }',
    '.qm-hint {',
    '  padding: 3px 10px; border-radius: 20px;',
    '  border: 1px solid var(--qm-border); background: var(--qm-bg3);',
    '  font-size: 10px; color: var(--qm-muted); cursor: pointer;',
    '  transition: all .15s; white-space: nowrap;',
    '}',
    '.qm-hint:hover { border-color:var(--qm-accent); color:var(--qm-accent); background:var(--qm-accent-glow); }',

    /* Welcome */
    '#qm-welcome {',
    '  flex:1; display:flex; flex-direction:column; align-items:center;',
    '  justify-content:center; padding:20px 16px; text-align:center; gap:12px;',
    '}',
    '#qm-welcome .qm-w-icon { font-size: 32px; }',
    '#qm-welcome .qm-w-title { font-size:17px; font-weight:700; color:var(--qm-text); }',
    '#qm-welcome .qm-w-sub { font-size:12px; color:var(--qm-muted); line-height:1.6; max-width:280px; }',

    /* Powered by */
    '.qm-powered {',
    '  text-align:center; font-size:9px; color:var(--qm-muted);',
    '  padding: 4px 0 2px; letter-spacing:.3px;',
    '}',
    '.qm-powered a { color:var(--qm-accent); text-decoration:none; }',
  ].join('\n');
  document.head.appendChild(style);

  // ── Build DOM ─────────────────────────────────────────────────────────────
  var themeClass = THEME === 'light' ? 'qm-light' : 'qm-dark';
  var posClass   = 'qm-' + POSITION;

  // FAB
  var fab = document.createElement('button');
  fab.id = 'qm-fab';
  fab.className = posClass;
  fab.innerHTML = '⚡';
  fab.title = 'Open ' + TITLE;
  document.body.appendChild(fab);

  // Window
  var win = document.createElement('div');
  win.id = 'qm-window';
  win.className = themeClass + ' ' + posClass + ' qm-hidden';
  win.innerHTML = [
    '<div id="qm-header">',
    '  <div class="qm-header-left">',
    '    <div class="qm-logo">⚡</div>',
    '    <div><div class="qm-title">' + TITLE + '</div><div class="qm-subtitle" id="qm-subtitle">Connecting…</div></div>',
    '  </div>',
    '  <div class="qm-header-actions">',
    '    <button class="qm-icon-btn" id="qm-theme-btn" title="Toggle theme">☀️</button>',
    '    <button class="qm-icon-btn" id="qm-clear-btn" title="New chat">🗑</button>',
    '    <button class="qm-icon-btn" id="qm-close-btn" title="Close">✕</button>',
    '  </div>',
    '</div>',
    '<div id="qm-messages">',
    '  <div id="qm-welcome">',
    '    <div class="qm-w-icon">⚡</div>',
    '    <div class="qm-w-title">' + TITLE + '</div>',
    '    <div class="qm-w-sub">Ask anything about your data in plain English.</div>',
    '  </div>',
    '</div>',
    '<div id="qm-input-area">',
    '  <div id="qm-input-wrap">',
    '    <textarea id="qm-textarea" rows="1" placeholder="Ask about your data…"></textarea>',
    '    <button id="qm-send" disabled>↑</button>',
    '  </div>',
    '  <div id="qm-hints">',
    '    <span class="qm-hint">How many records?</span>',
    '    <span class="qm-hint">Top 5 results</span>',
    '    <span class="qm-hint">Show schema</span>',
    '    <span class="qm-hint">Recent entries</span>',
    '  </div>',
    '  <div class="qm-powered">Powered by <a href="https://querymind-db-agent.vercel.app" target="_blank">QueryMind</a></div>',
    '</div>',
  ].join('');
  document.body.appendChild(win);

  // ── Element refs ──────────────────────────────────────────────────────────
  var messagesEl = win.querySelector('#qm-messages');
  var textarea   = win.querySelector('#qm-textarea');
  var sendBtn    = win.querySelector('#qm-send');
  var subtitle   = win.querySelector('#qm-subtitle');
  var welcome    = win.querySelector('#qm-welcome');

  // ── State ─────────────────────────────────────────────────────────────────
  var isOpen    = false;
  var loading   = false;
  var currentTheme = THEME;
  var cancelFn  = null;

  // ── Toggle open/close ─────────────────────────────────────────────────────
  function toggleWindow() {
    isOpen = !isOpen;
    win.classList.toggle('qm-hidden', !isOpen);
    fab.innerHTML = isOpen ? '✕' : '⚡';
    if (isOpen) textarea.focus();
  }

  fab.addEventListener('click', toggleWindow);
  win.querySelector('#qm-close-btn').addEventListener('click', toggleWindow);

  // ── Theme toggle ──────────────────────────────────────────────────────────
  win.querySelector('#qm-theme-btn').addEventListener('click', function () {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    win.classList.remove('qm-dark', 'qm-light');
    win.classList.add(currentTheme === 'dark' ? 'qm-dark' : 'qm-light');
    win.querySelector('#qm-theme-btn').innerHTML = currentTheme === 'dark' ? '☀️' : '🌙';
  });

  // ── Clear chat ────────────────────────────────────────────────────────────
  win.querySelector('#qm-clear-btn').addEventListener('click', function () {
    fetch(BACKEND + '/session/' + sessionId, { method: 'DELETE' }).catch(function(){});
    messagesEl.innerHTML = '';
    messagesEl.appendChild(welcome);
    loading = false;
    setInputDisabled(false);
  });

  // ── Health check ──────────────────────────────────────────────────────────
  function checkHealth() {
    fetch(BACKEND + '/health')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        subtitle.textContent = d.db_connected
          ? (d.db_type || 'DB') + ' · ' + (d.model || 'AI') + ' Ready'
          : 'DB Disconnected';
      })
      .catch(function () { subtitle.textContent = 'Backend unreachable'; });
  }
  checkHealth();
  setInterval(checkHealth, 30000);

  // ── Textarea auto-resize + send enable ────────────────────────────────────
  textarea.addEventListener('input', function () {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
    sendBtn.disabled = !textarea.value.trim() || loading;
  });

  textarea.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  });

  sendBtn.addEventListener('click', doSend);

  // Hint chips
  win.querySelectorAll('.qm-hint').forEach(function (chip) {
    chip.addEventListener('click', function () { doSend(chip.textContent); });
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  function setInputDisabled(disabled) {
    loading = disabled;
    textarea.disabled = disabled;
    sendBtn.disabled = disabled;
  }

  function scrollBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function formatTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function removeWelcome() {
    if (welcome && welcome.parentNode) welcome.parentNode.removeChild(welcome);
  }

  // ── Append user message ───────────────────────────────────────────────────
  function appendUser(text) {
    removeWelcome();
    var wrap = document.createElement('div');
    wrap.className = 'qm-msg-wrap qm-user';
    wrap.innerHTML = [
      '<div class="qm-meta">' + formatTime() + '</div>',
      '<div class="qm-bubble qm-user">' + escapeHtml(text) + '</div>',
    ].join('');
    messagesEl.appendChild(wrap);
    scrollBottom();
    return wrap;
  }

  // ── Append thinking indicator — returns element so we can replace it ──────
  function appendThinking() {
    var wrap = document.createElement('div');
    wrap.className = 'qm-msg-wrap qm-assistant';
    wrap.innerHTML = [
      '<div class="qm-meta">🤖 DB Agent</div>',
      '<div class="qm-thinking" id="qm-thinking-bubble">',
      '  <div class="qm-spinner"></div>',
      '  <span id="qm-status-text">Thinking…</span>',
      '</div>',
    ].join('');
    messagesEl.appendChild(wrap);
    scrollBottom();
    return wrap;
  }

  // ── Update status text inside thinking bubble ─────────────────────────────
  function updateStatus(stage, message) {
    var el = win.querySelector('#qm-status-text');
    if (el) el.textContent = message || stage;
  }

  // ── Render assistant response — replaces thinking bubble ──────────────────
  function renderResponse(thinkingWrap, data) {
    var html = '';

    // Main message (basic markdown: **bold**, `code`, newlines)
    if (data.message) {
      var msg = escapeHtml(data.message)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code style="background:var(--qm-bg3);padding:1px 4px;border-radius:3px;font-family:monospace;font-size:11px">$1</code>')
        .replace(/\n/g, '<br>');
      html += '<div class="qm-bubble qm-assistant">' + msg;

      // Query pill
      if (data.query) {
        html += '<div class="qm-query-label"><span>⚡ Query</span>';
        if (data.is_read_only) html += '<span class="qm-safe-tag">✓ READ ONLY</span>';
        html += '</div>';
        html += '<div class="qm-query-pill">' + escapeHtml(data.query) + '</div>';
      }

      // Error
      if (data.error) {
        html += '<div class="qm-error">⚠️ ' + escapeHtml(data.error) + '</div>';
      }

      html += '</div>';
    }

    // Table (up to 10 rows in widget)
    if (data.rows && data.rows.length > 0 && data.columns && data.columns.length > 0) {
      var displayRows = data.rows.slice(0, 10);
      html += '<div class="qm-table-wrap"><table class="qm-table"><thead><tr>';
      data.columns.forEach(function (col) {
        html += '<th>' + escapeHtml(col) + '</th>';
      });
      html += '</tr></thead><tbody>';
      displayRows.forEach(function (row) {
        html += '<tr>';
        data.columns.forEach(function (col) {
          var val = row[col];
          var display = val === null || val === undefined ? '<span style="color:var(--qm-muted);font-style:italic">NULL</span>'
            : String(val) === '***REDACTED***' ? '<span style="color:#f87171">🔒 REDACTED</span>'
            : escapeHtml(String(val));
          html += '<td>' + display + '</td>';
        });
        html += '</tr>';
      });
      html += '</tbody></table>';
      html += '<div class="qm-rows-label">' + data.row_count + ' row' + (data.row_count !== 1 ? 's' : '') + '</div>';
      html += '</div>';
    }

    var wrap = document.createElement('div');
    wrap.className = 'qm-msg-wrap qm-assistant';
    wrap.innerHTML = '<div class="qm-meta">🤖 DB Agent · ' + formatTime() + '</div>' + html;

    thinkingWrap.parentNode.replaceChild(wrap, thinkingWrap);
    scrollBottom();
  }

  // ── SSE stream ────────────────────────────────────────────────────────────
  function streamChat(message, thinkingWrap) {
    var ctrl = new AbortController();

    fetch(BACKEND + '/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message, session_id: sessionId }),
      signal: ctrl.signal,
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var reader  = res.body.getReader();
        var decoder = new TextDecoder();
        var buffer  = '';

        function pump() {
          return reader.read().then(function (chunk) {
            if (chunk.done) return;
            buffer += decoder.decode(chunk.value, { stream: true });
            var parts = buffer.split('\n\n');
            buffer = parts.pop();
            parts.forEach(function (part) {
              if (!part.startsWith('data: ')) return;
              try {
                var data = JSON.parse(part.slice(6));
                if (data.type === 'status') {
                  updateStatus(data.stage, data.message);
                } else if (data.type === 'response') {
                  setInputDisabled(false);
                  renderResponse(thinkingWrap, data);
                }
              } catch (e) { /* ignore */ }
            });
            return pump();
          });
        }
        return pump();
      })
      .catch(function (e) {
        if (e.name === 'AbortError') return;
        setInputDisabled(false);
        var msg = e.message || 'Unknown error';
        if (msg.indexOf('Failed to fetch') !== -1) msg = '🌐 Cannot reach backend server.';
        renderResponse(thinkingWrap, { message: msg, error: msg });
      });

    return function () { ctrl.abort(); };
  }

  // ── Main send ─────────────────────────────────────────────────────────────
  function doSend(text) {
    var msg = (text || textarea.value).trim();
    if (!msg || loading) return;
    textarea.value = '';
    textarea.style.height = 'auto';

    appendUser(msg);
    var thinkingWrap = appendThinking();
    setInputDisabled(true);

    if (cancelFn) cancelFn();
    cancelFn = streamChat(msg, thinkingWrap);
  }

})();
