import { useState, useMemo } from "react";
import { Copy, Check, Search, X } from "lucide-react";
import { IconButton } from "../../../components/primitives/IconButton";
import type { DatasetSection } from "../types";

interface DatasetViewerProps {
  /** Multi-section data (tabs). When only one section, the tab bar is hidden. */
  sections: DatasetSection[];
  maxHeight?: number; // px, default 280
}

function highlight(line: string, term: string): (string | { hl: string })[] {
  if (!term) return [line];
  const parts: (string | { hl: string })[] = [];
  const lower = line.toLowerCase();
  const termLower = term.toLowerCase();
  let idx = 0;
  while (idx < line.length) {
    const found = lower.indexOf(termLower, idx);
    if (found === -1) {
      parts.push(line.slice(idx));
      break;
    }
    if (found > idx) parts.push(line.slice(idx, found));
    parts.push({ hl: line.slice(found, found + term.length) });
    idx = found + term.length;
  }
  return parts;
}

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <IconButton
      size="sm"
      variant="ghost"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy section to clipboard"}
      className="text-nd-text-muted/60 hover:text-nd-accent-primary"
    >
      {copied ? <Check className="h-3 w-3 text-nd-accent-success" /> : <Copy className="h-3 w-3" />}
    </IconButton>
  );
}

const FORMAT_COLORS: Record<string, string> = {
  log: "text-nd-text-muted/40",
  json: "text-nd-text-muted/40",
  pcap: "text-nd-accent-primary/40",
  csv: "text-nd-text-muted/40",
  xml: "text-nd-text-muted/40",
  text: "text-nd-text-muted/40",
};

export function DatasetViewer({ sections, maxHeight = 280 }: DatasetViewerProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const active = sections[activeIdx] ?? sections[0];

  const filteredLines = useMemo(() => {
    if (!active) return [];
    const lines = active.content.split("\n");
    if (!searchTerm.trim()) return lines.map((l, i) => ({ line: l, origIdx: i }));
    const term = searchTerm.toLowerCase();
    return lines
      .map((l, i) => ({ line: l, origIdx: i }))
      .filter(({ line }) => line.toLowerCase().includes(term));
  }, [active, searchTerm]);

  if (!active) return null;

  const matchCount = searchTerm ? filteredLines.length : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-nd-border-subtle bg-nd-surface-base/30">
      {/* Tab bar — only shown when multiple sections */}
      {sections.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto border-b border-nd-border-subtle bg-nd-surface-base/60 px-2 pt-1">
          {sections.map((sec, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setActiveIdx(i);
                setSearchTerm("");
              }}
              className={`shrink-0 rounded-t-md px-3 py-1.5 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent-primary/40 ${
                i === activeIdx
                  ? "-mb-px border-x border-t border-nd-border-subtle bg-nd-surface-base text-nd-text-primary"
                  : "text-nd-text-muted/60 hover:text-nd-text-secondary"
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-nd-border-subtle bg-nd-surface-base/40 px-3 py-1.5">
        <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-nd-border-subtle bg-nd-surface-base/60 px-2 py-1 focus-within:border-nd-accent-primary/40">
          <Search className="h-3 w-3 shrink-0 text-nd-text-muted/40" aria-hidden="true" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter lines…"
            aria-label="Filter dataset lines"
            className="flex-1 bg-transparent text-[11px] text-nd-text-primary placeholder:text-nd-text-muted/30 focus:outline-none"
          />
          {searchTerm && (
            <IconButton
              size="sm"
              variant="ghost"
              onClick={() => setSearchTerm("")}
              aria-label="Clear filter"
              className="text-nd-text-muted/40 hover:text-nd-text-secondary"
            >
              <X className="h-2.5 w-2.5" />
            </IconButton>
          )}
        </div>
        {matchCount !== null && (
          <span className="shrink-0 text-[10px] text-nd-text-muted/50">
            {matchCount} match{matchCount !== 1 ? "es" : ""}
          </span>
        )}
        <CopyButton content={active.content} />
      </div>

      {/* Content */}
      <div
        className="overflow-auto bg-nd-surface-base/20"
        style={{ maxHeight }}
        aria-label={`Dataset: ${active.label}`}
        role="region"
      >
        <table className="w-full">
          <tbody>
            {filteredLines.map(({ line, origIdx }) => (
              <tr key={origIdx} className="transition hover:bg-nd-surface/20">
                <td
                  className={`w-8 shrink-0 select-none py-0 pr-2 pl-3 text-right font-mono text-[9px] leading-5 tabular-nums ${
                    FORMAT_COLORS[active.format] ?? "text-nd-text-muted/40"
                  }`}
                  aria-hidden="true"
                >
                  {origIdx + 1}
                </td>
                <td className="break-all whitespace-pre-wrap py-0 pl-1 pr-3 font-mono text-[11px] leading-5 text-nd-text-secondary">
                  {searchTerm
                    ? highlight(line, searchTerm).map((part, j) =>
                        typeof part === "string" ? (
                          <span key={j}>{part}</span>
                        ) : (
                          <mark
                            key={j}
                            className="rounded-[2px] bg-nd-accent-primary/30 text-nd-text-primary"
                          >
                            {part.hl}
                          </mark>
                        )
                      )
                    : line}
                </td>
              </tr>
            ))}
            {filteredLines.length === 0 && (
              <tr>
                <td
                  colSpan={2}
                  className="px-4 py-3 text-center text-[11px] italic text-nd-text-muted/40"
                >
                  No lines match &quot;{searchTerm}&quot;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
