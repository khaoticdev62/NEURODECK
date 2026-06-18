import { useId, Children, cloneElement, isValidElement } from "react";

export function SettingRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descId = `${baseId}-desc`;
  const controlId = `${baseId}-control`;

  const labelledChild = Children.map(children, (child) =>
    isValidElement(child) ? cloneElement(child, { id: controlId } as Record<string, unknown>) : child
  );

  return (
    <div
      className="flex min-h-touch items-center justify-between gap-4 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 px-3.5 py-3"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="h-5 w-5 shrink-0 text-nd-accent-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p id={titleId} className="font-semibold text-nd-text-primary text-sm">{title}</p>
          <p id={descId} className="text-xs text-nd-text-muted mt-0.5">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{labelledChild}</div>
    </div>
  );
}
