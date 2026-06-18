import type { Dispatch } from "react";
import { useState } from "react";
import { ChevronRight, Settings } from "lucide-react";
import type {
  NeuroDeckAction,
  NeuroDeckAppActions,
  NeuroDeckState,
} from "../../types/neurodeck";
import { NAV_PANELS, type PanelKey } from "./constants";
import { AiSettingsPanel } from "./panels/AiSettingsPanel";
import { AppearanceSettingsPanel } from "./panels/AppearanceSettingsPanel";
import { ExtensionsSettingsPanel } from "./panels/ExtensionsSettingsPanel";
import { GeneralSettingsPanel } from "./panels/GeneralSettingsPanel";
import { InputSettingsPanel } from "./panels/InputSettingsPanel";
import { KnowledgeSettingsPanel } from "./panels/KnowledgeSettingsPanel";
import { PackagesPanel } from "./PackagesPanel";
import { PerformanceSettingsPanel } from "./panels/PerformanceSettingsPanel";
import { PrivacySettingsPanel } from "./panels/PrivacySettingsPanel";
import { VoiceSettingsPanel } from "./panels/VoiceSettingsPanel";

export interface SettingsViewProps {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
  actions: NeuroDeckAppActions;
  onPanelChange?: (panel: string) => void;
  onClose?: () => void;
}

export default function SettingsView({
  state,
  dispatch,
  actions,
  onPanelChange,
  onClose,
}: SettingsViewProps) {
  const [activePanel, setActivePanel] = useState<PanelKey>(() => {
    const saved = localStorage.getItem("settingsActivePanel");
    const stripped = saved?.replace("sp-", "") ?? "general";
    return (NAV_PANELS.some((p) => p.key === stripped) ? stripped : "general") as PanelKey;
  });

  const selectPanel = (name: PanelKey) => {
    localStorage.setItem("settingsActivePanel", `sp-${name}`);
    setActivePanel(name);
    onPanelChange?.(name);
  };

  return (
    <div className="grid h-full min-h-0 gap-3 overflow-hidden p-3 xl:grid-cols-[220px_1fr]">
      {/* Sidebar */}
      <aside className="stv-sidebar flex min-h-0 flex-col overflow-y-auto rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/50 p-3 gap-2 scrollbar-thin">
        <div className="stv-sidebar-brand-chip flex items-center gap-2 rounded-xl border border-nd-accent-primary/20 bg-nd-accent-primary/10 px-3 py-2 mb-1">
          <Settings className="h-4 w-4 text-nd-accent-primary" />
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-nd-accent-primary">
            Settings
          </span>
        </div>
        {NAV_PANELS.map(({ key, label, icon: Icon }) => {
          const active = activePanel === key;
          return (
            <button
              key={key}
              type="button"
              data-testid={`settings-tab-${key}`}
              data-panel={`sp-${key}`}
              aria-current={active ? "page" : undefined}
              onClick={() => selectPanel(key)}
              className={`stv-nav-item flex min-h-touch w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/40 ${
                active
                  ? "active border-nd-accent-primary/35 bg-nd-accent-primary/10 text-nd-accent-primary font-semibold"
                  : "border-transparent text-nd-text-primary/70 hover:border-nd-border-subtle hover:bg-nd-surface-secondary/60 hover:text-nd-text-primary"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />}
            </button>
          );
        })}
      </aside>

      {/* Content */}
      <section className="min-h-0 overflow-y-auto rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/30 p-4 scrollbar-thin">
        {activePanel === "general" && (
          <GeneralSettingsPanel state={state} dispatch={dispatch} actions={actions} onClose={onClose} />
        )}
        {activePanel === "ai" && (
          <AiSettingsPanel state={state} dispatch={dispatch} actions={actions} />
        )}
        {activePanel === "appearance" && (
          <AppearanceSettingsPanel state={state} dispatch={dispatch} />
        )}
        {activePanel === "voice" && <VoiceSettingsPanel state={state} dispatch={dispatch} />}
        {activePanel === "input" && <InputSettingsPanel state={state} dispatch={dispatch} />}
        {activePanel === "performance" && <PerformanceSettingsPanel state={state} />}
        {activePanel === "knowledge" && <KnowledgeSettingsPanel />}
        {activePanel === "extensions" && (
          <ExtensionsSettingsPanel state={state} dispatch={dispatch} actions={actions} />
        )}
        {activePanel === "packages" && <PackagesPanel />}
        {activePanel === "privacy" && (
          <PrivacySettingsPanel state={state} actions={actions} />
        )}
      </section>
    </div>
  );
}
