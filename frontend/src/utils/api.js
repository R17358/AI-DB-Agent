const BASE = process.env.REACT_APP_API_URL || 'https://ai-db-agent-1.onrender.com';

// ── SSE streaming chat (primary) ──────────────────────────────────────────────
export function streamChat(message, sessionId, { onStatus, onResponse, onError }) {
  const ctrl = new AbortController();

  fetch(`${BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
    signal: ctrl.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop(); // keep incomplete chunk
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(part.slice(6));
            if (data.type === 'status') onStatus?.(data.stage, data.message);
            else if (data.type === 'response') onResponse?.(data);
          } catch { /* malformed chunk — ignore */ }
        }
      }
    })
    .catch((e) => {
      if (e.name === 'AbortError') return;
      let msg = e.message || 'Unknown error';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        msg = '🌐 Cannot reach backend. Make sure the server is running.';
      }
      onError?.(msg);
    });

  return () => ctrl.abort();
}

// ── REST fallback ─────────────────────────────────────────────────────────────
export async function sendChat(message, sessionId) {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function clearSession(sessionId) {
  await fetch(`${BASE}/session/${sessionId}`, { method: 'DELETE' });
}

export async function getHealth() {
  try {
    const res = await fetch(`${BASE}/health`);
    return res.json();
  } catch {
    return { status: 'error', db_connected: false };
  }
}

export async function getSchema() {
  try {
    const res = await fetch(`${BASE}/schema`);
    return res.json();
  } catch {
    return { schema: '' };
  }
}
