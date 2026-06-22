import { HashRouter, Route, Routes } from 'react-router-dom'
import { ShellLayout } from '../shell/ShellLayout'
import { ROUTE_DEFINITIONS, renderRouteElement } from './routes'

/**
 * `HashRouter` rather than `BrowserRouter`: the renderer loads from `file://`
 * in production builds (see src/main/index.ts), where path-based history
 * cannot resolve real filesystem routes.
 */
export function RouterRoot(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route element={<ShellLayout />}>
          {ROUTE_DEFINITIONS.map((route) => (
            <Route key={route.routeId} path={route.path} element={renderRouteElement(route)} />
          ))}
        </Route>
      </Routes>
    </HashRouter>
  )
}
