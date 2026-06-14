import * as React from 'react';

/* Inject scoped Button styles once (token-driven, real :hover/:focus-visible/:active). */
if (typeof document !== 'undefined' && !document.getElementById('nd-button-css')) {
  const s = document.createElement('style');
  s.id = 'nd-button-css';
  s.textContent = `
  .nd-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;
    font-family:var(--nd-font-ui);font-weight:500;border:1px solid transparent;cursor:pointer;
    border-radius:var(--nd-radius-md);transition:background var(--nd-motion-fast) var(--nd-ease-standard),
    border-color var(--nd-motion-fast) var(--nd-ease-standard),transform var(--nd-motion-fast) var(--nd-ease-standard),
    filter var(--nd-motion-fast) var(--nd-ease-standard);white-space:nowrap;outline:none;}
  .nd-btn:active{transform:scale(0.96);filter:brightness(1.1);}
  .nd-btn:focus-visible{box-shadow:var(--nd-elevation-focus);border-color:var(--nd-accent-primary);}
  .nd-btn:disabled{pointer-events:none;opacity:0.5;}
  .nd-btn--sm{height:32px;padding:0 10px;font-size:12px;border-radius:var(--nd-radius-sm);}
  .nd-btn--md{height:40px;padding:0 14px;font-size:14px;}
  .nd-btn--lg{height:44px;padding:0 18px;font-size:15px;}
  .nd-btn--fw{width:100%;}
  .nd-btn--primary{background:rgba(var(--nd-cyan-rgb),0.1);border-color:rgba(var(--nd-cyan-rgb),0.3);color:var(--nd-accent-primary);}
  .nd-btn--primary:hover{background:rgba(var(--nd-cyan-rgb),0.2);}
  .nd-btn--secondary{background:var(--nd-surface-secondary);border-color:var(--nd-border-subtle);color:var(--nd-text-primary);}
  .nd-btn--secondary:hover{background:var(--nd-surface-tertiary);}
  .nd-btn--ghost{background:transparent;border-color:transparent;color:var(--nd-text-muted);}
  .nd-btn--ghost:hover{background:var(--nd-surface-tertiary);color:var(--nd-text-primary);}
  .nd-btn--danger{background:rgba(var(--nd-red-rgb),0.1);border-color:rgba(var(--nd-red-rgb),0.3);color:var(--nd-accent-error);}
  .nd-btn--danger:hover{background:rgba(var(--nd-red-rgb),0.2);}
  .nd-btn--success{background:rgba(var(--nd-green-rgb),0.1);border-color:rgba(var(--nd-green-rgb),0.3);color:var(--nd-accent-success);}
  .nd-btn--success:hover{background:rgba(var(--nd-green-rgb),0.2);}
  .nd-btn__spin{width:14px;height:14px;border-radius:50%;border:2px solid currentColor;border-top-color:transparent;animation:nd-spin 0.6s linear infinite;}
  @keyframes nd-spin{to{transform:rotate(360deg);}}
  .nd-btn__sc{font-family:var(--nd-font-mono);font-size:11px;opacity:0.6;margin-left:4px;}
  @media (prefers-reduced-motion: reduce){.nd-btn,.nd-btn__spin{transition:none;animation:none;}}`;
  document.head.appendChild(s);
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * NEURODECK primary action button. Token-driven, controller-friendly focus ring.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual emphasis. @default 'secondary' */
  variant?: ButtonVariant;
  /** Control height. @default 'md' */
  size?: ButtonSize;
  /** Show spinner and block interaction. @default false */
  loading?: boolean;
  /** Stretch to container width. @default false */
  fullWidth?: boolean;
  /** Leading/trailing icon node (e.g. a Lucide icon element). */
  icon?: React.ReactNode;
  /** @default 'left' */
  iconPosition?: 'left' | 'right';
  /** Optional keyboard/controller shortcut label, rendered muted/mono. */
  shortcut?: string;
  children: React.ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon = null,
  iconPosition = 'left',
  shortcut,
  children,
  className = '',
  ...rest
}: ButtonProps): React.ReactNode {
  const cls = [
    'nd-btn',
    `nd-btn--${variant}`,
    `nd-btn--${size}`,
    fullWidth ? 'nd-btn--fw' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="nd-btn__spin" aria-hidden="true" /> : null}
      {!loading && icon && iconPosition === 'left' ? icon : null}
      {children}
      {!loading && icon && iconPosition === 'right' ? icon : null}
      {shortcut ? <span className="nd-btn__sc">{shortcut}</span> : null}
    </button>
  );
}
