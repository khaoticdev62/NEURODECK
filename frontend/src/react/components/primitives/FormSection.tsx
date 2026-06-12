import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Wraps a group of related form controls with a section heading and
 * optional description. Renders a <fieldset> when a legend is provided
 * so screen readers understand the grouping.
 */
export function FormSection({
  title,
  description,
  icon: Icon,
  children,
  className = '',
}: {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  const hasHeader = title || description || Icon;

  if (!hasHeader) {
    return (
      <div className={`space-y-3 ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <fieldset className={`space-y-3 ${className}`}>
      <legend className="flex w-full items-start gap-2 pb-2">
        {Icon && (
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-nd-accent" aria-hidden="true" />
        )}
        <div className="min-w-0">
          {title && (
            <span className="block text-sm font-semibold text-nd-text">{title}</span>
          )}
          {description && (
            <span className="block text-xs text-nd-text-muted">{description}</span>
          )}
        </div>
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * Single labeled row used inside FormSection or SettingRow patterns.
 */
export function FormRow({
  label,
  description,
  htmlFor,
  required,
  children,
}: {
  label: string;
  description?: string;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3.5 py-3">
      <div className="min-w-0">
        <label
          htmlFor={htmlFor}
          className="block cursor-pointer text-sm font-medium text-nd-text"
        >
          {label}
          {required && (
            <span className="ml-1 text-nd-warning" aria-hidden="true">*</span>
          )}
        </label>
        {description && (
          <p className="mt-0.5 text-xs text-nd-text-muted">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
