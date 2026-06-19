import type { LucideIcon } from "lucide-react";
import type { ReactNode, ComponentType } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  variant: variantProp,
  className = "",
  showBox = true,
}: {
  icon: LucideIcon | ComponentType<any>;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
  /** Visual weight. `deck` is the large, full-panel empty state for 1280×800. */
  variant?: "compact" | "default" | "deck";
  className?: string;
  showBox?: boolean;
}) {
  const variant = compact ? "compact" : variantProp ?? "default";

  const variants = {
    compact: {
      wrapper: "px-3 py-6",
      iconBox: "h-10 w-10 rounded-xl",
      icon: "h-5 w-5",
      title: "text-sm",
      desc: "max-w-[14rem] text-xs",
    },
    default: {
      wrapper: "px-4 py-12",
      iconBox: "h-14 w-14 rounded-2xl",
      icon: "h-7 w-7",
      title: "text-base",
      desc: "max-w-xs text-sm",
    },
    deck: {
      wrapper: "px-6 py-16",
      iconBox: "h-20 w-20 rounded-3xl border-2",
      icon: "h-10 w-10",
      title: "text-xl",
      desc: "max-w-md text-base",
    },
  };

  const v = variants[variant];

  return (
    <div
      className={[
        "flex flex-col items-center justify-center text-center",
        v.wrapper,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showBox ? (
        <div
          className={[
            "mb-5 flex items-center justify-center border border-nd-border-subtle shadow-panel",
            "bg-gradient-to-b from-[var(--nd-surface-secondary)] to-[var(--nd-surface-tertiary)]",
            v.iconBox,
          ].join(" ")}
        >
          <Icon
            className={`${v.icon} text-nd-accent-primary motion-reduce:transition-none`}
            aria-hidden="true"
          />
        </div>
      ) : (
        <div className="mb-5 flex items-center justify-center">
          <Icon
            className="h-16 w-16 text-nd-accent-primary motion-reduce:transition-none"
            aria-hidden="true"
          />
        </div>
      )}
      <h3 className={`${v.title} font-semibold text-nd-text-primary`}>{title}</h3>
      <p className={`${v.desc} mt-2 leading-relaxed text-nd-text-muted`}>
        {description}
      </p>
      {action && <div className={variant === "deck" ? "mt-8" : "mt-6"}>{action}</div>}
    </div>
  );
}

