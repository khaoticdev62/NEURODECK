import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FolderOpen,
  PackageCheck,
  ScanLine,
} from "lucide-react";
import { Badge } from "../../components/primitives/Badge";
import { MetricCard } from "../../components/primitives/MetricCard";
import { Panel } from "../../components/primitives/Panel";
import type { NeuroDeckAppActions, NeuroDeckState } from "../../types/neurodeck";

export function ProjectView({
  state,
  actions,
}: {
  state: NeuroDeckState;
  actions: NeuroDeckAppActions;
}) {
  const project = state.activeProject;

  if (!project) {
    return (
      <Panel
        eyebrow="Project Scanner"
        title="No Project Attached"
        className="h-full overflow-hidden"
      >
        <div className="flex h-full items-center justify-center p-6">
          <div className="max-w-xl rounded-3xl border border-nd-text-muted/15 bg-nd-surface/40 p-8 text-center">
            <FolderOpen className="mx-auto h-12 w-12 text-nd-accent" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-semibold text-nd-text">Attach a project folder</h2>
            <p className="mt-3 text-sm leading-6 text-nd-text-muted">
              NEURODECK will read top-level signals locally: package manager, scripts, frameworks,
              docs, tests, file counts, and basic release risks.
            </p>
            <button
              type="button"
              onClick={() => void actions.scanProject()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-nd-accent px-4 py-2 text-sm font-semibold text-nd-bg transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
            >
              <ScanLine className="h-4 w-4" aria-hidden="true" /> Select Folder
            </button>
          </div>
        </div>
      </Panel>
    );
  }

  const docsReady = Object.values(project.docs).filter(Boolean).length;
  const testReady = Object.values(project.testSignals).filter(Boolean).length;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={FolderOpen}
          label="Project"
          value={project.name}
          hint={project.packageManager}
        />
        <MetricCard
          icon={PackageCheck}
          label="Files"
          value={project.stats.fileCount}
          hint={`${project.stats.directoryCount} folders scanned`}
        />
        <MetricCard
          icon={ClipboardCheck}
          label="Docs"
          value={`${docsReady}/4`}
          hint="README, env, changelog, gitignore"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Risks"
          value={project.risks.length}
          hint="release blockers found"
        />
      </section>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1fr_380px]">
        <Panel eyebrow="Project Scanner" title={project.name} className="min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto p-4 scrollbar-thin">
            <div className="rounded-3xl border border-nd-accent/20 bg-nd-accent/[0.045] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge tone="accent">Scanned locally</Badge>
                  <h2 className="mt-4 text-xl font-semibold text-nd-text">{project.path}</h2>
                  <p className="mt-2 text-sm text-nd-text-muted">
                    Scanned at {new Date(project.scannedAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void actions.scanProject()}
                  className="rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  Rescan
                </button>
              </div>
            </div>

            <section className="mt-4 grid gap-4 lg:grid-cols-2">
              <InfoCard title="Detected Stack" items={project.frameworks} tone="accent" />
              <InfoCard
                title="Scripts"
                items={Object.entries(project.scripts).map(([name, value]) => `${name}: ${value}`)}
                empty="No package scripts detected."
              />
              <Checklist title="Documentation Signals" items={project.docs} />
              <Checklist
                title="Testing Signals"
                items={project.testSignals}
                readyCount={testReady}
              />
            </section>

            <section className="mt-4 grid gap-4 lg:grid-cols-2">
              <InfoCard
                title="Risks"
                items={project.risks}
                empty="No obvious risks from this lightweight scan."
                tone={project.risks.length ? "danger" : "success"}
              />
              <InfoCard
                title="Recommended Next Actions"
                items={project.recommendations}
                tone="success"
              />
            </section>
          </div>
        </Panel>

        <Panel eyebrow="Release Gate" title="What NEURODECK Thinks">
          <div className="space-y-3 p-4">
            <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-4">
              <CheckCircle2 className="h-6 w-6 text-nd-success" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-nd-text">Local scan completed</h3>
              <p className="mt-2 text-sm leading-6 text-nd-text-muted">
                This scan intentionally avoids network calls and skips heavy folders like
                node_modules, .git, dist, build, and release.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void actions.buildProjectContext()}
              className="w-full rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
            >
              Build AI context snapshot
            </button>
            <button
              type="button"
              onClick={() => void actions.exportSession()}
              className="w-full rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm font-semibold text-nd-text/80 transition hover:border-nd-accent/25 hover:text-nd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
            >
              Export project scan notes
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function InfoCard({
  title,
  items,
  empty = "Nothing detected.",
  tone = "neutral",
}: {
  title: string;
  items: string[];
  empty?: string;
  tone?: "accent" | "success" | "danger" | "neutral";
}) {
  return (
    <article className="rounded-3xl border border-nd-text-muted/15 bg-nd-surface/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-nd-text">{title}</h3>
        <Badge tone={tone}>{items.length}</Badge>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-nd-text-muted">
        {(items.length ? items : [empty]).map((item) => (
          <li
            key={item}
            className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 px-3 py-2"
          >
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}

function Checklist({ title, items }: { title: string; items: object; readyCount?: number }) {
  return (
    <article className="rounded-3xl border border-nd-text-muted/15 bg-nd-surface/40 p-4">
      <h3 className="font-semibold text-nd-text">{title}</h3>
      <div className="mt-4 space-y-2">
        {Object.entries(items).map(([label, ready]) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 px-3 py-2 text-sm"
          >
            <span className="capitalize text-nd-text-muted">
              {label.replace(/([A-Z])/g, " $1")}
            </span>
            <Badge tone={ready ? "success" : "warning"}>{ready ? "yes" : "missing"}</Badge>
          </div>
        ))}
      </div>
    </article>
  );
}
