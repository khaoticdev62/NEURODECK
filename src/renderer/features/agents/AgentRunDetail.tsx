import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  Brain,
  CheckCircle2,
  Clock,
  Database,
  List,
  Settings2,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "../../components/primitives/Badge";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { FocusTrapContainer } from "../../components/primitives/FocusTrapContainer";
import { StatusChip } from "../../components/primitives/StatusChip";
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from "../../components/primitives/Tabs";
import { listenBridge } from "../../services/bridgeAdapter";

type StepStatus = "pending" | "running" | "done" | "error";

interface AgentStep {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
  tool?: string;
  durationMs?: number;
  timestamp: string;
}

export interface AgentRun {
  runId: string;
  agentId: string;
  agentName: string;
  task: string;
  startedAt: string;
  endedAt?: string;
  status: "running" | "complete" | "error";
  inputs?: Record<string, unknown>;
  outputs?: string;
  errors?: string[];
}

interface AgentRunDetailProps {
  run: AgentRun | null;
  open: boolean;
  onClose: () => void;
}

const STEP_STATUS_BADGE: Record<StepStatus, "neutral" | "accent" | "success" | "warning" | "danger"> = {
  pending: "neutral",
  running: "accent",
  done: "success",
  error: "danger",
};

function StepIcon({ status }: { status: StepStatus }) {
  const cls = "h-3 w-3";
  if (status === "done") return <CheckCircle2 className={`${cls} text-nd-status-success`} aria-hidden />;
  if (status === "error") return <AlertCircle className={`${cls} text-nd-status-error`} aria-hidden />;
  if (status === "running") return <Activity className={`${cls} animate-pulse text-nd-accent-primary`} aria-hidden />;
  return <Clock className={`${cls} text-nd-text-muted`} aria-hidden />;
}

export function AgentRunDetail({ run, open, onClose }: AgentRunDetailProps) {
  const [activeTab, setActiveTab] = useState("timeline");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !run) return;
    setSteps([]);
    setExpandedSteps(new Set());

    const unsub = listenBridge("agent:step", (payload: unknown) => {
      const evt = payload as { run_id?: string; step?: AgentStep };
      if (evt.run_id !== run.runId || !evt.step) return;
      setSteps((prev) => {
        const idx = prev.findIndex((s) => s.id === evt.step!.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = evt.step!;
          return next;
        }
        return [...prev, evt.step!];
      });
    });
    return () => {
      unsub?.();
    };
  }, [open, run]);

  const toggleStep = (id: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!open || !run) return null;

  const runTone: "success" | "error" | "info" =
    run.status === "complete" ? "success" : run.status === "error" ? "error" : "info";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <div
        className="absolute inset-0 bg-nd-bg/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <FocusTrapContainer active={open}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Agent Run: ${run.agentName}`}
          className="relative z-10 flex h-full w-full max-w-[640px] flex-col border-l border-nd-border-subtle bg-nd-surface-secondary/90 shadow-2xl backdrop-blur"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-nd-border-subtle p-5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-nd-text-muted">
                  Agent Run
                </p>
                <StatusChip tone={runTone} size="sm">
                  {run.status.toUpperCase()}
                </StatusChip>
              </div>
              <h2 className="mt-1 text-lg font-black text-nd-text-primary">{run.agentName}</h2>
              <p className="mt-0.5 line-clamp-2 text-sm text-nd-text-muted">{run.task}</p>
              <p className="mt-1 text-xs text-nd-text-muted">
                Started {new Date(run.startedAt).toLocaleTimeString()}
                {run.endedAt && ` · Ended ${new Date(run.endedAt).toLocaleTimeString()}`}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={X}
              onClick={onClose}
              aria-label="Close run detail"
            />
          </div>

          {/* Tabs */}
          <TabGroup
            value={activeTab}
            onChange={setActiveTab}
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabList className="border-b border-nd-border-subtle px-5 scrollbar-none overflow-x-auto">
              <Tab value="timeline">
                <List className="h-3.5 w-3.5" aria-hidden />
                Timeline
              </Tab>
              <Tab value="inputs">
                <Brain className="h-3.5 w-3.5" aria-hidden />
                Inputs
              </Tab>
              <Tab value="outputs">
                <Zap className="h-3.5 w-3.5" aria-hidden />
                Outputs
              </Tab>
              <Tab value="tools">
                <Settings2 className="h-3.5 w-3.5" aria-hidden />
                Tools
              </Tab>
              <Tab value="memory">
                <Database className="h-3.5 w-3.5" aria-hidden />
                Memory
              </Tab>
              <Tab value="errors">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                Errors
                {run.errors && run.errors.length > 0 && (
                  <Badge tone="danger" className="ml-1">
                    {run.errors.length}
                  </Badge>
                )}
              </Tab>
            </TabList>

            <TabPanels className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
              {/* Timeline */}
              <TabPanel value="timeline" className="p-4">
                {steps.length === 0 ? (
                  <EmptyState
                    icon={Activity}
                    title={run.status === "running" ? "Waiting for steps…" : "No steps recorded"}
                    description={
                      run.status === "running"
                        ? "Agent steps will appear here in real time via the agent:step event."
                        : "This run produced no step events."
                    }
                  />
                ) : (
                  <ol
                    className="relative space-y-3 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-nd-border-subtle"
                    aria-label="Run timeline"
                  >
                    {steps.map((step) => {
                      const isExpanded = expandedSteps.has(step.id);
                      return (
                        <li key={step.id} className="relative pl-10">
                          <span className="absolute left-2 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-nd-border-subtle bg-nd-surface-secondary">
                            <StepIcon status={step.status} />
                          </span>
                          <button
                            onClick={() => toggleStep(step.id)}
                            aria-expanded={isExpanded}
                            className="w-full text-left"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-nd-text-primary">
                                {step.label}
                              </span>
                              <div className="flex shrink-0 items-center gap-2">
                                {step.tool && <Badge tone="neutral">{step.tool}</Badge>}
                                <Badge tone={STEP_STATUS_BADGE[step.status]}>{step.status}</Badge>
                                {step.durationMs != null && (
                                  <span className="text-xs text-nd-text-muted">
                                    {step.durationMs}ms
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-nd-text-muted">{step.timestamp}</p>
                          </button>
                          {isExpanded && step.detail && (
                            <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-nd-border-subtle bg-nd-surface-secondary/40 p-3 font-mono text-xs text-nd-text-secondary">
                              {step.detail}
                            </pre>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </TabPanel>

              {/* Inputs */}
              <TabPanel value="inputs" className="p-4">
                {run.inputs && Object.keys(run.inputs).length > 0 ? (
                  <pre className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4 font-mono text-xs text-nd-text-secondary">
                    {JSON.stringify(run.inputs, null, 2)}
                  </pre>
                ) : (
                  <EmptyState
                    icon={Brain}
                    title="No inputs recorded"
                    description="Input payload will appear here when the run produces structured inputs."
                  />
                )}
              </TabPanel>

              {/* Outputs */}
              <TabPanel value="outputs" className="p-4">
                {run.outputs ? (
                  <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4">
                    <pre className="whitespace-pre-wrap font-mono text-sm text-nd-text-primary">
                      {run.outputs}
                    </pre>
                  </div>
                ) : (
                  <EmptyState
                    icon={Zap}
                    title="No outputs yet"
                    description={
                      run.status === "running"
                        ? "Outputs will appear when the agent completes its task."
                        : "This run produced no output."
                    }
                  />
                )}
              </TabPanel>

              {/* Tools */}
              <TabPanel value="tools" className="p-4">
                {steps.filter((s) => s.tool).length === 0 ? (
                  <EmptyState
                    icon={Settings2}
                    title="No tool calls"
                    description="Tool invocations will appear here as the agent runs."
                  />
                ) : (
                  <ul className="space-y-2" role="list">
                    {steps
                      .filter((s) => s.tool)
                      .map((s) => (
                        <li
                          key={s.id}
                          className="flex items-center justify-between rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/20 px-4 py-3"
                        >
                          <div>
                            <p className="font-medium text-nd-text-primary">{s.label}</p>
                            <p className="text-xs text-nd-text-muted">{s.timestamp}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge tone="neutral">{s.tool}</Badge>
                            <Badge tone={STEP_STATUS_BADGE[s.status]}>{s.status}</Badge>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </TabPanel>

              {/* Memory */}
              <TabPanel value="memory" className="p-4">
                <EmptyState
                  icon={Database}
                  title="No memory events"
                  description="Facts written or read during this run will appear here."
                />
              </TabPanel>

              {/* Errors */}
              <TabPanel value="errors" className="p-4">
                {!run.errors || run.errors.length === 0 ? (
                  <EmptyState
                    icon={AlertCircle}
                    title="No errors"
                    description="If the agent encountered errors, they will appear here."
                  />
                ) : (
                  <ul className="space-y-2" role="list" aria-label="Run errors">
                    {run.errors.map((err, i) => (
                      <li
                        key={i}
                        className="rounded-xl border border-nd-status-error/30 bg-nd-status-error/5 p-3 text-sm text-nd-status-error"
                        role="listitem"
                      >
                        {err}
                      </li>
                    ))}
                  </ul>
                )}
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>
      </FocusTrapContainer>
    </div>
  );
}
