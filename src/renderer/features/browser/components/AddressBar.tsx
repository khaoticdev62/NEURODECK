import { Lock, Unlock } from "lucide-react";
import type { BrowserTab } from "../types";
import { Button } from "../../../components/primitives/Button";
import { StatusChip } from "../../../components/primitives/StatusChip";

interface AddressBarProps {
  urlInput: string;
  onUrlInputChange: (value: string) => void;
  onNavigate: (url: string) => void;
  urlInputRef: React.RefObject<HTMLInputElement | null>;
  activeTab?: BrowserTab;
}

export function AddressBar({
  urlInput,
  onUrlInputChange,
  onNavigate,
  urlInputRef,
  activeTab,
}: AddressBarProps) {
  return (
    <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 px-3 py-1.5 focus-within:border-nd-accent-primary/40 focus-within:ring-2 focus-within:ring-nd-accent-primary/25 transition">
      {activeTab?.security === "secure" ? (
        <StatusChip tone="success" size="sm" icon={Lock}>
          Secure
        </StatusChip>
      ) : (
        <StatusChip tone="warning" size="sm" icon={Unlock}>
          Insecure
        </StatusChip>
      )}
      <input
        ref={urlInputRef}
        id="browser-address-input"
        data-controller-default="true"
        type="text"
        value={urlInput}
        onChange={(e) => onUrlInputChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onNavigate(urlInput)}
        aria-label="Address bar"
        className="flex-1 bg-transparent text-xs text-nd-text-primary outline-none"
        placeholder="Search or enter web URL..."
      />
      <Button variant="primary" size="xs" onClick={() => onNavigate(urlInput)}>
        Go
      </Button>
    </div>
  );
}
