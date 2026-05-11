import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Message from './components/Message';
import StatusBar from './components/StatusBar';
import { streamChat, clearSession, getHealth, getSchema } from './utils/api';

const HINTS = [
  'Show me all tables',
  'Count total records',
  'Top 10 by revenue',
  'Show recent entries',
  'Summarize the data',
  'Compare categories',
];

const FEATURES = [
  { icon: '🔍', name: 'Smart Queries', desc: 'Generates SQL or MongoDB queries from natural language.' },
  { icon: '📊', name: 'Live Viz', desc: 'Charts results with bar, line, pie, area charts and more.' },
  { icon: '🧠', name: 'Memory', desc: 'Remembers context across your session.' },
  { icon: '🔒', name: 'Privacy Guard', desc: 'Sensitive columns are always masked.' },
  { icon: '💬', name: 'Dual Mode', desc: 'Knows when to query the DB vs just chat.' },
  { icon: '⚡', name: 'Any DB', desc: 'PostgreSQL, MySQL, SQLite, MongoDB via .env.' },
];

function formatTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [sessionId] = useState(() => uuidv4());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ stage: null, message: '' });
  const [dbConnected, setDbConnected] = useState('connecting');
  const [dbType, setDbType] = useState('');
  const [model, setModel] = useState('');
  const [schema, setSchema] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSchema, setShowSchema] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const cancelStreamRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const check = async () => {
      const h = await getHealth();
      setDbConnected(h.db_connected ? 'connected' : 'disconnected');
      if (h.model) setModel(h.model);
      if (h.db_type) setDbType(h.db_type);
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    getSchema().then((d) => setSchema(d.schema || ''));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, status]);

  const handleSend = useCallback(
    (text) => {
      const msg = (text || input).trim();
      if (!msg || loading) return;
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';

      setMessages((prev) => [
        ...prev,
        { id: uuidv4(), role: 'user', content: msg, time: formatTime() },
      ]);
      setLoading(true);
      setStatus({ stage: 'thinking', message: 'Thinking…' });

      // Cancel any previous stream
      if (cancelStreamRef.current) cancelStreamRef.current();

      cancelStreamRef.current = streamChat(msg, sessionId, {
        onStatus: (stage, message) => {
          setStatus({ stage, message });
          if (stage === 'done' || stage === 'error') {
            setTimeout(
              () => setStatus({ stage: null, message: '' }),
              stage === 'error' ? 4000 : 800
            );
          }
        },
        onResponse: (data) => {
          setLoading(false);
          setStatus({ stage: null, message: '' });
          setMessages((prev) => [
            ...prev,
            {
              id: uuidv4(),
              role: 'assistant',
              content: data.message,
              intent: data.intent,
              query: data.query,
              query_explanation: data.query_explanation,
              is_read_only: data.is_read_only,
              rows: data.rows,
              columns: data.columns,
              row_count: data.row_count,
              error: data.error,
              suggest_visualization: data.suggest_visualization,
              visualization_config: data.visualization_config,
              time: formatTime(),
            },
          ]);
        },
        onError: (errMsg) => {
          setLoading(false);
          setStatus({ stage: null, message: '' });
          setMessages((prev) => [
            ...prev,
            {
              id: uuidv4(),
              role: 'assistant',
              content: null,
              intent: 'chat',
              error: errMsg,
              time: formatTime(),
            },
          ]);
        },
      });
    },
    [input, loading, sessionId]
  );

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = async () => {
    if (cancelStreamRef.current) cancelStreamRef.current();
    await clearSession(sessionId);
    setMessages([]);
    setLoading(false);
    setStatus({ stage: null, message: '' });
  };

  const parseSchemaForDisplay = () => {
    return schema
      .split('\n')
      .filter((l) => l.match(/^\s{2}\w/))
      .map((l) => {
        const parts = l.trim().split(':');
        return parts.length >= 2
          ? { name: parts[0].trim(), cols: parts[1].split(',').map((c) => c.trim()) }
          : null;
      })
      .filter(Boolean);
  };

  const schemaItems = parseSchemaForDisplay();

  return (
    <div className="app-layout">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <div className="logo-icon">⚡</div>
              <span>DB AI Agent</span>
            </div>
            <button className="new-chat-btn" onClick={handleNewChat}>
              <span>+</span> New Chat
            </button>
          </div>

          <div className="sidebar-section-title">Session</div>
          <div className="history-list">
            <div className="history-item active">
              <span>💬</span>
              <span>Current session</span>
            </div>
          </div>

          {schema && (
            <>
              <div
                className="sidebar-section-title"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingRight: '18px',
                }}
              >
                <span>Schema</span>
                <button
                  onClick={() => setShowSchema((s) => !s)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  {showSchema ? 'Hide' : 'Show'}
                </button>
              </div>
              {showSchema && (
                <div className="schema-panel">
                  {schemaItems.map((t) => (
                    <div key={t.name} className="schema-table">
                      <div className="schema-table-name">{t.name}</div>
                      <div className="schema-cols">
                        {t.cols.slice(0, 8).map((c) => (
                          <span key={c} className="schema-col-tag">
                            {c}
                          </span>
                        ))}
                        {t.cols.length > 8 && (
                          <span className="schema-col-tag">+{t.cols.length - 8}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="sidebar-footer">
            <div className="db-status">
              <span className={`status-dot ${dbConnected}`}></span>
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {dbConnected === 'connected'
                  ? `DB · ${dbType || 'Connected'}`
                  : dbConnected === 'connecting'
                  ? 'Connecting to DB…'
                  : 'DB Disconnected'}
              </span>
            </div>
            {model && (
              <div className="db-status" style={{ marginTop: '6px' }}>
                <span className="status-dot connected"></span>
                <span>{model}</span>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Main */}
      <div className="main-area">
        <header className="main-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="icon-btn"
              onClick={() => setSidebarOpen((s) => !s)}
              title="Toggle sidebar"
            >
              ☰
            </button>
            <div>
              <div className="header-title">DB AI Agent</div>
              {model && <div className="header-meta">{model}</div>}
            </div>
          </div>
          <div className="header-actions">
            <button className="icon-btn" onClick={handleNewChat} title="Clear chat">
              🗑
            </button>
            <button
              className="icon-btn"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        <div className="messages-area">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-icon">⚡</div>
              <div className="welcome-title">Your DB AI Agent</div>
              <div className="welcome-sub">
                Ask anything in plain English — I'll generate the query, run it, visualize
                results, and explain everything.
              </div>
              <div className="welcome-features">
                {FEATURES.map((f) => (
                  <div
                    key={f.name}
                    className="feature-card"
                    onClick={() =>
                      f.name === 'Smart Queries' &&
                      handleSend('What tables do you have access to?')
                    }
                  >
                    <div className="feature-icon">{f.icon}</div>
                    <div className="feature-name">{f.name}</div>
                    <div className="feature-desc">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => <Message key={msg.id} msg={msg} />)
          )}

          {/* Live status while loading */}
          {loading && (
            <div className="message-wrap assistant" style={{ animation: 'fadeSlideIn 0.2s ease' }}>
              <div className="message-meta">
                <span style={{ color: 'var(--accent-bright)', fontWeight: 600, fontSize: '12px' }}>
                  🤖 DB Agent
                </span>
              </div>
              <div style={{ maxWidth: '78%' }}>
                <StatusBar stage={status.stage} message={status.message} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="input-area">
          <div className="input-wrap">
            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder="Ask anything about your data, or just chat…"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
              }}
              onKeyDown={handleKey}
              rows={1}
              disabled={loading}
            />
            <button
              className="send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              title="Send (Enter)"
            >
              ↑
            </button>
          </div>
          <div className="input-hints">
            {HINTS.map((h) => (
              <button
                key={h}
                className="hint-chip"
                onClick={() => handleSend(h)}
                disabled={loading}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
