/**
 * Real, distinguishable per-category icons for tvOS-style shelves (Phase 2
 * visual weight pass), sourced from `lucide-react` — matching
 * `components/navigation/navigationIcons.tsx`'s icon set rather than
 * duplicating hand-copied SVG paths.
 */
import {
  Activity,
  Bot,
  CircleHelp,
  Gamepad2,
  Globe,
  LayoutGrid,
  Power,
  Puzzle,
  Shield,
  Smartphone,
  Video,
  Zap,
  type LucideIcon
} from 'lucide-react'
import { createIconLookup } from '../primitives/iconLookup'

const TV_CATEGORY_ICON_COMPONENTS: Record<string, LucideIcon> = {
  'Display & Controller': Gamepad2,
  Devices: Smartphone,
  'AI & Automation': Bot,
  'Network & Sharing': Globe,
  'Privacy & Security': Shield,
  'System Health': Activity,
  'Session & Power': Power,
  'Help & Support': CircleHelp,
  'Media & Capture': Video,
  'Apps & Extensions': Puzzle,
  Workspaces: LayoutGrid,
  'Next actions': Zap
}

const LookupIcon = createIconLookup(TV_CATEGORY_ICON_COMPONENTS, CircleHelp, 'size-4 shrink-0')

export function TvCategoryIcon({ category }: { category: string }): React.JSX.Element {
  return <LookupIcon id={category} />
}
