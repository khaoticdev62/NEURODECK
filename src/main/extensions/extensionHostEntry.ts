import { isAbsolute, join, normalize, resolve } from 'node:path'

/**
 * Real Epic X3 extension execution boundary (supplemental spec §9.3) —
 * forked by `ExtensionHost` as a genuinely separate Node OS process per
 * extension, never required directly into the main process. This file
 * is the *entire* surface a third-party extension module runs inside:
 * it receives capability-call requests over `process.send`/`process.on`
 * (never a raw IPC/Electron handle — this process has no `electron`
 * module available to it at all), and the loaded extension's
 * `activate(ndxApi)` only ever gets that narrow client, not direct
 * access to anything else.
 *
 * Honest scope: this achieves real OS-process isolation (a crash here
 * cannot crash the shell/main process/other extensions — Node's own
 * process boundary) and real capability gating (the extension can only
 * reach host functionality through `ndxApi.call()`, which the parent
 * process's `CapabilityBroker` checks against real granted
 * capabilities). It does **not** achieve full content-level sandboxing
 * — the extension module itself is still a real Node module and could
 * call `require('fs')` directly within its own process. Closing that
 * gap needs a restricted runtime (WASM/QuickJS) this slice doesn't
 * build; named here rather than silently assumed away.
 */

interface PendingCall {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
}

const pending = new Map<string, PendingCall>()
let requestCounter = 0

function callCapability(
  capability: string,
  method: string,
  args: Record<string, unknown>
): Promise<unknown> {
  return new Promise((promiseResolve, promiseReject) => {
    const requestId = `${process.pid}-${requestCounter++}`
    pending.set(requestId, { resolve: promiseResolve, reject: promiseReject })
    process.send?.({ type: 'capability-call', requestId, capability, method, args })
  })
}

const ndxApi = {
  call: callCapability
}

process.on('message', (message: unknown) => {
  if (typeof message !== 'object' || message === null) return
  const payload = message as Record<string, unknown>

  if (payload.type === 'capability-result') {
    const requestId = String(payload.requestId)
    const entry = pending.get(requestId)
    if (!entry) return
    pending.delete(requestId)
    if (payload.ok) entry.resolve(payload.data)
    else
      entry.reject(
        new Error(typeof payload.error === 'string' ? payload.error : 'Capability call failed.')
      )
    return
  }

  if (payload.type === 'init') {
    void activate(payload.installPath as string, payload.entrypointMain as string)
  }

  if (payload.type === 'deactivate') {
    void deactivateAndExit()
  }
})

let activeModule: { deactivate?: () => void | Promise<void> } | null = null

async function activate(installPath: string, entrypointMain: string): Promise<void> {
  try {
    const resolvedInstallPath = resolve(installPath)
    const entryPath = normalize(join(resolvedInstallPath, entrypointMain))
    // Real directory-traversal protection — an entrypoint declaring
    // `../../../etc/passwd` must never resolve outside its own real
    // installed directory.
    if (!entryPath.startsWith(resolvedInstallPath) || isAbsolute(entrypointMain)) {
      throw new Error('Entrypoint path escapes the extension install directory.')
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const extensionModule = require(entryPath) as {
      activate?: (api: typeof ndxApi) => void | Promise<void>
      deactivate?: () => void | Promise<void>
    }
    activeModule = extensionModule
    await extensionModule.activate?.(ndxApi)
    process.send?.({ type: 'activated' })
  } catch (error) {
    process.send?.({
      type: 'fault',
      message: error instanceof Error ? error.message : String(error)
    })
  }
}

async function deactivateAndExit(): Promise<void> {
  try {
    await activeModule?.deactivate?.()
  } catch {
    // A failing deactivate() must not block real shutdown.
  } finally {
    process.exit(0)
  }
}

process.on('uncaughtException', (error) => {
  process.send?.({ type: 'fault', message: error.message })
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  process.send?.({
    type: 'fault',
    message: reason instanceof Error ? reason.message : String(reason)
  })
})
