import React, { useCallback, useState } from "react";
import { Gamepad2, RotateCcw, Save } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { Panel } from "../../components/primitives/Panel";
import { Select } from "../../components/primitives/Select";
import type { NeuroDeckState } from "../../types/neurodeck";

type ButtonId =
  | "a" | "b" | "x" | "y"
  | "lb" | "rb" | "lt" | "rt"
  | "start" | "select"
  | "l3" | "r3"
  | "dpad_up" | "dpad_down" | "dpad_left" | "dpad_right";

type BindingAction =
  | "none" | "chat" | "terminal" | "agents" | "memory"
  | "command_palette" | "radial_menu" | "back" | "confirm"
  | "scroll_up" | "scroll_down" | "tab_prev" | "tab_next";

const ACTIONS: { value: BindingAction; label: string }[] = [
  { value: "none", label: "— None —" },
  { value: "confirm", label: "Confirm / Select" },
  { value: "back", label: "Back / Cancel" },
  { value: "chat", label: "Open Chat" },
  { value: "terminal", label: "Open Terminal" },
  { value: "agents", label: "Open Agents" },
  { value: "memory", label: "Open Memory" },
  { value: "command_palette", label: "Command Palette" },
  { value: "radial_menu", label: "Radial Menu" },
  { value: "scroll_up", label: "Scroll Up" },
  { value: "scroll_down", label: "Scroll Down" },
  { value: "tab_prev", label: "Previous Tab" },
  { value: "tab_next", label: "Next Tab" },
];

const DEFAULT_BINDINGS: Record<ButtonId, BindingAction> = {
  a: "confirm",
  b: "back",
  x: "command_palette",
  y: "chat",
  lb: "tab_prev",
  rb: "tab_next",
  lt: "none",
  rt: "radial_menu",
  start: "command_palette",
  select: "terminal",
  l3: "scroll_up",
  r3: "scroll_down",
  dpad_up: "scroll_up",
  dpad_down: "scroll_down",
  dpad_left: "tab_prev",
  dpad_right: "tab_next",
};

const BUTTON_GROUPS = [
  { label: "Face Buttons", buttons: ["a", "b", "x", "y"] as ButtonId[] },
  { label: "Shoulder Buttons", buttons: ["lb", "rb", "lt", "rt"] as ButtonId[] },
  { label: "Menu Buttons", buttons: ["start", "select", "l3", "r3"] as ButtonId[] },
  { label: "D-Pad", buttons: ["dpad_up", "dpad_down", "dpad_left", "dpad_right"] as ButtonId[] },
];

const BUTTON_LABELS: Record<ButtonId, string> = {
  a: "A", b: "B", x: "X", y: "Y",
  lb: "LB", rb: "RB", lt: "LT", rt: "RT",
  start: "Start", select: "Select", l3: "L3", r3: "R3",
  dpad_up: "D-Up", dpad_down: "D-Down", dpad_left: "D-Left", dpad_right: "D-Right",
};

const STORAGE_KEY = "nd:controller-bindings";

function loadBindings(): Record<ButtonId, BindingAction> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_BINDINGS, ...(JSON.parse(raw) as Partial<Record<ButtonId, BindingAction>>) } : { ...DEFAULT_BINDINGS };
  } catch {
    return { ...DEFAULT_BINDINGS };
  }
}

export function ControllerProfileView({ state: _state }: { state: NeuroDeckState }) {
  const [bindings, setBindings] = useState<Record<ButtonId, BindingAction>>(loadBindings);
  const [saved, setSaved] = useState(false);

  const handleChange = (btn: ButtonId, action: BindingAction) => {
    setBindings((prev) => ({ ...prev, [btn]: action }));
  };

  const handleSave = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
    } catch { /* quota */ }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [bindings]);

  const handleReset = useCallback(() => {
    setBindings({ ...DEFAULT_BINDINGS });
  }, []);

  return (
    <Panel
      eyebrow="Settings"
      title="Controller Profile"
      data-testid="controller-profile-view"
      className="h-full overflow-hidden"
      scrollable
      action={
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={handleReset} aria-label="Reset to defaults">
            Reset
          </Button>
          <Button variant="primary" size="sm" icon={Save} onClick={handleSave}>
            {saved ? "Saved ✓" : "Save"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6 p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-nd-accent-primary/20 bg-nd-accent-primary/5 p-4">
          <Gamepad2 className="h-8 w-8 text-nd-accent-primary" aria-hidden />
          <div>
            <p className="font-bold text-nd-text-primary">Steam Deck Controller Bindings</p>
            <p className="text-sm text-nd-text-muted">
              Maps gamepad buttons to NEURODECK actions. Steam Input VDF profile is a separate
              OS-level configuration.
            </p>
          </div>
        </div>

        {BUTTON_GROUPS.map((group) => (
          <section key={group.label} aria-label={`${group.label} bindings`}>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-nd-text-muted">
              {group.label}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.buttons.map((btn) => (
                <div
                  key={btn}
                  className="flex items-center gap-3 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/20 px-4 py-2"
                >
                  <kbd className="min-w-[3rem] rounded-lg border border-nd-border-subtle bg-nd-surface-secondary/60 px-2 py-1 text-center text-xs font-bold font-mono text-nd-text-primary">
                    {BUTTON_LABELS[btn]}
                  </kbd>
                  <div className="flex-1">
                    <Select
                      label=""
                      value={bindings[btn]}
                      onChange={(e) => handleChange(btn, (e as React.ChangeEvent<HTMLSelectElement>).target.value as BindingAction)}
                      options={ACTIONS}
                      aria-label={`Action for ${BUTTON_LABELS[btn]}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Panel>
  );
}
