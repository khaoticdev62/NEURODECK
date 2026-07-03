import type { SVGProps } from 'react'

/**
 * Brand/functional icons ported from the NeuroSpatial Workbench Stitch
 * export. The source SVGs hardcode `#917eff`/`#4dd6fd` strokes and fills,
 * which would ignore the user's chosen accent color (see
 * `DisplayThemeSettings.tsx`'s `[data-ndx-accent]` presets); every icon here
 * uses `currentColor` instead, same as `navigationIcons.tsx`, so callers
 * control color via a wrapping `text-*` class.
 */
function Icon(props: SVGProps<SVGSVGElement>): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-6 shrink-0"
      {...props}
    />
  )
}

export function DataSovereigntyIcon(props: SVGProps<SVGSVGElement>): React.JSX.Element {
  return (
    <Icon {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Icon>
  )
}

export function GrowthVectorIcon(props: SVGProps<SVGSVGElement>): React.JSX.Element {
  return (
    <Icon {...props}>
      <polyline points="4 17 10 11 14 15 20 9" />
      <polyline points="14 9 20 9 20 15" />
    </Icon>
  )
}

export function HermesNodeIcon(props: SVGProps<SVGSVGElement>): React.JSX.Element {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="22" y1="12" x2="18" y2="12" />
      <line x1="6" y1="12" x2="2" y2="12" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="18" />
    </Icon>
  )
}

/**
 * The NeuroDeck brand logomark (hexagonal core + orbital ring + pulsing
 * center) — a static brand mark, distinct from `NeuralPulse`'s live
 * AI-state indicator. The source SVG animates the core's opacity in a loop;
 * dropped here since a static mark needs no reduced-motion handling.
 */
export function NeuroDeckLogomark(props: SVGProps<SVGSVGElement>): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      stroke="currentColor"
      aria-hidden
      className="size-12 shrink-0"
      {...props}
    >
      <circle cx="256" cy="256" r="240" strokeWidth={8} strokeDasharray="12 8" />
      <path
        d="M256 80 L408 168 V344 L256 432 L104 344 V168 Z"
        strokeWidth={16}
        strokeLinejoin="round"
      />
      <circle cx="256" cy="256" r="60" fill="currentColor" stroke="none" />
      <path
        d="M256 80 V256 M104 168 L256 256 M408 168 L256 256 M104 344 L256 256 M408 344 L256 256 M256 432 V256"
        strokeWidth={4}
        opacity={0.4}
      />
    </svg>
  )
}
