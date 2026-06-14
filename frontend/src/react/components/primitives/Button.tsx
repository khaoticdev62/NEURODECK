import { type ButtonHTMLAttributes, forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import '../../../design-system/components/core/Button';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'premium';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

const legacyVariantClasses: Record<ButtonVariant, string> = {
  primary:
    'border-nd-accent-primary/30 bg-nd-accent-primary/10 text-nd-accent-primary hover:bg-nd-accent-primary/20 focus-visible:ring-nd-accent-primary/50 disabled:border-nd-text-muted/15 disabled:bg-transparent disabled:text-nd-text-muted/50',
  secondary:
    'border-nd-border-subtle bg-nd-surface-base text-nd-text-primary hover:bg-nd-surface-raised focus-visible:ring-nd-accent-primary/40',
  ghost:
    'border-transparent bg-transparent text-nd-text-muted hover:bg-nd-surface-raised hover:text-nd-text-primary focus-visible:ring-nd-accent-primary/40',
  danger:
    'border-nd-accent-error/30 bg-nd-accent-error/10 text-nd-accent-error hover:bg-nd-accent-error/20 focus-visible:ring-nd-accent-error/40',
  success:
    'border-nd-accent-success/30 bg-nd-accent-success/10 text-nd-accent-success hover:bg-nd-accent-success/20 focus-visible:ring-nd-accent-success/40',
  premium:
    'relative overflow-hidden border-nd-accent-primary/40 bg-gradient-to-b from-nd-accent-primary/15 to-nd-accent-primary/5 text-nd-accent-primary shadow-modal-token ring-1 ring-inset ring-white/10 hover:from-nd-accent-primary/25 hover:to-nd-accent-primary/10 focus-visible:ring-nd-accent-primary/60 active:scale-95',
};

const legacySizeClasses: Record<ButtonSize, string> = {
  xs: 'h-7 gap-1 rounded-lg px-2 text-2xs',
  sm: 'h-8 gap-1.5 rounded-lg px-2.5 text-xs',
  md: 'h-10 gap-2 rounded-xl px-3.5 text-sm',
  lg: 'h-11 gap-2.5 rounded-xl px-4 text-sm font-medium',
};

const iconSizeClasses: Record<ButtonSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-4 w-4',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    fullWidth = false,
    icon: Icon,
    iconPosition = 'left',
    className = '',
    children,
    disabled,
    type = 'button',
    style,
    ...rest
  },
  ref,
) {
  const dsVariant = variant === 'premium' ? 'primary' : variant;
  const dsSize = size === 'xs' ? 'sm' : size;
  const iconEl = Icon && !loading ? <Icon className={iconSizeClasses[size]} aria-hidden="true" /> : null;

  const cls = [
    'nd-btn',
    `nd-btn--${dsVariant}`,
    `nd-btn--${dsSize}`,
    fullWidth ? 'nd-btn--fw w-full' : '',
    legacyVariantClasses[variant],
    legacySizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cls}
      style={{ pointerEvents: disabled || loading ? 'auto' : undefined, ...style }}
      {...rest}
    >
      {loading ? <span className="nd-btn__spin" aria-hidden="true" /> : null}
      {!loading && iconEl && iconPosition === 'left' ? iconEl : null}
      {children}
      {!loading && iconEl && iconPosition === 'right' ? iconEl : null}
    </button>
  );
});
