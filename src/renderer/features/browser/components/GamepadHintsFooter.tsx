export function GamepadHintsFooter() {
  return (
    <div className="flex items-center justify-between border-t border-nd-border-subtle bg-nd-surface-secondary/30 px-4 py-2 text-[10px] font-semibold text-nd-text-muted shrink-0">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <span className="rounded border border-nd-border-subtle bg-nd-surface-secondary px-1.5 py-0.5 font-mono text-[9px]">
            L2
          </span>{" "}
          Navigate Back
        </span>
        <span className="flex items-center gap-1">
          <span className="rounded border border-nd-border-subtle bg-nd-surface-secondary px-1.5 py-0.5 font-mono text-[9px]">
            R2
          </span>{" "}
          Navigate Forward
        </span>
        <span className="flex items-center gap-1">
          <span className="rounded border border-nd-border-subtle bg-nd-surface-secondary px-1.5 py-0.5 font-mono text-[9px]">
            Y
          </span>{" "}
          Focus Address Bar
        </span>
        <span className="flex items-center gap-1">
          <span className="rounded border border-nd-border-subtle bg-nd-surface-secondary px-1.5 py-0.5 font-mono text-[9px]">
            X
          </span>{" "}
          Toggle Tab Strip
        </span>
      </div>
      <div>
        <span>NeuroBrowse Guest sandboxed isolation partition</span>
      </div>
    </div>
  );
}
