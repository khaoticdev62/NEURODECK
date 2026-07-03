import { randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { dirname } from 'node:path'

export interface DeckyQuickAction {
  id: string
  label: string
  path: string
}

/** A small, explicit allowlist — never a generic command channel. Every entry here is a real, existing renderer route. */
export const DECKY_QUICK_ACTIONS: DeckyQuickAction[] = [
  { id: 'open-home', label: 'Go Home', path: '/' },
  { id: 'open-ai-chat', label: 'Open AI Chat', path: '/ai/chat' },
  { id: 'open-command-canvas', label: 'Ask AI', path: '/ai' },
  { id: 'open-terminal', label: 'Open Terminal', path: '/terminal' }
]

export interface DeckyBridgeCallbacks {
  focusWindow: () => void
  navigate: (path: string) => void
  getAppVersion: () => string
}

/**
 * Phase 4 real local control-plane bridge: a loopback-only (127.0.0.1),
 * token-authenticated HTTP server the separate Decky Loader plugin calls
 * into. Deliberately not gRPC/NaCl like LAN Share — that pattern solves a
 * cross-device, untrusted-network problem; this is a same-machine bridge
 * between two processes owned by the same user, where loopback binding +
 * a bearer token is the proportionate, standard protection (the same
 * threat model most local dev tools use). Deliberately Electron-free
 * (`focusWindow`/`navigate`/`getAppVersion` are injected by
 * `main/ipc/index.ts`), mirroring the same boundary `AgentRuntime`'s
 * `AgentModelPort` injection already draws.
 */
export class DeckyBridgeService {
  private server: Server | null = null
  private token: string | null = null
  private port: number | null = null
  private lastRequestAt: number | undefined

  constructor(
    private readonly discoveryFilePath: string,
    private readonly callbacks: DeckyBridgeCallbacks
  ) {}

  isListening(): boolean {
    return this.server !== null
  }

  getPort(): number | null {
    return this.port
  }

  getLastRequestAt(): number | undefined {
    return this.lastRequestAt
  }

  async start(): Promise<void> {
    if (this.server) return
    this.token = randomBytes(32).toString('hex')

    const server = createServer((req, res) => this.handleRequest(req, res))
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })

    const address = server.address()
    if (!address || typeof address === 'string') {
      server.close()
      throw new Error('Failed to bind the Decky bridge to a loopback port.')
    }
    this.port = address.port
    this.server = server
    await this.writeDiscoveryFile()
  }

  async stop(): Promise<void> {
    const server = this.server
    this.server = null
    this.port = null
    this.token = null
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
    await rm(this.discoveryFilePath, { force: true })
  }

  private async writeDiscoveryFile(): Promise<void> {
    await mkdir(dirname(this.discoveryFilePath), { recursive: true })
    // Owner-read-only. Root (which Decky Loader's Python backend typically
    // runs as on SteamOS) still bypasses standard Unix permission checks
    // and can read this regardless — the mode restricts other local users,
    // not root, which is an accepted, documented part of this threat model.
    await writeFile(
      this.discoveryFilePath,
      JSON.stringify({ port: this.port, token: this.token }, null, 2),
      { mode: 0o600 }
    )
  }

  private isAuthorized(req: IncomingMessage): boolean {
    const header = req.headers.authorization
    if (!header || !this.token) return false
    const expected = `Bearer ${this.token}`
    const headerBuffer = Buffer.from(header)
    const expectedBuffer = Buffer.from(expected)
    if (headerBuffer.length !== expectedBuffer.length) return false
    return timingSafeEqual(headerBuffer, expectedBuffer)
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    this.lastRequestAt = Date.now()
    if (!this.isAuthorized(req)) {
      sendJson(res, 401, { error: 'Unauthorized' })
      return
    }

    const url = new URL(req.url ?? '/', 'http://127.0.0.1')

    if (req.method === 'GET' && url.pathname === '/status') {
      sendJson(res, 200, { running: true, appVersion: this.callbacks.getAppVersion() })
      return
    }

    if (req.method === 'GET' && url.pathname === '/quick-actions') {
      sendJson(res, 200, {
        actions: DECKY_QUICK_ACTIONS.map(({ id, label }) => ({ id, label }))
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/focus') {
      this.callbacks.focusWindow()
      sendJson(res, 200, { ok: true })
      return
    }

    const triggerMatch = /^\/quick-actions\/([^/]+)\/trigger$/.exec(url.pathname)
    if (req.method === 'POST' && triggerMatch) {
      const action = DECKY_QUICK_ACTIONS.find((candidate) => candidate.id === triggerMatch[1])
      if (!action) {
        sendJson(res, 404, { error: 'Unknown quick action.' })
        return
      }
      this.callbacks.focusWindow()
      this.callbacks.navigate(action.path)
      sendJson(res, 200, { ok: true })
      return
    }

    sendJson(res, 404, { error: 'Not found.' })
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  })
  res.end(payload)
}
