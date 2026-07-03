import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import type { LanSharePeer } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { ErrorState } from '../../components/feedback/UXState'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import {
  listLanSharePeers,
  pickLanShareFiles,
  sendLanShareFiles
} from '../../services/ipc/lanShareClient'

function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

/**
 * ND-LAN-004 Send Composer, folding in ND-LAN-005 Selection Review (the
 * selected-files list below *is* the review step — there is no separate
 * wizard page, since nothing about the selection changes between
 * picking files and confirming send). File sizes are intentionally not
 * shown here: the real preflight/manifest build (which computes them)
 * happens in the main process once Send is pressed, and this screen
 * does not duplicate that work with a second, client-side `fs.stat`
 * pass just to render a number a moment earlier.
 */
export function LanShareSendComposer(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const state = location.state as { sourcePaths?: unknown } | null
  const initialSourcePaths = Array.isArray(state?.sourcePaths)
    ? state.sourcePaths.filter(
        (path): path is string => typeof path === 'string' && path.length > 0
      )
    : []
  const [peers, setPeers] = useState<LanSharePeer[]>([])
  const [peerId, setPeerId] = useState(searchParams.get('peerId') ?? '')
  const [sourcePaths, setSourcePaths] = useState<string[]>(initialSourcePaths)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let active = true
    void listLanSharePeers().then((result) => {
      if (!active) return
      if (result.ok) {
        setPeers(result.data.filter((peer) => peer.trustState !== 'blocked'))
      } else {
        setError(result.error.userMessage)
      }
    })
    return () => {
      active = false
    }
  }, [])

  async function handlePickFiles(): Promise<void> {
    const result = await pickLanShareFiles()
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    if (result.data.length > 0) setSourcePaths(result.data)
  }

  async function handleSend(): Promise<void> {
    if (!peerId || sourcePaths.length === 0) return
    setSending(true)
    const result = await sendLanShareFiles({ peerId, sourcePaths })
    setSending(false)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    navigate(`/lan-share/transfers/${result.data.id}`)
  }

  return (
    <div className="grid h-full grid-cols-1 gap-2 overflow-auto docked:min-w-[76rem] docked:grid-cols-[20rem_minmax(40rem,1fr)_18rem]">
      <NdxToolWindow title="Send Context" subtitle={`${sourcePaths.length} selected`}>
        <div className="space-y-3 text-meta text-text-secondary">
          <p>File picking and send submission use the LAN Share IPC bridge.</p>
          <p>{peers.length} unblocked peers are available as recipients.</p>
        </div>
      </NdxToolWindow>

      <NdxEditorShell title="Send Composer">
        <div className="flex min-h-full min-w-0 flex-col gap-4 p-4">
          <p className="text-title font-semibold text-text-primary">Send Files</p>
          {error && <ErrorState title="Send error" description={error} />}

          <section className="flex flex-col gap-2 ndx-settings-section">
            <p className="text-body font-semibold text-text-primary">1. Choose a device</p>
            {peers.length === 0 ? (
              <p className="text-meta text-text-secondary">
                No devices available to send to yet — discover or add one first.
              </p>
            ) : (
              <select
                value={peerId}
                onChange={(event) => setPeerId(event.target.value)}
                className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
              >
                <option value="">Select a device…</option>
                {peers.map((peer) => (
                  <option key={peer.id} value={peer.id}>
                    {peer.displayName} ({peer.status})
                  </option>
                ))}
              </select>
            )}
          </section>

          <section className="flex flex-col gap-2 ndx-settings-section">
            <p className="text-body font-semibold text-text-primary">2. Choose files</p>
            <ControllerButton variant="secondary" onClick={() => void handlePickFiles()}>
              Choose files…
            </ControllerButton>
            {sourcePaths.length > 0 && (
              <ul className="flex flex-col gap-1">
                {sourcePaths.map((path) => (
                  <li key={path} className="text-meta text-text-secondary">
                    {basename(path)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <ControllerButton
            variant="primary"
            disabled={sending || !peerId || sourcePaths.length === 0}
            onClick={() => void handleSend()}
          >
            {sending
              ? 'Sending…'
              : `Send ${sourcePaths.length || ''} file${sourcePaths.length === 1 ? '' : 's'}`}
          </ControllerButton>
        </div>
      </NdxEditorShell>

      <NdxToolWindow title="Preflight Policy" subtitle="Main process" side="right">
        <div className="space-y-3 text-meta text-text-secondary">
          <p>Manifest building and file stat checks stay in the main process when Send runs.</p>
          <p>Blocked peers are filtered before the recipient selector is rendered.</p>
        </div>
      </NdxToolWindow>
    </div>
  )
}
