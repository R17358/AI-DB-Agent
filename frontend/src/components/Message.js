import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import DataTable from './DataTable';
import Charts from './Charts';

function QueryBlock({ query, explanation, isReadOnly }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="query-block">
      <div className="query-block-header">
        <span className="label">
          <span>⚡</span>
          <span>Generated Query</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isReadOnly !== null && isReadOnly !== undefined && (
            <span className={`readonly-tag ${isReadOnly ? 'safe' : 'unsafe'}`}>
              {isReadOnly ? '✓ READ ONLY' : '⚠ WRITE OP'}
            </span>
          )}
          <button onClick={() => setExpanded(e => !e)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px' }}>
            {expanded ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      {explanation && (
        <div style={{ padding: '8px 14px', fontSize: '12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
          {explanation}
        </div>
      )}
      {expanded && (
        <pre className="query-code">{query}</pre>
      )}
    </div>
  );
}

export default function Message({ msg }) {
  const [viewMode, setViewMode] = useState('chart');
  const isUser = msg.role === 'user';

  const hasResults = msg.rows && msg.rows.length > 0;
  const hasViz = hasResults && msg.suggest_visualization && msg.suggest_visualization !== 'table';

  if (isUser) {
    return (
      <div className="message-wrap user">
        <div className="message-meta">
          <span>You</span>
          <span>{msg.time}</span>
        </div>
        <div className="msg-bubble user">{msg.content}</div>
      </div>
    );
  }

  return (
    <div className="message-wrap assistant">
      <div className="message-meta">
        <span style={{ color: 'var(--accent-bright)', fontWeight: 600, fontSize: '12px' }}>🤖 DB Agent</span>
        <span>{msg.time}</span>
        {msg.intent === 'db_query' && (
          <span className="intent-badge db_query">DB Query</span>
        )}
        {msg.intent === 'chat' && (
          <span className="intent-badge chat">Chat</span>
        )}
      </div>

      <div className="msg-bubble assistant" style={{ maxWidth: hasResults ? '95%' : '78%' }}>
        {/* Main message */}
        {msg.content && (
          <ReactMarkdown>{msg.content}</ReactMarkdown>
        )}

        {/* Query block */}
        {msg.query && (
          <QueryBlock
            query={msg.query}
            explanation={msg.query_explanation}
            isReadOnly={msg.is_read_only}
          />
        )}

        {/* Error */}
        {msg.error && (
          <div className="error-block">
            <span>⚠️</span>
            <span>{msg.error}</span>
          </div>
        )}

        {/* Results */}
        {hasResults && (
          <div className="results-section">
            <div className="results-header">
              <span className="results-count">
                {msg.row_count} row{msg.row_count !== 1 ? 's' : ''} returned
              </span>
              {hasViz && (
                <div className="view-toggle">
                  <button className={`view-btn ${viewMode === 'chart' ? 'active' : ''}`}
                    onClick={() => setViewMode('chart')}>📊 Chart</button>
                  <button className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}>≡ Table</button>
                  <button className={`view-btn ${viewMode === 'both' ? 'active' : ''}`}
                    onClick={() => setViewMode('both')}>⊞ Both</button>
                </div>
              )}
            </div>

            {/* Chart */}
            {hasViz && (viewMode === 'chart' || viewMode === 'both') && (
              <Charts
                rows={msg.rows}
                columns={msg.columns}
                vizType={msg.suggest_visualization}
                vizConfig={msg.visualization_config}
              />
            )}

            {/* Table */}
            {(viewMode === 'table' || viewMode === 'both' || !hasViz) && (
              <DataTable rows={msg.rows} columns={msg.columns} />
            )}
          </div>
        )}

        {/* No results */}
        {msg.intent === 'db_query' && !hasResults && !msg.error && msg.rows !== undefined && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Query returned 0 rows.
          </div>
        )}
      </div>
    </div>
  );
}
