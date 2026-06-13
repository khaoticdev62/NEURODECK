type PendingPing = {
  resolve: () => void;
  reject: (reason: Error) => void;
  timer: NodeJS.Timeout;
};

const pending = new Map<string, PendingPing>();

export function waitForPong(requestId: string, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const entry = pending.get(requestId);
      if (entry) {
        pending.delete(requestId);
        reject(new Error(`Renderer pong timeout after ${timeoutMs}ms`));
      }
    }, timeoutMs);
    pending.set(requestId, { resolve, reject, timer });
  });
}

export function resolvePong(requestId: string): boolean {
  const entry = pending.get(requestId);
  if (!entry) return false;
  clearTimeout(entry.timer);
  pending.delete(requestId);
  entry.resolve();
  return true;
}
