import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';
import '../../../design-system/components/core/IconButton';

type IconButtonSize = 'sm' | 'md' | 'lg' | 'xl';
type IconButtonVariant = 'ghost' | 'subtle' | 'outline' | 'accent' | 'danger';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
}

const legacyVariantClasses: Record<IconButtonVariant, string> = {
  ghost:
    'border-transparent bg-transparent text-nd-text-primary/80 hover:bg-nd-surface-raised/50 hover:text-nd-text-primary',
  subtle:
    'border-nd-border-subtle bg-nd-surface-base/50 text-nd-text-primary/80 hover:border-nd-accent-primary/40 hover:bg-nd-accent-primary/10 hover:text-nd-accent-primary',
  outline:
    'border-nd-border-subtle bg-transparent text-nd-text-primary/80 hover:border-nd-accent-primary/40 hover:text-nd-accent-primary',
  accent:
    'border-nd-accent-primary/25 bg-nd-accent-primary/10 text-nd-accent-primary hover:bg-nd-accent-primary/20',
  danger:
    'border-nd-accent-error/25 bg-nd-accent-error/10 text-nd-accent-error hover:bg-nd-accent-error/20',
};

const legacySizeClasses: Record<IconButtonSize, string> = {
  sm: 'min-h-touch min-w-touch',
  md: 'min-h-touch min-w-touch',
  lg: 'min-h-11 min-w-11',
  xl: 'min-h-12 min-w-12',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    children,
    className = '',
    size = 'md',
    variant = 'subtle',
    'aria-label': ariaLabel,
    type = 'button',
    ...props
  },
  ref,
) {
  const dsVariant = variant === 'accent' ? 'primary' : variant === 'danger' ? 'danger' : 'default';
  const dsSize = size === 'xl' ? 'lg' : size;

  const cls = [
    'nd-iconbtn',
    `nd-iconbtn--${dsVariant}`,
    `nd-iconbtn--${dsSize}`,
    legacyVariantClasses[variant],
    legacySizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} type={type} aria-label={ariaLabel} className={cls} {...props}>
      {children}
      {ariaLabel ? (
        <span className="nd-iconbtn__tip" role="tooltip">
          {ariaLabel}
        </span>
      ) : null}
    </button>
  );
});
