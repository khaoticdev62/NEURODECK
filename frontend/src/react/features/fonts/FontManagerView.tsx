import type { Dispatch } from 'react';
import { useMemo, useState } from 'react';
import { Type, Search, Check, X } from 'lucide-react';
import { fontOptions } from '../../types/seed';
import type { FontCategory, NeuroDeckAction, NeuroDeckState } from '../../types/neurodeck';

const SAMPLE_TEXT = 'NEURODECK v6 — Local AI, zero latency.';
const MONO_SAMPLE = 'fn main() { println!("Hello"); }';
const CATEGORIES: FontCategory[] = ['Sans Serif', 'Serif', 'Monospace', 'Sci-Fi', 'Display'];

export function FontManagerView({ state, dispatch }: { state: NeuroDeckState; dispatch: Dispatch<NeuroDeckAction> }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<FontCategory | 'All'>('All');

  const filtered = useMemo(() => {
    return fontOptions.filter((f) => {
      const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'All' || f.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  const applyFont = (fontId: string) => {
    dispatch({ type: 'set-font', font: fontId });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <Type className="h-5 w-5 text-nd-accent" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-nd-text">Font Manager</h2>
          <p className="text-xs text-nd-text-muted">
            {fontOptions.length} typefaces available • Active: <span style={{ fontFamily: fontOptions.find((f) => f.id === state.selectedFont)?.family }}>{fontOptions.find((f) => f.id === state.selectedFont)?.name}</span>
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 focus-within:border-nd-accent/40 focus-within:ring-1 focus-within:ring-nd-accent/40 transition-shadow">
          <Search className="h-4 w-4 text-nd-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fonts..."
            className="flex-1 bg-transparent text-sm text-nd-text outline-none placeholder:text-nd-text-muted/70"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="text-nd-text-muted hover:text-nd-text/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 rounded">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setCategory('All')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${category === 'All' ? 'bg-nd-accent/10 text-nd-accent' : 'text-nd-text-muted hover:text-nd-text/80'}`}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${category === c ? 'bg-nd-accent/10 text-nd-accent' : 'text-nd-text-muted hover:text-nd-text/80'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Font Grid */}
      <div className="grid flex-1 grid-cols-1 gap-3 overflow-auto pb-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 scrollbar-thin">
        {filtered.map((font) => {
          const isActive = state.selectedFont === font.id;
          const preview = font.category === 'Monospace' ? MONO_SAMPLE : SAMPLE_TEXT;
          return (
            <button
              key={font.id}
              type="button"
              onClick={() => applyFont(font.id)}
              className={`relative flex flex-col rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
                isActive
                  ? 'border-nd-accent/40 bg-nd-accent/[0.08] shadow-focus'
                  : 'border-nd-text-muted/15 bg-nd-surface/30 hover:border-nd-text-muted/20 hover:bg-nd-surface/50'
              }`}
            >
              {isActive && (
                <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-nd-accent text-nd-bg">
                  <Check className="h-3.5 w-3.5" />
                </div>
              )}

              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-md border border-nd-text-muted/15 bg-nd-surface/50 px-1.5 py-0.5 text-[10px] text-nd-text-muted">
                  {font.category}
                </span>
                <span className="text-[10px] text-nd-text-muted/70">{font.weights.length} weights</span>
              </div>

              <p className="text-sm font-semibold text-nd-text/90">{font.name}</p>

              <div className="mt-3 flex-1 rounded-xl border border-nd-text-muted/8 bg-nd-surface/40 p-3">
                <p
                  className="text-lg leading-relaxed text-nd-text/80"
                  style={{ fontFamily: font.family }}
                >
                  {preview}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] text-nd-text-muted/70">{font.family.split(',')[0].replace(/"/g, '')}</span>
                {isActive ? (
                  <span className="text-xs font-medium text-nd-accent">Active</span>
                ) : (
                  <span className="text-xs text-nd-text-muted/70">Click to apply</span>
                )}
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-nd-text-muted/70">
            <Type className="h-10 w-10 mb-3" />
            <p className="text-sm">No fonts match your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
