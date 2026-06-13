/**
 * neurobridge.js
 *
 * Replaces client invoke() / listen() / emit() with HTTP fetch + WebSocket
 * calls to the Rust sidecar bridge server running on localhost.
 */

const BRIDGE_PORT = (typeof window !== 'undefined' && (window.NEURODECK_PORT || new URLSearchParams(window.location.search).get('port'))) || '9477';
const BRIDGE_URL = `http://127.0.0.1:${BRIDGE_PORT}`;
const WS_URL = `ws://127.0.0.1:${BRIDGE_PORT}/ws`;

let ws = null;
let wsReconnectTimer = null;
let wsConnectState = 'closed';
const listeners = new Map();

// ─────────────────────────────────────────────────────────
// WebSocket Lifecycle
// ─────────────────────────────────────────────────────────

function _wsDispatchMessage(msg) {
  let data;
  try { data = JSON.parse(msg.data); } catch (err) { console.error('[neurobridge] Invalid WS message:', err); return; }
  const { event, payload } = data;
  if (event === '__lag__') { console.warn('[neurobridge] WS lag — dropped messages:', payload?.dropped); return; }
  const handlers = listeners.get(event);
  if (handlers) handlers.forEach(fn => { try { fn({ payload }); } catch (err) { console.error('[neurobridge] Listener error for event', event, ':', err); } });
}

function getWebSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return ws;
  try {
    ws = new WebSocket(WS_URL);
    wsConnectState = 'connecting';
  } catch (err) {
    console.error('[neurobridge] Failed to create WebSocket:', err);
    scheduleReconnect();
    return null;
  }
  ws.onopen = () => { wsConnectState = 'open'; console.log('[neurobridge] WS connected'); };
  ws.onmessage = msg => _wsDispatchMessage(msg);
  ws.onclose = () => { wsConnectState = 'closed'; ws = null; console.log('[neurobridge] WS closed'); scheduleReconnect(); };
  ws.onerror = err => { console.error('[neurobridge] WS error:', err); };
  return ws;
}

function scheduleReconnect() {
  if (wsReconnectTimer) return;
  wsReconnectTimer = setTimeout(() => {
    wsReconnectTimer = null;
    getWebSocket();
  }, 1000);
}

// Eager-connect on module load
if (typeof window !== 'undefined') {
  getWebSocket();
}

// ─────────────────────────────────────────────────────────
// invoke()
// ─────────────────────────────────────────────────────────

export async function invoke(command, args = {}) {
  const url = `${BRIDGE_URL}/api/${command}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await res.json().catch(() => null);
      const message = body?.error?.message || body?.message || `Command "${command}" failed with status ${res.status}`;
      const error = new Error(message);
      error.status = res.status;
      error.code = body?.error?.code || body?.code || 'bridge_error';
      error.details = body;
      throw error;
    }
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(text || `Command "${command}" failed with status ${res.status}`);
  }

  // Some endpoints return empty body for 204-like semantics
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

// ─────────────────────────────────────────────────────────
// listen()
// ─────────────────────────────────────────────────────────

export function listen(event, callback) {
  getWebSocket();

  if (!listeners.has(event)) {
    listeners.set(event, []);
  }
  listeners.get(event).push(callback);

  // Return an unlisten function wrapped in a Promise (matches standard shape)
  return Promise.resolve(() => {
    const arr = listeners.get(event);
    if (!arr) return;
    const idx = arr.indexOf(callback);
    if (idx >= 0) arr.splice(idx, 1);
    if (arr.length === 0) listeners.delete(event);
  });
}

// ─────────────────────────────────────────────────────────
// emit()
// ─────────────────────────────────────────────────────────

export async function emit(event, payload) {
  // The bridge server does not have a dedicated emit endpoint.
  // If needed, commands that accept events from frontend should expose
  // a dedicated command (e.g. emit_event). For now, this is a no-op
  // that preserves API compatibility.
  console.warn('[neurobridge] emit() is not implemented over bridge; use invoke() instead');
}

// ─────────────────────────────────────────────────────────
// Convenience: batch invoke (not in Tauri API but useful)
// ─────────────────────────────────────────────────────────

export async function invokeBatch(commands) {
  return Promise.all(commands.map(({ cmd, args }) => invoke(cmd, args)));
}
