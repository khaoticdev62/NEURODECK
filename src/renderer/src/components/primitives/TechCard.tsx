import type { ComponentProps, ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from './cn'

export type TechCardProps = Omit<ComponentProps<typeof motion.div>, 'children'> & {
  children: ReactNode
  /** ND-044 reduce-motion preference — disables the tap-scale feedback rather than just shortening it. */
  reduceMotion?: boolean
}

/**
 * Bento Grid Stage widget shell: translucent surface, hairline border,
 * backdrop blur. `whileTap` gives the 1280x800 handheld tactile response
 * (wireframe §2) via the already-installed `motion` package — skipped
 * entirely under `reduceMotion` rather than just shortened, matching how
 * `.ndx-focus-surface`/`.ndx-focusable` already gate transforms in tokens.css.
 */
export function TechCard({
  children,
  className,
  reduceMotion = false,
  ...rest
}: TechCardProps): React.JSX.Element {
  return (
    <motion.div
      whileTap={reduceMotion ? undefined : { scale: 0.95 }}
      className={cn(
        'rounded-lg border border-white/10 bg-surface-bright/5 backdrop-blur-md',
        className
      )}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
