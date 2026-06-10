export function Divider({ label, className = '' }: { label?: string; className?: string }) {
  if (label) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="h-px flex-1 bg-nd-text-muted/15" />
        <span className="text-2xs font-medium uppercase tracking-[0.18em] text-nd-text-muted/60">{label}</span>
        <div className="h-px flex-1 bg-nd-text-muted/15" />
      </div>
    );
  }
  return <div className={`h-px bg-nd-text-muted/15 ${className}`} />;
}
