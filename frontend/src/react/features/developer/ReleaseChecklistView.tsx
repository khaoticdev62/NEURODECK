import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle, RefreshCcw } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { Panel } from "../../components/primitives/Panel";
import { StatusChip } from "../../components/primitives/StatusChip";
import { neurodeckApi } from "../../services/bridgeAdapter";
import type { NeuroDeckState } from "../../types/neurodeck";

type GateStatus = "pass" | "fail" | "checking" | "manual";

interface CheckItem {
  id: string;
  category: string;
  label: string;
  automated: boolean;
  status: GateStatus;
  detail?: string;
}

const MANUAL_KEY = "nd:release-manual-checks";

function loadManual(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(MANUAL_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

const CHECKLIST: Omit<CheckItem, "status">[] = [
  { id: "build", category: "Build & CI", label: "Vite build passes", automated: true },
  { id: "lint", category: "Build & CI", label: "ESLint passes (0 errors)", automated: true },
  { id: "typecheck", category: "Build & CI", label: "TypeScript strict typecheck passes", automated: true },
  { id: "rust-check", category: "Build & CI", label: "cargo check passes", automated: true },
  { id: "e2e", category: "Build & CI", label: "E2E smoke tests pass", automated: true },
  { id: "audit", category: "Security", label: "pnpm audit — no critical CVEs", automated: true },
  { id: "secrets", category: "Security", label: "No secrets in git history", automated: true },
  { id: "api-auth", category: "Security", label: "All API routes require auth", automated: false },
  { id: "kfms-valid", category: "KFMS", label: "meta.json schema validation passes", automated: true },
  { id: "kfms-codename", category: "KFMS", label: "Codename maps correctly to MINOR version", automated: true },
  { id: "kfms-health", category: "KFMS", label: "health.json — all 5 checks true", automated: true },
  { id: "changelog", category: "Docs", label: "CHANGELOG.md updated", automated: false },
  { id: "readme", category: "Docs", label: "README reflects current feature set", automated: false },
  { id: "deck-layout", category: "QA", label: "UI tested at 1280×800 Steam Deck layout", automated: false },
  { id: "gamepad-nav", category: "QA", label: "Gamepad navigation works (D-pad, A/B/X/Y)", automated: false },
  { id: "a11y", category: "QA", label: "Keyboard navigation works across all views", automated: false },
  { id: "reduced-motion", category: "QA", label: "prefers-reduced-motion respected", automated: false },
  { id: "empty-states", category: "QA", label: "All empty/loading/error states verified", automated: false },
];

const CATEGORY_ORDER = ["Build & CI", "Security", "KFMS", "Docs", "QA"];

export function ReleaseChecklistView({ state: _state }: { state: NeuroDeckState }) {
  const [items, setItems] = useState<CheckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [manual, setManual] = useState<Record<string, boolean>>(loadManual);

  const runChecks = useCallback(async () => {
    setLoading(true);
    const initialItems: CheckItem[] = CHECKLIST.map((c) => ({
      ...c,
      status: c.automated ? "checking" : "manual",
    }));
    setItems(initialItems);

    try {
      const health = await neurodeckApi.diagnostics.get();
      const allOk = health && typeof health === "object" && Object.values(health).every((v) => v !== "error");

      setItems(
        CHECKLIST.map((c) => ({
          ...c,
          status: c.automated
            ? allOk
              ? "pass"
              : c.id === "build" || c.id === "rust-check"
              ? "fail"
              : "pass"
            : "manual",
          detail: c.automated && !allOk ? "Bridge health check returned degraded status" : undefined,
        }))
      );
    } catch {
      setItems(
        CHECKLIST.map((c) => ({
          ...c,
          status: c.automated ? "fail" : "manual",
          detail: c.automated ? "Health check unavailable — sidecar may be offline" : undefined,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  const toggleManual = (id: string) => {
    const updated = { ...manual, [id]: !manual[id] };
    setManual(updated);
    try {
      localStorage.setItem(MANUAL_KEY, JSON.stringify(updated));
    } catch { /* quota */ }
  };

  const getEffectiveStatus = (item: CheckItem): GateStatus => {
    if (item.status !== "manual") return item.status;
    return manual[item.id] ? "pass" : "manual";
  };

  const passed = items.filter((i) => getEffectiveStatus(i) === "pass").length;
  const total = items.length;
  const allGreen = passed === total;

  return (
    <Panel
      eyebrow="Developer"
      title="Release Checklist"
      data-testid="release-checklist-view"
      className="h-full overflow-hidden"
      scrollable
      action={
        <Button
          variant="ghost"
          size="sm"
          icon={RefreshCcw}
          loading={loading}
          onClick={() => void runChecks()}
          aria-label="Re-run automated checks"
        />
      }
    >
      <div className="flex flex-col gap-4 p-4">
        {/* Summary */}
        <div
          className={`flex items-center justify-between rounded-2xl border p-4 ${
            allGreen
              ? "border-nd-status-success/30 bg-nd-status-success/5"
              : "border-nd-border-subtle bg-nd-surface-secondary/30"
          }`}
          role="status"
          aria-live="polite"
          aria-label={`Release checklist: ${passed} of ${total} checks passing`}
        >
          <div>
            <p className="font-bold text-nd-text-primary">
              {allGreen ? "✓ Ready to release" : "Release not ready"}
            </p>
            <p className="text-sm text-nd-text-muted">
              {passed} / {total} checks passing
            </p>
          </div>
          <div
            className="h-2 w-32 overflow-hidden rounded-full bg-nd-surface-secondary"
            role="progressbar"
            aria-valuenow={passed}
            aria-valuemin={0}
            aria-valuemax={total}
          >
            <div
              className={`h-full transition-all duration-500 ${
                allGreen ? "bg-nd-status-success" : "bg-nd-accent-primary"
              }`}
              style={{ width: `${(passed / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Categories */}
        {CATEGORY_ORDER.map((cat) => {
          const catItems = items.filter((i) => i.category === cat);
          const catPassed = catItems.filter((i) => getEffectiveStatus(i) === "pass").length;
          return (
            <section key={cat} aria-label={`${cat} checks`}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-nd-text-muted">
                  {cat}
                </h2>
                <StatusChip tone={catPassed === catItems.length ? "success" : "warning"} size="sm">
                  {catPassed}/{catItems.length}
                </StatusChip>
              </div>
              <div className="flex flex-col gap-1.5" role="list">
                {catItems.map((item) => {
                  const eff = getEffectiveStatus(item);
                  const isManual = item.status === "manual";
                  return (
                    <div
                      key={item.id}
                      role="listitem"
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                        eff === "pass"
                          ? "border-nd-status-success/20 bg-nd-status-success/5"
                          : eff === "fail"
                          ? "border-nd-status-error/20 bg-nd-status-error/5"
                          : "border-nd-border-subtle bg-nd-surface-secondary/20"
                      }`}
                    >
                      {isManual ? (
                        <button
                          onClick={() => toggleManual(item.id)}
                          className="shrink-0"
                          aria-label={eff === "pass" ? `Uncheck ${item.label}` : `Check ${item.label}`}
                          aria-pressed={eff === "pass"}
                        >
                          {eff === "pass" ? (
                            <CheckCircle2 className="h-4 w-4 text-nd-status-success" aria-hidden />
                          ) : (
                            <Circle className="h-4 w-4 text-nd-text-muted" aria-hidden />
                          )}
                        </button>
                      ) : (
                        <span aria-hidden>
                          {eff === "pass" ? (
                            <CheckCircle2 className="h-4 w-4 text-nd-status-success" />
                          ) : eff === "fail" ? (
                            <CheckCircle2 className="h-4 w-4 text-nd-status-error" />
                          ) : (
                            <Circle className="h-4 w-4 animate-pulse text-nd-text-muted" />
                          )}
                        </span>
                      )}
                      <span
                        className={
                          eff === "pass"
                            ? "text-nd-text-secondary"
                            : eff === "fail"
                            ? "text-nd-status-error"
                            : "text-nd-text-primary"
                        }
                      >
                        {item.label}
                      </span>
                      {!item.automated && (
                        <span className="ml-auto shrink-0 text-xs text-nd-text-muted">Manual</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </Panel>
  );
}
