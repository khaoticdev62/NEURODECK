import { useState } from 'react';
import { Layers, Play, Square, Plus, Trash2 } from 'lucide-react';

interface WorkflowNode {
  id: string;
  type: 'start' | 'llm' | 'agent' | 'condition' | 'action' | 'end';
  label: string;
  x: number;
  y: number;
}

const DEMO_NODES: WorkflowNode[] = [
  { id: '1', type: 'start', label: 'Start', x: 100, y: 50 },
  { id: '2', type: 'llm', label: 'Analyze Prompt', x: 100, y: 150 },
  { id: '3', type: 'condition', label: 'Need Research?', x: 100, y: 250 },
  { id: '4', type: 'agent', label: 'Research Agent', x: 50, y: 350 },
  { id: '5', type: 'action', label: 'Generate Output', x: 150, y: 350 },
  { id: '6', type: 'end', label: 'End', x: 100, y: 450 },
];

export function OrchestratorView() {
  const [running, setRunning] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <Layers className="h-5 w-5 text-nd-accent" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-nd-text">Orchestrator</h2>
          <p className="text-xs text-nd-text-muted">Visual workflow automation builder</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setRunning(!running)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${running ? 'border-nd-danger/30 bg-nd-danger/10 text-nd-danger' : 'border-nd-success/30 bg-nd-success/10 text-nd-success'}`}>
            {running ? <><Square className="h-4 w-4" aria-hidden="true" /> Stop</> : <><Play className="h-4 w-4" aria-hidden="true" /> Run</>}
          </button>
          <button type="button" aria-label="Add workflow node" className="rounded-xl border border-nd-text-muted/15 px-3 py-2 text-sm text-nd-text-muted hover:bg-nd-surface/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40">
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30">
        <svg className="h-full w-full" viewBox="0 0 300 550">
          {/* Connections */}
          <line x1="100" y1="80" x2="100" y2="120" stroke="rgba(141,161,179,0.2)" strokeWidth="2" />
          <line x1="100" y1="180" x2="100" y2="220" stroke="rgba(141,161,179,0.2)" strokeWidth="2" />
          <line x1="100" y1="280" x2="70" y2="320" stroke="rgba(141,161,179,0.2)" strokeWidth="2" />
          <line x1="100" y1="280" x2="170" y2="320" stroke="rgba(141,161,179,0.2)" strokeWidth="2" />
          <line x1="70" y1="380" x2="100" y2="420" stroke="rgba(141,161,179,0.2)" strokeWidth="2" />
          <line x1="170" y1="380" x2="100" y2="420" stroke="rgba(141,161,179,0.2)" strokeWidth="2" />

          {/* Nodes */}
          {DEMO_NODES.map((node) => (
            <g key={node.id} transform={`translate(${node.x - 60}, ${node.y - 20})`}>
              <rect
                width="120"
                height="40"
                rx="8"
                fill={node.type === 'start' || node.type === 'end' ? 'rgba(94,235,255,0.1)' : 'rgba(255,255,255,0.04)'}
                stroke={node.type === 'start' || node.type === 'end' ? 'rgba(94,235,255,0.3)' : 'rgba(255,255,255,0.1)'}
                strokeWidth="1"
              />
              <text x="60" y="25" textAnchor="middle" fill="#9CA3AF" fontSize="12">{node.label}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
