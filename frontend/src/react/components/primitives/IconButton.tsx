import type { ButtonHTMLAttributes, ReactNode } from 'react';

const sizeClasses = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-11 w-11',
};

const variantClasses = {
  ghost:   'border-transparent bg-transparent text-nd-text/80 hover:bg-nd-surface/50 hover:text-nd-text',
  subtle:  'border-nd-text-muted/15 bg-nd-surface/50 text-nd-text/80 hover:border-nd-accent/40 hover:bg-nd-accent/10 hover:text-nd-accent',
  outline: 'border-nd-text-muted/15 bg-transparent text-nd-text/80 hover:border-nd-accent/40 hover:text-nd-accent',
  accent:  'border-nd-accent/25 bg-nd-accent/10 text-nd-accent hover:bg-nd-accent/20',
  danger:  'border-nd-danger/25 bg-nd-danger/10 text-nd-danger hover:bg-nd-danger/20',
};

export function IconButton({
  children,
  className = '',
  size = 'md',
  variant = 'subtle',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  size?: keyof typeof sizeClasses;
  variant?: keyof typeof variantClasses;
}) {
  return (
    <button
      type="button"
      className={[
        'no-drag inline-flex shrink-0 items-center justify-center rounded-lg border',
        'transition-colors duration-150',
        'active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40',
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
