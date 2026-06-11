import { Network, GitGraph, BarChart3, Share2 } from 'lucide-react';

export function GraphView() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <Network className="h-5 w-5 text-nd-accent" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-nd-text">Graph</h2>
          <p className="text-xs text-nd-text-muted">Relationship visualizations and node graphs</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-8 text-center">
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-nd-text-muted/15 bg-nd-surface/50 p-4">
            <GitGraph className="h-6 w-6 text-nd-accent" />
            <span className="text-xs text-nd-text-muted">Session Graph</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-nd-text-muted/15 bg-nd-surface/50 p-4">
            <BarChart3 className="h-6 w-6 text-nd-success" />
            <span className="text-xs text-nd-text-muted">Model Usage</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-nd-text-muted/15 bg-nd-surface/50 p-4">
            <Share2 className="h-6 w-6 text-nd-warning" />
            <span className="text-xs text-nd-text-muted">Memory Links</span>
          </div>
        </div>
        <p className="max-w-sm text-sm text-nd-text-muted">
          Graph visualization engine is being integrated from the legacy UI.
          Visualize session relationships, model usage patterns, and memory connections.
        </p>
      </div>
    </div>
  );
}
