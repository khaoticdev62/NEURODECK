import { CommandBuilder } from './CommandBuilder'

/**
 * Universal Terminal's Intent mode — a thin wrapper around the real,
 * already-built `CommandBuilder` (ND-029, still real and unchanged at its
 * own standalone `/terminal/builder` route) rather than a duplicate
 * implementation. Zero duplicated logic: one shared component, one
 * `embedded` flag.
 */
export function CommandBuilderPanel({
  onSwitchToDirect
}: {
  onSwitchToDirect: () => void
}): React.JSX.Element {
  return <CommandBuilder embedded onSwitchToDirect={onSwitchToDirect} />
}
