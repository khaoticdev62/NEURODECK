import { useState, useCallback, useEffect } from "react";
import { ShieldAlert, FolderOpen, Check, Loader2 } from "lucide-react";
import { Button } from "../../../components/primitives/Button";
import { EmptyState } from "../../../components/primitives/EmptyState";
import { Panel } from "../../../components/primitives/Panel";
import { AlertQueuePanel } from "../components/AlertQueuePanel";
import { AlertDetailPanel } from "../components/AlertDetailPanel";
import { MOCK_ALERTS } from "../data/alerts";
import { neurodeckApi } from "../../../services/bridgeAdapter";
import type { AlertAnalysisState, AlertDisposition, LearnerProgress } from "../types";

const SOC_STORAGE_KEY = "neurodeck_academy_soc";
const SOC_EXPORTED_KEY = "neurodeck_academy_soc_exported";
const LOCAL_PORTFOLIO_KEY = "neurodeck_academy_portfolio_local";

function defaultAnalysis(): AlertAnalysisState {
  return {
    mitreTags: [],
    disposition: "" as AlertDisposition | "",
    escalationNote: "",
    graded: false,
  };
}

function loadFromStorage(): Record<string, AlertAnalysisState> {
  try {
    const raw = localStorage.getItem(SOC_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, AlertAnalysisState>;
  } catch {
    // ignore
  }
  return {};
}

function saveToStorage(analyses: Record<string, AlertAnalysisState>) {
  try {
    localStorage.setItem(SOC_STORAGE_KEY, JSON.stringify(analyses));
  } catch {
    // ignore
  }
}

function buildPortfolioEntry(analyses: Record<string, AlertAnalysisState>) {
  const findings: string[] = [];
  const allMitre = new Set<string>();

  for (const alert of MOCK_ALERTS) {
    const a = analyses[alert.id];
    if (!a?.graded) continue;
    const disp = a.disposition || "unset";
    const tags = a.mitreTags.length > 0 ? ` (${a.mitreTags.join(", ")})` : "";
    findings.push(`${alert.title} → ${disp}${tags}`);
    if (a.disposition === "true-positive") {
      alert.correctMitreTechniques.forEach((t) => allMitre.add(t));
    }
  }

  const tpCount = MOCK_ALERTS.filter((a) => analyses[a.id]?.disposition === "true-positive").length;
  const fpCount = MOCK_ALERTS.filter(
    (a) =>
      analyses[a.id]?.disposition === "false-positive" || analyses[a.id]?.disposition === "benign"
  ).length;

  const avgScore = (() => {
    const scores = MOCK_ALERTS.map((a) => analyses[a.id]?.gradeResult?.score ?? 0).filter(
      (s) => s > 0
    );
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  })();

  return {
    labId: `soc-session-${Date.now()}`,
    labTitle: "SOC Alert Triage Session",
    summary: `Triaged ${MOCK_ALERTS.length} security alerts (${tpCount} true positive, ${fpCount} benign/false positive). Average analysis score: ${avgScore}/100.`,
    commandsUsed: [] as string[],
    findings,
    mitreMappings: [...allMitre],
    skillsEarned: ["soc-triage"],
    timestamp: new Date().toISOString(),
  };
}

interface SOCConsoleViewProps {
  progress: LearnerProgress;
  onProgressUpdate: (updated: LearnerProgress) => void;
}

export function SOCConsoleView({ progress, onProgressUpdate }: SOCConsoleViewProps) {
  const [analyses, setAnalyses] = useState<Record<string, AlertAnalysisState>>(loadFromStorage);
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_ALERTS[0]?.id ?? null);
  const [exported, setExported] = useState(() => !!localStorage.getItem(SOC_EXPORTED_KEY));
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    saveToStorage(analyses);
  }, [analyses]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setAnalyses((prev) => {
      if (prev[id]) return prev;
      return { ...prev, [id]: defaultAnalysis() };
    });
  }, []);

  const handleChange = useCallback(
    (id: string, next: AlertAnalysisState) => {
      setAnalyses((prev) => {
        const updated = { ...prev, [id]: next };
        const wasGraded = prev[id]?.graded ?? false;
        if (!wasGraded && next.graded && next.gradeResult) {
          const score = next.gradeResult.score;
          const cur = progress.skillScores["soc-triage"] ?? 0;
          const gain = Math.round((score / 100) * 20 * (1 - cur / 100));
          const newScore = Math.min(100, cur + gain);
          onProgressUpdate({
            ...progress,
            skillScores: { ...progress.skillScores, "soc-triage": newScore },
            lastActive: new Date().toISOString(),
          });
        }
        return updated;
      });
    },
    [progress, onProgressUpdate]
  );

  const handleExport = useCallback(async () => {
    if (exporting || exported) return;
    setExporting(true);
    const entry = buildPortfolioEntry(analyses);
    try {
      await neurodeckApi.academy.savePortfolioEntry(entry);
    } catch {
      // Persist locally when bridge is unavailable
      try {
        const raw = localStorage.getItem(LOCAL_PORTFOLIO_KEY);
        const existing = raw ? (JSON.parse(raw) as object[]) : [];
        const withId = { ...entry, id: `local-${Date.now()}` };
        localStorage.setItem(LOCAL_PORTFOLIO_KEY, JSON.stringify([withId, ...existing]));
      } catch {
        // best-effort
      }
    } finally {
      setExporting(false);
      setExported(true);
      localStorage.setItem(SOC_EXPORTED_KEY, "1");
    }
  }, [analyses, exporting, exported]);

  const selectedAlert = MOCK_ALERTS.find((a) => a.id === selectedId) ?? null;
  const selectedAnalysis = selectedId ? (analyses[selectedId] ?? defaultAnalysis()) : null;

  const gradedCount = MOCK_ALERTS.filter((a) => analyses[a.id]?.graded).length;
  const totalCount = MOCK_ALERTS.length;
  const allDone = gradedCount === totalCount;

  // Init first alert analysis on mount
  useEffect(() => {
    if (MOCK_ALERTS[0] && !analyses[MOCK_ALERTS[0].id]) {
      setAnalyses((prev) => ({ ...prev, [MOCK_ALERTS[0].id]: defaultAnalysis() }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-nd-border-subtle px-4 py-2.5">
        <ShieldAlert className="h-4 w-4 shrink-0 text-nd-accent-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-nd-text-primary">SOC Alert Console</p>
          <p className="text-[10px] text-nd-text-muted/60">
            Triage each alert — disposition, MITRE, escalation note
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-xs font-semibold text-nd-text-primary">
            {gradedCount}/{totalCount}
          </p>
          <p className="text-[10px] text-nd-text-muted/50">analysed</p>
        </div>
      </div>

      {/* All-done banner */}
      {allDone && (
        <Panel
          variant="surface"
          className="shrink-0 rounded-none border-x-0 border-b border-t-0 border-nd-accent-success/20 bg-nd-accent-success/10"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2.5">
            <p className="text-[11px] font-semibold text-nd-accent-success">
              All {totalCount} alerts triaged. SOC Triage skill updated.
            </p>
            {exported ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-nd-accent-success">
                <Check className="h-3.5 w-3.5" />
                Saved to Portfolio
              </span>
            ) : (
              <Button
                size="xs"
                variant="soft"
                icon={exporting ? Loader2 : FolderOpen}
                loading={exporting}
                onClick={handleExport}
              >
                Save to Portfolio
              </Button>
            )}
          </div>
        </Panel>
      )}

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden">
        <AlertQueuePanel
          alerts={MOCK_ALERTS}
          selectedId={selectedId}
          analyses={analyses}
          onSelect={handleSelect}
        />

        <main className="flex-1 overflow-hidden">
          {selectedAlert && selectedAnalysis ? (
            <AlertDetailPanel
              key={selectedAlert.id}
              alert={selectedAlert}
              state={selectedAnalysis}
              onChange={(next) => handleChange(selectedAlert.id, next)}
            />
          ) : (
            <EmptyState
              icon={ShieldAlert}
              title="Select an alert"
              description="Choose an alert from the queue to begin triage."
              compact
            />
          )}
        </main>
      </div>
    </div>
  );
}
