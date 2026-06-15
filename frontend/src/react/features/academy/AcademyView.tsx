import { useState, useEffect, useCallback } from "react";
import {
  GraduationCap,
  Home,
  BookOpen,
  FlaskConical,
  FolderOpen,
  ShieldAlert,
  Database,
  ClipboardList,
  Map,
} from "lucide-react";
import { LoadingState } from "../../components/primitives/LoadingState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { TabGroup, TabList, Tab } from "../../components/primitives/Tabs";
import { AcademyHome } from "./views/AcademyHome";
import { LearningPathsView } from "./views/LearningPathsView";
import { LabBrowserView } from "./views/LabBrowserView";
import { PortfolioView } from "./views/PortfolioView";
import { LabRunnerView } from "./views/LabRunnerView";
import { SOCConsoleView } from "./views/SOCConsoleView";
import { SIEMQueryView } from "./views/SIEMQueryView";
import { PracticeExamView } from "./views/PracticeExamView";
import { CertRoadmapView } from "./views/CertRoadmapView";
import { defaultProgress } from "./types";
import { getLabById } from "./data/curricula";
import { neurodeckApi } from "../../services/bridgeAdapter";
import type { AcademyLearnerProgress } from "../../services/bridgeAdapter";
import type { AcademyTab, Lab, LearnerProgress } from "./types";

const TABS: { id: AcademyTab; label: string; icon: React.ElementType }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "paths", label: "Paths", icon: BookOpen },
  { id: "labs", label: "Labs", icon: FlaskConical },
  { id: "portfolio", label: "Portfolio", icon: FolderOpen },
  { id: "soc", label: "SOC", icon: ShieldAlert },
  { id: "query", label: "SIEM", icon: Database },
  { id: "exam", label: "Exam", icon: ClipboardList },
  { id: "roadmap", label: "Roadmap", icon: Map },
];

const PROGRESS_LS_KEY = "neurodeck_academy_progress";

export function AcademyView() {
  const [activeTab, setActiveTab] = useState<AcademyTab>("home");
  const [progress, setProgress] = useState<LearnerProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLab, setActiveLab] = useState<Lab | null>(null);

  const loadProgress = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await neurodeckApi.academy.getProgress();
      setProgress(data as LearnerProgress);
    } catch {
      try {
        const raw = localStorage.getItem(PROGRESS_LS_KEY);
        setProgress(raw ? (JSON.parse(raw) as LearnerProgress) : defaultProgress());
      } catch {
        setProgress(defaultProgress());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const saveProgress = useCallback(async (next: LearnerProgress) => {
    setProgress(next);
    try {
      await neurodeckApi.academy.saveProgress(next as AcademyLearnerProgress);
    } catch {
      localStorage.setItem(PROGRESS_LS_KEY, JSON.stringify(next));
    }
  }, []);

  const handleStartLab = useCallback((labId: string) => {
    const lab = getLabById(labId);
    if (lab) setActiveLab(lab);
  }, []);

  const handleLabComplete = useCallback(
    async (updatedProgress: LearnerProgress) => {
      await saveProgress(updatedProgress);
      // stay in runner — LabRunnerView transitions to 'saved' phase before calling back
    },
    [saveProgress]
  );

  const handleLabBack = useCallback(() => {
    setActiveLab(null);
  }, []);

  const handleNavigate = useCallback((tab: AcademyTab) => {
    setActiveTab(tab);
  }, []);

  if (loading)
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingState label="Loading Academy…" />
      </div>
    );

  if (error)
    return (
      <div className="flex h-full items-center justify-center">
        <ErrorState message={error} onRetry={loadProgress} />
      </div>
    );

  const prog = progress ?? defaultProgress();

  // Lab runner takes over the full view when active
  if (activeLab) {
    return (
      <LabRunnerView
        lab={activeLab}
        progress={prog}
        onBack={handleLabBack}
        onLabComplete={handleLabComplete}
      />
    );
  }

  const isFullBleedTab = activeTab === "soc" || activeTab === "query" || activeTab === "exam";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-nd-border-subtle bg-nd-surface-base/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
            <GraduationCap className="h-4 w-4 text-nd-accent-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-nd-text-primary">SOC Forge</h2>
            <p className="text-[11px] text-nd-text-secondary">NeuroDeck Ops Academy</p>
          </div>
        </div>

        <TabGroup
          value={activeTab}
          onChange={(v) => setActiveTab(v as AcademyTab)}
          className="mt-3"
        >
          <TabList aria-label="Academy navigation" className="overflow-x-auto scrollbar-none">
            {TABS.map(({ id, label, icon: Icon }) => (
              <Tab key={id} value={id} className="gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </Tab>
            ))}
          </TabList>
        </TabGroup>
      </header>

      <main
        id={`academy-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`academy-tab-${activeTab}`}
        className={`flex-1 ${isFullBleedTab ? "overflow-hidden" : "overflow-y-auto p-4"}`}
        tabIndex={0}
      >
        {activeTab === "home" && (
          <AcademyHome progress={prog} onNavigate={handleNavigate} onStartLab={handleStartLab} />
        )}
        {activeTab === "paths" && <LearningPathsView progress={prog} onStartLab={handleStartLab} />}
        {activeTab === "labs" && <LabBrowserView progress={prog} onStartLab={handleStartLab} />}
        {activeTab === "portfolio" && <PortfolioView />}
        {activeTab === "soc" && <SOCConsoleView progress={prog} onProgressUpdate={saveProgress} />}
        {activeTab === "query" && <SIEMQueryView />}
        {activeTab === "exam" && <PracticeExamView />}
        {activeTab === "roadmap" && <CertRoadmapView progress={prog} />}
      </main>
    </div>
  );
}
