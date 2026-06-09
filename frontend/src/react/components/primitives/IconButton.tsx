import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function IconButton({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      className={`no-drag inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-neuro/40 hover:bg-neuro/10 hover:text-neuro focus:outline-none focus:ring-2 focus:ring-neuro/40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
