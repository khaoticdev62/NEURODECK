import { Download, ShieldCheck, Terminal } from "lucide-react";
import { IconButton } from "../../../components/primitives/IconButton";

interface GlobalToolbarProps {
  showDownloadsMenu: boolean;
  activeDownloadCount: number;
  onToggleDownloadsMenu: () => void;
  showDiagnostics: boolean;
  onToggleDiagnostics: () => void;
  showVpnPanel: boolean;
  onToggleVpnPanel: () => void;
}

export function GlobalToolbar({
  showDownloadsMenu,
  activeDownloadCount,
  onToggleDownloadsMenu,
  showDiagnostics,
  onToggleDiagnostics,
  showVpnPanel,
  onToggleVpnPanel,
}: GlobalToolbarProps) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="relative">
        <IconButton
          aria-label="Downloads"
          variant={showDownloadsMenu || activeDownloadCount > 0 ? "accent" : "subtle"}
          size="md"
          onClick={onToggleDownloadsMenu}
          aria-expanded={showDownloadsMenu}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
        </IconButton>
        {activeDownloadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-nd-accent-primary text-[9px] font-bold text-nd-surface-app">
            {activeDownloadCount}
          </span>
        )}
      </div>

      <IconButton
        aria-label="Session diagnostics"
        variant={showDiagnostics ? "accent" : "subtle"}
        size="md"
        onClick={onToggleDiagnostics}
        aria-expanded={showDiagnostics}
      >
        <Terminal className="h-4 w-4" aria-hidden="true" />
      </IconButton>

      <IconButton
        aria-label="Browser VPN"
        variant={showVpnPanel ? "danger" : "subtle"}
        size="md"
        onClick={onToggleVpnPanel}
        aria-expanded={showVpnPanel}
      >
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
      </IconButton>
    </div>
  );
}
