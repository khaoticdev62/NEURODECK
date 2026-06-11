import type { ButtonHTMLAttributes, ReactNode } from 'react';

const sizeClasses = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-11 w-11',
};

const variantClasses = {
  ghost: 'border-transparent bg-transparent text-nd-text/80 hover:bg-nd-surface/50 hover:text-nd-text',
  subtle: 'border-nd-text-muted/15 bg-nd-surface/50 text-nd-text/80 hover:border-nd-accent/40 hover:bg-nd-accent/10 hover:text-nd-accent',
  outline: 'border-nd-text-muted/15 bg-transparent text-nd-text/80 hover:border-nd-accent/40 hover:text-nd-accent',
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
      className={`no-drag inline-flex items-center justify-center rounded-lg transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
