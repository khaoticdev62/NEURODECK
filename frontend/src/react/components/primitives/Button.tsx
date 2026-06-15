import { type ButtonHTMLAttributes, forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Button as DSButton,
  type ButtonVariant as DSButtonVariant,
  type ButtonSize as DSButtonSize,
} from '../../../design-system/components/core/Button';

type ButtonVariant = DSButtonVariant | 'premium' | 'soft' | 'outline';
type ButtonSize = DSButtonSize | 'xs';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

const sizeIconClasses: Record<ButtonSize, string> = {
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
  const iconNode = Icon && !loading ? <Icon className={sizeIconClasses[size]} aria-hidden="true" /> : null;

  // Map wrapper sizes to design-system sizes (xs -> sm).
  const dsSize: DSButtonSize = size === 'xs' ? 'sm' : size;
  // Premium maps to primary visually; soft/outline are rendered as custom class overlays.
  const dsVariant: DSButtonVariant =
    variant === 'premium' || variant === 'soft'
      ? 'primary'
      : variant === 'outline'
        ? 'secondary'
        : variant;

  const extraClasses = [
    variant === 'premium'
      ? 'relative overflow-hidden border-nd-accent-primary/40 bg-gradient-to-b from-nd-accent-primary/15 to-nd-accent-primary/5 text-nd-accent-primary shadow-modal-token ring-1 ring-inset ring-white/10 hover:from-nd-accent-primary/25 hover:to-nd-accent-primary/10 focus-visible:ring-nd-accent-primary/60 active:scale-95'
      : '',
    variant === 'soft'
      ? 'bg-nd-surface-secondary/60 border-nd-border-subtle text-nd-text-primary hover:bg-nd-surface-tertiary/80'
      : '',
    variant === 'outline'
      ? 'border-nd-border-subtle bg-transparent text-nd-text-primary hover:border-nd-accent-primary/35 hover:bg-nd-surface-secondary/50'
      : '',
    size === 'xs' ? 'h-7 px-2 text-2xs gap-1 rounded-lg' : '',
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <DSButton
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      variant={dsVariant}
      size={dsSize}
      loading={loading}
      disabled={disabled}
      fullWidth={fullWidth && size !== 'xs'}
      icon={iconNode}
      iconPosition={iconPosition}
      className={extraClasses || undefined}
      {...rest}
    >
      {children}
    </DSButton>
  );
});
