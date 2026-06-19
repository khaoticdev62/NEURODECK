import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { CheckCircle2, Command, Sparkles, X, AlertCircle, Info } from "lucide-react";
import { FocusTrapContainer } from "../components/primitives/FocusTrapContainer";
import { GlobalSearch } from "../components/search/GlobalSearch";
import { ViewLoader } from "./ViewLoader";
import { listenBridge } from "../services/bridgeAdapter";
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState, ViewId } from "../types/neurodeck";

const SettingsView = lazy(() =>
  import("../features/settings/SettingsView").then((m) => ({ default: m.default }))
);

interface BridgeNotification {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  timestamp: number;
}

const NOTIFICATION_EVENTS: Array<{ event: string; message: (data: unknown) => string; type: BridgeNotification["type"] }> = [
  { event: "transfer_completed", message: () => "File transfer completed", type: "success" },
  { event: "transfer_failed", message: (data) => `Transfer failed${data && typeof data === "object" && "transfer_id" in data ? `: ${(data as { transfer_id: string }).transfer_id}` : ""}`, type: "error" },
  { event: "plugin_reload_done", message: () => "Plugins reloaded", type: "success" },
  { event: "plugin_reload_error", message: (data) => `Plugin reload failed${data && typeof data === "object" && "error" in data ? `: ${(data as { error: string }).error}` : ""}`, type: "error" },
  { event: "workflow_started", message: (data) => `Workflow started${data && typeof data === "object" && "name" in data ? `: ${(data as { name: string }).name}` : ""}`, type: "info" },
  { event: "ollama_pull_done", message: (data) => `Model downloaded${data && typeof data === "object" && "model" in data ? `: ${(data as { model: string }).model}` : ""}`, type: "success" },
  { event: "hf_download_done", message: () => "HuggingFace download completed", type: "success" },
  { event: "hf_download_error", message: () => "HuggingFace download failed", type: "error" },
  { event: "command_done", message: () => "Command completed", type: "success" },
  { event: "persona_changed", message: (data) => `Persona changed${typeof data === "string" ? ` to ${data}` : ""}`, type: "info" },
];

const MAX_NOTIFICATIONS = 20;

function useBridgeNotifications() {
  const [notifications, setNotifications] = useState<BridgeNotification[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    const unsubs: Array<() => void> = [];
    for (const { event, message, type } of NOTIFICATION_EVENTS) {
      const unsub = listenBridge(event, (data: unknown) => {
        setNotifications((prev) => {
          const next: BridgeNotification = {
            id: `${event}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            message: message(data),
            type,
            timestamp: Date.now(),
          };
          return [next, ...prev].slice(0, MAX_NOTIFICATIONS);
        });
      });
      if (unsub) unsubs.push(unsub);
    }
    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, []);

  return { notifications, dismiss, clearAll };
}

export type AppOverlaysProps = {
  state: NeuroDeckState;
  dispatch: React.Dispatch<NeuroDeckAction>;
  actions: NeuroDeckAppActions;
  settingsOpen: boolean;
  settingsPanel: string;
  setSettingsPanel: (panel: string) => void;
  setSettingsOpen: (value: boolean) => void;
  settingsDialogRef: React.RefObject<HTMLDivElement | null>;
  notificationsOpen: boolean;
  setNotificationsOpen: (value: boolean) => void;
  notifDialogRef: React.RefObject<HTMLDivElement | null>;
  shortcutsOpen: boolean;
  setShortcutsOpen: (value: boolean) => void;
  shortcutsDialogRef: React.RefObject<HTMLDivElement | null>;
  ctrlPromptOpen: boolean;
  setCtrlPromptOpen: (value: boolean) => void;
  ctrlPromptDialogRef: React.RefObject<HTMLDivElement | null>;
  quickSwitcherOpen: boolean;
  setQuickSwitcherOpen: (value: boolean) => void;
  quickSwitcherDialogRef: React.RefObject<HTMLDivElement | null>;
  recentViews: ViewId[];
  quickSwitcherFocusIdx: number;
};

export function AppOverlays({
  state,
  dispatch,
  actions,
  settingsOpen,
  settingsPanel,
  setSettingsPanel,
  setSettingsOpen,
  settingsDialogRef,
  notificationsOpen,
  setNotificationsOpen,
  notifDialogRef,
  shortcutsOpen,
  setShortcutsOpen,
  shortcutsDialogRef,
  ctrlPromptOpen,
  setCtrlPromptOpen,
  ctrlPromptDialogRef,
  quickSwitcherOpen,
  setQuickSwitcherOpen,
  quickSwitcherDialogRef,
  recentViews,
  quickSwitcherFocusIdx,
}: AppOverlaysProps) {
  const { notifications, dismiss, clearAll } = useBridgeNotifications();
  const notifCount = notifications.length;
  return (
    <>
      {/* Settings overlay */}
      <div
        id="settings-overlay"
        data-controller-overlay={settingsOpen ? "true" : undefined}
        className={`settings-overlay ${settingsOpen ? "active" : ""}`}
        onMouseDown={() => setSettingsOpen(false)}
      >
        {settingsOpen && (
          <FocusTrapContainer
            active={settingsOpen}
            onEscape={() => setSettingsOpen(false)}
            className="contents"
          >
            <div
              ref={settingsDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-dialog-title"
              tabIndex={-1}
              className="settings-modal-card absolute inset-3 rounded-3xl border border-nd-text-muted/15 p-0 shadow-2xl shadow-nd-accent/10 outline-none"
              data-settings-theme={settingsPanel}
              data-controller-zone="dialog"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <span id="settings-dialog-title" className="sr-only">
                Settings
              </span>
              <div className="h-full min-h-0">
                <Suspense fallback={<ViewLoader />}>
                  <SettingsView
                    key={settingsPanel}
                    state={state}
                    dispatch={dispatch}
                    actions={actions}
                    onPanelChange={setSettingsPanel}
                    onClose={() => setSettingsOpen(false)}
                  />
                </Suspense>
              </div>
            </div>
          </FocusTrapContainer>
        )}
      </div>

      {/* Notifications overlay */}
      <div
        id="notif-modal"
        data-controller-overlay={notificationsOpen ? "true" : undefined}
        className={`fixed inset-0 z-modal bg-nd-bg/55 backdrop-blur-sm transition-opacity duration-200 ${notificationsOpen ? "active" : "pointer-events-none opacity-0"}`}
        onMouseDown={() => setNotificationsOpen(false)}
      >
        {notificationsOpen && (
          <FocusTrapContainer
            active={notificationsOpen}
            onEscape={() => setNotificationsOpen(false)}
            className="contents"
          >
            <div
              ref={notifDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="notif-dialog-title"
              tabIndex={-1}
              className="notif-modal-card absolute right-4 top-14 w-[360px] rounded-3xl border border-nd-text-muted/15 bg-nd-bg/96 p-4 shadow-2xl shadow-nd-accent/10 outline-none"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 id="notif-dialog-title" className="text-sm font-semibold text-nd-text">
                  Notifications {notifCount > 0 && <span className="ml-1 text-xs text-nd-text-muted">({notifCount})</span>}
                </h2>
                <div className="flex items-center gap-2">
                  {notifCount > 0 && (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-2xs text-nd-text-muted hover:text-nd-text"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    id="close-notif-x"
                    type="button"
                    onClick={() => setNotificationsOpen(false)}
                    className="rounded-lg border border-nd-text-muted/15 px-2 py-1 text-2xs text-nd-text-muted hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                  >
                    Close
                  </button>
                </div>
              </div>
              {notifications.length === 0 ? (
                <p className="mt-3 text-sm text-nd-text-muted">No notifications.</p>
              ) : (
                <ul className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto">
                  {notifications.map((n) => {
                    const Icon = n.type === "success" ? CheckCircle2 : n.type === "error" ? AlertCircle : Info;
                    return (
                      <li
                        key={n.id}
                        className="flex items-start gap-2 rounded-lg border border-nd-border-subtle bg-nd-surface-tertiary/30 p-2"
                      >
                        <Icon
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            n.type === "success"
                              ? "text-nd-accent-success"
                              : n.type === "error"
                                ? "text-nd-accent-danger"
                                : "text-nd-accent"
                          }`}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-nd-text">{n.message}</p>
                          <p className="text-2xs text-nd-text-muted">
                            {new Date(n.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => dismiss(n.id)}
                          aria-label="Dismiss notification"
                          className="rounded p-1 text-nd-text-muted hover:text-nd-text"
                        >
                          <X className="h-3 w-3" aria-hidden />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </FocusTrapContainer>
        )}
      </div>

      {/* Keyboard shortcuts overlay */}
      <div
        id="shortcuts-overlay"
        data-controller-overlay={shortcutsOpen ? "true" : undefined}
        className={`fixed inset-0 z-modal bg-nd-bg/55 backdrop-blur-sm ${shortcutsOpen ? "" : "hidden"}`}
        onMouseDown={() => setShortcutsOpen(false)}
      >
        {shortcutsOpen && (
          <FocusTrapContainer
            active={shortcutsOpen}
            onEscape={() => setShortcutsOpen(false)}
            className="contents"
          >
            <div
              ref={shortcutsDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="shortcuts-dialog-title"
              tabIndex={-1}
              className="absolute left-1/2 top-16 z-modal w-[760px] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-3xl border border-nd-text-muted/15 bg-nd-bg/96 p-5 shadow-2xl shadow-nd-accent/10 outline-none"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 id="shortcuts-dialog-title" className="text-sm font-semibold text-nd-text">
                  Keyboard Shortcuts
                </h2>
                <button
                  type="button"
                  onClick={() => setShortcutsOpen(false)}
                  aria-label="Close shortcuts"
                  className="rounded-lg p-1 text-nd-text-muted hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                {[
                  ["Ctrl / ⌘ + K", "Open command palette"],
                  ["Ctrl + Tab", "Quick view switcher"],
                  ["Ctrl / ⌘ + Enter", "Run assistant"],
                  ["Ctrl + Shift + P", "Controller prompt"],
                  ["?", "Show this help"],
                  ["Escape", "Close overlay"],
                  ["Ctrl + 1–9", "Jump to view (Chat → Sessions)"],
                  ["Ctrl + 0", "Open settings"],
                  ["Ctrl + D", "Diagnostics"],
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between gap-3 py-1">
                    <span className="text-xs text-nd-text-muted">{label}</span>
                    <kbd className="rounded border border-nd-text-muted/20 bg-nd-surface/60 px-2 py-0.5 text-[10px] font-mono text-nd-accent">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </FocusTrapContainer>
        )}
      </div>

      {/* Controller prompt overlay */}
      {ctrlPromptOpen && (
        <div
          id="ctrl-prompt-overlay"
          data-controller-overlay="true"
          className={`fixed inset-0 z-modal bg-nd-bg/55 backdrop-blur-sm ${ctrlPromptOpen ? "active" : ""}`}
          onMouseDown={() => setCtrlPromptOpen(false)}
        >
          <FocusTrapContainer
            active={ctrlPromptOpen}
            onEscape={() => setCtrlPromptOpen(false)}
            ref={ctrlPromptDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ctrlprompt-dialog-title"
            tabIndex={-1}
            className="absolute left-1/2 top-20 z-modal w-[720px] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-3xl border border-nd-text-muted/15 bg-nd-bg/96 p-4 shadow-2xl shadow-nd-accent/10 outline-none"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <div
                id="ctrlprompt-dialog-title"
                className="ctrl-prompt-title flex items-center gap-2 text-sm font-semibold text-nd-text"
              >
                <Sparkles className="nd-icon-svg h-4 w-4 text-nd-accent" aria-hidden="true" />
                <span className="ctrl-prompt-cat-icon inline-flex h-6 w-6 items-center justify-center rounded-lg border border-nd-text-muted/15 bg-nd-surface/50">
                  <Command
                    className="nd-icon-svg h-3.5 w-3.5 text-nd-text/90"
                    aria-hidden="true"
                  />
                </span>
                Controller Prompt
              </div>
              <button
                type="button"
                onClick={() => setCtrlPromptOpen(false)}
                aria-label="Close controller prompt"
                className="rounded-lg p-1 text-nd-text-muted hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-nd-text-muted">
              Press B to close, R4 to accept suggestions, R5 hold to execute, and L5 to save or
              record PromptDrive macros.
            </p>
          </FocusTrapContainer>
        </div>
      )}

      {/* Quick switcher overlay */}
      <div
        id="quick-switcher-overlay"
        data-controller-overlay={quickSwitcherOpen ? "true" : undefined}
        className={`fixed inset-0 z-modal bg-nd-bg/55 backdrop-blur-sm transition-opacity duration-150 ${quickSwitcherOpen ? "active" : "pointer-events-none opacity-0"}`}
        onMouseDown={() => setQuickSwitcherOpen(false)}
      >
        {quickSwitcherOpen && (
          <FocusTrapContainer
            active={quickSwitcherOpen}
            onEscape={() => setQuickSwitcherOpen(false)}
            ref={quickSwitcherDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="qs-dialog-title"
            tabIndex={-1}
            className="absolute left-1/2 top-20 z-modal w-[520px] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-3xl border border-nd-text-muted/15 bg-nd-bg/96 p-4 shadow-2xl shadow-nd-accent/10 outline-none"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 id="qs-dialog-title" className="text-sm font-semibold text-nd-text">
              Quick Switcher
            </h2>
            <div
              id="quick-switcher-list"
              role="listbox"
              aria-label="Recent views"
              aria-activedescendant={
                recentViews.slice(1)[quickSwitcherFocusIdx]
                  ? `qs-item-${recentViews.slice(1)[quickSwitcherFocusIdx]}`
                  : undefined
              }
              className="mt-3 space-y-1"
            >
              {recentViews.slice(1).map((view, index) => (
                <button
                  id={`qs-item-${view}`}
                  key={view}
                  type="button"
                  role="option"
                  aria-selected={index === quickSwitcherFocusIdx}
                  data-qs-item
                  className={`quick-switcher-item flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${index === quickSwitcherFocusIdx ? "active border-nd-accent/35 bg-nd-accent/10 text-nd-accent" : "border-nd-text-muted/15 bg-nd-surface/40 text-nd-text/80 hover:bg-nd-surface/60"}`}
                  onClick={() => {
                    dispatch({ type: "set-view", view });
                    setQuickSwitcherOpen(false);
                  }}
                >
                  <span className="capitalize">{view.replace(/-/g, " ")}</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-nd-text-muted">
                    {index === 0 ? "previous" : "recent"}
                  </span>
                </button>
              ))}
              {!recentViews.slice(1).length && (
                <p className="py-2 text-sm text-nd-text-muted">
                  Visit two or more views to use quick switcher.
                </p>
              )}
            </div>
          </FocusTrapContainer>
        )}
      </div>

      {/* Global search overlay */}
      <GlobalSearch
        open={state.searchOpen}
        onClose={() => dispatch({ type: "toggle-search", open: false })}
        dispatch={dispatch}
      />
    </>
  );
}
