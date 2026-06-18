import type { LucideIcon } from "lucide-react";
import {
  StatusChip as DSStatusChip,
  type StatusTone as DSStatusTone,
} from "../../design-system/components/core/StatusChip";

type StatusTone = "info" | "success" | "warning" | "error";

const toneMap: Record<StatusTone, DSStatusTone> = {
  info: "info",
  success: "success",
  warning: "warning",
  error: "error",
};

export function StatusChip({
  tone = "info",
  size = "md",
  icon: Icon,
  pulse = false,
  children,
  className = "",
}: {
  tone?: StatusTone;
  size?: "sm" | "md";
  icon?: LucideIcon;
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DSStatusChip
      tone={toneMap[tone]}
      size={size}
      pulse={pulse}
      icon={Icon ? <Icon aria-hidden="true" /> : undefined}
      className={className}
    >
      {children}
    </DSStatusChip>
  );
}
