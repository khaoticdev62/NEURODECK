import { DEFAULT_TIMEOUT_MS } from "./config";
import { BridgeError, isBridgeError } from "./errors";

/** Generate a unique request id for bridge commands. */
export function generateRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000_000)}`;
}

/** Promise-based sleep helper. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** @internal exported for unit tests */
export function computeBackoff(attempt: number, baseMs: number, maxMs: number): number {
  const exponential = baseMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponential;
  return Math.min(maxMs, exponential + jitter);
}

/** @internal exported for unit tests */
export function isSafeReadCommand(cmd: string): boolean {
  const safePrefixes = ["get_", "list_", "search_", "discover_", "count_"];
  const safeExact = new Set(["status", "health", "get_bridge_telemetry"]);
  if (safeExact.has(cmd)) return true;
  return safePrefixes.some((prefix) => cmd.startsWith(prefix));
}

/** Resolve the HTTP timeout for a given bridge command. */
export function getCommandTimeoutMs(cmd: string): number | undefined {
  // Streaming commands have no HTTP-level client timeout; they stream
  // progress over WebSocket and the server enforces its own limits.
  if (
    cmd === "send_command" ||
    cmd === "execute_command_stream" ||
    cmd === "exec_code_stream"
  ) {
    return undefined;
  }
  // File transfers and large archive operations can run for several minutes.
  if (
    cmd === "ftp_download_file" ||
    cmd === "ftp_upload_file" ||
    cmd === "sftp_download_file" ||
    cmd === "sftp_upload_file" ||
    cmd === "transfer_file" ||
    cmd === "warpinator_send" ||
    cmd === "warpinator_receive" ||
    cmd === "generate_support_bundle"
  ) {
    return 310_000;
  }
  return DEFAULT_TIMEOUT_MS;
}

/** Determine whether a bridge error is retryable. */
export function isRetryableError(err: BridgeError): boolean {
  if (err.code === "client_timeout" || err.code === "network_error") return true;
  if (err.status === 429 || err.status === 502 || err.status === 503 || err.status === 504) {
    return true;
  }
  return false;
}

export { BridgeError, isBridgeError };
