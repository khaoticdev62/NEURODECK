/**
 * Real per-peer rate limiting (spec §13 "Per-peer rate limiting").
 * Fixed-window counter keyed by the peer's real address string from
 * `call.getPeer()` — deliberately simple (no token-bucket smoothing)
 * since registration calls are inherently infrequent; the goal is
 * blocking a real abusive/broken peer from hammering the registration
 * RPCs, not precise traffic shaping.
 */
export class RegistrationRateLimiter {
  private readonly hits = new Map<string, number[]>()

  constructor(
    private readonly maxRequests = 10,
    private readonly windowMs = 10_000
  ) {}

  /** Returns `true` if the request is allowed; records it either way is wrong — only allowed requests count toward the window. */
  allow(peerKey: string, now: number = Date.now()): boolean {
    const recent = (this.hits.get(peerKey) ?? []).filter((t) => now - t < this.windowMs)
    if (recent.length >= this.maxRequests) {
      this.hits.set(peerKey, recent)
      return false
    }
    recent.push(now)
    this.hits.set(peerKey, recent)
    return true
  }

  reset(): void {
    this.hits.clear()
  }
}
