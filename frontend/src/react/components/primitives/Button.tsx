import { type ButtonHTMLAttributes, forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:   'border-nd-accent/30 bg-nd-accent/10 text-nd-accent hover:bg-nd-accent/20 focus-visible:ring-nd-accent/50 disabled:border-nd-text-muted/15 disabled:bg-transparent disabled:text-nd-text-muted/50',
  secondary: 'border-nd-text-muted/20 bg-nd-surface text-nd-text hover:bg-nd-surface-raised focus-visible:ring-nd-accent/40',
  ghost:     'border-transparent bg-transparent text-nd-text-muted hover:bg-nd-surface-raised hover:text-nd-text focus-visible:ring-nd-accent/40',
  danger:    'border-nd-danger/30 bg-nd-danger/10 text-nd-danger hover:bg-nd-danger/20 focus-visible:ring-nd-danger/40',
  success:   'border-nd-success/30 bg-nd-success/10 text-nd-success hover:bg-nd-success/20 focus-visible:ring-nd-success/40',
};

const sizeClasses: Record<ButtonSize, string> = {
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
    ...rest
  },
  ref,
) {
  const iconEl = Icon && !loading ? (
    <Icon className={iconSizeClasses[size]} aria-hidden="true" />
  ) : null;

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        'inline-flex items-center justify-center border font-medium',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-nd-bg',
        'disabled:pointer-events-none disabled:opacity-50',
        'active:scale-[0.97]',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {loading ? (
        <svg className={`${iconSizeClasses[size]} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : null}
      {iconPosition === 'left' && iconEl}
      {children}
      {iconPosition === 'right' && iconEl}
    </button>
  );
});
