import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/primitives/Button";
import { Panel } from "../../components/primitives/Panel";
import type { NeuroDeckState } from "../../types/neurodeck";

interface ColorToken {
  name: string;
  value: string;
  cssVar: string;
}

const BRAND_COLORS: ColorToken[] = [
  { name: "Canonical Cyan", value: "#5EEBFF", cssVar: "--nd-accent-primary" },
  { name: "Cyan Dark", value: "#00C2D9", cssVar: "--nd-accent-secondary" },
  { name: "Surface BG", value: "#0D0F14", cssVar: "--nd-surface-bg" },
  { name: "Surface 1", value: "#13161E", cssVar: "--nd-surface-1" },
  { name: "Surface 2", value: "#1A1E27", cssVar: "--nd-surface-2" },
  { name: "Text Primary", value: "#F0F4FF", cssVar: "--nd-text-primary" },
  { name: "Text Muted", value: "#6B7280", cssVar: "--nd-text-muted" },
  { name: "Success", value: "#34D399", cssVar: "--nd-status-success" },
  { name: "Warning", value: "#FBBF24", cssVar: "--nd-status-warning" },
  { name: "Error", value: "#F87171", cssVar: "--nd-status-error" },
];

function ColorSwatch({ token }: { token: ColorToken }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(token.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="group flex flex-col overflow-hidden rounded-xl border border-nd-border-subtle transition hover:border-nd-accent-primary/40"
      aria-label={`Copy ${token.name} (${token.value})`}
    >
      <div
        className="h-16 w-full"
        style={{ backgroundColor: token.value }}
        aria-hidden
      />
      <div className="bg-nd-surface-secondary/40 px-3 py-2 text-left">
        <p className="text-xs font-bold text-nd-text-primary">{token.name}</p>
        <p className="font-mono text-xs text-nd-text-muted">{token.value}</p>
        <p className="font-mono text-xs text-nd-text-muted">{token.cssVar}</p>
      </div>
      <div className="flex items-center justify-center border-t border-nd-border-subtle/30 bg-nd-surface-secondary/60 py-1.5">
        {copied ? (
          <span className="flex items-center gap-1 text-xs text-nd-status-success">
            <Check className="h-3 w-3" aria-hidden /> Copied
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-nd-text-muted group-hover:text-nd-accent-primary">
            <Copy className="h-3 w-3" aria-hidden /> Copy hex
          </span>
        )}
      </div>
    </button>
  );
}

export function BrandAssetsView({ state: _state }: { state: NeuroDeckState }) {
  return (
    <Panel
      eyebrow="Brand"
      title="Brand Assets"
      data-testid="brand-assets-view"
      className="h-full overflow-hidden"
      scrollable
    >
      <div className="flex flex-col gap-8 p-4">
        {/* Logo */}
        <section aria-label="Logo">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-nd-text-muted">
            Logo
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Cyan on Dark", bg: "bg-nd-bg", textColor: "text-nd-accent-primary" },
              { label: "White on Cyan", bg: "bg-nd-accent-primary", textColor: "text-nd-bg" },
              { label: "Cyan on White", bg: "bg-white", textColor: "text-nd-accent-primary" },
            ].map((variant) => (
              <div
                key={variant.label}
                className={`flex flex-col items-center gap-3 rounded-2xl border border-nd-border-subtle p-6 ${variant.bg}`}
              >
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 text-2xl font-black ${variant.textColor} border-current`}
                >
                  N
                </div>
                <p className={`text-xs font-semibold ${variant.textColor}`}>{variant.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" size="sm" icon={Download} aria-label="Download SVG logo">
              SVG
            </Button>
            <Button variant="secondary" size="sm" icon={Download} aria-label="Download PNG logo">
              PNG
            </Button>
          </div>
        </section>

        {/* Color palette */}
        <section aria-label="Color palette">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-nd-text-muted">
            Color Tokens
          </h2>
          <p className="mb-4 text-sm text-nd-text-muted">
            Canonical cyan is{" "}
            <code className="font-mono font-bold text-nd-accent-primary">#5EEBFF</code> — not{" "}
            <code className="font-mono text-nd-text-muted">#00F0FF</code>. Non-negotiable.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {BRAND_COLORS.map((token) => (
              <ColorSwatch key={token.cssVar} token={token} />
            ))}
          </div>
        </section>

        {/* Typography */}
        <section aria-label="Typography">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-nd-text-muted">
            Typography
          </h2>
          <div className="flex flex-col gap-3 rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/20 p-4">
            {[
              { label: "Display / H1", className: "text-3xl font-black tracking-tight text-nd-text-primary", sample: "NEURODECK" },
              { label: "Heading / H2", className: "text-xl font-bold text-nd-text-primary", sample: "AI-Powered Terminal OS" },
              { label: "Body", className: "text-sm text-nd-text-secondary", sample: "Smart, fast, and fully extensible on Steam Deck." },
              { label: "Mono / Code", className: "font-mono text-sm text-nd-accent-primary", sample: "neurodeckApi.ai.sendMessage()" },
              { label: "Label / Eyebrow", className: "text-xs font-bold uppercase tracking-widest text-nd-text-muted", sample: "Diagnostics" },
            ].map((t) => (
              <div key={t.label} className="flex items-baseline gap-4">
                <span className="w-36 shrink-0 text-xs text-nd-text-muted">{t.label}</span>
                <span className={t.className}>{t.sample}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Voice */}
        <section aria-label="Copy voice">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-nd-text-muted">
            Copy Voice
          </h2>
          <div className="flex flex-col gap-2 text-sm text-nd-text-secondary">
            <p>✓ <strong className="text-nd-text-primary">Precise, confident, never verbose.</strong> No filler. No fluff.</p>
            <p>✓ <strong className="text-nd-text-primary">Developer-native.</strong> Speak in terms the user already knows.</p>
            <p>✓ <strong className="text-nd-text-primary">Steam Deck–first.</strong> UI copy assumes gamepad awareness.</p>
            <p>✗ <em className="text-nd-text-muted">Do not use corporate buzzwords or AI assistant clichés.</em></p>
          </div>
        </section>
      </div>
    </Panel>
  );
}
