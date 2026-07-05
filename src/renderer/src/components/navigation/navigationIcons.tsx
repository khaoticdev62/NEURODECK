/**
 * Primary Navigation Rail icons (wireframe §6.2), sourced from `lucide-react`
 * per the NeuroSpatial Workbench design reference
 * (`stitch_neurospatial_workbench_design_system/`) — several of that
 * reference's icon assets (Lock, Crosshair) are byte-identical to their
 * Lucide source, confirming the reference itself was built on this icon
 * set rather than a hand-drawn one.
 *
 * Keyed by rail destination id, which since the category consolidation
 * (`navigationDestinations.ts`) is either a pinned feature id (home,
 * search) or a `NavigationCategory` id (workspace, ide, terminal, ai,
 * browser, system) rather than a raw `FEATURE_CATALOG` id.
 */
import {
  Circle,
  Globe,
  Hammer,
  House,
  LayoutGrid,
  Search,
  Settings,
  Sparkles,
  Terminal,
  type LucideIcon
} from 'lucide-react'
import { createIconLookup } from '../primitives/iconLookup'

const NAVIGATION_ICON_COMPONENTS: Record<string, LucideIcon> = {
  home: House,
  search: Search,
  workspace: LayoutGrid,
  ide: Hammer,
  terminal: Terminal,
  ai: Sparkles,
  browser: Globe,
  system: Settings
}

const LookupIcon = createIconLookup(NAVIGATION_ICON_COMPONENTS, Circle, 'size-5 shrink-0')

export function NavigationIcon({ destinationId }: { destinationId: string }): React.JSX.Element {
  return <LookupIcon id={destinationId} />
}
