import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BootSessionStart } from '../../features/onboarding/BootSessionStart'
import { ShellLayout } from '../shell/ShellLayout'
import { ROUTE_DEFINITIONS, renderRouteElement } from './routes'

/**
 * `HashRouter` rather than `BrowserRouter`: the renderer loads from `file://`
 * in production builds (see src/main/index.ts), where path-based history
 * cannot resolve real filesystem routes.
 *
 * ND-001 Boot and Session Start renders outside `ShellLayout` because boot
 * verifies the services the shell depends on; the remaining routes render
 * inside the global shell chrome.
 */
export function RouterRoot(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route path="/boot" element={<BootSessionStart />} />
        <Route path="/" element={<Navigate to="/boot" replace />} />
        <Route element={<ShellLayout />}>
          {ROUTE_DEFINITIONS.filter((route) => route.routeId !== 'boot').map((route) => (
            <Route key={route.routeId} path={route.path} element={renderRouteElement(route)} />
          ))}
        </Route>
      </Routes>
    </HashRouter>
  )
}
