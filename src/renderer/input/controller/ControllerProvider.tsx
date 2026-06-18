import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  ControllerAction,
  ControllerRuntimeState,
  ControllerSettings,
} from "../../shared/types/controller";
import { createActionRouter } from "./actionRouter";
import { controllerRuntimeDefaults } from "./controllerStore";
import { axisToStep } from "./deadzone";
import { applyFocusGraph, findInteractiveRoot, focusDefault, moveSpatialFocus } from "./focusGraph";
import { mapButtonsToActions, mapGamepadDevice } from "./gamepadMapper";
import { pulseHaptics } from "./haptics";
import { RepeatManager } from "./repeatManager";

interface ControllerContextValue {
  runtime: ControllerRuntimeState;
  settings: ControllerSettings;
  requestAction: (action: ControllerAction) => Promise<boolean>;
  registerActionHandler: (
    action: ControllerAction,
    handler: () => boolean | void | Promise<boolean | void>
  ) => () => void;
  setHelpOverlayOpen: (open: boolean) => void;
  setDebugOverlayOpen: (open: boolean) => void;
  focusDefaultElement: () => void;
}

interface ControllerProviderProps {
  children: ReactNode;
  activeView: string;
  settings: ControllerSettings;
  onSettingsChange: (next: Partial<ControllerSettings>) => void;
  onOpenCommandPalette: () => void;
  onCloseCommandPalette: () => void;
  onOpenSettings: (panel?: string) => void;
  onOpenHelp: () => void;
  onNavigatePreviousView: () => void;
  onNavigateNextView: () => void;
  onBack: () => void;
  onEmergencyEscape: () => void;
  onOpenSearch: () => void;
  onReload: () => void;
  onSave: () => void;
  onRegenerate: () => void;
  onNewContextAction: () => void;
  onToggleFullscreen: () => void;
}

const noopContext: ControllerContextValue = {
  runtime: controllerRuntimeDefaults,
  settings: {
    enabled: false,
    preferredProfile: "generic",
    glyphStyle: "generic",
    confirmButton: "south",
    stickDeadzone: 0.28,
    triggerThreshold: 0.45,
    initialRepeatDelayMs: 350,
    repeatIntervalMs: 85,
    buttonDebounceMs: 120,
    scrollSpeed: 1,
    hapticsEnabled: false,
    showHints: false,
    reducedMotion: false,
    browserActionLayerEnabled: true,
    terminalActionLayerEnabled: true,
    textInputAssistEnabled: true,
    preferSteamDeckLayout: false,
  },
  requestAction: async () => false,
  registerActionHandler: () => () => {},
  setHelpOverlayOpen: () => {},
  setDebugOverlayOpen: () => {},
  focusDefaultElement: () => {},
};

const ControllerContext = createContext<ControllerContextValue>(noopContext);

function getLastInputSource(event: Event): ControllerRuntimeState["lastInputSource"] {
  if (event.type.startsWith("mouse")) return "mouse";
  if (event.type.startsWith("touch")) return "touch";
  return "keyboard";
}

export function ControllerProvider({
  children,
  activeView,
  settings,
  onOpenCommandPalette,
  onOpenSettings,
  onOpenHelp,
  onNavigatePreviousView,
  onNavigateNextView,
  onBack,
  onEmergencyEscape,
  onOpenSearch,
  onReload,
  onSave,
  onRegenerate,
  onNewContextAction,
  onToggleFullscreen,
}: ControllerProviderProps) {
  const routerRef = useRef(createActionRouter());
  const repeatManagerRef = useRef(new RepeatManager());
  const rafRef = useRef<number | null>(null);
  const lastButtonFireRef = useRef(new Map<ControllerAction, number>());
  const [runtime, setRuntime] = useState<ControllerRuntimeState>(controllerRuntimeDefaults);

  const updateRuntime = useCallback((patch: Partial<ControllerRuntimeState>) => {
    setRuntime((current) => ({ ...current, ...patch }));
  }, []);

  const focusDefaultElement = useCallback(() => {
    const root = findInteractiveRoot();
    const focused = applyFocusGraph(null) ?? focusDefault(root);
    updateRuntime({
      currentFocusNodeId: focused?.id || undefined,
      currentFocusZone: focused?.closest<HTMLElement>("[data-controller-zone]")?.dataset
        .controllerZone as ControllerRuntimeState["currentFocusZone"] | undefined,
      currentScreenId:
        focused?.closest<HTMLElement>("[data-controller-screen]")?.dataset.controllerScreen ??
        activeView,
    });
  }, [activeView, updateRuntime]);

  const defaultActionHandler = useCallback(
    async (action: ControllerAction): Promise<boolean> => {
      switch (action) {
        case "confirm": {
          const active = document.activeElement as HTMLElement | null;
          if (!active) {
            focusDefaultElement();
            return true;
          }
          if (active.matches("input, textarea, select")) {
            active.focus();
            return true;
          }
          active.click?.();
          return true;
        }
        case "cancel":
        case "back":
          onBack();
          return true;
        case "openCommandPalette":
        case "openQuickActions":
          onOpenCommandPalette();
          return true;
        case "openSearch":
          onOpenSearch();
          return true;
        case "openMainMenu":
          onOpenSettings("general");
          return true;
        case "openHelp":
        case "openControllerOverlay":
          updateRuntime({ helpOverlayOpen: true });
          onOpenHelp();
          return true;
        case "focusNext": {
          const root = findInteractiveRoot();
          const items = Array.from(
            root.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
            )
          );
          const index = items.findIndex((item) => item === document.activeElement);
          const target = items[index + 1] ?? items[0];
          target?.focus();
          target?.scrollIntoView({ block: "nearest" });
          return true;
        }
        case "focusPrevious": {
          const root = findInteractiveRoot();
          const items = Array.from(
            root.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
            )
          );
          const index = items.findIndex((item) => item === document.activeElement);
          const target = items[index - 1] ?? items[items.length - 1];
          target?.focus();
          target?.scrollIntoView({ block: "nearest" });
          return true;
        }
        case "focusUp":
          moveSpatialFocus("up");
          return true;
        case "focusDown":
          moveSpatialFocus("down");
          return true;
        case "focusLeft":
          moveSpatialFocus("left");
          return true;
        case "focusRight":
          moveSpatialFocus("right");
          return true;
        case "scrollUp":
        case "pageUp": {
          const root = findInteractiveRoot();
          root.scrollBy({
            top: -180 * settings.scrollSpeed,
            behavior: settings.reducedMotion ? "auto" : "smooth",
          });
          return true;
        }
        case "scrollDown":
        case "pageDown": {
          const root = findInteractiveRoot();
          root.scrollBy({
            top: 180 * settings.scrollSpeed,
            behavior: settings.reducedMotion ? "auto" : "smooth",
          });
          return true;
        }
        case "previousTab":
          onNavigatePreviousView();
          return true;
        case "nextTab":
          onNavigateNextView();
          return true;
        case "newTab":
          onNewContextAction();
          return true;
        case "reload":
          onReload();
          return true;
        case "save":
          onSave();
          return true;
        case "regenerate":
          onRegenerate();
          return true;
        case "toggleFullscreen":
          onToggleFullscreen();
          return true;
        case "emergencyEscape":
          onEmergencyEscape();
          return true;
        default:
          return false;
      }
    },
    [
      focusDefaultElement,
      onBack,
      onEmergencyEscape,
      onNavigateNextView,
      onNavigatePreviousView,
      onNewContextAction,
      onOpenCommandPalette,
      onOpenHelp,
      onOpenSearch,
      onOpenSettings,
      onRegenerate,
      onReload,
      onSave,
      onToggleFullscreen,
      settings.reducedMotion,
      settings.scrollSpeed,
      updateRuntime,
    ]
  );

  const requestAction = useCallback(
    async (action: ControllerAction) => {
      const handled = await routerRef.current.invoke(action);
      if (!handled) {
        await defaultActionHandler(action);
      }
      updateRuntime({
        lastAction: action,
        currentFocusNodeId: (document.activeElement as HTMLElement | null)?.id || undefined,
        currentFocusZone: (document.activeElement as HTMLElement | null)?.closest<HTMLElement>(
          "[data-controller-zone]"
        )?.dataset.controllerZone as ControllerRuntimeState["currentFocusZone"] | undefined,
        currentScreenId:
          (document.activeElement as HTMLElement | null)?.closest<HTMLElement>(
            "[data-controller-screen]"
          )?.dataset.controllerScreen ?? activeView,
      });
      return true;
    },
    [activeView, defaultActionHandler, updateRuntime]
  );

  useEffect(() => {
    updateRuntime({ currentScreenId: activeView });
  }, [activeView, updateRuntime]);

  useEffect(() => {
    const recordInput = (event: Event) => {
      updateRuntime({ lastInputSource: getLastInputSource(event) });
    };

    window.addEventListener("keydown", recordInput, true);
    window.addEventListener("mousedown", recordInput, true);
    window.addEventListener("touchstart", recordInput, true);

    return () => {
      window.removeEventListener("keydown", recordInput, true);
      window.removeEventListener("mousedown", recordInput, true);
      window.removeEventListener("touchstart", recordInput, true);
    };
  }, [updateRuntime]);

  useEffect(() => {
    if (!settings.enabled || typeof navigator.getGamepads !== "function") {
      updateRuntime({
        connectionStatus: typeof navigator.getGamepads !== "function" ? "unsupported" : "none",
      });
      return;
    }

    const scan = async () => {
      const gamepads = Array.from(navigator.getGamepads?.() ?? []).filter(
        (item): item is Gamepad => item !== null
      );
      const devices = gamepads.map(mapGamepadDevice);
      const activePad = gamepads[0] ?? null;

      updateRuntime({
        devices,
        activeDeviceId: devices[0]?.id,
        connectionStatus: devices.length > 0 ? "connected" : "none",
      });

      if (!activePad) {
        rafRef.current = window.requestAnimationFrame(scan);
        return;
      }

      const actions = mapButtonsToActions(
        activePad,
        settings.confirmButton,
        settings.triggerThreshold
      );
      const now = performance.now();

      for (const action of actions) {
        const repeated =
          action === "focusUp" ||
          action === "focusDown" ||
          action === "focusLeft" ||
          action === "focusRight" ||
          action === "pageUp" ||
          action === "pageDown";

        if (repeated) {
          const decision = repeatManagerRef.current.decide(
            action,
            true,
            now,
            settings.initialRepeatDelayMs,
            settings.repeatIntervalMs
          );
          if (!decision.fire) continue;
        } else {
          const lastAt = lastButtonFireRef.current.get(action) ?? 0;
          if (now - lastAt < settings.buttonDebounceMs) continue;
          lastButtonFireRef.current.set(action, now);
        }

        await requestAction(action);
        await pulseHaptics(activePad, settings.hapticsEnabled, action === "confirm" ? 0.24 : 0.14);
      }

      const horizontal = axisToStep(activePad.axes[0] ?? 0, settings.stickDeadzone);
      const vertical = axisToStep(activePad.axes[1] ?? 0, settings.stickDeadzone);
      if (horizontal === -1) {
        const decision = repeatManagerRef.current.decide(
          "focusLeft",
          true,
          now,
          settings.initialRepeatDelayMs,
          settings.repeatIntervalMs
        );
        if (decision.fire) await requestAction("focusLeft");
      }
      if (horizontal === 1) {
        const decision = repeatManagerRef.current.decide(
          "focusRight",
          true,
          now,
          settings.initialRepeatDelayMs,
          settings.repeatIntervalMs
        );
        if (decision.fire) await requestAction("focusRight");
      }
      if (vertical === -1) {
        const decision = repeatManagerRef.current.decide(
          "focusUp",
          true,
          now,
          settings.initialRepeatDelayMs,
          settings.repeatIntervalMs
        );
        if (decision.fire) await requestAction("focusUp");
      }
      if (vertical === 1) {
        const decision = repeatManagerRef.current.decide(
          "focusDown",
          true,
          now,
          settings.initialRepeatDelayMs,
          settings.repeatIntervalMs
        );
        if (decision.fire) await requestAction("focusDown");
      }

      if (horizontal === 0) repeatManagerRef.current.decide("focusLeft", false, now, 0, 0);
      if (horizontal === 0) repeatManagerRef.current.decide("focusRight", false, now, 0, 0);
      if (vertical === 0) repeatManagerRef.current.decide("focusUp", false, now, 0, 0);
      if (vertical === 0) repeatManagerRef.current.decide("focusDown", false, now, 0, 0);

      rafRef.current = window.requestAnimationFrame(scan);
    };

    rafRef.current = window.requestAnimationFrame(scan);
    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [requestAction, settings, updateRuntime]);

  useEffect(() => {
    const onConnect = () => updateRuntime({ connectionStatus: "connected" });
    const onDisconnect = () => updateRuntime({ connectionStatus: "disconnected" });
    window.addEventListener("gamepadconnected", onConnect);
    window.addEventListener("gamepaddisconnected", onDisconnect);
    return () => {
      window.removeEventListener("gamepadconnected", onConnect);
      window.removeEventListener("gamepaddisconnected", onDisconnect);
    };
  }, [updateRuntime]);

  const contextValue = useMemo<ControllerContextValue>(
    () => ({
      runtime,
      settings,
      requestAction,
      registerActionHandler: routerRef.current.register,
      setHelpOverlayOpen: (open) => updateRuntime({ helpOverlayOpen: open }),
      setDebugOverlayOpen: (open) => updateRuntime({ debugOverlayOpen: open }),
      focusDefaultElement,
    }),
    [focusDefaultElement, requestAction, runtime, settings, updateRuntime]
  );

  return <ControllerContext.Provider value={contextValue}>{children}</ControllerContext.Provider>;
}

export function useController() {
  return useContext(ControllerContext);
}
