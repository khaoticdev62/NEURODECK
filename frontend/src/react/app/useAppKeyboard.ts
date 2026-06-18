import { useEffect } from "react";
import type { NeuroDeckAction, ViewId } from "../types/neurodeck";

const numberToView: Record<string, ViewId> = {
  "1": "chat",
  "2": "execution",
  "3": "agent",
  "4": "memory",
  "5": "project",
  "6": "models",
  "7": "cache",
  "8": "plugins",
  "9": "sessions",
  "0": "settings",
  d: "diagnostics",
  D: "diagnostics",
};

export type UseAppKeyboardOptions = {
  dispatch: React.Dispatch<NeuroDeckAction>;
  runAssistant: () => Promise<void>;
  recentViews: ViewId[];
  quickSwitcherOpen: boolean;
  setQuickSwitcherOpen: (value: boolean) => void;
  quickSwitcherFocusIdx: number;
  setQuickSwitcherFocusIdx: (value: number | ((prev: number) => number)) => void;
  quickSwitcherDialogRef: React.RefObject<HTMLDivElement | null>;
  settingsOpen: boolean;
  setSettingsOpen: (value: boolean) => void;
  notificationsOpen: boolean;
  setNotificationsOpen: (value: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (value: boolean) => void;
  ctrlPromptOpen: boolean;
  setCtrlPromptOpen: (value: boolean) => void;
  commandOpen: boolean;
};

export function useAppKeyboard({
  dispatch,
  runAssistant,
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
  commandOpen,
}: UseAppKeyboardOptions) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase();
      const editingField =
        activeTag === "input" ||
        activeTag === "textarea" ||
        activeTag === "select" ||
        (document.activeElement as HTMLElement | null)?.isContentEditable;
      const metaK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (metaK) {
        event.preventDefault();
        dispatch({ type: "toggle-command" });
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setCtrlPromptOpen(true);
        return;
      }
      if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key === "?" && !editingField) {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "Tab") {
        event.preventDefault();
        if (recentViews.length > 1) setQuickSwitcherOpen(true);
        return;
      }
      if (quickSwitcherOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        const items =
          quickSwitcherDialogRef.current?.querySelectorAll<HTMLButtonElement>(
            "button[data-qs-item]"
          );
        if (items && items.length > 0) {
          setQuickSwitcherFocusIdx((prev) => {
            const next =
              event.key === "ArrowDown"
                ? (prev + 1) % items.length
                : (prev - 1 + items.length) % items.length;
            items[next]?.focus();
            return next;
          });
        }
        return;
      }
      if (quickSwitcherOpen && event.key === "Enter") {
        event.preventDefault();
        const items =
          quickSwitcherDialogRef.current?.querySelectorAll<HTMLButtonElement>(
            "button[data-qs-item]"
          );
        const target = items?.[quickSwitcherFocusIdx];
        if (target) target.click();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void runAssistant();
        return;
      }
      if (event.key === "Escape") {
        if (commandOpen) {
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
      }
      if (!event.ctrlKey && !event.metaKey && !event.altKey) return;
      const view = numberToView[event.key];
      if (view) dispatch({ type: "set-view", view });
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [
    dispatch,
    runAssistant,
    recentViews,
    quickSwitcherOpen,
    quickSwitcherFocusIdx,
    quickSwitcherDialogRef,
    setCtrlPromptOpen,
    setNotificationsOpen,
    setQuickSwitcherFocusIdx,
    setQuickSwitcherOpen,
    setSettingsOpen,
    setShortcutsOpen,
    settingsOpen,
    notificationsOpen,
    shortcutsOpen,
    ctrlPromptOpen,
    commandOpen,
  ]);
}
