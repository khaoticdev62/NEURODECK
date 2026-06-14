import * as React from 'react';
import { Badge } from '../core/Badge';

if (typeof document !== 'undefined' && !document.getElementById('nd-sessioncard-css')) {
  const s = document.createElement('style');
  s.id = 'nd-sessioncard-css';
  s.textContent = `
  .nd-sessioncard{background:var(--nd-surface-secondary);border:1px solid var(--nd-border-subtle);
    border-radius:var(--nd-radius-md);padding:12px 14px;font-family:var(--nd-font-ui);color:var(--nd-text-primary);
    display:flex;align-items:center;gap:14px;cursor:pointer;outline:none;text-align:left;width:100%;
    transition:border-color var(--nd-motion-fast) var(--nd-ease-standard),background var(--nd-motion-fast) var(--nd-ease-standard);}
  .nd-sessioncard:hover{background:var(--nd-surface-tertiary);border-color:var(--nd-border-default);}
  .nd-sessioncard:focus-visible{box-shadow:var(--nd-elevation-focus);border-color:var(--nd-accent-primary);}
  .nd-sessioncard--active{border-color:rgba(var(--nd-cyan-rgb),0.4);}
  .nd-sessioncard__main{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;}
  .nd-sessioncard__title{font-size:14px;font-weight:600;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .nd-sessioncard__sub{display:flex;align-items:center;gap:10px;font-family:var(--nd-font-mono);
    font-size:11px;color:var(--nd-text-muted);}
  .nd-sessioncard__sub .dot{width:3px;height:3px;border-radius:50%;background:var(--nd-text-muted);}
  .nd-sessioncard__tags{display:flex;gap:6px;flex-wrap:wrap;}
  .nd-sessioncard__actions{display:flex;gap:4px;flex:none;}
  @media (prefers-reduced-motion: reduce){.nd-sessioncard{transition:none;}}`;
  document.head.appendChild(s);
}

/**
 * Represents a saved conversation / workspace in the session browser.
 */
export interface SessionCardProps {
  title: string;
  /** Relative updated time, e.g. "2h ago". */
  updated?: string;
  /** Model/agent used. */
  model?: string;
  messageCount?: number;
  /** @default 'local' */
  location?: 'local' | 'remote';
  tags?: string[];
  /** Highlight as the current session. @default false */
  active?: boolean;
  onOpen?: () => void;
  /** Trailing IconButtons (rename, duplicate, archive…). */
  actions?: React.ReactNode;
  className?: string;
}

export function SessionCard({
  title,
  updated,
  model,
  messageCount,
  location = 'local',
  tags = [],
  active = false,
  onOpen,
  actions,
  className = '',
}: SessionCardProps): React.ReactNode {
  return (
    <button
      type="button"
      className={['nd-sessioncard', active ? 'nd-sessioncard--active' : '', className].filter(Boolean).join(' ')}
      onClick={onOpen}
    >
      <div className="nd-sessioncard__main">
        <div className="nd-sessioncard__title">{title}</div>
        <div className="nd-sessioncard__sub">
          {updated ? <span>{updated}</span> : null}
          {model ? <><span className="dot" />{model}</> : null}
          {typeof messageCount === 'number' ? <><span className="dot" />{messageCount} msgs</> : null}
        </div>
        {tags.length ? (
          <div className="nd-sessioncard__tags">
            <Badge tone={location === 'remote' ? 'info' : 'neutral'} size="sm">{location}</Badge>
            {tags.map((t) => <Badge key={t} tone="neutral" size="sm">{t}</Badge>)}
          </div>
        ) : null}
      </div>
      {actions ? <div className="nd-sessioncard__actions" onClick={(e) => e.stopPropagation()}>{actions}</div> : null}
    </button>
  );
}
