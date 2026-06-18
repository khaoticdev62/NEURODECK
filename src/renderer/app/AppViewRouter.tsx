import { lazy, Suspense, type ReactNode } from "react";
import { ViewErrorBoundary } from "../components/system/ViewErrorBoundary";
import { ViewLoader } from "./ViewLoader";
import { WorkspaceView } from "../features/workspace/WorkspaceView";
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState, ViewId } from "../types/neurodeck";
import type { NeuroDeckSelectors } from "../state/useNeuroDeckSelectors";

const AgentsView = lazy(() =>
  import("../features/agents/AgentsView").then((m) => ({ default: m.AgentsView }))
);
const ApiLabView = lazy(() =>
  import("../features/api-lab/ApiLabView").then((m) => ({ default: m.ApiLabView }))
);
const CacheView = lazy(() =>
  import("../features/cache/CacheView").then((m) => ({ default: m.CacheView }))
);
const CliMakerView = lazy(() =>
  import("../features/cli-maker/CliMakerView").then((m) => ({ default: m.CliMakerView }))
);
const DiagnosticsView = lazy(() =>
  import("../features/diagnostics/DiagnosticsView").then((m) => ({ default: m.DiagnosticsView }))
);
const ExecutionView = lazy(() =>
  import("../features/execution/ExecutionView").then((m) => ({ default: m.ExecutionView }))
);
const GitView = lazy(() => import("../features/git/GitView").then((m) => ({ default: m.GitView })));
const MemoryView = lazy(() =>
  import("../features/memory/MemoryView").then((m) => ({ default: m.MemoryView }))
);
const ModelsView = lazy(() =>
  import("../features/models/ModelsView").then((m) => ({ default: m.ModelsView }))
);
const ProviderManagerView = lazy(() =>
  import("../features/models/ProviderManagerView").then((m) => ({ default: m.ProviderManagerView }))
);
const PluginsView = lazy(() =>
  import("../features/plugins/PluginsView").then((m) => ({ default: m.PluginsView }))
);
const ProjectView = lazy(() =>
  import("../features/project/ProjectView").then((m) => ({ default: m.ProjectView }))
);
const SessionsView = lazy(() =>
  import("../features/sessions/SessionsView").then((m) => ({ default: m.SessionsView }))
);
const SettingsView = lazy(() =>
  import("../features/settings/SettingsView").then((m) => ({ default: m.default }))
);
const SSHView = lazy(() => import("../features/ssh/SSHView").then((m) => ({ default: m.SSHView })));
const TerminalView = lazy(() =>
  import("../features/terminal/TerminalView").then((m) => ({ default: m.TerminalView }))
);
const AcademyView = lazy(() =>
  import("../features/academy/AcademyView").then((m) => ({ default: m.AcademyView }))
);
const BrowserView = lazy(() =>
  import("../features/browser/BrowserView").then((m) => ({ default: m.BrowserView }))
);
const CanvasView = lazy(() =>
  import("../features/canvas/CanvasView").then((m) => ({ default: m.CanvasView }))
);
const DocsView = lazy(() =>
  import("../features/docs/DocsView").then((m) => ({ default: m.DocsView }))
);
const ExportsView = lazy(() =>
  import("../features/exports/ExportsView").then((m) => ({ default: m.ExportsView }))
);
const FontManagerView = lazy(() =>
  import("../features/fonts/FontManagerView").then((m) => ({ default: m.FontManagerView }))
);
const GraphView = lazy(() =>
  import("../features/graph/GraphView").then((m) => ({ default: m.GraphView }))
);
const IDEView = lazy(() => import("../features/ide/IDEView").then((m) => ({ default: m.IDEView })));
const MaintenanceView = lazy(() =>
  import("../features/maintenance/MaintenanceView").then((m) => ({ default: m.MaintenanceView }))
);
const OrchestratorView = lazy(() =>
  import("../features/orchestrator/OrchestratorView").then((m) => ({ default: m.OrchestratorView }))
);
const PromptLabView = lazy(() =>
  import("../features/prompt-lab/PromptLabView").then((m) => ({ default: m.PromptLabView }))
);
const PromptLibraryView = lazy(() =>
  import("../features/prompt-lab/PromptLibraryView").then((m) => ({ default: m.PromptLibraryView }))
);
const PromptBuilderView = lazy(() =>
  import("../features/prompt-lab/PromptBuilderView").then((m) => ({ default: m.PromptBuilderView }))
);
const RecoveryView = lazy(() =>
  import("../features/recovery/RecoveryView").then((m) => ({ default: m.RecoveryView }))
);
const RemoteView = lazy(() =>
  import("../features/remote/RemoteView").then((m) => ({ default: m.RemoteView }))
);
const SchedulerView = lazy(() =>
  import("../features/scheduler/SchedulerView").then((m) => ({ default: m.SchedulerView }))
);
const SyncView = lazy(() =>
  import("../features/sync/SyncView").then((m) => ({ default: m.SyncView }))
);
const SecurityView = lazy(() =>
  import("../features/security/SecurityView").then((m) => ({ default: m.SecurityView }))
);
const ApiKeyVaultView = lazy(() =>
  import("../features/security/ApiKeyVaultView").then((m) => ({ default: m.ApiKeyVaultView }))
);
const ShareView = lazy(() =>
  import("../features/share/ShareView").then((m) => ({ default: m.ShareView }))
);
const ThemesView = lazy(() =>
  import("../features/themes/ThemesView").then((m) => ({ default: m.ThemesView }))
);
const TorrentView = lazy(() =>
  import("../features/torrent/TorrentView").then((m) => ({ default: m.TorrentView }))
);
const TunnelView = lazy(() =>
  import("../features/tunnel/TunnelView").then((m) => ({ default: m.TunnelView }))
);
const MCPView = lazy(() => import("../features/mcp/MCPView").then((m) => ({ default: m.MCPView })));

// New sprint views
const DashboardView = lazy(() =>
  import("../features/dashboard/DashboardView").then((m) => ({ default: m.DashboardView }))
);
const QuickStartView = lazy(() =>
  import("../features/quickstart/QuickStartView").then((m) => ({ default: m.QuickStartView }))
);
const PersonaManagerView = lazy(() =>
  import("../features/personas/PersonaManagerView").then((m) => ({ default: m.PersonaManagerView }))
);
const VPNView = lazy(() =>
  import("../features/network/VPNView").then((m) => ({ default: m.VPNView }))
);
const LuaScriptsView = lazy(() =>
  import("../features/plugins/LuaScriptsView").then((m) => ({ default: m.LuaScriptsView }))
);
const PluginPermissionsView = lazy(() =>
  import("../features/plugins/PluginPermissionsView").then((m) => ({ default: m.PluginPermissionsView }))
);
const AboutView = lazy(() =>
  import("../features/system/AboutView").then((m) => ({ default: m.AboutView }))
);
const UpdateCenterView = lazy(() =>
  import("../features/system/UpdateCenterView").then((m) => ({ default: m.UpdateCenterView }))
);
const ReleaseNotesView = lazy(() =>
  import("../features/system/ReleaseNotesView").then((m) => ({ default: m.ReleaseNotesView }))
);
const LogsView = lazy(() =>
  import("../features/diagnostics/LogsView").then((m) => ({ default: m.LogsView }))
);
const UIRollbackView = lazy(() =>
  import("../features/recovery/UIRollbackView").then((m) => ({ default: m.UIRollbackView }))
);
const FeatureTourView = lazy(() =>
  import("../features/help/FeatureTourView").then((m) => ({ default: m.FeatureTourView }))
);
const IPCConnectorMapView = lazy(() =>
  import("../features/developer/IPCConnectorMapView").then((m) => ({ default: m.IPCConnectorMapView }))
);
const DevConsoleView = lazy(() =>
  import("../features/developer/DevConsoleView").then((m) => ({ default: m.DevConsoleView }))
);
const FeatureFlagsView = lazy(() =>
  import("../features/developer/FeatureFlagsView").then((m) => ({ default: m.FeatureFlagsView }))
);
const DataConnectorsView = lazy(() =>
  import("../features/developer/DataConnectorsView").then((m) => ({ default: m.DataConnectorsView }))
);
const BrandAssetsView = lazy(() =>
  import("../features/developer/BrandAssetsView").then((m) => ({ default: m.BrandAssetsView }))
);
const ReleaseChecklistView = lazy(() =>
  import("../features/developer/ReleaseChecklistView").then((m) => ({ default: m.ReleaseChecklistView }))
);
const PermissionsView = lazy(() =>
  import("../features/security/PermissionsView").then((m) => ({ default: m.PermissionsView }))
);
const ControllerProfileView = lazy(() =>
  import("../features/settings/ControllerProfileView").then((m) => ({ default: m.ControllerProfileView }))
);
const BackupRestoreView = lazy(() =>
  import("../features/maintenance/BackupRestoreView").then((m) => ({ default: m.BackupRestoreView }))
);
const ArchiveView = lazy(() =>
  import("../features/archive/ArchiveView").then((m) => ({ default: m.ArchiveView }))
);
const StorageView = lazy(() =>
  import("../features/storage/StorageView").then((m) => ({ default: m.StorageView }))
);
const SafeModeScreen = lazy(() =>
  import("../features/recovery/SafeModeScreen").then((m) => ({ default: m.SafeModeScreen }))
);

function renderView(id: ViewId, content: ReactNode) {
  return (
    <div
      id={`view-${id}`}
      data-testid={`view-${id}`}
      data-controller-screen={id}
      data-controller-screen-active="true"
      data-controller-default="true"
      className="view-content active h-full min-h-0 animate-view-enter"
    >
      <ViewErrorBoundary viewId={id}>
        <Suspense fallback={<ViewLoader />}>{content}</Suspense>
      </ViewErrorBoundary>
    </div>
  );
}

export type AppViewRouterProps = {
  state: NeuroDeckState;
  dispatch: React.Dispatch<NeuroDeckAction>;
  selectors: NeuroDeckSelectors;
  actions: NeuroDeckAppActions;
};

export function AppViewRouter({ state, dispatch, selectors, actions }: AppViewRouterProps) {
  return (
    <>
      {(state.activeView === "chat" || state.activeView === "workspace") &&
        renderView(
          "chat",
          <WorkspaceView state={state} dispatch={dispatch} selectors={selectors} actions={actions} />
        )}
      {state.activeView === "execution" &&
        renderView("execution", <ExecutionView state={state} actions={actions} />)}
      {state.activeView === "project" &&
        renderView("project", <ProjectView state={state} actions={actions} />)}
      {state.activeView === "models" &&
        renderView("models", <ModelsView state={state} dispatch={dispatch} actions={actions} />)}
      {state.activeView === "provider-manager" &&
        renderView("provider-manager", <ProviderManagerView state={state} dispatch={dispatch} />)}
      {(state.activeView === "agent" || state.activeView === "agents") &&
        renderView("agent", <AgentsView state={state} dispatch={dispatch} actions={actions} />)}
      {state.activeView === "memory" &&
        renderView("memory", <MemoryView state={state} dispatch={dispatch} actions={actions} />)}
      {state.activeView === "sessions" &&
        renderView("sessions", <SessionsView state={state} actions={actions} />)}
      {state.activeView === "cache" && renderView("cache", <CacheView state={state} />)}
      {state.activeView === "plugins" &&
        renderView("plugins", <PluginsView state={state} dispatch={dispatch} />)}
      {state.activeView === "diagnostics" &&
        renderView("diagnostics", <DiagnosticsView state={state} actions={actions} />)}
      {state.activeView === "canvas" && renderView("canvas", <CanvasView />)}
      {state.activeView === "terminal" && renderView("terminal", <TerminalView />)}
      {state.activeView === "ssh" && renderView("ssh", <SSHView />)}
      {state.activeView === "ide" && renderView("ide", <IDEView />)}
      {state.activeView === "git" && renderView("git", <GitView />)}
      {state.activeView === "api-lab" && renderView("api-lab", <ApiLabView />)}
      {state.activeView === "cli-maker" && renderView("cli-maker", <CliMakerView />)}
      {state.activeView === "browser" && renderView("browser", <BrowserView />)}
      {state.activeView === "tunnel" && renderView("tunnel", <TunnelView />)}
      {state.activeView === "share" && renderView("share", <ShareView />)}
      {state.activeView === "torrent" && renderView("torrent", <TorrentView />)}
      {state.activeView === "remote" && renderView("remote", <RemoteView />)}
      {state.activeView === "docs" && renderView("docs", <DocsView />)}
      {state.activeView === "prompt-lab" && renderView("prompt-lab", <PromptLabView />)}
      {state.activeView === "prompt-library" &&
        renderView("prompt-library", <PromptLibraryView state={state} dispatch={dispatch} />)}
      {state.activeView === "prompt-builder" &&
        renderView("prompt-builder", <PromptBuilderView state={state} dispatch={dispatch} />)}
      {state.activeView === "academy" && renderView("academy", <AcademyView />)}
      {state.activeView === "graph" && renderView("graph", <GraphView />)}
      {state.activeView === "scheduler" && renderView("scheduler", <SchedulerView />)}
      {state.activeView === "sync" && renderView("sync", <SyncView />)}
      {state.activeView === "orchestrator" &&
        renderView("orchestrator", <OrchestratorView />)}
      {state.activeView === "settings" &&
        renderView(
          "settings",
          <SettingsView state={state} dispatch={dispatch} actions={actions} />
        )}
      {state.activeView === "security" &&
        renderView("security", <SecurityView state={state} actions={actions} />)}
      {state.activeView === "api-key-vault" &&
        renderView("api-key-vault", <ApiKeyVaultView state={state} dispatch={dispatch} />)}
      {state.activeView === "themes" && renderView("themes", <ThemesView dispatch={dispatch} />)}
      {state.activeView === "exports" &&
        renderView("exports", <ExportsView state={state} actions={actions} />)}
      {state.activeView === "maintenance" &&
        renderView("maintenance", <MaintenanceView state={state} actions={actions} />)}
      {state.activeView === "recovery" &&
        renderView(
          "recovery",
          <RecoveryView state={state} dispatch={dispatch} actions={actions} />
        )}
      {state.activeView === "fonts" &&
        renderView("fonts", <FontManagerView state={state} dispatch={dispatch} />)}
      {state.activeView === "mcp" && renderView("mcp", <MCPView />)}
      {state.activeView === "dashboard" &&
        renderView("dashboard", <DashboardView state={state} dispatch={dispatch} />)}
      {state.activeView === "quickstart" &&
        renderView("quickstart", <QuickStartView state={state} dispatch={dispatch} />)}
      {state.activeView === "personas" &&
        renderView("personas", <PersonaManagerView state={state} />)}
      {state.activeView === "vpn" && renderView("vpn", <VPNView state={state} />)}
      {state.activeView === "lua-scripts" &&
        renderView("lua-scripts", <LuaScriptsView state={state} />)}
      {state.activeView === "plugin-permissions" &&
        renderView("plugin-permissions", <PluginPermissionsView state={state} />)}
      {state.activeView === "about" && renderView("about", <AboutView state={state} />)}
      {state.activeView === "update-center" &&
        renderView("update-center", <UpdateCenterView state={state} />)}
      {state.activeView === "release-notes" &&
        renderView("release-notes", <ReleaseNotesView state={state} />)}
      {state.activeView === "logs" && renderView("logs", <LogsView state={state} />)}
      {state.activeView === "ui-rollback" &&
        renderView("ui-rollback", <UIRollbackView state={state} />)}
      {state.activeView === "feature-tours" &&
        renderView("feature-tours", <FeatureTourView state={state} />)}
      {state.activeView === "ipc-map" &&
        renderView("ipc-map", <IPCConnectorMapView state={state} />)}
      {state.activeView === "dev-console" &&
        renderView("dev-console", <DevConsoleView state={state} />)}
      {state.activeView === "feature-flags" &&
        renderView("feature-flags", <FeatureFlagsView state={state} />)}
      {state.activeView === "data-connectors" &&
        renderView("data-connectors", <DataConnectorsView state={state} />)}
      {state.activeView === "brand-assets" &&
        renderView("brand-assets", <BrandAssetsView state={state} />)}
      {state.activeView === "release-checklist" &&
        renderView("release-checklist", <ReleaseChecklistView state={state} />)}
      {state.activeView === "permissions" &&
        renderView("permissions", <PermissionsView state={state} />)}
      {state.activeView === "controller-profile" &&
        renderView("controller-profile", <ControllerProfileView state={state} />)}
      {state.activeView === "backup" &&
        renderView("backup", <BackupRestoreView state={state} />)}
      {state.activeView === "archive" && renderView("archive", <ArchiveView />)}
      {state.activeView === "storage" &&
        renderView("storage", <StorageView dispatch={dispatch} />)}
      {state.activeView === "safe-mode" && renderView("safe-mode", <SafeModeScreen />)}
    </>
  );
}
