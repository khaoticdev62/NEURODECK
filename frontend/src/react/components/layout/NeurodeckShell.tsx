/* NEURODECK v6 workspace shell — functional shell that wires the v6 layout
   components (TitleBar, PrimarySidebar, SecondaryRail) to the live React app
   state and preserves all existing feature views. */

import { useEffect, useMemo, useState } from "react";
import { TitleBar } from "./TitleBar";
import { PrimarySidebar } from "./PrimarySidebar";
import { SecondaryRail } from "./SecondaryRail";
import { ChatWorkspace } from "../../../design-system/ui_kits/workstation/ChatWorkspace";
import { InputConsole } from "../../../design-system/ui_kits/workstation/InputConsole";
import type {
  AIMessage,
  LocalModel,
  NeuroDeckAction,
  NeuroDeckAppActions,
  NeuroDeckSelectors,
  NeuroDeckState,
  ViewId,
} from "../../types/neurodeck";
import type { NeurodeckTheme } from "../../../shared/theme/themeContracts";
import type { ChatMessage } from "../../../design-system/ui_kits/workstation/ChatWorkspace";

function shortSessionId(id: string): string {
  if (!id) return "—";
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function formatClock(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function formatMessageTime(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function adaptMessages(messages: AIMessage[]): ChatMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    model: m.model,
    text: m.content,
    streaming: m.role === "assistant" && m.content === "",
    time: formatMessageTime(m.createdAt),
    tokens: m.latencyMs ? undefined : undefined,
    latency: m.latencyMs ? `${m.latencyMs}ms` : undefined,
  }));
}

export interface NeurodeckShellProps {
  state: NeuroDeckState;
  dispatch: React.Dispatch<NeuroDeckAction>;
  appActions: NeuroDeckAppActions;
  selectors: NeuroDeckSelectors;
  runAssistant: (prompt?: string) => Promise<void>;
  modelName: string;
  selectedBackendModel: string;
  selectedModel?: LocalModel;
  activeTheme: NeurodeckTheme;
  recentViews: ViewId[];
  setRecentViews: React.Dispatch<React.SetStateAction<ViewId[]>>;
  openSettings: (panel?: string) => void;
  setSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setNotificationsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setShortcutsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setQuickSwitcherOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setCtrlPromptOpen: React.Dispatch<React.SetStateAction<boolean>>;
  children: React.ReactNode;
}

export function NeurodeckShell(props: NeurodeckShellProps): React.ReactNode {
  const { state, dispatch, selectors, runAssistant, modelName } = props;
  const [clock, setClock] = useState(formatClock);

  useEffect(() => {
    const handle = window.setInterval(() => setClock(formatClock()), 1000);
    return () => window.clearInterval(handle);
  }, []);

  const activeView = state.activeView;
  const isChat = activeView === "chat" || activeView === "workspace";
  const normalizedViewId: ViewId = isChat ? "chat" : activeView;

  const chatMessages = useMemo(() => adaptMessages(state.messages), [state.messages]);

  const handleComposerChange = (value: string) => {
    dispatch({ type: "set-composer", value });
  };

  const handleOpenPalette = () => {
    dispatch({ type: "toggle-command", open: true });
  };

  const handleRunAssistant = () => {
    void runAssistant();
  };

  const sessionName = state.statusBar?.session?.id
    ? shortSessionId(state.statusBar.session.id)
    : (state.activeProject?.name ?? "NEURODECK");

  const subtitle = `${sessionName} · ${modelName} · ${clock}`;

  const chatWorkspace = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1">
        <ChatWorkspace messages={chatMessages} />
      </div>
      <InputConsole
        value={state.composerValue}
        onChange={handleComposerChange}
        onSubmit={handleRunAssistant}
        onOpenPalette={handleOpenPalette}
        model={modelName}
        persona={state.selectedPersona}
        busy={!!state.busyLabel}
      />
    </div>
  );

  const mainContent = isChat ? chatWorkspace : props.children;

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-surface-primary text-text-primary">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--z-toast)] focus:rounded-lg focus:bg-nd-accent-primary focus:px-4 focus:py-2 focus:text-nd-bg focus:font-semibold focus:shadow-glow-md"
      >
        Skip to main content
      </a>
      <TitleBar subtitle={subtitle} />
      <div className="flex min-h-0 flex-1">
        <PrimarySidebar
          state={state}
          dispatch={dispatch}
          onOpenSettings={() => props.openSettings("general")}
          onOpenNotifications={() => props.setNotificationsOpen(true)}
        />
        <main
          id="main-content"
          data-controller-zone="content"
          data-controller-default="true"
          className="min-w-0 flex-1 overflow-hidden border-x border-border-subtle bg-surface-primary/40"
        >
          <div
            id={`view-${normalizedViewId}`}
            data-testid={`view-${normalizedViewId}`}
            data-controller-screen={normalizedViewId}
            data-controller-screen-active="true"
            className="h-full min-h-0 animate-view-enter"
          >
            {mainContent}
          </div>
        </main>
        <SecondaryRail state={state} dispatch={dispatch} selectors={selectors} />
      </div>
    </div>
  );
}
