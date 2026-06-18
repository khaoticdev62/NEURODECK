import type { ReactNode } from "react";
import {
  Badge as DSBadge,
  type BadgeTone as DSBadgeTone,
} from "../../design-system/components/core/Badge";

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

const toneMap: Record<BadgeTone, DSBadgeTone> = {
  neutral: "neutral",
  accent: "info",
  success: "success",
  warning: "warning",
  danger: "error",
};

export function Badge({
  children,
  tone = "neutral",
  size = "sm",
  variant = "fill",
  dot = false,
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  size?: "sm" | "md";
  variant?: "fill" | "outline";
  dot?: boolean;
  className?: string;
}) {
  return (
    <DSBadge tone={toneMap[tone]} size={size} variant={variant} dot={dot} className={className}>
      {children}
    </DSBadge>
  );
}
