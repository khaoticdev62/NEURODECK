import type { ReactNode } from 'react';

export function Tooltip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full z-tooltip mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg border border-nd-text-muted/15 bg-nd-surface-raised px-2 py-1 text-2xs text-nd-text opacity-0 shadow-panel transition-opacity duration-150 group-hover/tooltip:opacity-100">
        {label}
      </span>
    </span>
  );
}
