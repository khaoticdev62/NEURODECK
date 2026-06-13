import { useState, useCallback, useEffect } from 'react';
import { ShieldAlert, FolderOpen, Check, Loader2 } from 'lucide-react';
import { AlertQueuePanel } from '../components/AlertQueuePanel';
import { AlertDetailPanel } from '../components/AlertDetailPanel';
import { MOCK_ALERTS } from '../data/alerts';
import { neurodeckApi } from '../../../services/bridgeAdapter';
import type { AlertAnalysisState, AlertDisposition, LearnerProgress } from '../types';

const SOC_STORAGE_KEY = 'neurodeck_academy_soc';
const SOC_EXPORTED_KEY = 'neurodeck_academy_soc_exported';
const LOCAL_PORTFOLIO_KEY = 'neurodeck_academy_portfolio_local';

function defaultAnalysis(): AlertAnalysisState {
  return {
    mitreTags: [],
    disposition: '' as AlertDisposition | '',
    escalationNote: '',
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
    const disp = a.disposition || 'unset';
    const tags = a.mitreTags.length > 0 ? ` (${a.mitreTags.join(', ')})` : '';
    findings.push(`${alert.title} → ${disp}${tags}`);
    if (a.disposition === 'true-positive') {
      alert.correctMitreTechniques.forEach((t) => allMitre.add(t));
    }
  }

  const tpCount = MOCK_ALERTS.filter((a) => analyses[a.id]?.disposition === 'true-positive').length;
  const fpCount = MOCK_ALERTS.filter(
    (a) => analyses[a.id]?.disposition === 'false-positive' || analyses[a.id]?.disposition === 'benign'
  ).length;

  const avgScore = (() => {
    const scores = MOCK_ALERTS
      .map((a) => analyses[a.id]?.gradeResult?.score ?? 0)
      .filter((s) => s > 0);
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  })();

  return {
    labId: `soc-session-${Date.now()}`,
    labTitle: 'SOC Alert Triage Session',
    summary: `Triaged ${MOCK_ALERTS.length} security alerts (${tpCount} true positive, ${fpCount} benign/false positive). Average analysis score: ${avgScore}/100.`,
    commandsUsed: [] as string[],
    findings,
    mitreMappings: [...allMitre],
    skillsEarned: ['soc-triage'],
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

  useEffect(() => { saveToStorage(analyses); }, [analyses]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setAnalyses((prev) => {
      if (prev[id]) return prev;
      return { ...prev, [id]: defaultAnalysis() };
    });
  }, []);

  const handleChange = useCallback((id: string, next: AlertAnalysisState) => {
    setAnalyses((prev) => {
      const updated = { ...prev, [id]: next };
      const wasGraded = prev[id]?.graded ?? false;
      if (!wasGraded && next.graded && next.gradeResult) {
        const score = next.gradeResult.score;
        const cur = progress.skillScores['soc-triage'] ?? 0;
        const gain = Math.round((score / 100) * 20 * (1 - cur / 100));
        const newScore = Math.min(100, cur + gain);
        onProgressUpdate({
          ...progress,
          skillScores: { ...progress.skillScores, 'soc-triage': newScore },
          lastActive: new Date().toISOString(),
        });
      }
      return updated;
    });
  }, [progress, onProgressUpdate]);

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
      localStorage.setItem(SOC_EXPORTED_KEY, '1');
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
        <ShieldAlert className="h-4 w-4 text-nd-accent shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-nd-text-primary">SOC Alert Console</p>
          <p className="text-[10px] text-nd-text-muted/50">Triage each alert — disposition, MITRE, escalation note</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-mono font-semibold text-nd-text-primary">{gradedCount}/{totalCount}</p>
          <p className="text-[10px] text-nd-text-muted/40">analysed</p>
        </div>
      </div>

      {/* All-done banner */}
      {allDone && (
        <div className="shrink-0 border-b border-nd-success/20 bg-nd-success/10 px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-[11px] font-semibold text-nd-success">
            All {totalCount} alerts triaged. SOC Triage skill updated.
          </p>
          {exported ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-nd-success">
              <Check className="h-3.5 w-3.5" />
              Saved to Portfolio
            </span>
          ) : (
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-nd-success/30 bg-nd-success/15 px-3 py-1.5 text-[11px] font-semibold text-nd-success transition hover:bg-nd-success/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-success/40 disabled:opacity-50"
            >
              {exporting
                ? <><Loader2 className="h-3 w-3 animate-spin" />Saving…</>
                : <><FolderOpen className="h-3.5 w-3.5" />Save to Portfolio</>
              }
            </button>
          )}
        </div>
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
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-nd-text-muted/20" aria-hidden="true" />
                <p className="text-sm text-nd-text-muted/50">Select an alert from the queue</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
