import { BRIDGE_PORT, WS_INITIAL_RECONNECT_DELAY_MS, WS_MAX_RECONNECT_DELAY_MS } from "./config";

let _ws: WebSocket | null = null;
const _wsListeners: Map<string, Set<(payload: unknown) => void>> = new Map();
if (typeof window !== "undefined") {
  (window as any).__wsListeners = _wsListeners;
}
let _wsOpenPromise: Promise<void> | null = null;
let _wsOpenResolve: (() => void) | null = null;
let _wsOpenReject: ((err: Error) => void) | null = null;
let _wsReconnectDelayMs = WS_INITIAL_RECONNECT_DELAY_MS;
let _wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleWsReconnect(): void {
  if (_wsReconnectTimer) return;
  const delay = _wsReconnectDelayMs;
  _wsReconnectTimer = setTimeout(() => {
    _wsReconnectTimer = null;
    _wsReconnectDelayMs = Math.min(
      WS_MAX_RECONNECT_DELAY_MS,
      _wsReconnectDelayMs * 2
    );
    _ensureWs();
  }, delay);
}

function _ensureWs(): WebSocket | null {
  if (_ws && _ws.readyState === WebSocket.OPEN) return _ws;
  if (_ws && _ws.readyState === WebSocket.CONNECTING) return _ws;

  const socket = new WebSocket(`ws://127.0.0.1:${BRIDGE_PORT}/ws`);
  const openPromise = new Promise<void>((resolve, reject) => {
    _wsOpenResolve = resolve;
    _wsOpenReject = reject;
  });
  // Prevent unhandled-rejection noise during module load / reconnection attempts.
  openPromise.catch(() => {});
  _wsOpenPromise = openPromise;
  socket.onopen = () => {
    _wsReconnectDelayMs = WS_INITIAL_RECONNECT_DELAY_MS;
    _wsOpenPromise = null;
    _wsOpenReject = null;
    _wsOpenResolve?.();
    _wsOpenResolve = null;
  };
  socket.onerror = () => {
    _wsOpenReject?.(new Error("WebSocket connection failed"));
    _wsOpenReject = null;
    _wsOpenResolve = null;
    _wsOpenPromise = null;
  };
  socket.onclose = () => {
    _wsOpenReject?.(new Error("WebSocket closed before open"));
    _wsOpenReject = null;
    _wsOpenResolve = null;
    _wsOpenPromise = null;
    _ws = null;
    scheduleWsReconnect();
  };
  socket.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      const eventName = msg.event || msg.type;
      if (eventName) {
        const handlers = _wsListeners.get(eventName);
        if (handlers) handlers.forEach((h) => h(msg.payload ?? msg));
      }
    } catch (_) {
      /* ignore non-JSON ws messages */
    }
  };
  _ws = socket;
  return _ws;
}

function _waitForWsOpen(): Promise<void> {
  _ensureWs();
  if (_ws?.readyState === WebSocket.OPEN) return Promise.resolve();
  return _wsOpenPromise ?? Promise.resolve();
}

_ensureWs();

export function listenBridge(event: string, handler: (payload: unknown) => void): () => void {
  _ensureWs();
  if (!_wsListeners.has(event)) _wsListeners.set(event, new Set());
  _wsListeners.get(event)!.add(handler);
  return () => {
    _wsListeners.get(event)?.delete(handler);
  };
}

export { _ensureWs, _waitForWsOpen };
