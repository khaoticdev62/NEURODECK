export function ViewLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-nd-accent/30 border-t-nd-accent"
          aria-hidden="true"
        />
        <p className="text-2xs text-nd-text-muted">Loading view…</p>
      </div>
    </div>
  );
}
