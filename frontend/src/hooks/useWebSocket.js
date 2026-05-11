import { useEffect, useRef, useCallback, useState } from 'react';

const WS_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:8000')
  .replace(/^http/, 'ws');

export default function useWebSocket(sessionId, { onStatus, onResponse, onError }) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimer = useRef(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current && wsRef.current.readyState <= 1) return; // already open/connecting

    const ws = new WebSocket(`${WS_BASE}/ws/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (mountedRef.current) setConnected(true);
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setConnected(false);
      // Reconnect after 2 s
      reconnectTimer.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (evt) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(evt.data);
        if (data.type === 'status') onStatus?.(data.stage, data.message);
        else if (data.type === 'response') onResponse?.(data);
        else if (data.type === 'error') onError?.(data.message);
      } catch { /* ignore */ }
    };
  }, [sessionId]); // eslint-disable-line

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ message }));
      return true;
    }
    return false;
  }, []);

  return { send, connected };
}
