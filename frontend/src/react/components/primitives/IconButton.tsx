import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function IconButton({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      className={`no-drag inline-flex h-8 w-8 items-center justify-center rounded-lg border border-nd-text-muted/15 bg-nd-surface/50 text-nd-text/80 transition hover:border-nd-accent/40 hover:bg-nd-accent/10 hover:text-nd-accent focus:outline-none focus:ring-2 focus:ring-nd-accent/40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
