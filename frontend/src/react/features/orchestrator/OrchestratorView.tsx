import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layers, Play, Square, Plus, Trash2, Upload, Download, AlertTriangle, CheckCircle2, TerminalSquare } from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';
import { listenBridge } from '../../services/bridgeAdapter';
import type { WorkflowDoc, WorkflowSummary } from '../../services/bridgeAdapter';
import { Button } from '../../components/primitives/Button';
import { EmptyState } from '../../components/primitives/EmptyState';
import { IconButton } from '../../components/primitives/IconButton';
import { Modal } from '../../components/primitives/Modal';

type LayoutNode = {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
};

type RunState =
  | { status: 'idle' }
  | { status: 'running'; nodeId?: string }
  | { status: 'error'; message: string }
  | { status: 'complete'; outputs: Record<string, string>; finalOutput?: string };

const NODE_COLORS: Record<string, { fill: string; stroke: string }> = {
  trigger: {
    fill: 'color-mix(in srgb, var(--nd-accent-primary) 12%, transparent)',
    stroke: 'color-mix(in srgb, var(--nd-accent-primary) 42%, transparent)',
  },
  prompt: {
    fill: 'color-mix(in srgb, var(--nd-accent-tertiary) 12%, transparent)',
    stroke: 'color-mix(in srgb, var(--nd-accent-tertiary) 42%, transparent)',
  },
  shell: {
    fill: 'color-mix(in srgb, var(--nd-accent-warning) 12%, transparent)',
    stroke: 'color-mix(in srgb, var(--nd-accent-warning) 42%, transparent)',
  },
  condition: {
    fill: 'color-mix(in srgb, var(--nd-accent-success) 12%, transparent)',
    stroke: 'color-mix(in srgb, var(--nd-accent-success) 42%, transparent)',
  },
  output: {
    fill: 'color-mix(in srgb, var(--nd-accent-primary) 12%, transparent)',
    stroke: 'color-mix(in srgb, var(--nd-accent-primary) 42%, transparent)',
  },
  default: {
    fill: 'color-mix(in srgb, var(--nd-text-muted) 8%, transparent)',
    stroke: 'color-mix(in srgb, var(--nd-text-muted) 20%, transparent)',
  },
};

const SAMPLE_WORKFLOW: WorkflowDoc = {
  name: 'sample-greet',
  nodes: [
    { id: 'start', type: 'trigger', config: { seed: 'world' } },
    { id: 'greet', type: 'prompt', config: { prompt: 'Say a short greeting to {{input}}.' } },
    { id: 'done', type: 'output', config: {} },
  ],
  edges: [
    { id: 'e1', from: 'start', fromPort: 'out', to: 'greet' },
    { id: 'e2', from: 'greet', fromPort: 'out', to: 'done' },
  ],
};

function computeLayout(doc: WorkflowDoc): LayoutNode[] {
  const inDegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  for (const node of doc.nodes) {
    inDegree.set(node.id, 0);
    outgoing.set(node.id, []);
  }
  for (const edge of doc.edges) {
    if (inDegree.has(edge.to)) {
      inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    }
    if (outgoing.has(edge.from)) {
      outgoing.get(edge.from)!.push(edge.to);
    }
  }

  const depth = new Map<string, number>();
  const queue = Array.from(inDegree.entries())
    .filter(([, d]) => d === 0)
    .map(([id]) => id);
  queue.forEach((id) => depth.set(id, 0));

  const visited = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    visited.add(id);
    for (const next of outgoing.get(id) ?? []) {
      depth.set(next, Math.max(depth.get(next) ?? 0, (depth.get(id) ?? 0) + 1));
      const remaining = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, remaining);
      if (remaining === 0) queue.push(next);
    }
  }

  // Handle cycles / disconnected nodes by giving them depth 0
  for (const node of doc.nodes) {
    if (!depth.has(node.id)) depth.set(node.id, 0);
  }

  const byDepth = new Map<number, string[]>();
  for (const [id, d] of depth.entries()) {
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(id);
  }

  const nodeMap = new Map(doc.nodes.map((n) => [n.id, n]));
  const colWidth = 180;
  const rowHeight = 80;
  const positions: LayoutNode[] = [];
  for (const [d, ids] of byDepth.entries()) {
    ids.forEach((id, index) => {
      const node = nodeMap.get(id);
      positions.push({
        id,
        type: node?.type ?? 'unknown',
        label: (node?.config?.label as string) ?? node?.type ?? id,
        x: d * colWidth + 80,
        y: index * rowHeight + 60,
      });
    });
  }
  return positions;
}

function getNodeStyle(type: string) {
  return NODE_COLORS[type] ?? NODE_COLORS.default;
}

export function OrchestratorView() {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [doc, setDoc] = useState<WorkflowDoc | null>(null);
  const [editorText, setEditorText] = useState('');
  const [editorError, setEditorError] = useState<string | null>(null);
  const [runState, setRunState] = useState<RunState>({ status: 'idle' });
  const [logs, setLogs] = useState<string[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const importTextareaRef = useRef<HTMLTextAreaElement>(null);

  const layout = useMemo(() => (doc ? computeLayout(doc) : []), [doc]);
  const activeNodeId = runState.status === 'running' ? runState.nodeId : undefined;

  const loadList = useCallback(async () => {
    try {
      const list = await neurodeckApi.workflow.list();
      setWorkflows(list);
      if (list.length > 0 && !selectedName) {
        setSelectedName(list[0].name);
      }
    } catch (e) {
      setLogs((prev) => [...prev, `Failed to load workflows: ${String(e)}`]);
    }
  }, [selectedName]);

  const loadWorkflow = useCallback(async (name: string) => {
    try {
      const loaded = await neurodeckApi.workflow.load(name);
      setDoc(loaded);
      setEditorText(JSON.stringify(loaded, null, 2));
      setEditorError(null);
    } catch (e) {
      setLogs((prev) => [...prev, `Failed to load ${name}: ${String(e)}`]);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedName) void loadWorkflow(selectedName);
  }, [selectedName, loadWorkflow]);

  useEffect(() => {
    const unsubStart = listenBridge('workflow_started', (payload) => {
      const data = payload as { name?: string };
      setRunState({ status: 'running' });
      setLogs((prev) => [...prev, `Started workflow: ${data.name ?? 'unknown'}`]);
    });
    const unsubNode = listenBridge('workflow_node_start', (payload) => {
      const data = payload as { node_id?: string; node_type?: string };
      setRunState({ status: 'running', nodeId: data.node_id });
      setLogs((prev) => [...prev, `Running node ${data.node_id ?? '?'} (${data.node_type ?? '?'})`]);
    });
    const unsubError = listenBridge('workflow_error', (payload) => {
      const data = payload as { node_id?: string; error?: string };
      setRunState({ status: 'error', message: data.error ?? 'Workflow failed' });
      setLogs((prev) => [...prev, `Error at ${data.node_id ?? '?'}: ${data.error ?? ''}`]);
    });
    const unsubComplete = listenBridge('workflow_complete', (payload) => {
      const data = payload as { workflow_name?: string; success?: boolean; outputs?: Record<string, string>; final_output?: string };
      if (data.success) {
        setRunState({ status: 'complete', outputs: data.outputs ?? {}, finalOutput: data.final_output });
      } else {
        setRunState({ status: 'error', message: 'Workflow completed with errors' });
      }
      setLogs((prev) => [...prev, `Completed workflow: ${data.workflow_name ?? 'unknown'}`]);
    });
    return () => {
      unsubStart();
      unsubNode();
      unsubError();
      unsubComplete();
    };
  }, []);

  const handleSave = async () => {
    if (!doc) return;
    try {
      const parsed = JSON.parse(editorText) as WorkflowDoc;
      await neurodeckApi.workflow.save(parsed.name, parsed);
      setDoc(parsed);
      setEditorError(null);
      setLogs((prev) => [...prev, `Saved workflow: ${parsed.name}`]);
      if (parsed.name !== selectedName) {
        setSelectedName(parsed.name);
      }
      void loadList();
    } catch (e) {
      setEditorError(String(e));
    }
  };

  const handleRun = async () => {
    if (!doc) return;
    setRunState({ status: 'running' });
    setLogs((prev) => [...prev, `Triggering workflow: ${doc.name}`]);
    try {
      await neurodeckApi.workflow.run(doc.name);
    } catch (e) {
      setRunState({ status: 'error', message: String(e) });
      setLogs((prev) => [...prev, `Run failed: ${String(e)}`]);
    }
  };

  const handleStop = () => {
    setRunState({ status: 'idle' });
    setLogs((prev) => [...prev, 'Run state reset locally (backend execution continues).']);
  };

  const handleDelete = async (name: string) => {
    try {
      await neurodeckApi.workflow.delete(name);
      setLogs((prev) => [...prev, `Deleted workflow: ${name}`]);
      if (selectedName === name) {
        setSelectedName(null);
        setDoc(null);
        setEditorText('');
      }
      void loadList();
    } catch (e) {
      setLogs((prev) => [...prev, `Delete failed: ${String(e)}`]);
    }
  };

  const handleCreateSample = async () => {
    try {
      await neurodeckApi.workflow.save(SAMPLE_WORKFLOW.name, SAMPLE_WORKFLOW);
      setLogs((prev) => [...prev, `Created sample workflow: ${SAMPLE_WORKFLOW.name}`]);
      void loadList().then(() => setSelectedName(SAMPLE_WORKFLOW.name));
    } catch (e) {
      setLogs((prev) => [...prev, `Create failed: ${String(e)}`]);
    }
  };

  const handleImport = () => {
    setImportJson('');
    setImportModalOpen(true);
    setTimeout(() => importTextareaRef.current?.focus(), 50);
  };

  const confirmImport = async () => {
    if (!importJson.trim()) return;
    setImportModalOpen(false);
    try {
      const res = await neurodeckApi.workflow.importJson(importJson.trim());
      setLogs((prev) => [...prev, `Imported workflow: ${res.name}`]);
      setImportJson('');
      void loadList().then(() => setSelectedName(res.name));
    } catch (e) {
      setLogs((prev) => [...prev, `Import failed: ${String(e)}`]);
    }
  };

  const handleExport = async () => {
    if (!selectedName) return;
    try {
      const res = await neurodeckApi.workflow.export(selectedName);
      await navigator.clipboard.writeText(res.ndwf);
      setLogs((prev) => [...prev, `Exported ${res.name} to clipboard`]);
    } catch (e) {
      setLogs((prev) => [...prev, `Export failed: ${String(e)}`]);
    }
  };

  const running = runState.status === 'running';

  return (
    <div data-testid="orchestrator-view" className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent-primary/20 bg-nd-accent-primary/10">
          <Layers className="h-5 w-5 text-nd-accent-primary" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-nd-text-primary">Orchestrator</h2>
          <p className="text-xs text-nd-text-muted">Visual workflow automation builder</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={running ? 'danger' : 'primary'}
            size="sm"
            icon={running ? Square : Play}
            disabled={!doc}
            onClick={running ? handleStop : handleRun}
          >
            {running ? 'Stop' : 'Run'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={Plus}
            onClick={() => void handleCreateSample()}
          >
            Sample
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={Upload}
            onClick={handleImport}
          >
            Import
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={Download}
            disabled={!selectedName}
            onClick={() => void handleExport()}
          >
            Export
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[220px_1fr_320px]">
        {/* Workflow list */}
        <section className="flex min-h-0 flex-col gap-3 overflow-hidden rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-nd-text-muted">Workflows</div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {workflows.length === 0 ? (
              <EmptyState
                compact
                icon={Layers}
                title="No workflows yet"
                description="Create a sample or import workflow JSON."
              />
            ) : (
              workflows.map((wf) => (
                <div
                  key={wf.name}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${selectedName === wf.name ? 'border-nd-accent-primary/30 bg-nd-accent-primary/[0.08]' : 'border-nd-text-muted/15 bg-nd-surface/40'}`}
                >
                  <Button
                    variant="ghost"
                    size="xs"
                    className="min-w-0 flex-1 truncate !justify-start text-left text-xs"
                    onClick={() => setSelectedName(wf.name)}
                  >
                    {wf.name}
                  </Button>
                  <IconButton
                    aria-label={`Delete ${wf.name}`}
                    variant="danger"
                    size="sm"
                    onClick={() => void handleDelete(wf.name)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Graph preview */}
        <section className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30">
          {doc ? (
            <div className="h-full w-full overflow-auto p-4">
              <svg
                role="img"
                aria-label={doc ? `Workflow graph for ${doc.name}` : 'Workflow graph'}
                className="min-h-[20rem] min-w-[20rem]"
                viewBox={`0 0 ${Math.max(300, layout.length ? Math.max(...layout.map((n) => n.x)) + 140 : 300)} ${Math.max(300, layout.length ? Math.max(...layout.map((n) => n.y)) + 80 : 300)}`}
              >
                {doc.edges.map((edge) => {
                  const from = layout.find((n) => n.id === edge.from);
                  const to = layout.find((n) => n.id === edge.to);
                  if (!from || !to) return null;
                  return (
                    <line
                      key={edge.id}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      style={{ stroke: 'color-mix(in srgb, var(--nd-text-muted) 25%, transparent)' }}
                      strokeWidth="2"
                    />
                  );
                })}
                {layout.map((node) => {
                  const style = getNodeStyle(node.type);
                  const isActive = activeNodeId === node.id;
                  return (
                    <g key={node.id} transform={`translate(${node.x - 60}, ${node.y - 20})`}>
                      <rect
                        width="120"
                        height="40"
                        rx="8"
                        fill={style.fill}
                        style={{ stroke: isActive ? 'var(--nd-accent-primary)' : style.stroke }}
                        strokeWidth={isActive ? 3 : 1}
                        className={isActive ? 'animate-pulse' : ''}
                      />
                      <text x="60" y="17" textAnchor="middle" style={{ fill: 'var(--nd-text-primary)' }} fontSize="10" fontWeight="500">
                        {node.type}
                      </text>
                      <text x="60" y="30" textAnchor="middle" style={{ fill: 'var(--nd-text-muted)' }} fontSize="9">
                        {node.label.length > 16 ? `${node.label.slice(0, 16)}…` : node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            <EmptyState
              className="h-full"
              icon={Layers}
              title="No workflow selected"
              description="Select an existing workflow, create a sample, or import workflow JSON to preview the graph."
            />
          )}
          {runState.status === 'error' && (
            <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-nd-accent-error/25 bg-nd-accent-error/10 p-3 text-xs text-nd-accent-error">
              <AlertTriangle className="mr-2 inline h-4 w-4" aria-hidden="true" />
              {runState.message}
            </div>
          )}
          {runState.status === 'complete' && (
            <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-nd-accent-success/25 bg-nd-accent-success/10 p-3 text-xs text-nd-accent-success">
              <CheckCircle2 className="mr-2 inline h-4 w-4" aria-hidden="true" />
              Workflow completed. {runState.finalOutput ? `Output: ${runState.finalOutput}` : ''}
            </div>
          )}
        </section>

        {/* Editor + logs */}
        <section className="flex min-h-0 flex-col gap-3 overflow-hidden rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-nd-text-muted">Workflow JSON</div>
          <textarea
            value={editorText}
            onChange={(e) => setEditorText(e.target.value)}
            disabled={!doc}
            className="min-h-0 flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-bg/60 p-3 font-mono text-xs text-nd-text-primary outline-none focus:border-nd-accent-primary/40 disabled:opacity-50"
            spellCheck={false}
          />
          {editorError && (
            <div className="rounded-xl border border-nd-accent-error/25 bg-nd-accent-error/10 px-3 py-2 text-xs text-nd-accent-error">
              {editorError}
            </div>
          )}
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            disabled={!doc}
            onClick={() => void handleSave()}
          >
            Save Workflow
          </Button>

          <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-nd-text-muted/15 bg-nd-bg/40 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-nd-text-muted">
              <TerminalSquare className="h-3.5 w-3.5" aria-hidden="true" /> Run Log
            </div>
            <div className="h-full space-y-1 overflow-y-auto text-[11px] text-nd-text-muted">
              {logs.length === 0 ? (
                <EmptyState
                  compact
                  icon={TerminalSquare}
                  title="No run activity"
                  description="Run, save, import, or delete a workflow to populate this log."
                />
              ) : (
                logs.slice(-50).map((line, i) => <div key={i}>{line}</div>)
              )}
            </div>
          </div>
        </section>
      </div>

      <Modal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Import Workflow JSON"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setImportModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => void confirmImport()} disabled={!importJson.trim()}>Import</Button>
          </>
        }
      >
        <label htmlFor="workflow-import-json" className="mb-1.5 block text-xs font-medium text-nd-text-muted">
          Paste workflow JSON below
        </label>
        <textarea
          id="workflow-import-json"
          ref={importTextareaRef}
          value={importJson}
          onChange={(e) => setImportJson(e.target.value)}
          rows={10}
          placeholder='{ "name": "my-workflow", "steps": [...], "edges": [...] }'
          className="w-full resize-y rounded-xl border border-nd-text-muted/15 bg-nd-bg/50 px-3 py-2 font-mono text-xs text-nd-text-primary outline-none focus:border-nd-accent-primary/40 focus-visible:ring-1 focus-visible:ring-nd-accent-primary/40"
        />
      </Modal>
    </div>
  );
}
