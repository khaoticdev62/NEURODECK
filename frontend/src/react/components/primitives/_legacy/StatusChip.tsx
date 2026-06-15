import type { LucideIcon } from "lucide-react";

type StatusTone = "info" | "success" | "warning" | "error";
type StatusSize = "sm" | "md";

const toneClasses: Record<StatusTone, string> = {
  info: "border-nd-accent-info/30 bg-nd-accent-info/10 text-nd-accent-info",
  success: "border-nd-accent-success/30 bg-nd-accent-success/10 text-nd-accent-success",
  warning: "border-nd-accent-warning/30 bg-nd-accent-warning/10 text-nd-accent-warning",
  error: "border-nd-accent-error/30 bg-nd-accent-error/10 text-nd-accent-error",
};

const sizeClasses: Record<StatusSize, string> = {
  sm: "h-5 gap-1 px-1.5 text-2xs",
  md: "h-6 gap-1.5 px-2 text-xs",
};

const dotClasses: Record<StatusTone, string> = {
  info: "bg-nd-accent-info",
  success: "bg-nd-accent-success",
  warning: "bg-nd-accent-warning",
  error: "bg-nd-accent-error",
};

export function StatusChip({
  tone = "info",
  size = "md",
  icon: Icon,
  pulse = false,
  children,
}: {
  tone?: StatusTone;
  size?: StatusSize;
  icon?: LucideIcon;
  pulse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border font-medium",
        toneClasses[tone],
        sizeClasses[size],
      ].join(" ")}
    >
      {Icon ? (
        <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden="true" />
      ) : (
        <span
          className={[
            "rounded-full",
            size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
            pulse ? "animate-pulse" : "",
            dotClasses[tone],
          ].join(" ")}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
