import { Network, GitGraph, BarChart3, Share2 } from 'lucide-react';

export function GraphView() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neuro/20 bg-neuro/10">
          <Network className="h-5 w-5 text-neuro" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-50">Graph</h2>
          <p className="text-xs text-slate-500">Relationship visualizations and node graphs</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <GitGraph className="h-6 w-6 text-neuro" />
            <span className="text-xs text-slate-400">Session Graph</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <BarChart3 className="h-6 w-6 text-success" />
            <span className="text-xs text-slate-400">Model Usage</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <Share2 className="h-6 w-6 text-warning" />
            <span className="text-xs text-slate-400">Memory Links</span>
          </div>
        </div>
        <p className="max-w-sm text-sm text-slate-500">
          Graph visualization engine is being integrated from the legacy UI.
          Visualize session relationships, model usage patterns, and memory connections.
        </p>
      </div>
    </div>
  );
}
