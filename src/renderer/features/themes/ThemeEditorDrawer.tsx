import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, RotateCcw, Save, X } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { FocusTrapContainer } from "../../components/primitives/FocusTrapContainer";
import { TextInput } from "../../components/primitives/TextInput";

interface TokenRow {
  key: string;
  label: string;
  group: string;
  value: string;
}

const DEFAULT_TOKENS: TokenRow[] = [
  { key: "--nd-accent-primary", label: "Accent Primary", group: "Brand", value: "#5EEBFF" },
  { key: "--nd-accent-secondary", label: "Accent Secondary", group: "Brand", value: "#00B5CC" },
  { key: "--nd-surface-bg", label: "Background", group: "Surface", value: "#0a0a0f" },
  { key: "--nd-surface-secondary", label: "Surface Secondary", group: "Surface", value: "#13131a" },
  { key: "--nd-surface-tertiary", label: "Surface Tertiary", group: "Surface", value: "#1c1c26" },
  { key: "--nd-text-primary", label: "Text Primary", group: "Text", value: "#f0f0ff" },
  { key: "--nd-text-secondary", label: "Text Secondary", group: "Text", value: "#a0a0b8" },
  { key: "--nd-text-muted", label: "Text Muted", group: "Text", value: "#5a5a72" },
  { key: "--nd-border-subtle", label: "Border Subtle", group: "Border", value: "#2a2a3a" },
  { key: "--nd-status-success", label: "Status Success", group: "Status", value: "#22c55e" },
  { key: "--nd-status-warning", label: "Status Warning", group: "Status", value: "#f59e0b" },
  { key: "--nd-status-error", label: "Status Error", group: "Status", value: "#ef4444" },
];

function readLiveToken(key: string): string {
  return (
    getComputedStyle(document.documentElement).getPropertyValue(key).trim() ||
    DEFAULT_TOKENS.find((t) => t.key === key)?.value ||
    "#000000"
  );
}

interface ThemeEditorDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (name: string, tokens: Record<string, string>) => void;
}

function isValidHex(v: string): boolean {
  return /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(v);
}

export function ThemeEditorDrawer({ open, onClose, onSaved }: ThemeEditorDrawerProps) {
  const [themeName, setThemeName] = useState("");
  const [tokens, setTokens] = useState<TokenRow[]>(() =>
    DEFAULT_TOKENS.map((t) => ({ ...t }))
  );
  const [saving, setSaving] = useState(false);
  const originalRef = useRef<TokenRow[]>([]);

  useEffect(() => {
    if (!open) return;
    const live = DEFAULT_TOKENS.map((t) => ({ ...t, value: readLiveToken(t.key) }));
    setTokens(live);
    originalRef.current = live.map((t) => ({ ...t }));
  }, [open]);

  const applyToken = useCallback((key: string, value: string) => {
    document.documentElement.style.setProperty(key, value);
  }, []);

  const handleChange = (key: string, value: string) => {
    setTokens((prev) =>
      prev.map((t) => (t.key === key ? { ...t, value } : t))
    );
    if (isValidHex(value)) {
      applyToken(key, value);
    }
  };

  const handleReset = () => {
    const original = originalRef.current;
    setTokens(original.map((t) => ({ ...t })));
    original.forEach((t) => applyToken(t.key, t.value));
  };

  const handleSave = useCallback(async () => {
    if (!themeName.trim()) return;
    setSaving(true);
    await new Promise<void>((r) => setTimeout(r, 300));
    const map: Record<string, string> = {};
    tokens.forEach((t) => { map[t.key] = t.value; });
    onSaved?.(themeName.trim(), map);
    setSaving(false);
    onClose();
  }, [themeName, tokens, onSaved, onClose]);

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const groups = [...new Set(tokens.map((t) => t.group))];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <div
        className="absolute inset-0 bg-nd-surface-bg/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />
      <FocusTrapContainer active={open}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Theme Editor"
          className="relative z-10 flex h-full w-full max-w-[560px] flex-col border-l border-nd-border-subtle bg-nd-surface-secondary/90 shadow-2xl backdrop-blur"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-nd-border-subtle p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-nd-text-muted">
                Themes
              </p>
              <h2 className="text-lg font-black text-nd-text-primary">Theme Editor</h2>
              <p className="text-xs text-nd-text-muted">
                Changes preview live. Save to persist as a custom theme.
              </p>
            </div>
            <Button variant="ghost" size="sm" icon={X} onClick={handleClose} aria-label="Close" />
          </div>

          {/* Body — two-panel: token list (left) + live preview chip (right inline) */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-thin">
            <div className="p-5">
              <TextInput
                label="Theme Name"
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                placeholder="My Custom Theme"
                required
                fullWidth
              />
            </div>

            {/* Live preview strip */}
            <div
              className="mx-5 mb-4 flex items-center gap-3 rounded-xl border border-nd-border-subtle p-3"
              aria-label="Live theme preview"
              role="img"
            >
              <Eye className="h-4 w-4 shrink-0 text-nd-text-muted" aria-hidden />
              <div className="flex flex-wrap gap-2">
                {tokens
                  .filter((t) => t.group === "Brand" || t.group === "Surface")
                  .map((t) => (
                    <span
                      key={t.key}
                      className="h-6 w-6 rounded-full border border-nd-border-subtle shadow-sm"
                      style={{ backgroundColor: t.value }}
                      title={t.label}
                    />
                  ))}
              </div>
              <div className="ml-auto rounded-lg px-3 py-1.5 text-sm font-semibold"
                style={{
                  backgroundColor: tokens.find((t) => t.key === "--nd-surface-secondary")?.value,
                  color: tokens.find((t) => t.key === "--nd-text-primary")?.value,
                  border: `1px solid ${tokens.find((t) => t.key === "--nd-border-subtle")?.value}`,
                }}
              >
                <span style={{ color: tokens.find((t) => t.key === "--nd-accent-primary")?.value }}>
                  NEURODECK
                </span>
              </div>
            </div>

            {/* Token groups */}
            <div className="flex-1 space-y-4 px-5 pb-5">
              {groups.map((group) => (
                <section key={group} aria-label={`${group} tokens`}>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-nd-text-muted">
                    {group}
                  </h3>
                  <div className="space-y-2">
                    {tokens
                      .filter((t) => t.group === group)
                      .map((token) => (
                        <div
                          key={token.key}
                          className="flex items-center gap-3 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/20 px-3 py-2"
                        >
                          {/* Color picker */}
                          <div className="relative">
                            <input
                              type="color"
                              id={`color-${token.key}`}
                              value={isValidHex(token.value) ? token.value : "#000000"}
                              onChange={(e) => handleChange(token.key, e.target.value)}
                              className="h-8 w-8 cursor-pointer rounded-lg border-none bg-transparent p-0 opacity-0 absolute inset-0"
                              aria-label={`Pick color for ${token.label}`}
                            />
                            <span
                              className="block h-8 w-8 rounded-lg border border-nd-border-subtle shadow-sm"
                              style={{ backgroundColor: token.value }}
                              aria-hidden
                            />
                          </div>
                          <label
                            htmlFor={`color-${token.key}`}
                            className="min-w-0 flex-1 cursor-pointer"
                          >
                            <p className="text-sm font-medium text-nd-text-primary">{token.label}</p>
                            <p className="font-mono text-xs text-nd-text-muted">{token.key}</p>
                          </label>
                          {/* Hex text input */}
                          <input
                            type="text"
                            value={token.value}
                            onChange={(e) => handleChange(token.key, e.target.value)}
                            maxLength={9}
                            className="w-24 rounded-lg border border-nd-border-subtle bg-nd-surface-secondary/40 px-2 py-1 font-mono text-xs text-nd-text-primary focus:outline-none focus:ring-1 focus:ring-nd-accent-primary/40"
                            aria-label={`${token.label} hex value`}
                          />
                        </div>
                      ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-nd-border-subtle p-4">
            <Button variant="ghost" size="sm" icon={RotateCcw} onClick={handleReset}>
              Reset
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Save}
                onClick={() => void handleSave()}
                loading={saving}
                disabled={!themeName.trim()}
              >
                Save Theme
              </Button>
            </div>
          </div>
        </div>
      </FocusTrapContainer>
    </div>
  );
}
