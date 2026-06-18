import { Button } from "../../components/primitives/Button";
import { Panel } from "../../components/primitives/Panel";

interface LogEntry {
  text: string;
  tone: "info" | "ok" | "error" | "warn";
}

interface IdeOutputPanelProps {
  logs: LogEntry[];
  onClear: () => void;
}

export function IdeOutputPanel({ logs, onClear }: IdeOutputPanelProps) {
  return (
    <Panel
      className="h-28 shrink-0"
      eyebrow="Output"
      title="Command Log"
      action={
        <Button variant="ghost" size="xs" onClick={onClear}>
          Clear
        </Button>
      }
    >
      <div className="h-[calc(100%-2.5rem)] overflow-auto space-y-0.5 px-1">
        {logs.length === 0 && (
          <p className="text-[11px] text-nd-text-muted/40 italic">No output yet</p>
        )}
        {logs.map((l, i) => (
          <div
            key={i}
            className={`text-[11px] font-mono ${
              l.tone === "error"
                ? "text-nd-accent-error"
                : l.tone === "ok"
                  ? "text-nd-accent-success"
                  : l.tone === "warn"
                    ? "text-nd-accent-warning"
                    : "text-nd-text-muted"
            }`}
          >
            [{new Date().toLocaleTimeString("en-US", { hour12: false })}] {l.text}
          </div>
        ))}
      </div>
    </Panel>
  );
}
