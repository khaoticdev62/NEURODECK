import { cn } from './cn'

export type NeuralPulseState = 'idle' | 'listening' | 'analyzing' | 'streaming'

export interface NeuralPulseProps {
  /** Real AI runtime state this indicator reflects — never decorative-only. */
  state?: NeuralPulseState
  size?: number
  className?: string
  label?: string
}

const STATE_LABEL: Record<NeuralPulseState, string> = {
  idle: 'AI idle',
  listening: 'AI listening',
  analyzing: 'AI analyzing',
  streaming: 'AI streaming a reply'
}

const RING_CLASS: Record<NeuralPulseState, string> = {
  idle: 'ndx-neural-pulse-idle border-[var(--ndx-accent)]',
  listening: 'ndx-neural-pulse-ping border-[var(--color-secondary)]',
  analyzing: 'ndx-neural-pulse-ring border-dashed border-[var(--ndx-accent)]',
  streaming: 'ndx-neural-pulse-ring border-[var(--color-tertiary)]'
}

const CORE_CLASS: Record<NeuralPulseState, string> = {
  idle: 'bg-[var(--ndx-accent)] shadow-[0_0_10px_2px_rgb(var(--ndx-accent-rgb)/0.7)]',
  listening: 'bg-[var(--color-secondary)] shadow-[0_0_10px_2px_rgb(77_214_253/0.7)]',
  analyzing: 'bg-[var(--ndx-accent)] shadow-[0_0_10px_2px_rgb(var(--ndx-accent-rgb)/0.7)]',
  streaming: 'bg-[var(--color-tertiary)] shadow-[0_0_10px_2px_rgb(89_219_189/0.7)]'
}

/**
 * NeuroSpatial Workbench "Neural Pulse" (DESIGN.md): the app's one AI-state
 * indicator. Idle/Listening/Analyzing/Streaming map directly to real AI
 * runtime states (see `AgentRuntime`/`ChatRuntime`) — never a decorative
 * loading spinner shown while nothing is actually happening.
 */
export function NeuralPulse({
  state = 'idle',
  size = 32,
  className,
  label
}: NeuralPulseProps): React.JSX.Element {
  return (
    <span
      role="status"
      aria-label={label ?? STATE_LABEL[state]}
      className={cn('relative inline-flex shrink-0 items-center justify-center rounded-full', className)}
      style={{ width: size, height: size }}
    >
      <span
        aria-hidden="true"
        className={cn('absolute inset-0 rounded-full border-2', RING_CLASS[state])}
      />
      <span
        aria-hidden="true"
        className={cn('relative h-[42%] w-[42%] rounded-full', CORE_CLASS[state])}
      />
    </span>
  )
}
