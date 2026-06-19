export function ViewLoader() {
  return (
    <div className="animate-panel-enter flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="animate-spin"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            strokeOpacity="0.2"
            className="text-nd-accent-primary"
          />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-nd-accent-primary"
          />
        </svg>
        <p className="text-2xs text-nd-text-muted">Loading view…</p>
      </div>
    </div>
  );
}
