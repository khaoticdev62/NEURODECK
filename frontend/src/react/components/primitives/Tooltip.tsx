import { useId, isValidElement, cloneElement } from 'react';
import type { ReactNode, ReactElement } from 'react';

export function Tooltip({ children, label }: { children: ReactNode; label: string }) {
  const tipId = useId();
  return (
    <span className="group/tooltip relative inline-flex">
      {isValidElement(children)
        ? cloneElement(children as ReactElement<{ 'aria-describedby'?: string }>, {
            'aria-describedby': tipId,
          })
        : children}
      <span
        id={tipId}
        role="tooltip"
        className={[
          'pointer-events-none absolute left-1/2 top-full z-[var(--z-tip)] mt-1.5',
          '-translate-x-1/2 whitespace-nowrap',
          'rounded-lg border border-nd-text-muted/15 bg-nd-surface-raised px-2 py-1',
          'text-2xs text-nd-text-primary shadow-panel',
          'opacity-0 transition-opacity duration-fast motion-reduce:transition-none',
          'group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100',
        ].join(' ')}
      >
        {label}
      </span>
    </span>
  );
}
