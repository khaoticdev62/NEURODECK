import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  TestTube,
  Package,
  Wand2,
  ScanLine,
  RefreshCw,
  AlertCircle,
  Puzzle,
} from "lucide-react";
import { Badge } from "../../components/primitives/Badge";
import { Button } from "../../components/primitives/Button";
import type { CommandTemplate } from "../../shared/ide/ideContracts";

interface WheelSegment {
  id: string;
  label: string;
  icon: React.ReactNode;
  commands: CommandTemplate[];
}

interface RadialCommandWheelProps {
  visible: boolean;
  languageId: string | null;
  commands: CommandTemplate[];
  onRunCommand: (cmd: CommandTemplate) => void;
  onClose: () => void;
}

const SEGMENT_CATEGORIES = [
  {
    id: "run",
    label: "Run",
    icon: <Play className="h-5 w-5" aria-hidden="true" />,
    matches: ["run", "execute", "start"],
  },
  {
    id: "test",
    label: "Test",
    icon: <TestTube className="h-5 w-5" aria-hidden="true" />,
    matches: ["test", "spec", "jest", "pytest", "vitest"],
  },
  {
    id: "build",
    label: "Build",
    icon: <Package className="h-5 w-5" aria-hidden="true" />,
    matches: ["build", "compile", "bundle", "cargo build"],
  },
  {
    id: "format",
    label: "Format",
    icon: <Wand2 className="h-5 w-5" aria-hidden="true" />,
    matches: ["format", "fmt", "prettier", "black", "shfmt"],
  },
  {
    id: "lint",
    label: "Lint",
    icon: <ScanLine className="h-5 w-5" aria-hidden="true" />,
    matches: ["lint", "check", "clippy", "eslint", "ruff", "shellcheck"],
  },
  {
    id: "refactor",
    label: "Refactor",
    icon: <RefreshCw className="h-5 w-5" aria-hidden="true" />,
    matches: ["typecheck", "tsc", "mypy", "vet", "go vet"],
  },
  {
    id: "diagnostics",
    label: "Diagnostics",
    icon: <AlertCircle className="h-5 w-5" aria-hidden="true" />,
    matches: ["diagnostic", "audit", "analyze", "health"],
  },
  {
    id: "snippets",
    label: "Snippets",
    icon: <Puzzle className="h-5 w-5" aria-hidden="true" />,
    matches: ["snippet", "template", "scaffold"],
  },
];

const SEGMENT_ANGLES = SEGMENT_CATEGORIES.map((_, i) => -90 + i * 45);

function matchCategory(cmd: CommandTemplate): string {
  const full = [cmd.command, ...cmd.args, cmd.label, cmd.description ?? ""].join(" ").toLowerCase();
  for (const seg of SEGMENT_CATEGORIES) {
    if (seg.matches.some((m) => full.includes(m))) return seg.id;
  }
  return "run";
}

export function RadialCommandWheel({
  visible,
  languageId,
  commands,
  onRunCommand,
  onClose,
}: RadialCommandWheelProps) {
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [selectedCmd, setSelectedCmd] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  const segments: WheelSegment[] = SEGMENT_CATEGORIES.map((seg) => ({
    ...seg,
    commands: commands.filter((c) => matchCategory(c) === seg.id),
  }));

  const activeSegment = segments.find((s) => s.id === selectedSegment);

  useEffect(() => {
    if (!visible) return;
    wheelRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (!selectedSegment) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          const idx = segments.findIndex((s) => s.id === selectedSegment);
          setSelectedSegment(segments[(idx + 1) % segments.length].id);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          const idx = segments.findIndex((s) => s.id === selectedSegment);
          setSelectedSegment(segments[(idx - 1 + segments.length) % segments.length].id);
        } else if (e.key === "Enter" && segments.length > 0) {
          setSelectedSegment(segments[0].id);
        }
        return;
      }

      if (e.key === "Backspace" || e.key === "ArrowLeft") {
        setSelectedSegment(null);
        return;
      }
      if (e.key === "ArrowDown") {
        setSelectedCmd((i) => (i + 1) % (activeSegment?.commands.length ?? 1));
      } else if (e.key === "ArrowUp") {
        setSelectedCmd(
          (i) =>
            (i - 1 + (activeSegment?.commands.length ?? 1)) % (activeSegment?.commands.length ?? 1)
        );
      } else if (e.key === "Enter" && activeSegment?.commands[selectedCmd]) {
        onRunCommand(activeSegment.commands[selectedCmd]);
      }
    };

    window.addEventListener("keydown", handleKey, { capture: true });
    return () => window.removeEventListener("keydown", handleKey, { capture: true });
  }, [visible, selectedSegment, selectedCmd, segments, activeSegment, onRunCommand, onClose]);

  const handleSegmentClick = useCallback(
    (segId: string) => {
      setSelectedSegment(segId === selectedSegment ? null : segId);
      setSelectedCmd(0);
    },
    [selectedSegment]
  );

  if (!visible) return null;

  const RADIUS = 110;
  const CENTER = 160;

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-surface-overlay/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Command wheel"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={wheelRef}
        tabIndex={-1}
        className="relative flex items-center justify-center outline-none"
        style={{ width: CENTER * 2, height: CENTER * 2 }}
      >
        <svg width={CENTER * 2} height={CENTER * 2} className="absolute inset-0" aria-hidden="true">
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS + 28}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="56"
          />
        </svg>

        {segments.map((seg, i) => {
          const angle = SEGMENT_ANGLES[i]!;
          const rad = (angle * Math.PI) / 180;
          const x = CENTER + RADIUS * Math.cos(rad);
          const y = CENTER + RADIUS * Math.sin(rad);
          const isActive = selectedSegment === seg.id;
          const hasCommands = seg.commands.length > 0;

          return (
            <button
              key={seg.id}
              type="button"
              aria-pressed={isActive}
              aria-label={`${seg.label} — ${seg.commands.length} command${seg.commands.length !== 1 ? "s" : ""}`}
              onClick={() => handleSegmentClick(seg.id)}
              style={{ position: "absolute", left: x - 28, top: y - 28, width: 56, height: 56 }}
              className={`flex flex-col items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 ${
                isActive
                  ? "border-accent-primary/50 bg-accent-primary/20 text-accent-primary shadow-lg shadow-accent-primary/20"
                  : hasCommands
                    ? "border-border-subtle bg-surface-secondary/80 text-text-primary hover:border-accent-primary/30 hover:text-accent-primary"
                    : "border-border-subtle/50 bg-surface-secondary/40 text-text-muted/40 cursor-not-allowed"
              }`}
            >
              {seg.icon}
              <span className="mt-0.5 text-[9px] leading-none">{seg.label}</span>
            </button>
          );
        })}

        <div
          className="relative z-10 flex flex-col items-center justify-center rounded-full border border-border-subtle bg-surface-app text-center shadow-xl"
          style={{ width: 96, height: 96 }}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted/60">
            {languageId ?? "IDE"}
          </span>
          <span className="mt-0.5 text-[9px] text-text-muted/40">
            {selectedSegment ? "← Back" : "Select"}
          </span>
        </div>
      </div>

      {activeSegment && (
        <div className="absolute right-4 top-1/2 w-64 -translate-y-1/2 rounded-2xl border border-border-subtle bg-surface-primary p-3 shadow-overlay">
          <div className="mb-2 flex items-center gap-2">
            {activeSegment.icon}
            <span className="font-semibold text-text-primary">{activeSegment.label}</span>
            <span className="ml-auto text-[10px] text-text-muted">
              {activeSegment.commands.length} cmd
            </span>
          </div>
          {activeSegment.commands.length === 0 ? (
            <p className="text-xs text-text-muted/60 italic">
              No commands available for {languageId}
            </p>
          ) : (
            <div className="space-y-0.5">
              {activeSegment.commands.map((cmd, i) => (
                <Button
                  key={cmd.id}
                  variant="ghost"
                  size="xs"
                  fullWidth
                  className={`justify-start ${i === selectedCmd ? "bg-accent-primary/10 text-accent-primary" : ""}`}
                  onClick={() => onRunCommand(cmd)}
                >
                  <span className="flex-1 truncate font-mono">{cmd.label}</span>
                  {cmd.safety !== "safe" && (
                    <Badge
                      tone={cmd.safety === "confirm" ? "warning" : "danger"}
                      variant="outline"
                      size="sm"
                    >
                      {cmd.safety}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
