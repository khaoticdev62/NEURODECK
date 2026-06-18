import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";
import {
  IconButton as DSIconButton,
  type IconButtonVariant as DSIconButtonVariant,
  type IconButtonSize as DSIconButtonSize,
} from "../../design-system/components/core/IconButton";

type IconButtonSize = "sm" | "md" | "lg" | "xl" | "touch";
type IconButtonVariant = "ghost" | "subtle" | "outline" | "accent" | "danger";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  /** Required: accessible label for screen readers and tooltips. */
  "aria-label": string;
}

const hitTargetClasses: Record<IconButtonSize, string> = {
  sm: "min-h-touch min-w-touch",
  md: "min-h-touch min-w-touch",
  lg: "min-h-touch min-w-touch",
  xl: "min-h-12 min-w-12",
  touch: "min-h-touch min-w-touch",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    children,
    className = "",
    size = "md",
    variant = "subtle",
    "aria-label": ariaLabel,
    type = "button",
    disabled,
    ...props
  },
  ref
) {
  const dsVariant: DSIconButtonVariant = variant === "accent" ? "primary" : variant;
  const dsSize: DSIconButtonSize = size === "xl" || size === "touch" ? "lg" : size;

  return (
    <DSIconButton
      ref={ref}
      type={type}
      label={ariaLabel}
      icon={children}
      variant={dsVariant}
      size={dsSize}
      disabled={disabled}
      aria-disabled={disabled}
      className={[hitTargetClasses[size], className].filter(Boolean).join(" ")}
      {...props}
    />
  );
});
