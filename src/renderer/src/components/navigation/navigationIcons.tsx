/**
 * Real, distinguishable per-destination icons for the Primary Navigation
 * Rail (wireframe §6.2) — replacing what was previously just a generic
 * placeholder dot (`<span className="size-2 rounded-full" />`) shared by
 * every destination, which made the rail's collapsed (icon-only, 88px)
 * state genuinely unusable: every item looked identical. Hand-authored
 * inline SVGs (stroke="currentColor", no fill) rather than a new icon
 * library dependency, consistent with this project's zero-bloat stance.
 */
import type { SVGProps } from 'react'

function Icon(props: SVGProps<SVGSVGElement>): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-5 shrink-0"
      {...props}
    />
  )
}

const NAVIGATION_ICON_PATHS: Record<string, React.JSX.Element> = {
  home: (
    <Icon>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </Icon>
  ),
  search: (
    <Icon>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </Icon>
  ),
  ai: (
    <Icon>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  ),
  workspaces: (
    <Icon>
      <rect x="3" y="4" width="8" height="8" rx="1" />
      <rect x="13" y="4" width="8" height="8" rx="1" />
      <rect x="3" y="14" width="8" height="6" rx="1" />
      <rect x="13" y="14" width="8" height="6" rx="1" />
    </Icon>
  ),
  build: (
    <Icon>
      <path d="M14.5 3.5 18 7l-2.5 2.5L12 6z" />
      <path d="M11.5 8.5 4 16l-1 4 4-1 7.5-7.5" />
      <path d="M16.5 5 19 7.5" />
    </Icon>
  ),
  files: (
    <Icon>
      <path d="M4 5a1 1 0 0 1 1-1h4.5l2 2H19a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
    </Icon>
  ),
  terminal: (
    <Icon>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M7 9.5 10.5 12 7 14.5M12.5 14.5h4.5" />
    </Icon>
  ),
  browser: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18" />
    </Icon>
  ),
  automations: (
    <Icon>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="18" cy="12" r="2.2" />
      <path d="M8 7l8 4M8 17l8-4" />
    </Icon>
  ),
  models: (
    <Icon>
      <path d="M12 3 4 7v6l8 4 8-4V7z" />
      <path d="M4 7l8 4 8-4M12 11v10" />
    </Icon>
  ),
  extensions: (
    <Icon>
      <path d="M9 3h6v5h5v6h-5v5H9v-5H4V8h5z" />
      <path d="M9 8h6M9 14h6" />
    </Icon>
  ),
  learn: (
    <Icon>
      <path d="M3 6.5 12 3l9 3.5-9 3.5z" />
      <path d="M6.5 8.7V15c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3V8.7" />
    </Icon>
  ),
  system: (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a1.7 1.7 0 1 1-2.4 2.4l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V19a1.7 1.7 0 0 1-3.4 0v-.1a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a1.7 1.7 0 1 1-2.4-2.4l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H4.6a1.7 1.7 0 0 1 0-3.4h.1a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a1.7 1.7 0 1 1 2.4-2.4l.06.06a1.7 1.7 0 0 0 1.87.34h.05a1.7 1.7 0 0 0 1.02-1.56V4.6a1.7 1.7 0 0 1 3.4 0v.1a1.7 1.7 0 0 0 1.03 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a1.7 1.7 0 1 1 2.4 2.4l-.06.06a1.7 1.7 0 0 0-.34 1.87v.05c.3.73.86 1.13 1.56 1.13h.1a1.7 1.7 0 0 1 0 3.4h-.1a1.7 1.7 0 0 0-1.55 1.03z" />
    </Icon>
  ),
  'ai-chat': (
    <Icon>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Icon>
  ),
  applications: (
    <Icon>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <path d="M8 21h8M12 17v4" />
    </Icon>
  )
}

const FALLBACK_ICON = (
  <Icon>
    <circle cx="12" cy="12" r="8" />
  </Icon>
)

export function NavigationIcon({ destinationId }: { destinationId: string }): React.JSX.Element {
  return NAVIGATION_ICON_PATHS[destinationId] ?? FALLBACK_ICON
}
