export function Divider({ label, className = '' }: { label?: string; className?: string }) {
  if (label) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="h-px flex-1 bg-nd-border-subtle" />
        <span className="text-2xs font-medium uppercase tracking-[0.18em] text-nd-text-muted">{label}</span>
        <div className="h-px flex-1 bg-nd-border-subtle" />
      </div>
    );
  }
  return <div className={`h-px bg-nd-border-subtle ${className}`} />;
}
