import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusRestoration } from "./hooks/useFocusRestoration";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { SplashScreen } from "./components/app/SplashScreen";
import { CommandPalette } from "./components/command/CommandPalette";
import { OnboardingModal } from "./components/onboarding/OnboardingModal";
import { OnboardingProvider } from "./onboarding/OnboardingProvider";
import { ControllerHintBar } from "./components/layout/ControllerHintBar";
import { PrimarySidebar } from "./components/layout/PrimarySidebar";
import { SecondaryRail } from "./components/layout/SecondaryRail";
import { TitleBar } from "./components/layout/TitleBar";
import { Badge } from "./components/primitives/Badge";
import { ToastProvider } from "./components/primitives/Toast";
import { LiveWallpaperHost } from "./features/wallpapers/LiveWallpaperHost";
import { ControllerDebugOverlay } from "./input/controller/ControllerDebugOverlay";
import { ControllerHelpOverlay } from "./input/controller/ControllerHelpOverlay";
import { ControllerProvider } from "./input/controller/ControllerProvider";
import { useTheme } from "./theme/useTheme";
import { neurodeckApi } from "./services/bridgeAdapter";
import { useNeuroDeckState } from "./state/useNeuroDeckState";
import type { ViewId } from "./types/neurodeck";
import { fontOptions, navItems } from "./types/seed";
import { useAppActions } from "./app/useAppActions";
import { useAppKeyboard } from "./app/useAppKeyboard";
import { AppOverlays } from "./app/AppOverlays";
import { AppViewRouter } from "./app/AppViewRouter";

export default function App() {
  const { state, dispatch, resetLocalState, selectors } = useNeuroDeckState();
  const { activeTheme } = useTheme();
  const shellRef = useRef<HTMLDivElement>(null);
  const shortcutSinkRef = useRef<HTMLInputElement>(null);
  const settingsDialogRef = useRef<HTMLDivElement>(null);
  const notifDialogRef = useRef<HTMLDivElement>(null);
  const shortcutsDialogRef = useRef<HTMLDivElement>(null);
  const ctrlPromptDialogRef = useRef<HTMLDivElement>(null);
  const quickSwitcherDialogRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsPanel, setSettingsPanel] = useState("general");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const [quickSwitcherFocusIdx, setQuickSwitcherFocusIdx] = useState(0);
  const [ctrlPromptOpen, setCtrlPromptOpen] = useState(false);
  const [recentViews, setRecentViews] = useState<ViewId[]>([]);

  useEffect(() => {
    const loader = document.getElementById("boot-loader");
    if (loader) {
      const t = setTimeout(() => {
        loader.classList.add("done");
      }, 100);
      const t2 = setTimeout(() => {
        loader.remove();
      }, 700);
      return () => {
        clearTimeout(t);
        clearTimeout(t2);
      };
    }
  }, []);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onDiagnosticsPing) return;
    const unsubscribe = api.onDiagnosticsPing((data) => {
      api.diagnosticsPong({ requestId: data.requestId }).catch(() => {});
    });
    return unsubscribe;
  }, []);

  const selectedModel =
    state.models.find((model) => model.id === state.selectedModelId) ??
    state.models.find((model) => model.backendModel === state.selectedModelId) ??
    state.models[0];
  const modelName =
    state.selectedProvider === "offline-draft"
      ? "NeuroDraft"
      : (selectedModel?.name ?? state.selectedModelId ?? "default");
  const selectedBackendModel =
    selectedModel?.backendModel ?? selectedModel?.id ?? "neurodraft-local";

  useEffect(() => {
    setRecentViews((current) => {
      const next = current.filter((view) => view !== state.activeView);
      return [state.activeView, ...next].slice(0, 8);
    });
  }, [state.activeView]);

  useFocusRestoration(settingsDialogRef, settingsOpen);
  useFocusRestoration(notifDialogRef, notificationsOpen);
  useFocusRestoration(shortcutsDialogRef, shortcutsOpen);
  useFocusRestoration(ctrlPromptDialogRef, ctrlPromptOpen);
  useFocusRestoration(
    quickSwitcherDialogRef,
    quickSwitcherOpen,
    () => setQuickSwitcherFocusIdx(0),
    "button[data-qs-item]"
  );

  useEffect(() => {
    if (state.activeView !== "browser") {
      neurodeckApi.browser.hide();
    }
  }, [state.activeView]);

  const appActions = useAppActions({
    state,
    dispatch,
    selectors,
    modelName,
    selectedBackendModel,
    activeTheme,
    resetLocalState,
  });

  const openSettings = useCallback((panel = "general") => {
    localStorage.setItem("settingsActivePanel", `sp-${panel}`);
    setSettingsPanel(panel);
    setSettingsOpen(true);
  }, []);

  const { checkAiHealth } = appActions;
  useEffect(() => {
    void checkAiHealth();
  }, [checkAiHealth]);

  useEffect(() => {
    if (!state.hydrated) return;
    requestAnimationFrame(() => shortcutSinkRef.current?.focus({ preventScroll: true }));
  }, [state.hydrated]);

  useAppKeyboard({
    dispatch,
    runAssistant: appActions.runAssistant,
    recentViews,
    quickSwitcherOpen,
    setQuickSwitcherOpen,
    quickSwitcherFocusIdx,
    setQuickSwitcherFocusIdx,
    quickSwitcherDialogRef,
    settingsOpen,
    setSettingsOpen,
    notificationsOpen,
    setNotificationsOpen,
    shortcutsOpen,
    setShortcutsOpen,
    ctrlPromptOpen,
    setCtrlPromptOpen,
    commandOpen: state.commandOpen,
  });

  const activeFont = useMemo(
    () => fontOptions.find((f) => f.id === state.selectedFont) ?? fontOptions[0],
    [state.selectedFont]
  );

  const titleSubtitle = [
    state.activeProject?.name ?? state.statusBar?.session?.id ?? "NEURODECK",
    modelName,
    state.selectedPersona,
  ]
    .filter(Boolean)
    .join(" / ");

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    shell.style.setProperty("--nd-font-ui", activeFont.family);
    document.documentElement.style.setProperty("--nd-font-ui", activeFont.family);
  }, [activeFont]);

  if (!state.hydrated) {
    return (
      <SplashScreen
        onOpenDiagnostics={() => {
          dispatch({ type: "hydrate", payload: null });
          dispatch({ type: "set-view", view: "diagnostics" });
        }}
      />
    );
  }

  return (
    <OnboardingProvider state={state} dispatch={dispatch}>
      <ToastProvider>
        <ControllerProvider
          activeView={state.activeView}
          settings={state.controllerSettings}
          onSettingsChange={(next) => dispatch({ type: "set-controller-settings", settings: next })}
          onOpenCommandPalette={() => dispatch({ type: "toggle-command", open: true })}
          onCloseCommandPalette={() => dispatch({ type: "toggle-command", open: false })}
          onOpenSettings={openSettings}
          onOpenHelp={() => {}}
          onNavigatePreviousView={() => {
            const index = navItems.findIndex((item) => item.id === state.activeView);
            if (index > 0) {
              dispatch({ type: "set-view", view: navItems[index - 1].id });
            }
          }}
          onNavigateNextView={() => {
            const index = navItems.findIndex((item) => item.id === state.activeView);
            if (index >= 0 && index < navItems.length - 1) {
              dispatch({ type: "set-view", view: navItems[index + 1].id });
            }
          }}
          onBack={() => {
            if (state.commandOpen) {
              dispatch({ type: "toggle-command", open: false });
              return;
            }
            if (settingsOpen) {
              setSettingsOpen(false);
              return;
            }
            if (notificationsOpen) {
              setNotificationsOpen(false);
              return;
            }
            if (quickSwitcherOpen) {
              setQuickSwitcherOpen(false);
              return;
            }
            if (shortcutsOpen) {
              setShortcutsOpen(false);
              return;
            }
            if (ctrlPromptOpen) {
              setCtrlPromptOpen(false);
            }
            if (state.activeView === "browser") {
              (
                window as unknown as { __neurodeckBrowserBack?: () => void }
              ).__neurodeckBrowserBack?.();
              return;
            }
            dispatch({ type: "set-view", view: "chat" });
          }}
          onEmergencyEscape={() => {
            setSettingsOpen(false);
            setNotificationsOpen(false);
            setShortcutsOpen(false);
            setQuickSwitcherOpen(false);
            setCtrlPromptOpen(false);
            dispatch({ type: "toggle-command", open: false });
            dispatch({ type: "set-view", view: "chat" });
          }}
          onOpenSearch={() => {
            const target = document.querySelector<HTMLElement>(
              "#command-palette-input, #browser-address-input, #user-input, input[type='search'], input[placeholder*='Search'], input[placeholder*='search'], input[placeholder*='address'], textarea"
            );
            target?.focus();
            target?.scrollIntoView({ block: "nearest", inline: "nearest" });
          }}
          onReload={() => {
            if (state.activeView === "browser") {
              (
                window as unknown as { __neurodeckBrowserReload?: () => void }
              ).__neurodeckBrowserReload?.();
              return;
            }
            void appActions.runAssistant();
          }}
          onSave={() => {
            if (state.activeView === "browser") {
              (
                window as unknown as { __neurodeckBrowserFavorite?: () => void }
              ).__neurodeckBrowserFavorite?.();
              return;
            }
            void appActions.saveSession();
          }}
          onRegenerate={() => {
            void appActions.runAssistant();
          }}
          onNewContextAction={() => {
            if (state.activeView === "browser") {
              (
                window as unknown as { __neurodeckBrowserNewTab?: () => void }
              ).__neurodeckBrowserNewTab?.();
              return;
            }
            dispatch({ type: "set-view", view: "sessions" });
          }}
          onToggleFullscreen={() => {
            void window.electronAPI
              ?.getIsKiosk?.()
              .then((isKiosk) => window.electronAPI?.setKiosk?.(!isKiosk));
          }}
        >
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[var(--nd-z-toast)] focus:rounded-lg focus:bg-nd-accent focus:px-3 focus:py-2 focus:text-nd-bg focus:text-sm focus:font-semibold"
          >
            Skip to main content
          </a>
          <div
            id="app-shell"
            ref={shellRef}
            data-controller-screen="app-shell"
            data-onboarding-anchor="app-shell"
            data-density={state.deckMode ? "deck" : "comfortable"}
            className={`flex h-full flex-col overflow-hidden tactical-grid outline-none ${state.deckMode ? "text-[15px]" : ""}`}
            style={{ color: "var(--nd-text)" }}
          >
            <input
              ref={shortcutSinkRef}
              id="shortcut-sink"
              tabIndex={0}
              aria-label="Shortcut listener"
              className="pointer-events-none absolute left-0 top-0 h-2 w-2 opacity-0"
            />
            <div className="app-background-container" aria-hidden="true">
              <LiveWallpaperHost />
            </div>
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="pointer-events-none"
            >
              {state.busyLabel && (
                <div className="fixed left-1/2 top-14 z-toast -translate-x-1/2 rounded-full border border-nd-accent/25 bg-nd-bg/95 px-4 py-2 shadow-2xl shadow-nd-accent/10">
                  <span className="inline-flex items-center gap-2 text-2xs font-semibold text-nd-accent">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />{" "}
                    {state.busyLabel}
                  </span>
                </div>
              )}
            </div>
            {state.lastError && (
              <div
                role="alert"
                className="fixed right-4 top-16 z-toast w-[360px] rounded-3xl border border-nd-danger/30 bg-nd-bg/95 p-4 shadow-2xl shadow-nd-danger/10"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className="mt-0.5 h-5 w-5 shrink-0 text-nd-danger"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <Badge tone="danger">Action needed</Badge>
                    <h3 className="mt-2 font-semibold text-nd-text">{state.lastError.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-nd-text-muted">
                      {state.lastError.message}
                    </p>
                    {state.lastError.action && (
                      <p className="mt-2 text-2xs text-nd-text-muted">{state.lastError.action}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label="Dismiss error"
                    onClick={() => dispatch({ type: "set-error", error: null })}
                    className="rounded-xl border border-nd-text-muted/15 p-2 text-nd-text-muted transition hover:text-nd-text"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
            <TitleBar subtitle={titleSubtitle} />
            <div className="flex min-h-0 flex-1">
              <PrimarySidebar
                state={state}
                dispatch={dispatch}
                onOpenSettings={() => openSettings("general")}
                onOpenNotifications={() => setNotificationsOpen(true)}
              />
              <main
                id="main-content"
                data-onboarding-anchor="main-content"
                className="min-w-0 flex-1 overflow-hidden p-3 md:p-4"
              >
                <div className="view-container h-full min-h-0">
                  <AppViewRouter state={state} dispatch={dispatch} selectors={selectors} actions={appActions} />
                </div>
              </main>
              <SecondaryRail state={state} dispatch={dispatch} selectors={selectors} />
            </div>
            {state.deckMode && <ControllerHintBar />}
            <ControllerHelpOverlay />
            <ControllerDebugOverlay />
            <CommandPalette
              state={state}
              dispatch={dispatch}
              actions={appActions}
              onOpenSettings={openSettings}
            />

            <AppOverlays
              state={state}
              dispatch={dispatch}
              actions={appActions}
              settingsOpen={settingsOpen}
              settingsPanel={settingsPanel}
              setSettingsPanel={setSettingsPanel}
              setSettingsOpen={setSettingsOpen}
              settingsDialogRef={settingsDialogRef}
              notificationsOpen={notificationsOpen}
              setNotificationsOpen={setNotificationsOpen}
              notifDialogRef={notifDialogRef}
              shortcutsOpen={shortcutsOpen}
              setShortcutsOpen={setShortcutsOpen}
              shortcutsDialogRef={shortcutsDialogRef}
              ctrlPromptOpen={ctrlPromptOpen}
              setCtrlPromptOpen={setCtrlPromptOpen}
              ctrlPromptDialogRef={ctrlPromptDialogRef}
              quickSwitcherOpen={quickSwitcherOpen}
              setQuickSwitcherOpen={setQuickSwitcherOpen}
              quickSwitcherDialogRef={quickSwitcherDialogRef}
              recentViews={recentViews}
              quickSwitcherFocusIdx={quickSwitcherFocusIdx}
            />

            {state.showOnboarding && state.onboardingMode === "setup" && (
              <OnboardingModal state={state} dispatch={dispatch} />
            )}
          </div>
        </ControllerProvider>
      </ToastProvider>
    </OnboardingProvider>
  );
}
