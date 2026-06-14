import { createContext, useCallback, useContext, useId, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

// ── Context ───────────────────────────────────────────────────────────────────

interface TabsCtx {
  value: string;
  onChange: (v: string) => void;
  idPrefix: string;
}

const TabsContext = createContext<TabsCtx | null>(null);

function useTabsCtx(): TabsCtx {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tab components must be used inside <TabGroup>');
  return ctx;
}

// ── TabGroup ──────────────────────────────────────────────────────────────────

export function TabGroup({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const idPrefix = useId();
  return (
    <TabsContext.Provider value={{ value, onChange, idPrefix }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

// ── TabList ───────────────────────────────────────────────────────────────────

export function TabList({
  children,
  'aria-label': ariaLabel,
  className,
}: {
  children: ReactNode;
  'aria-label'?: string;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []
    );
    const current = document.activeElement as HTMLButtonElement;
    const idx = tabs.indexOf(current);
    if (idx === -1) return;

    let next = -1;
    if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;

    e.preventDefault();
    tabs[next]?.focus();
    tabs[next]?.click();
  }, []);

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={className}
    >
      {children}
    </div>
  );
}

// ── Tab ───────────────────────────────────────────────────────────────────────

export function Tab({
  value,
  children,
  className,
  activeClassName,
  inactiveClassName,
  disabled,
}: {
  value: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
  inactiveClassName?: string;
  disabled?: boolean;
}) {
  const { value: active, onChange, idPrefix } = useTabsCtx();
  const isActive = active === value;

  return (
    <button
      type="button"
      role="tab"
      id={`${idPrefix}-tab-${value}`}
      aria-selected={isActive}
      aria-controls={`${idPrefix}-panel-${value}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => onChange(value)}
      className={`${className ?? ''} ${isActive ? (activeClassName ?? '') : (inactiveClassName ?? '')}`}
    >
      {children}
    </button>
  );
}

// ── TabPanels ─────────────────────────────────────────────────────────────────

export function TabPanels({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

// ── TabPanel ──────────────────────────────────────────────────────────────────

export function TabPanel({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { value: active, idPrefix } = useTabsCtx();
  const isActive = active === value;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${value}`}
      aria-labelledby={`${idPrefix}-tab-${value}`}
      tabIndex={0}
      className={`focus-visible:outline-none ${className ?? ''}`}
    >
      {children}
    </div>
  );
}
