import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { FocusTrapContainer } from "../../../components/primitives/FocusTrapContainer";
import { IconButton } from "../../../components/primitives/IconButton";

interface BrowserOverlayProps {
  active: boolean;
  onClose: () => void;
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  role?: string;
  ariaLabel?: string;
}

export function BrowserOverlay({
  active,
  onClose,
  title,
  icon: Icon,
  children,
  className = "",
  role = "dialog",
  ariaLabel,
}: BrowserOverlayProps) {
  if (!active) return null;
  return (
    <FocusTrapContainer
      active={active}
      onEscape={onClose}
      className={`rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/95 p-4 shadow-2xl ${className}`}
      role={role}
      aria-label={ariaLabel || title}
    >
      <div className="flex items-center justify-between mb-3 border-b border-nd-border-subtle pb-2">
        <h4 className="text-sm font-semibold text-nd-text-primary flex items-center gap-1.5">
          {Icon && <Icon className="h-4 w-4 text-nd-accent-primary" aria-hidden="true" />}
          <span>{title}</span>
        </h4>
        <IconButton
          aria-label={`Close ${title.toLowerCase()}`}
          variant="ghost"
          size="sm"
          onClick={onClose}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      </div>
      {children}
    </FocusTrapContainer>
  );
}
