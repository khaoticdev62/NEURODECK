import { ControllerHint, type ControllerHintProps } from '../navigation/ControllerHint'
import { DEFAULT_PRIMARY_HINTS } from '../navigation/defaultControllerHints'
import { formatKernelStatus, formatUptime, useCoreTelemetry } from '../../state/useCoreTelemetry'

export interface NdxStatusBarProps {
  routeTitle: string
  screenId?: string
  controllerLayer?: string
  primaryHints?: ControllerHintProps[]
}

/**
 * Footer: 26px fixed bar. Left keeps the route/controller-layer label
 * required for controller-native orientation; center adds real core
 * telemetry (Latency/Uptime/Kernel, from `useCoreTelemetry`'s live IPC round
 * trip — never a placeholder); right keeps the real controller button hints
 * (never dropped — this app has no mouse-only fallback).
 */
export function NdxStatusBar({
  routeTitle,
  screenId,
  controllerLayer = 'workbench',
  primaryHints = DEFAULT_PRIMARY_HINTS
}: NdxStatusBarProps): React.JSX.Element {
  const telemetry = useCoreTelemetry()

  return (
    <footer
      role="contentinfo"
      className="flex items-center justify-between border-t border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-statusbar-bg)] px-[var(--ndx-safe-inset)]"
      style={{ zIndex: 'var(--ndx-z-rail)' }}
    >
      <div className="flex min-w-0 items-center gap-2 text-meta text-text-secondary">
        <span className="truncate text-text-primary">{routeTitle}</span>
        {screenId && <span className="hidden deck:inline">{screenId}</span>}
        <span className="hidden deck:inline">Layer: {controllerLayer}</span>
      </div>
      <div className="ndx-footer-telemetry hidden shrink-0 items-center gap-3 deck:flex">
        <span>Latency: {telemetry.latencyMs === null ? '--' : `${telemetry.latencyMs}ms`}</span>
        <span>Uptime: {formatUptime(telemetry.uptimeSeconds)}</span>
        <span>Kernel: {formatKernelStatus(telemetry.kernelStatus)}</span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {primaryHints.slice(0, 4).map((hint) => (
          <ControllerHint key={hint.glyph} {...hint} />
        ))}
      </div>
    </footer>
  )
}
