/**
 * Real, distinguishable per-category icons for tvOS-style shelves (Phase 2
 * visual weight pass). Hand-authored inline SVGs (stroke="currentColor", no
 * fill), matching `components/navigation/navigationIcons.tsx`'s exact
 * convention — not a new icon library dependency, same zero-bloat stance.
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
      className="size-4 shrink-0"
      {...props}
    />
  )
}

const TV_CATEGORY_ICON_PATHS: Record<string, React.JSX.Element> = {
  'Display & Controller': (
    <Icon>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M8 20h8M12 16v4" />
    </Icon>
  ),
  Devices: (
    <Icon>
      <rect x="5" y="2.5" width="14" height="19" rx="2" />
      <path d="M9 18h6" />
    </Icon>
  ),
  'AI & Automation': (
    <Icon>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  ),
  'Network & Sharing': (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18" />
    </Icon>
  ),
  'Privacy & Security': (
    <Icon>
      <path d="M12 3 5 6v5c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6z" />
    </Icon>
  ),
  'System Health': (
    <Icon>
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    </Icon>
  ),
  'Session & Power': (
    <Icon>
      <path d="M12 3v8" />
      <path d="M6.3 6.3a8 8 0 1 0 11.4 0" />
    </Icon>
  ),
  'Help & Support': (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 1-1 1.7" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </Icon>
  ),
  'Media & Capture': (
    <Icon>
      <rect x="3" y="6" width="14" height="12" rx="1.5" />
      <path d="M17 10.5 21 8v8l-4-2.5z" />
    </Icon>
  ),
  'Apps & Extensions': (
    <Icon>
      <path d="M9 3h6v5h5v6h-5v5H9v-5H4V8h5z" />
    </Icon>
  ),
  Workspaces: (
    <Icon>
      <rect x="3" y="4" width="8" height="8" rx="1" />
      <rect x="13" y="4" width="8" height="8" rx="1" />
      <rect x="3" y="14" width="8" height="6" rx="1" />
      <rect x="13" y="14" width="8" height="6" rx="1" />
    </Icon>
  ),
  'Next actions': (
    <Icon>
      <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
    </Icon>
  )
}

const FALLBACK_ICON = (
  <Icon>
    <circle cx="12" cy="12" r="8" />
  </Icon>
)

export function TvCategoryIcon({ category }: { category: string }): React.JSX.Element {
  return TV_CATEGORY_ICON_PATHS[category] ?? FALLBACK_ICON
}
