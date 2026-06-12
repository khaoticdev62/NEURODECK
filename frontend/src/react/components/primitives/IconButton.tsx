import type { ButtonHTMLAttributes, ReactNode } from 'react';

const sizeClasses = {
  sm: 'h-7 w-7 min-h-[40px] min-w-[40px]',
  md: 'h-8 w-8 min-h-[40px] min-w-[40px]',
  lg: 'h-10 w-10 min-h-[44px] min-w-[44px]',
  xl: 'h-11 w-11 min-h-[48px] min-w-[48px]',
};

const variantClasses = {
  ghost:   'border-transparent bg-transparent text-nd-text-primary/80 hover:bg-nd-surface-raised/50 hover:text-nd-text-primary',
  subtle:  'border-nd-border-subtle bg-nd-surface-base/50 text-nd-text-primary/80 hover:border-nd-accent-primary/40 hover:bg-nd-accent-primary/10 hover:text-nd-accent-primary',
  outline: 'border-nd-border-subtle bg-transparent text-nd-text-primary/80 hover:border-nd-accent-primary/40 hover:text-nd-accent-primary',
  accent:  'border-nd-accent-primary/25 bg-nd-accent-primary/10 text-nd-accent-primary hover:bg-nd-accent-primary/20',
  danger:  'border-nd-accent-error/25 bg-nd-accent-error/10 text-nd-accent-error hover:bg-nd-accent-error/20',
};

export function IconButton({
  children,
  className = '',
  size = 'md',
  variant = 'subtle',
  'aria-label': ariaLabel,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  size?: keyof typeof sizeClasses;
  variant?: keyof typeof variantClasses;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={[
        'no-drag inline-flex shrink-0 items-center justify-center rounded-lg border',
        'transition-all duration-fast',
        'active:scale-95 active:brightness-110',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/40',
        'disabled:pointer-events-none disabled:opacity-50',
        sizeClasses[size],
        variantClasses[variant],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
