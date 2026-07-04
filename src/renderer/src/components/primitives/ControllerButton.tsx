import { forwardRef, type ReactNode } from 'react'
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react'
import { cn } from './cn'

export type ControllerButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'

/**
 * Based on `HTMLMotionProps` (Motion's own prop type) rather than React's
 * `ButtonHTMLAttributes`, since the two disagree on `onDrag`/`onDragStart`/
 * `onDragEnd` (native DOM event vs. Motion's pan-gesture signature) — the
 * same base `TechCard` already uses for the equivalent reason.
 */
export type ControllerButtonProps = Omit<HTMLMotionProps<'button'>, 'children'> & {
  variant?: ControllerButtonVariant
  children: ReactNode
}

const VARIANT_CLASSES: Record<ControllerButtonVariant, string> = {
  primary:
    'ndx-inner-glow ndx-primary-glow border border-[var(--ndx-workbench-control-bg-active)] bg-[var(--ndx-workbench-control-bg-active)] text-[var(--ndx-workbench-control-text-active)] hover:brightness-110',
  secondary:
    'ndx-inner-glow border border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-control-bg)] text-text-primary hover:border-[var(--ndx-workbench-border-active)] hover:bg-[var(--ndx-workbench-control-bg-hover)]',
  ghost:
    'border border-transparent bg-transparent text-text-primary hover:border-[var(--ndx-workbench-border-muted)] hover:bg-[var(--ndx-workbench-row-hover-bg)]',
  destructive: 'ndx-inner-glow border border-status-error bg-status-error text-canvas hover:brightness-110 hover:shadow-[0_0_24px_0_rgb(255_180_171_/_0.45)]'
}

/**
 * The baseline focusable action control (mega-prompt §8.2 `ControllerButton`).
 * Ref-forwarding so callers can register it with `useFocusable` (Epic 2's
 * Spatial Focus Engine) the same way a plain DOM element would be.
 *
 * `whileTap` gives the handheld tactile response (Responsive Scaling &
 * Breakpoint Spec §5) via the already-installed `motion` package, the same
 * pattern `TechCard` already uses. Gated by `motion`'s own OS-level
 * `useReducedMotion()` rather than the app's `useDisplaySettings()` context,
 * since this button renders on nearly every screen (and in many tests that
 * don't wrap a `DisplaySettingsProvider`), so a self-contained check avoids
 * requiring every render tree to provide that context.
 */
export const ControllerButton = forwardRef<HTMLButtonElement, ControllerButtonProps>(
  function ControllerButton({ variant = 'secondary', className, children, ...rest }, ref) {
    const prefersReducedMotion = useReducedMotion()
    return (
      <motion.button
        ref={ref}
        type="button"
        whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-sm px-4 text-base font-medium transition-colors',
          'min-h-[var(--ndx-target-min)] [height:var(--ndx-button-height)]',
          'focus-visible:shadow-[var(--ndx-workbench-focus-ring)] focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-40',
          VARIANT_CLASSES[variant],
          className
        )}
        {...rest}
      >
        {children}
      </motion.button>
    )
  }
)
