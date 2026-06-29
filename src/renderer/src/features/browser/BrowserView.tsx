import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { BrowserPermissionRequest, BrowserTab } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { ErrorState } from '../../components/feedback/UXState'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import {
  goBackBrowserTab,
  goForwardBrowserTab,
  navigateBrowserTab,
  onBrowserPermissionRequest,
  onBrowserTabUpdate,
  openExternalUrl,
  reloadBrowserTab,
  respondToBrowserPermissionRequest,
  setActiveBrowserTab,
  setBrowserTabBounds
} from '../../services/ipc/browserClient'
import { BrowserPermissionDialog } from './BrowserPermissionDialog'

/**
 * ND-031 Browser View. Real: the actual page content is a native
 * `WebContentsView` (`main/browser/BrowserSessionService.ts`) positioned
 * directly under the placeholder `<div>` below via real, continuously
 * measured `getBoundingClientRect()` bounds reported over IPC — there is
 * no `<webview>`/`<iframe>` rendering the page inside the DOM. Leaving
 * this screen collapses the view to zero bounds (hides it) rather than
 * destroying it, since only one tab's content is ever resident at a time
 * (see `BrowserSessionService`'s scope note) and the next tab activation
 * will reset real bounds again.
 */
export function BrowserView(): React.JSX.Element {
  const { tabId } = useParams<{ tabId: string }>()
  const navigate = useNavigate()
  const placeholderRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<BrowserTab | null>(null)
  const [addressInput, setAddressInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [permissionRequest, setPermissionRequest] = useState<BrowserPermissionRequest | null>(null)

  useEffect(() => {
    if (!tabId) return
    let active = true
    void setActiveBrowserTab({ tabId }).then((result) => {
      if (!active) return
      setLoading(false)
      if (result.ok) {
        setTab(result.data)
        setAddressInput(result.data.url)
        setError(null)
      } else {
        setError(result.error.userMessage)
      }
    })
    return () => {
      active = false
    }
  }, [tabId])

  useEffect(() => {
    return onBrowserTabUpdate((updated) => {
      if (updated.id !== tabId) return
      setTab(updated)
      setAddressInput(updated.url)
    })
  }, [tabId])

  useEffect(() => {
    return onBrowserPermissionRequest((request) => {
      setPermissionRequest(request)
    })
  }, [])

  useEffect(() => {
    if (!tabId || !placeholderRef.current) return
    const element = placeholderRef.current

    function reportBounds(): void {
      const rect = element.getBoundingClientRect()
      void setBrowserTabBounds({
        tabId: tabId!,
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      })
    }

    reportBounds()
    const observer = new ResizeObserver(reportBounds)
    observer.observe(element)
    window.addEventListener('resize', reportBounds)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', reportBounds)
      void setBrowserTabBounds({ tabId: tabId!, x: 0, y: 0, width: 0, height: 0 })
    }
  }, [tabId])

  async function handleNavigate(): Promise<void> {
    if (!tabId || !addressInput.trim()) return
    const result = await navigateBrowserTab({ tabId, url: addressInput.trim() })
    if (!result.ok) setError(result.error.userMessage)
  }

  if (loading) return <p className="p-4 text-meta text-text-secondary">Loading…</p>
  if (!tab) return <ErrorState title="Tab not found" description={error ?? 'Unknown tab.'} />

  return (
    <div className="grid h-full min-w-[64rem] grid-cols-[22rem_minmax(32rem,1fr)] gap-2 overflow-auto">
      <NdxToolWindow title="Browser Controls" subtitle={tab.title || tab.url}>
        <ControllerButton variant="ghost" onClick={() => navigate('/browser')}>
          Tabs
        </ControllerButton>
        <ControllerButton
          variant="secondary"
          onClick={() => tabId && void goBackBrowserTab({ tabId })}
          disabled={!tab.canGoBack}
        >
          Back
        </ControllerButton>
        <ControllerButton
          variant="secondary"
          onClick={() => tabId && void goForwardBrowserTab({ tabId })}
          disabled={!tab.canGoForward}
        >
          Forward
        </ControllerButton>
        <ControllerButton
          variant="secondary"
          onClick={() => tabId && void reloadBrowserTab({ tabId })}
        >
          Reload
        </ControllerButton>
        <input
          value={addressInput}
          onChange={(event) => setAddressInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleNavigate()
          }}
          className="w-full rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
        />
        <ControllerButton variant="primary" onClick={() => void handleNavigate()}>
          Go
        </ControllerButton>
        <ControllerButton variant="ghost" onClick={() => void openExternalUrl(tab.url)}>
          Open externally
        </ControllerButton>
        {error && <ErrorState title="Browser error" description={error} />}
        {tab.loading && <p className="text-meta text-text-tertiary">Loading…</p>}
      </NdxToolWindow>

      <NdxEditorShell title={tab.title || tab.url}>
        <div ref={placeholderRef} className="h-full min-h-0 border border-border bg-canvas" />
      </NdxEditorShell>

      <BrowserPermissionDialog
        request={permissionRequest}
        onAllow={() => {
          if (!permissionRequest) return
          void respondToBrowserPermissionRequest({
            requestId: permissionRequest.requestId,
            granted: true
          })
          setPermissionRequest(null)
        }}
        onDeny={() => {
          if (!permissionRequest) return
          void respondToBrowserPermissionRequest({
            requestId: permissionRequest.requestId,
            granted: false
          })
          setPermissionRequest(null)
        }}
      />
    </div>
  )
}
