import { Bell, Gauge, Minus, Square, X, Zap, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Badge } from "../primitives/Badge";
import { IconButton } from "../primitives/IconButton";
import type { LocalModel } from "../../types/neurodeck";

interface TopStatusBarProps {
  modelName: string;
  models: LocalModel[];
  selectedModelId: string;
  persona: string;
  provider: string;
  latencyMs: number;
  contextUsed: number;
  onSelectModel?: (id: string) => void;
  onOpenCommandPalette?: () => void;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
}

export function TitleBar({
  modelName,
  models,
  selectedModelId,
  persona,
  provider,
  latencyMs,
  contextUsed,
  onSelectModel,
  onOpenCommandPalette,
  onOpenNotifications,
  onOpenSettings,
}: TopStatusBarProps) {
  const contextColor = contextUsed > 80 ? "danger" : contextUsed > 60 ? "warning" : "success";
  const usableModels = models.filter((m) => m.status !== "disabled" && m.status !== "missing");
  const [modelOpen, setModelOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const modelBtnRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setModelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus the active model when dropdown opens
  useEffect(() => {
    if (!modelOpen) return;
    const idx = usableModels.findIndex((m) => m.id === selectedModelId);
    const startIdx = idx >= 0 ? idx : 0;
    setFocusedIdx(startIdx);
    requestAnimationFrame(() => optionRefs.current[startIdx]?.focus());
  }, [modelOpen, usableModels, selectedModelId]);

  const handleDropdownKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (!modelOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setModelOpen(false);
        modelBtnRef.current?.focus();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIdx((prev) => {
          const next = (prev + 1) % usableModels.length;
          optionRefs.current[next]?.focus();
          return next;
        });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIdx((prev) => {
          const next = (prev - 1 + usableModels.length) % usableModels.length;
          optionRefs.current[next]?.focus();
          return next;
        });
        return;
      }
      if (e.key === "Home") {
        e.preventDefault();
        setFocusedIdx(0);
        optionRefs.current[0]?.focus();
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        const last = usableModels.length - 1;
        setFocusedIdx(last);
        optionRefs.current[last]?.focus();
      }
    },
    [modelOpen, usableModels.length]
  );

  return (
    <header
      data-controller-zone="toolbar"
      className="drag-region relative z-[var(--z-dropdown)] flex h-11 shrink-0 items-center justify-between border-b border-nd-text-muted/15 bg-nd-bg/80 px-3 backdrop-blur-xl"
      role="banner"
    >
      {/* Left: wordmark + traffic lights */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex gap-1.5 pl-1" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-nd-danger/80" />
          <span className="h-3 w-3 rounded-full bg-nd-warning/80" />
          <span className="h-3 w-3 rounded-full bg-nd-success/80" />
        </div>
        <div className="h-5 w-px bg-nd-text-muted/15" aria-hidden="true" />
        <p className="shrink-0 text-xs font-bold uppercase tracking-[0.32em] text-nd-text/90">
          NEURODECK
        </p>
      </div>

      {/* Center: live status chips */}
      <div className="no-drag hidden items-center gap-2 sm:flex" aria-label="System status">
        {/* Model switcher dropdown */}
        <div className="relative" ref={modelDropdownRef} onKeyDown={handleDropdownKey}>
          <button
            id="model-name"
            ref={modelBtnRef}
            type="button"
            onClick={() => setModelOpen((v) => !v)}
            className="flex items-center gap-1 rounded-lg border border-nd-text-muted/15 bg-nd-surface/40 px-2 py-1 text-[11px] text-nd-text-muted/80 transition hover:border-nd-accent/30 hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
            aria-label="Switch model"
            aria-haspopup="listbox"
            aria-expanded={modelOpen}
          >
            <Zap className="h-3 w-3 text-nd-accent" aria-hidden="true" />
            <span className="max-w-[140px] truncate">{modelName}</span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${modelOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
          <div
            id="agent-switcher-panel"
            role="listbox"
            aria-label="Select model"
            aria-activedescendant={focusedIdx >= 0 ? `model-option-${focusedIdx}` : undefined}
            className={`no-drag pointer-events-auto absolute left-0 top-full z-[var(--z-dropdown)] mt-1 w-56 rounded-xl border border-nd-text-muted/15 bg-nd-bg p-1 shadow-2xl shadow-black/40 ${modelOpen ? "" : "hidden"}`}
          >
            <div className="agent-switcher-header border-b border-nd-text-muted/15 px-3 py-1.5 flex items-center justify-between mb-1">
              <span className="agent-switcher-title text-[10px] font-semibold uppercase tracking-wider text-nd-text-muted flex items-center gap-1">
                <Zap className="h-3 w-3 text-nd-accent nd-icon-svg" /> select model
              </span>
              <button
                type="button"
                onClick={() => setModelOpen(false)}
                aria-label="Close model selector"
                className="agent-switcher-close rounded-lg p-1 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
              >
                <X className="h-3 w-3 nd-icon-svg" aria-hidden="true" />
              </button>
            </div>
            {usableModels.length === 0 && (
              <div
                className="px-3 py-2 text-xs text-nd-text-muted"
                role="option"
                aria-selected={false}
              >
                No usable models detected. Start a local runtime (Ollama, LM Studio, etc.) or switch
                to Offline Draft.
              </div>
            )}
            {usableModels.map((model, idx) => (
              <button
                key={model.id}
                id={`model-option-${idx}`}
                ref={(el) => {
                  optionRefs.current[idx] = el;
                }}
                type="button"
                role="option"
                aria-selected={model.id === selectedModelId}
                onClick={() => {
                  onSelectModel?.(model.id);
                  setModelOpen(false);
                  modelBtnRef.current?.focus();
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
                  model.id === selectedModelId
                    ? "bg-nd-accent/10 text-nd-accent"
                    : "text-nd-text/80 hover:bg-nd-surface/50"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{model.name}</div>
                  <div className="truncate text-[10px] text-nd-text-muted/70">
                    {model.provider} · {model.status}
                  </div>
                </div>
                {model.id === selectedModelId && (
                  <span className="ml-2 h-1.5 w-1.5 rounded-full bg-nd-accent" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        </div>

        <span className="text-nd-text-muted/30" aria-hidden="true">
          ·
        </span>
        <StatusChip label={persona} />
        <span className="text-nd-text-muted/30" aria-hidden="true">
          ·
        </span>
        <StatusChip icon={Gauge} label={`${latencyMs}ms`} />
        <span className="text-nd-text-muted/30" aria-hidden="true">
          ·
        </span>
        <span
          className="flex items-center gap-1.5 text-[11px]"
          aria-label={`Context: ${contextUsed}% used`}
        >
          <span className="text-nd-text-muted/70" aria-hidden="true">
            ctx
          </span>
          <Badge tone={contextColor} aria-hidden="true">
            {contextUsed}%
          </Badge>
        </span>
        <span className="text-nd-text-muted/30" aria-hidden="true">
          ·
        </span>
        <Badge tone={provider === "offline-draft" ? "neutral" : "success"}>
          {provider === "offline-draft" ? "offline" : provider}
        </Badge>
      </div>

      {/* Right: action buttons + window chrome */}
      <div className="no-drag flex items-center gap-1.5">
        {onOpenCommandPalette && (
          <IconButton
            id="command-palette-btn"
            aria-label="Open command palette (Ctrl K)"
            onClick={onOpenCommandPalette}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-nd-accent">
              K
            </span>
          </IconButton>
        )}
        {onOpenNotifications && (
          <IconButton id="notif-btn" aria-label="Open notifications" onClick={onOpenNotifications}>
            <Bell className="h-3.5 w-3.5" />
          </IconButton>
        )}
        {onOpenSettings && (
          <IconButton id="settings-btn" aria-label="Open settings" onClick={onOpenSettings}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-nd-text/90">
              S
            </span>
          </IconButton>
        )}
        <div className="mx-1 h-4 w-px bg-nd-text-muted/15" aria-hidden="true" />
        <IconButton
          aria-label="Minimize window"
          onClick={() => window.neurodeck?.window.minimize()}
        >
          <Minus className="h-4 w-4" />
        </IconButton>
        <IconButton
          aria-label="Maximize window"
          onClick={() => window.neurodeck?.window.maximizeToggle()}
        >
          <Square className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton
          aria-label="Close window"
          className="hover:border-nd-danger/40 hover:bg-nd-danger/10 hover:text-nd-danger"
          onClick={() => window.neurodeck?.window.close()}
        >
          <X className="h-4 w-4" />
        </IconButton>
      </div>
    </header>
  );
}

function StatusChip({ icon: Icon, label }: { icon?: typeof Zap; label: string }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-nd-text-muted/80">
      {Icon && <Icon className="h-3 w-3 text-nd-accent" aria-hidden="true" />}
      <span>{label}</span>
    </span>
  );
}
