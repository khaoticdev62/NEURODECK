import type { SVGProps } from 'react'

/**
 * Brand/functional icons ported from the NeuroSpatial Workbench Stitch
 * export. `DataSovereigntyIcon`/`GrowthVectorIcon`/`HermesNodeIcon` used to
 * live here as hand-copied SVG paths — they were confirmed byte-identical
 * (Lock, Crosshair) or near-identical (TrendingUp) to real `lucide-react`
 * icons, so call sites now import those directly instead of duplicating the
 * path data. `NeuroDeckLogomark` stays: it's a genuine custom brand mark
 * with no Lucide equivalent.
 */

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
