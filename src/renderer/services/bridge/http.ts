import { BRIDGE_ORIGIN, DEFAULT_TIMEOUT_MS, RETRY_INITIAL_DELAY_MS, RETRY_MAX_ATTEMPTS, RETRY_MAX_DELAY_MS } from "./config";
import { BridgeError, BridgeErrorBody, isBridgeError } from "./errors";
import {
  computeBackoff,
  generateRequestId,
  getCommandTimeoutMs,
  isRetryableError,
  isSafeReadCommand,
  sleep,
} from "./utils";

export interface BridgeInvokeOptions {
  timeoutMs?: number;
  retry?: boolean | { maxAttempts?: number; delayMs?: number };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs?: number
): Promise<Response> {
  if (timeoutMs === undefined) return fetch(url, init);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function bridgeInvokeOnce<T>(
  cmd: string,
  args: unknown,
  requestId: string,
  includeRequestId: boolean,
  timeoutMs?: number
): Promise<T> {
  const body = includeRequestId
    ? { ...((args as Record<string, unknown>) ?? {}), request_id: requestId }
    : args;

  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${BRIDGE_ORIGIN}/api/${cmd}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      },
      timeoutMs
    );
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new BridgeError(
        "client_timeout",
        `Request '${cmd}' timed out after ${timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`,
        cmd,
        0,
        requestId
      );
    }
    const message = e instanceof Error ? e.message : String(e);
    throw new BridgeError("network_error", message, cmd, 0, requestId);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "Bridge error");
    let parsed: BridgeErrorBody = {};
    try {
      parsed = JSON.parse(text) as BridgeErrorBody;
    } catch (_) {
      /* body is not JSON */
    }
    const code = parsed.error?.code ?? "command_error";
    const message = parsed.error?.message ?? text;
    throw new BridgeError(
      code,
      message,
      parsed.error?.command ?? cmd,
      res.status,
      parsed.error?.request_id ?? requestId
    );
  }

  return res.json() as Promise<T>;
}

export async function bridgeInvoke<T>(
  cmd: string,
  args?: unknown,
  options?: BridgeInvokeOptions
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? getCommandTimeoutMs(cmd);
  const requestId = generateRequestId();

  let maxAttempts = 1;
  let retryBaseMs = RETRY_INITIAL_DELAY_MS;
  let retryMaxMs = RETRY_MAX_DELAY_MS;

  if (options?.retry === true || (options?.retry !== false && isSafeReadCommand(cmd))) {
    maxAttempts = RETRY_MAX_ATTEMPTS;
    if (typeof options?.retry === "object") {
      maxAttempts = options.retry.maxAttempts ?? RETRY_MAX_ATTEMPTS;
      retryBaseMs = options.retry.delayMs ?? RETRY_INITIAL_DELAY_MS;
      retryMaxMs = Math.max(retryBaseMs * 4, RETRY_MAX_DELAY_MS);
    }
  }

  // Only include request_id when retry is enabled. The backend ignores unknown
  // fields by default, but keeping it scoped to retried commands minimizes risk.
  const includeRequestId = maxAttempts > 1;
  let lastErr: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await bridgeInvokeOnce<T>(cmd, args, requestId, includeRequestId, timeoutMs);
    } catch (e) {
      lastErr = e;
      if (attempt === maxAttempts - 1) break;
      if (!isBridgeError(e) || !isRetryableError(e)) break;
      const delay = computeBackoff(attempt, retryBaseMs, retryMaxMs);
      await sleep(delay);
    }
  }

  throw lastErr;
}

export { BridgeError };
