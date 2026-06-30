import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../../components/overlays/Modal'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import type { TerminalSession } from '@shared/contracts'
import { addKnowledgeNote } from '../../services/ipc/knowledgeClient'
import { listTerminalSessions, writeTerminal } from '../../services/ipc/terminalClient'
import { openExternalUrl } from '../../services/ipc/browserClient'
import { upsertSnippet } from '../../services/ipc/snippetClient'
import { useShareSheet } from '../../state/useShareSheet'
import type { SharePayload } from '../../state/shareSheetContext'
import { useWorkspaces } from '../workspaces/useWorkspaces'

/**
 * Real Epic X6 Universal Share Sheet (supplemental §17.4). Every
 * target routes to an already-real backend — no new storage or
 * dispatch mechanism invented for this screen. Targets are filtered
 * to what the current `SharePayload` actually contains, and each
 * real action reports success/failure rather than assuming it
 * worked. "Workflow," "Export archive," and "Workspace" targets from
 * the spec's list are not offered: each would need its own concrete
 * design (which workflow? which archive format? what does
 * "share to a workspace" even persist?) that doesn't exist yet —
 * offering them here would be a UI control with nothing real behind it.
 */
export function ShareSheetOverlay(): React.JSX.Element {
  const { payload } = useShareSheet()
  if (!payload) return <></>
  // Remounting on a fresh payload (rather than resetting state in an
  // effect) gives each new share request a clean status/error/session
  // list with no synchronous setState-in-effect call.
  return <ShareSheetContent key={JSON.stringify(payload)} payload={payload} />
}

function ShareSheetContent({ payload }: { payload: SharePayload }): React.JSX.Element {
  const navigate = useNavigate()
  const { closeShareSheet } = useShareSheet()
  const { activeWorkspaceId } = useWorkspaces()
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [terminalSessions, setTerminalSessions] = useState<TerminalSession[]>([])

  useEffect(() => {
    if (!activeWorkspaceId) return
    let active = true
    void listTerminalSessions({ workspaceId: activeWorkspaceId }).then((result) => {
      if (active && result.ok) setTerminalSessions(result.data)
    })
    return () => {
      active = false
    }
  }, [activeWorkspaceId])

  const shareText = payload.text ?? payload.url

  async function handleCopyToClipboard(): Promise<void> {
    if (!shareText) return
    await navigator.clipboard.writeText(shareText)
    setStatus('Copied to clipboard.')
  }

  async function handleAddToKnowledgeVault(): Promise<void> {
    if (!shareText) return
    const result = await addKnowledgeNote({
      title: payload.sourceLabel,
      text: shareText,
      origin: `share-sheet:${payload.sourceLabel}`,
      privacyLevel: 'workspace'
    })
    if (result.ok) setStatus('Added to Knowledge Vault.')
    else setError(result.error.userMessage)
  }

  async function handleSaveAsSnippet(): Promise<void> {
    if (!shareText) return
    const result = await upsertSnippet({
      id: crypto.randomUUID(),
      name: payload.sourceLabel,
      type: payload.url ? 'url' : 'text',
      content: shareText
    })
    if (result.ok) setStatus('Saved as a snippet.')
    else setError(result.error.userMessage)
  }

  async function handleSendToTerminal(session: TerminalSession): Promise<void> {
    if (!shareText) return
    const result = await writeTerminal({ sessionId: session.id, data: shareText })
    if (result.ok) setStatus(`Sent to terminal session ${session.id.slice(0, 8)}.`)
    else setError(result.error.userMessage)
  }

  function handleOpenInBrowser(): void {
    if (!payload.url) return
    closeShareSheet()
    navigate('/browser', { state: { openUrl: payload.url } })
  }

  async function handleOpenExternally(): Promise<void> {
    if (!payload.url) return
    const result = await openExternalUrl(payload.url)
    if (result.ok) setStatus('Opened in the system default app.')
    else setError(result.error.userMessage)
  }

  function handleSendToNearbyDevice(): void {
    if (!payload.filePaths || payload.filePaths.length === 0) return
    closeShareSheet()
    navigate('/lan-share/send', { state: { sourcePaths: payload.filePaths } })
  }

  return (
    <Modal open onClose={closeShareSheet} title={`Share: ${payload.sourceLabel}`}>
      <div className="flex flex-col gap-3 p-1">
        {error && (
          <p role="alert" className="text-meta text-status-error">
            {error}
          </p>
        )}
        {status && (
          <p role="status" className="text-meta text-status-success">
            {status}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {shareText && (
            <ControllerButton variant="secondary" onClick={() => void handleCopyToClipboard()}>
              Copy to Clipboard
            </ControllerButton>
          )}
          {shareText && (
            <ControllerButton variant="secondary" onClick={() => void handleAddToKnowledgeVault()}>
              Add to Knowledge Vault
            </ControllerButton>
          )}
          {shareText && (
            <ControllerButton variant="secondary" onClick={() => void handleSaveAsSnippet()}>
              Save as Snippet
            </ControllerButton>
          )}
          {payload.url && (
            <ControllerButton variant="secondary" onClick={handleOpenInBrowser}>
              Open in Browser
            </ControllerButton>
          )}
          {payload.url && (
            <ControllerButton variant="secondary" onClick={() => void handleOpenExternally()}>
              Open in External App
            </ControllerButton>
          )}
          {payload.filePaths && payload.filePaths.length > 0 && (
            <ControllerButton variant="secondary" onClick={handleSendToNearbyDevice}>
              Send to Nearby Device
            </ControllerButton>
          )}
        </div>

        {shareText && terminalSessions.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <p className="text-meta font-semibold text-text-primary">Send to terminal session</p>
            <div className="flex flex-wrap gap-2">
              {terminalSessions.map((session) => (
                <ControllerButton
                  key={session.id}
                  variant="secondary"
                  onClick={() => void handleSendToTerminal(session)}
                >
                  {session.id.slice(0, 8)}
                </ControllerButton>
              ))}
            </div>
          </div>
        )}

        <ControllerButton variant="ghost" onClick={closeShareSheet}>
          Close
        </ControllerButton>
      </div>
    </Modal>
  )
}
