import React, { useEffect, useState } from 'react';

const STAGE_ICONS = {
  thinking:   { icon: '🧠', label: 'Thinking' },
  querying:   { icon: '⚡', label: 'Building query' },
  running:    { icon: '🗄️', label: 'Running on DB' },
  summarizing:{ icon: '📝', label: 'Summarising' },
  done:       { icon: '✅', label: 'Done' },
  error:      { icon: '❌', label: 'Error' },
};

export default function StatusBar({ stage, message }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
    if (stage === 'done' || stage === 'error') return;
    const t = setInterval(() => setElapsed(s => s + 0.1), 100);
    return () => clearInterval(t);
  }, [stage]);

  if (!stage) return null;

  const info = STAGE_ICONS[stage] || { icon: '⏳', label: stage };
  const isError = stage === 'error';
  const isDone  = stage === 'done';

  return (
    <div className={`status-bar ${isError ? 'error' : ''}`}>
      {!isDone && !isError && <div className="status-spinner" />}
      <span className="status-stage-icon">{info.icon}</span>
      <span className="status-text">{message || info.label}</span>
      {!isDone && !isError && elapsed > 0.3 && (
        <span className="status-elapsed">{elapsed.toFixed(1)}s</span>
      )}
    </div>
  );
}
