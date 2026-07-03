import { useAiSafety } from '../../ai-safety/useAiSafety'
import type { ToolDefinition } from '../../ai-safety/ToolRegistry'
import { useToast } from '../../components/overlays/useToast'
import { useFocusable } from '../../controller/focus/useFocusable'
import { cn } from '../../components/primitives/cn'

export interface CommandPaletteToolRowProps {
  tool: ToolDefinition
  priority: number
  onRun: () => void
}

/**
 * Runs a real tool through the real safety pipeline (`ActionQueue.submit`).
 * If the required capability isn't already granted, this surfaces a real
 * "Approval required" notification (Epic 3's Notification Center) pointing
 * at the Approval Queue — it never silently skips the review step.
 */
export function CommandPaletteToolRow({
  tool,
  priority,
  onRun
}: CommandPaletteToolRowProps): React.JSX.Element {
  const { queue } = useAiSafety()
  const { push } = useToast()
  const { ref, isFocused } = useFocusable<HTMLButtonElement>({
    id: `tool:${tool.id}`,
    groupId: 'command-palette',
    priority,
    onActivate: () => runTool()
  })

  function runTool(): void {
    const result = queue.submit(tool.id)
    if (!result.ok) {
      push({ category: 'error', title: result.error, durationMs: 4000 })
    } else if (result.record.status === 'pending-approval') {
      push({
        category: 'approval-required',
        title: `${tool.title} needs your approval`,
        description: 'Open the Approval Queue to review it.'
      })
    } else {
      push({ category: 'information', title: `Running: ${tool.title}`, durationMs: 3000 })
    }
    onRun()
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={runTool}
      className={cn(
        'flex min-h-[var(--ndx-target-min)] w-full items-center rounded-md border-l-4 px-3 text-left text-body text-text-primary transition-colors',
        isFocused
          ? 'border-l-[var(--ndx-accent)] bg-[var(--ndx-workbench-row-selected-bg)]'
          : 'border-l-transparent hover:bg-surface-raised/60'
      )}
    >
      Run: {tool.title}
    </button>
  )
}
