import * as React from "react";
import { FocusTrap } from "../../../focus-trap.js";

if (typeof document !== "undefined" && !document.getElementById("nd-modal-css")) {
  const s = document.createElement("style");
  s.id = "nd-modal-css";
  s.textContent = `
  .nd-modal__overlay{position:fixed;inset:0;background:var(--nd-surface-overlay);backdrop-filter:blur(2px);
    display:flex;align-items:center;justify-content:center;padding:24px;z-index:var(--nd-z-modal,9990);
    animation:nd-modal-fade var(--nd-motion-normal) var(--nd-ease-out);}
  .nd-modal{background:var(--nd-surface-tertiary);border:1px solid var(--nd-border-default);
    border-radius:var(--nd-radius-xl);box-shadow:var(--nd-elevation-overlay);width:100%;
    max-height:700px;display:flex;flex-direction:column;font-family:var(--nd-font-ui);color:var(--nd-text-primary);
    animation:nd-modal-rise var(--nd-motion-normal) var(--nd-ease-out);overflow:hidden;}
  .nd-modal--sm{max-width:360px;}
  .nd-modal--md{max-width:460px;}
  .nd-modal--lg{max-width:600px;}
  .nd-modal--xl{max-width:720px;}
  .nd-modal__desc{font-size:12px;line-height:17px;color:var(--nd-text-muted);margin-top:2px;}
  .nd-modal--critical{border-color:rgba(var(--nd-red-rgb),0.4);box-shadow:var(--nd-elevation-overlay),0 0 40px rgba(var(--nd-red-rgb),0.12);}
  .nd-modal__head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 20px 12px;}
  .nd-modal__title{font-size:18px;font-weight:700;line-height:24px;margin:0;}
  .nd-modal__close{background:transparent;border:none;color:var(--nd-text-muted);cursor:pointer;font-size:18px;
    line-height:1;padding:4px;border-radius:var(--nd-radius-sm);outline:none;}
  .nd-modal__close:hover{color:var(--nd-text-primary);background:var(--nd-surface-secondary);}
  .nd-modal__close:focus-visible{box-shadow:var(--nd-elevation-focus);}
  .nd-modal__body{padding:0 20px 18px;font-size:14px;line-height:21px;color:var(--nd-text-secondary);overflow:auto;}
  .nd-modal__foot{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:14px 20px;
    border-top:1px solid var(--nd-border-subtle);background:var(--nd-surface-secondary);}
  @keyframes nd-modal-fade{from{opacity:0;}to{opacity:1;}}
  @keyframes nd-modal-rise{from{opacity:0;transform:translateY(10px) scale(0.96);}to{opacity:1;transform:none;}}
  @media (prefers-reduced-motion: reduce){.nd-modal,.nd-modal__overlay{animation:none;}}`;
  document.head.appendChild(s);
}

/**
 * Focus-trapping overlay for critical decisions. B / Escape closes when
 * cancellable. Fits within Deck safe area.
 */
export type ModalSize = "sm" | "md" | "lg" | "xl";

export interface ModalProps {
  /** Mount + show the modal. */
  open: boolean;
  /** Close handler (Escape, backdrop, close button). */
  onClose?: () => void;
  title?: React.ReactNode;
  /** Small descriptive text rendered below the title. */
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Right-aligned footer actions (Buttons). */
  footer?: React.ReactNode;
  /** 'critical' adds a red glow for destructive/security dialogs. @default 'default' */
  emphasis?: "default" | "critical";
  /** Show close affordance + allow Escape/backdrop dismiss. @default true */
  closable?: boolean;
  /** Allow clicking the backdrop to close. Independent of closable/Escape. @default true */
  closeOnBackdrop?: boolean;
  /** Trap focus inside the dialog while open. @default true */
  trap?: boolean;
  /** Dialog max-width. @default 'md' */
  size?: ModalSize;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  emphasis = "default",
  closable = true,
  closeOnBackdrop = true,
  trap = true,
  size = "md",
  className = "",
}: ModalProps): React.ReactNode {
  const ref = React.useRef<HTMLDivElement>(null);
  const trapRef = React.useRef<FocusTrap | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closable && onClose) {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    if (trap && ref.current) {
      trapRef.current = new FocusTrap(ref.current);
      trapRef.current.activate();
    }
    return () => {
      document.removeEventListener("keydown", onKey, true);
      trapRef.current?.deactivate();
      trapRef.current = null;
    };
  }, [open, closable, trap, onClose]);

  if (!open) return null;
  return (
    <div
      className="nd-modal__overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && closeOnBackdrop && closable && onClose) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "nd-modal-title" : undefined}
        aria-describedby={description ? "nd-modal-desc" : undefined}
        tabIndex={-1}
        className={[
          "nd-modal",
          `nd-modal--${size}`,
          emphasis === "critical" ? "nd-modal--critical" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {title || closable ? (
          <div className="nd-modal__head">
            <div>
              {title ? (
                <h2 id="nd-modal-title" className="nd-modal__title">
                  {title}
                </h2>
              ) : (
                <span />
              )}
              {description ? (
                <p id="nd-modal-desc" className="nd-modal__desc">
                  {description}
                </p>
              ) : null}
            </div>
            {closable ? (
              <button className="nd-modal__close" aria-label="Close dialog" onClick={onClose}>
                ×
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="nd-modal__body">{children}</div>
        {footer ? <div className="nd-modal__foot">{footer}</div> : null}
      </div>
    </div>
  );
}
