import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Message from './components/Message';
import { sendChat, clearSession, getHealth, getSchema } from './utils/api';

const HINTS = [
  "Show me all tables",
  "Count total records",
  "Top 10 by revenue",
  "Show recent entries",
  "Summarize the data",
  "Compare categories",
];

const FEATURES = [
  { icon: '🔍', name: 'Smart Queries', desc: 'Generates SQL or MongoDB queries automatically from natural language.' },
  { icon: '📊', name: 'Live Viz', desc: 'Instantly charts your data with bar, line, pie, area charts and more.' },
  { icon: '🧠', name: 'Memory', desc: 'Remembers conversation context across your session.' },
  { icon: '🔒', name: 'Privacy Guard', desc: 'Sensitive columns are always masked — passwords, tokens, SSNs.' },
  { icon: '💬', name: 'Dual Mode', desc: 'Knows when to query the DB and when to just chat with you.' },
  { icon: '⚡', name: 'Any DB', desc: 'Works with PostgreSQL, MySQL, SQLite, MongoDB via .env config.' },
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
  const [dbStatus, setDbStatus] = useState('connecting');
  const [dbType, setDbType] = useState('');
  const [model, setModel] = useState('');
  const [schema, setSchema] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSchema, setShowSchema] = useState(false);
  const [sessions, setSessions] = useState([{ id: sessionId, title: 'Current session', active: true }]);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Health check
  useEffect(() => {
    const check = async () => {
      const h = await getHealth();
      setDbStatus(h.db_connected ? 'connected' : 'disconnected');
      if (h.model) setModel(h.model);
      if (h.db_type) setDbType(h.db_type);
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  // Schema
  useEffect(() => {
    getSchema().then(d => setSchema(d.schema || ''));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { id: uuidv4(), role: 'user', content: msg, time: formatTime() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await sendChat(msg, sessionId);
      const aiMsg = {
        id: uuidv4(),
        role: 'assistant',
        content: res.message,
        intent: res.intent,
        query: res.query,
        query_explanation: res.query_explanation,
        is_read_only: res.is_read_only,
        rows: res.rows,
        columns: res.columns,
        row_count: res.row_count,
        error: res.error,
        suggest_visualization: res.suggest_visualization,
        visualization_config: res.visualization_config,
        time: formatTime(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: null,
        intent: 'chat',
        error: `Failed to reach server: ${e.message}. Make sure the backend is running on port 8000.`,
        time: formatTime(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = async () => {
    await clearSession(sessionId);
    setMessages([]);
  };

  const parseSchemaForDisplay = () => {
    if (!schema) return [];
    const lines = schema.split('\n');
    const tables = [];
    lines.forEach(line => {
      if (line.match(/^\s{2}\w/)) {
        const parts = line.trim().split(':');
        if (parts.length >= 2) {
          tables.push({ name: parts[0].trim(), cols: parts[1].split(',').map(c => c.trim()) });
        }
      }
    });
    return tables;
  };

  const schemaItems = parseSchemaForDisplay();

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? '' : 'closed'}`} style={!sidebarOpen ? { display: 'none' } : {}}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">⚡</div>
            <span>DB AI Agent</span>
          </div>
          <button className="new-chat-btn" onClick={handleNewChat}>
            <span>+</span> New Chat
          </button>
        </div>

        <div className="sidebar-section-title">Sessions</div>
        <div className="history-list">
          {sessions.map(s => (
            <div key={s.id} className={`history-item ${s.active ? 'active' : ''}`}>
              <span>💬</span>
              <span>{s.title}</span>
            </div>
          ))}
        </div>

        {/* Schema */}
        {schema && (
          <>
            <div className="sidebar-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '18px' }}>
              <span>Schema</span>
              <button onClick={() => setShowSchema(s => !s)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px' }}>
                {showSchema ? 'Hide' : 'Show'}
              </button>
            </div>
            {showSchema && (
              <div className="schema-panel">
                {schemaItems.map(t => (
                  <div key={t.name} className="schema-table">
                    <div className="schema-table-name">{t.name}</div>
                    <div className="schema-cols">
                      {t.cols.slice(0, 8).map(c => (
                        <span key={c} className="schema-col-tag">{c}</span>
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
            <span className={`status-dot ${dbStatus}`}></span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {dbStatus === 'connected' ? `Connected · ${dbType || 'DB'}` :
               dbStatus === 'connecting' ? 'Connecting…' : 'Disconnected'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-area">
        <header className="main-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="icon-btn" onClick={() => setSidebarOpen(s => !s)} title="Toggle sidebar">
              ☰
            </button>
            <div>
              <div className="header-title">DB AI Agent</div>
              {model && <div className="header-meta">{model}</div>}
            </div>
          </div>
          <div className="header-actions">
            <button className="icon-btn" onClick={handleNewChat} title="Clear chat">🗑</button>
            <button className="icon-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Toggle theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="messages-area">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-icon">⚡</div>
              <div className="welcome-title">Your DB AI Agent</div>
              <div className="welcome-sub">
                Ask questions in plain English — I'll generate queries, visualize results, and explain everything. 
                I also retain memory of our conversation.
              </div>
              <div className="welcome-features">
                {FEATURES.map(f => (
                  <div key={f.name} className="feature-card" onClick={() => handleSend(f.name === 'Smart Queries' ? 'What tables do you have access to?' : f.name)}>
                    <div className="feature-icon">{f.icon}</div>
                    <div className="feature-name">{f.name}</div>
                    <div className="feature-desc">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            messages.map(msg => <Message key={msg.id} msg={msg} />)
          )}

          {loading && (
            <div className="message-wrap assistant" style={{ animation: 'fadeSlideIn 0.3s ease' }}>
              <div className="message-meta">
                <span style={{ color: 'var(--accent-bright)', fontWeight: 600, fontSize: '12px' }}>🤖 DB Agent</span>
              </div>
              <div className="thinking-bubble">
                <div className="thinking-dots">
                  <div className="thinking-dot"></div>
                  <div className="thinking-dot"></div>
                  <div className="thinking-dot"></div>
                </div>
                <span>Thinking…</span>
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
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
              }}
              onKeyDown={handleKey}
              rows={1}
              disabled={loading}
            />
            <button className="send-btn" onClick={() => handleSend()} disabled={!input.trim() || loading} title="Send">
              ↑
            </button>
          </div>
          <div className="input-hints">
            {HINTS.map(h => (
              <button key={h} className="hint-chip" onClick={() => handleSend(h)}>{h}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
