import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, TestTube, Package, Wand2, ScanLine, RefreshCw, AlertCircle, Puzzle } from 'lucide-react';
import type { CommandTemplate } from '../../../shared/ide/ideContracts';

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
  { id: 'run',         label: 'Run',         icon: <Play className="h-5 w-5" aria-hidden="true" />,        matches: ['run', 'execute', 'start'] },
  { id: 'test',        label: 'Test',         icon: <TestTube className="h-5 w-5" aria-hidden="true" />,    matches: ['test', 'spec', 'jest', 'pytest', 'vitest'] },
  { id: 'build',       label: 'Build',        icon: <Package className="h-5 w-5" aria-hidden="true" />,     matches: ['build', 'compile', 'bundle', 'cargo build'] },
  { id: 'format',      label: 'Format',       icon: <Wand2 className="h-5 w-5" aria-hidden="true" />,       matches: ['format', 'fmt', 'prettier', 'black', 'shfmt'] },
  { id: 'lint',        label: 'Lint',         icon: <ScanLine className="h-5 w-5" aria-hidden="true" />,    matches: ['lint', 'check', 'clippy', 'eslint', 'ruff', 'shellcheck'] },
  { id: 'refactor',    label: 'Refactor',     icon: <RefreshCw className="h-5 w-5" aria-hidden="true" />,   matches: ['typecheck', 'tsc', 'mypy', 'vet', 'go vet'] },
  { id: 'diagnostics', label: 'Diagnostics',  icon: <AlertCircle className="h-5 w-5" aria-hidden="true" />, matches: ['diagnostic', 'audit', 'analyze', 'health'] },
  { id: 'snippets',    label: 'Snippets',     icon: <Puzzle className="h-5 w-5" aria-hidden="true" />,      matches: ['snippet', 'template', 'scaffold'] },
];

const SEGMENT_ANGLES = SEGMENT_CATEGORIES.map((_, i) => -90 + i * 45);

function matchCategory(cmd: CommandTemplate): string {
  const full = [cmd.command, ...cmd.args, cmd.label, cmd.description ?? ''].join(' ').toLowerCase();
  for (const seg of SEGMENT_CATEGORIES) {
    if (seg.matches.some((m) => full.includes(m))) return seg.id;
  }
  return 'run';
}

export function RadialCommandWheel({ visible, languageId, commands, onRunCommand, onClose }: RadialCommandWheelProps) {
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [selectedCmd, setSelectedCmd] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  const segments: WheelSegment[] = SEGMENT_CATEGORIES.map((seg) => ({
    ...seg,
    commands: commands.filter((c) => matchCategory(c) === seg.id),
  }));

  const activeSegment = segments.find((s) => s.id === selectedSegment);

  // Focus trap and keyboard navigation
  useEffect(() => {
    if (!visible) return;
    wheelRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }

      if (!selectedSegment) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          const idx = segments.findIndex((s) => s.id === selectedSegment);
          setSelectedSegment(segments[(idx + 1) % segments.length].id);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          const idx = segments.findIndex((s) => s.id === selectedSegment);
          setSelectedSegment(segments[(idx - 1 + segments.length) % segments.length].id);
        } else if (e.key === 'Enter' && segments.length > 0) {
          setSelectedSegment(segments[0].id);
        }
        return;
      }

      if (e.key === 'Backspace' || e.key === 'ArrowLeft') {
        setSelectedSegment(null); return;
      }
      if (e.key === 'ArrowDown') {
        setSelectedCmd((i) => (i + 1) % (activeSegment?.commands.length ?? 1));
      } else if (e.key === 'ArrowUp') {
        setSelectedCmd((i) => (i - 1 + (activeSegment?.commands.length ?? 1)) % (activeSegment?.commands.length ?? 1));
      } else if (e.key === 'Enter' && activeSegment?.commands[selectedCmd]) {
        onRunCommand(activeSegment.commands[selectedCmd]);
      }
    };

    window.addEventListener('keydown', handleKey, { capture: true });
    return () => window.removeEventListener('keydown', handleKey, { capture: true });
  }, [visible, selectedSegment, selectedCmd, segments, activeSegment, onRunCommand, onClose]);

  const handleSegmentClick = useCallback((segId: string) => {
    setSelectedSegment(segId === selectedSegment ? null : segId);
    setSelectedCmd(0);
  }, [selectedSegment]);

  if (!visible) return null;

  const RADIUS = 110;
  const CENTER = 160;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Command wheel"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={wheelRef}
        tabIndex={-1}
        className="relative flex items-center justify-center outline-none"
        style={{ width: CENTER * 2, height: CENTER * 2 }}
      >
        {/* SVG ring */}
        <svg
          width={CENTER * 2}
          height={CENTER * 2}
          className="absolute inset-0"
          aria-hidden="true"
        >
          <circle
            cx={CENTER} cy={CENTER} r={RADIUS + 28}
            fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="56"
          />
        </svg>

        {/* Segments */}
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
              aria-label={`${seg.label} — ${seg.commands.length} command${seg.commands.length !== 1 ? 's' : ''}`}
              onClick={() => handleSegmentClick(seg.id)}
              style={{ position: 'absolute', left: x - 28, top: y - 28, width: 56, height: 56 }}
              className={`flex flex-col items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/50 ${
                isActive
                  ? 'border-nd-accent/50 bg-nd-accent/20 text-nd-accent shadow-lg shadow-nd-accent/20'
                  : hasCommands
                  ? 'border-nd-text-muted/20 bg-nd-surface/80 text-nd-text hover:border-nd-accent/30 hover:text-nd-accent'
                  : 'border-nd-text-muted/10 bg-nd-surface/40 text-nd-text-muted/40 cursor-not-allowed'
              }`}
            >
              {seg.icon}
              <span className="mt-0.5 text-[9px] leading-none">{seg.label}</span>
            </button>
          );
        })}

        {/* Center: language + instructions */}
        <div className="relative z-10 flex flex-col items-center justify-center rounded-full border border-nd-text-muted/15 bg-nd-bg text-center shadow-xl"
          style={{ width: 96, height: 96 }}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-nd-text-muted/60">
            {languageId ?? 'IDE'}
          </span>
          <span className="mt-0.5 text-[9px] text-nd-text-muted/40">
            {selectedSegment ? '← Back' : 'Select'}
          </span>
        </div>
      </div>

      {/* Command list panel */}
      {activeSegment && (
        <div className="absolute right-4 top-1/2 w-64 -translate-y-1/2 rounded-2xl border border-nd-text-muted/15 bg-nd-bg p-3 shadow-2xl">
          <div className="mb-2 flex items-center gap-2">
            {activeSegment.icon}
            <span className="font-semibold text-nd-text">{activeSegment.label}</span>
            <span className="ml-auto text-[10px] text-nd-text-muted/60">{activeSegment.commands.length} cmd</span>
          </div>
          {activeSegment.commands.length === 0 ? (
            <p className="text-xs text-nd-text-muted/50 italic">No commands available for {languageId}</p>
          ) : (
            <div className="space-y-0.5">
              {activeSegment.commands.map((cmd, i) => (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => onRunCommand(cmd)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent/40 ${
                    i === selectedCmd
                      ? 'bg-nd-accent/10 text-nd-accent'
                      : 'text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text'
                  }`}
                >
                  <span className="flex-1 truncate font-mono">{cmd.label}</span>
                  {cmd.safety !== 'safe' && (
                    <span className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold ${
                      cmd.safety === 'confirm' ? 'bg-nd-warning/10 text-nd-warning' : 'bg-nd-danger/10 text-nd-danger'
                    }`}>
                      {cmd.safety}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
