/**
 * Primary Navigation Rail icons (wireframe §6.2), sourced from `lucide-react`
 * per the NeuroSpatial Workbench design reference
 * (`stitch_neurospatial_workbench_design_system/`) — several of that
 * reference's icon assets (Lock, Crosshair) are byte-identical to their
 * Lucide source, confirming the reference itself was built on this icon
 * set rather than a hand-drawn one.
 */
import {
  Box,
  Circle,
  FileText,
  GraduationCap,
  Globe,
  Hammer,
  House,
  LayoutGrid,
  MessageSquare,
  Monitor,
  Puzzle,
  Search,
  Settings,
  Sparkles,
  Terminal,
  Workflow,
  type LucideIcon
} from 'lucide-react'
import { createIconLookup } from '../primitives/iconLookup'

const NAVIGATION_ICON_COMPONENTS: Record<string, LucideIcon> = {
  home: House,
  search: Search,
  ai: Sparkles,
  workspaces: LayoutGrid,
  build: Hammer,
  files: FileText,
  terminal: Terminal,
  browser: Globe,
  automations: Workflow,
  models: Box,
  extensions: Puzzle,
  learn: GraduationCap,
  system: Settings,
  'ai-chat': MessageSquare,
  applications: Monitor
}

const LookupIcon = createIconLookup(NAVIGATION_ICON_COMPONENTS, Circle, 'size-5 shrink-0')

export function NavigationIcon({ destinationId }: { destinationId: string }): React.JSX.Element {
  return <LookupIcon id={destinationId} />
}
