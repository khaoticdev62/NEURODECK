/**
 * Bridge client errors.
 */

export interface BridgeErrorBody {
  error?: {
    code?: string;
    message?: string;
    command?: string;
    request_id?: string;
  };
}

export class BridgeError extends Error {
  code: string;
  command: string;
  status: number;
  requestId?: string;

  constructor(
    code: string,
    message: string,
    command: string,
    status: number,
    requestId?: string
  ) {
    super(message);
    this.name = "BridgeError";
    this.code = code;
    this.command = command;
    this.status = status;
    this.requestId = requestId;
  }
}

export function isBridgeError(err: unknown): err is BridgeError {
  return err instanceof BridgeError;
}
