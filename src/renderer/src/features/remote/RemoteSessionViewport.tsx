import { useCallback, useEffect, useRef } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import type { RemoteSession, RemoteSessionDataEvent } from '@shared/contracts'
import { useFocusable } from '../../controller/focus/useFocusable'
import {
  getRemoteSessionSnapshot,
  onRemoteSessionData,
  resizeRemoteSession,
  writeRemoteSession
} from '../../services/ipc/remoteClient'

export interface RemoteSessionViewportProps {
  session: RemoteSession
  onError: (message: string) => void
}

/** xterm-backed view of one real SSH shell session — mirrors `TerminalViewport`'s sequence-safe snapshot hydration exactly, against the SSH-backed session instead of a local PTY. */
export function RemoteSessionViewport({
  session,
  onError
}: RemoteSessionViewportProps): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const { ref: focusRef, isFocused } = useFocusable<HTMLDivElement>({
    id: `remote-session-viewport-${session.id}`,
    groupId: 'remote-session',
    role: 'field',
    initialFocus: true,
    onActivate: () => terminalRef.current?.focus()
  })
  const setHostRef = useCallback(
    (element: HTMLDivElement | null) => {
      hostRef.current = element
      focusRef(element)
    },
    [focusRef]
  )

  useEffect(() => {
    if (isFocused) terminalRef.current?.focus()
  }, [isFocused])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const terminal = new Terminal({
      cursorBlink: session.status === 'running',
      cursorStyle: 'bar',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: 14,
      lineHeight: 1.25,
      scrollback: 5000,
      theme: {
        background: '#0b0c10',
        foreground: '#f5f6fa',
        cursor: '#7aa2ff',
        selectionBackground: '#3a3f4c',
        black: '#14161c',
        red: '#f05b6e',
        green: '#4fd18b',
        yellow: '#f2b84b',
        blue: '#5ea8ff',
        magenta: '#b48bff',
        cyan: '#5ea8ff',
        white: '#f5f6fa'
      }
    })
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(host)
    terminalRef.current = terminal

    let hydrated = false
    let disposed = false
    let lastSequence = 0
    const queuedEvents: RemoteSessionDataEvent[] = []
    const unsubscribeData = onRemoteSessionData((event) => {
      if (event.sessionId !== session.id) return
      if (!hydrated) {
        queuedEvents.push(event)
        return
      }
      if (event.sequence <= lastSequence) return
      lastSequence = event.sequence
      terminal.write(event.data)
    })

    void getRemoteSessionSnapshot({ sessionId: session.id }).then((result) => {
      if (disposed) return
      if (!result.ok) {
        onError(result.error.userMessage)
        return
      }
      terminal.write(result.data.output)
      lastSequence = result.data.lastSequence
      hydrated = true
      for (const event of queuedEvents) {
        if (event.sequence <= lastSequence) continue
        lastSequence = event.sequence
        terminal.write(event.data)
      }
      queuedEvents.length = 0
      fitAddon.fit()
    })

    const inputSubscription =
      session.status === 'running'
        ? terminal.onData((data) => {
            void writeRemoteSession({ sessionId: session.id, data }).then((result) => {
              if (!result.ok) onError(result.error.userMessage)
            })
          })
        : { dispose: () => undefined }

    let previousCols = terminal.cols
    let previousRows = terminal.rows
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
      if (
        session.status !== 'running' ||
        (terminal.cols === previousCols && terminal.rows === previousRows)
      ) {
        return
      }
      previousCols = terminal.cols
      previousRows = terminal.rows
      void resizeRemoteSession({
        sessionId: session.id,
        cols: terminal.cols,
        rows: terminal.rows
      }).then((result) => {
        if (!result.ok) onError(result.error.userMessage)
      })
    })
    resizeObserver.observe(host)

    return () => {
      disposed = true
      resizeObserver.disconnect()
      unsubscribeData()
      inputSubscription.dispose()
      terminal.dispose()
      terminalRef.current = null
    }
  }, [onError, session.id, session.status])

  return (
    <div
      ref={setHostRef}
      tabIndex={0}
      aria-label={`Remote session ${session.hostLabel}`}
      className="h-full min-h-0 overflow-hidden bg-canvas p-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
    />
  )
}
