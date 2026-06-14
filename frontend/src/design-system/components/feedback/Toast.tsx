import * as React from 'react';

if (typeof document !== 'undefined' && !document.getElementById('nd-toast-css')) {
  const s = document.createElement('style');
  s.id = 'nd-toast-css';
  s.textContent = `
  .nd-toast{display:flex;align-items:flex-start;gap:10px;min-width:280px;max-width:420px;
    background:var(--nd-surface-tertiary);border:1px solid var(--nd-border-default);border-left-width:3px;
    border-radius:var(--nd-radius-md);box-shadow:var(--nd-elevation-card);padding:12px 14px;
    font-family:var(--nd-font-ui);color:var(--nd-text-primary);
    animation:nd-toast-in var(--nd-motion-normal) var(--nd-ease-out);}
  .nd-toast__glyph{font-family:var(--nd-font-mono);font-weight:700;font-size:14px;line-height:20px;flex:none;}
  .nd-toast__main{flex:1;min-width:0;}
  .nd-toast__title{font-size:13px;font-weight:600;line-height:18px;}
  .nd-toast__msg{font-size:12px;line-height:17px;color:var(--nd-text-muted);margin-top:2px;}
  .nd-toast__close{background:transparent;border:none;color:var(--nd-text-muted);cursor:pointer;
    font-size:15px;line-height:1;padding:2px;flex:none;border-radius:4px;outline:none;}
  .nd-toast__close:hover{color:var(--nd-text-primary);}
  .nd-toast__close:focus-visible{box-shadow:var(--nd-elevation-focus);}
  .nd-toast--info{border-left-color:var(--nd-accent-info);}
  .nd-toast--info .nd-toast__glyph{color:var(--nd-accent-info);}
  .nd-toast--success{border-left-color:var(--nd-accent-success);}
  .nd-toast--success .nd-toast__glyph{color:var(--nd-accent-success);}
  .nd-toast--warning{border-left-color:var(--nd-accent-warning);}
  .nd-toast--warning .nd-toast__glyph{color:var(--nd-accent-warning);}
  .nd-toast--error{border-left-color:var(--nd-accent-error);}
  .nd-toast--error .nd-toast__glyph{color:var(--nd-accent-error);}
  @keyframes nd-toast-in{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
  @media (prefers-reduced-motion: reduce){.nd-toast{animation:none;}}`;
  document.head.appendChild(s);
}

const TOAST_GLYPH = { info: '…', success: '✓', warning: '!', error: '×' };

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

/**
 * Temporary notification. Readable at Deck distance; does not steal focus unless
 * an action is required. Critical errors should never be toast-only.
 */
export interface ToastProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** @default 'info' */
  tone?: ToastTone;
  title?: React.ReactNode;
  message?: React.ReactNode;
  /** Show a dismiss button wired to this handler. */
  onClose?: () => void;
}

export function Toast({
  tone = 'info',
  title,
  message,
  onClose,
  className = '',
  ...rest
}: ToastProps): React.ReactNode {
  return (
    <div
      className={['nd-toast', `nd-toast--${tone}`, className].filter(Boolean).join(' ')}
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
      {...rest}
    >
      <span className="nd-toast__glyph" aria-hidden="true">{TOAST_GLYPH[tone]}</span>
      <div className="nd-toast__main">
        {title ? <div className="nd-toast__title">{title}</div> : null}
        {message ? <div className="nd-toast__msg">{message}</div> : null}
      </div>
      {onClose ? <button className="nd-toast__close" aria-label="Dismiss" onClick={onClose}>×</button> : null}
    </div>
  );
}
