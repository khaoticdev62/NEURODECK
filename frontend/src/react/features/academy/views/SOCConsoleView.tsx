import { useState, useCallback, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { AlertQueuePanel } from '../components/AlertQueuePanel';
import { AlertDetailPanel } from '../components/AlertDetailPanel';
import { MOCK_ALERTS } from '../data/alerts';
import type { AlertAnalysisState, AlertDisposition, LearnerProgress } from '../types';

const SOC_STORAGE_KEY = 'neurodeck_academy_soc';

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

interface SOCConsoleViewProps {
  progress: LearnerProgress;
  onProgressUpdate: (updated: LearnerProgress) => void;
}

export function SOCConsoleView({ progress, onProgressUpdate }: SOCConsoleViewProps) {
  const [analyses, setAnalyses] = useState<Record<string, AlertAnalysisState>>(loadFromStorage);
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_ALERTS[0]?.id ?? null);

  // Persist on every change
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

  const handleChange = useCallback((id: string, next: AlertAnalysisState) => {
    setAnalyses((prev) => {
      const updated = { ...prev, [id]: next };

      // When newly graded, apply skill gain to soc-triage
      const wasGraded = prev[id]?.graded ?? false;
      if (!wasGraded && next.graded && next.gradeResult) {
        const score = next.gradeResult.score;
        const cur = progress.skillScores['soc-triage'] ?? 0;
        const gain = Math.round((score / 100) * 20 * (1 - cur / 100));
        const newScore = Math.min(100, cur + gain);
        const updatedProgress: LearnerProgress = {
          ...progress,
          skillScores: { ...progress.skillScores, 'soc-triage': newScore },
          lastActive: new Date().toISOString(),
        };
        onProgressUpdate(updatedProgress);
      }

      return updated;
    });
  }, [progress, onProgressUpdate]);

  const selectedAlert = MOCK_ALERTS.find((a) => a.id === selectedId) ?? null;
  const selectedAnalysis = selectedId ? (analyses[selectedId] ?? defaultAnalysis()) : null;

  // Initialise state for first alert on mount
  useEffect(() => {
    if (MOCK_ALERTS[0] && !analyses[MOCK_ALERTS[0].id]) {
      setAnalyses((prev) => ({ ...prev, [MOCK_ALERTS[0].id]: defaultAnalysis() }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gradedCount = MOCK_ALERTS.filter((a) => analyses[a.id]?.graded).length;
  const totalCount = MOCK_ALERTS.length;
  const allDone = gradedCount === totalCount;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-nd-border-subtle px-4 py-2.5">
        <ShieldAlert className="h-4 w-4 text-nd-accent shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-nd-text-primary">SOC Alert Console</p>
          <p className="text-[10px] text-nd-text-muted/50">Triage each alert — choose a disposition, map MITRE techniques, write an escalation note</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-mono font-semibold text-nd-text-primary">{gradedCount}/{totalCount}</p>
          <p className="text-[10px] text-nd-text-muted/40">analysed</p>
        </div>
      </div>

      {/* All-done banner */}
      {allDone && (
        <div className="shrink-0 border-b border-nd-success/20 bg-nd-success/10 px-4 py-2.5">
          <p className="text-[11px] font-semibold text-nd-success">
            All alerts triaged. SOC Triage skill updated — check your Portfolio for evidence.
          </p>
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

        {/* Detail pane */}
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
