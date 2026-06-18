/**
 * Bridge client configuration.
 */

export const DEFAULT_TIMEOUT_MS = 30_000;
export const WS_INITIAL_RECONNECT_DELAY_MS = 1_000;
export const WS_MAX_RECONNECT_DELAY_MS = 30_000;
export const RETRY_MAX_ATTEMPTS = 3;
export const RETRY_INITIAL_DELAY_MS = 500;
export const RETRY_MAX_DELAY_MS = 8_000;

function getBridgePort(): number {
  const runtime = typeof window !== "undefined" ? (window as any).NEURODECK_PORT : undefined;
  const runtimePort = runtime ? parseInt(String(runtime), 10) : NaN;
  return Number.isNaN(runtimePort)
    ? parseInt(import.meta.env.VITE_BRIDGE_PORT || "9477", 10)
    : runtimePort;
}

export const BRIDGE_PORT = getBridgePort();
export const BRIDGE_ORIGIN = `http://127.0.0.1:${BRIDGE_PORT}`;
