import { useState } from 'react'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { ROUTE_DEFINITIONS } from '../../app/routing/routes'
import { useKioskMode } from '../../state/useKioskMode'
import { useLockState } from '../../state/useLockState'

const SELECTABLE_ROUTES = ROUTE_DEFINITIONS.filter(
  (route) => route.routeId !== 'boot' && route.path !== '/kiosk'
)

/**
 * Epic X14 Kiosk Mode settings (supplemental spec §46.2). Unreachable
 * once kiosk mode is active (see `KioskModeProvider.isRouteAllowed`),
 * matching "Restricted settings" — this screen only ever appears
 * before enabling, or after exiting through `KioskExitOverlay`'s real
 * PIN prompt.
 */
export function KioskModeSettings(): React.JSX.Element {
  const { pinConfigured } = useLockState()
  const { enabled, allowedRoutePaths, restrictSettings, startRoutePath, enableKiosk } =
    useKioskMode()
  const [selectedPaths, setSelectedPaths] = useState<string[]>(allowedRoutePaths)
  const [restrictSettingsDraft, setRestrictSettingsDraft] = useState(restrictSettings)
  const [startRouteDraft, setStartRouteDraft] = useState(startRoutePath)

  function toggleRoute(path: string): void {
    setSelectedPaths((current) =>
      current.includes(path)
        ? current.filter((candidate) => candidate !== path)
        : [...current, path]
    )
  }

  async function handleEnable(): Promise<void> {
    await enableKiosk({
      allowedRoutePaths: selectedPaths,
      restrictSettings: restrictSettingsDraft,
      startRoutePath: startRouteDraft
    })
  }

  if (enabled) {
    return (
      <div className="flex h-full flex-col gap-4 p-4">
        <p className="text-title font-semibold text-text-primary">Kiosk Mode</p>
        <p className="text-body text-text-secondary">
          Kiosk mode is active. Use the Exit Kiosk Mode control in the bottom-right corner with your
          real PIN to make changes here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <p className="text-title font-semibold text-text-primary">Kiosk Mode</p>
      <p className="text-meta text-text-secondary">
        Restricts navigation to a chosen set of routes. Exiting kiosk mode always requires your real
        Lock PIN — there is no separate kiosk PIN.
      </p>

      {!pinConfigured && (
        <p role="alert" className="text-meta text-status-warning">
          Set a Lock PIN in Privacy and Permissions before enabling Kiosk Mode — otherwise there
          would be no way to exit it.
        </p>
      )}

      <section className="flex flex-col gap-2">
        <p className="text-meta font-semibold text-text-primary">Allowed routes</p>
        <p className="text-caption text-text-tertiary">
          Leave empty to allow every non-settings route.
        </p>
        <div className="flex flex-wrap gap-2">
          {SELECTABLE_ROUTES.map((route) => (
            <ControllerButton
              key={route.routeId}
              variant={selectedPaths.includes(route.path) ? 'primary' : 'secondary'}
              onClick={() => toggleRoute(route.path)}
            >
              {route.title}
            </ControllerButton>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <ControllerButton
          variant={restrictSettingsDraft ? 'primary' : 'secondary'}
          onClick={() => setRestrictSettingsDraft((current) => !current)}
        >
          Restrict settings: {restrictSettingsDraft ? 'On' : 'Off'}
        </ControllerButton>
      </section>

      <section className="flex flex-col gap-2">
        <label className="text-meta font-semibold text-text-primary" htmlFor="kiosk-start-route">
          Start route (redirect target for blocked navigation)
        </label>
        <input
          id="kiosk-start-route"
          value={startRouteDraft}
          onChange={(event) => setStartRouteDraft(event.target.value)}
          className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
        />
      </section>

      <ControllerButton
        variant="primary"
        disabled={!pinConfigured}
        onClick={() => void handleEnable()}
      >
        Enable Kiosk Mode
      </ControllerButton>
    </div>
  )
}
