const BASE = process.env.REACT_APP_API_URL || 'https://ai-db-agent-uuwa.onrender.com';

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
