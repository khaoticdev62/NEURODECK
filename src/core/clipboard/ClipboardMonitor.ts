import type { ClipboardStore } from './ClipboardStore'

const DEFAULT_POLL_INTERVAL_MS = 1500

export type ClipboardTextReader = () => string

/**
 * Real Epic X6 Clipboard Center monitoring (supplemental §17.1 "Text
 * clipboard history"). Electron/Chromium expose no clipboard-changed
 * event, so this polls the real OS clipboard on an interval and diffs
 * against the last seen value — the same honest polling technique
 * `BackupScheduler` already uses for its own missing OS hook. Without
 * this, `ClipboardStore` is a real but permanently empty store: nothing
 * else in this codebase ever calls `add()`. `ClipboardStore.add()`
 * itself already enforces the monitoring-enabled flag and secret-shape
 * rejection, so a poll tick never needs to duplicate either check.
 */
export class ClipboardMonitor {
  private timer: ReturnType<typeof setInterval> | null = null
  private lastSeen: string | null = null

  constructor(
    private readonly clipboardStore: ClipboardStore,
    private readonly readClipboardText: ClipboardTextReader,
    private readonly pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS
  ) {}

  start(): void {
    void this.tick()
    this.timer = setInterval(() => void this.tick(), this.pollIntervalMs)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  async tick(): Promise<void> {
    const text = this.readClipboardText()
    if (!text || text === this.lastSeen) return
    this.lastSeen = text
    await this.clipboardStore.add(text, 'text')
  }
}
