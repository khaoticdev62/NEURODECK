import type { Dispatch } from "react";
import { ChevronRight, Gamepad2, Palette, Sliders } from "lucide-react";
import { Button } from "../../../components/primitives/Button";
import { Panel } from "../../../components/primitives/Panel";
import { Toggle } from "../../../components/primitives/Toggle";
import { useController } from "../../../input/controller/ControllerProvider";
import type { NeuroDeckAction, NeuroDeckState } from "../../../types/neurodeck";
import { SettingRow } from "../components/SettingRow";

export interface InputSettingsPanelProps {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
}

export function InputSettingsPanel({ state, dispatch }: InputSettingsPanelProps) {
  const { runtime, settings: controllerSettings, setDebugOverlayOpen } = useController();

  return (
    <div id="sp-input" className="settings-panel active space-y-4">
      <Panel eyebrow="Controller" title="Full Application Controller Support">
        <div className="space-y-2 p-4">
          <SettingRow
            icon={Gamepad2}
            title="Controller Support"
            description="Enable semantic controller actions across shell, dialogs, forms, and views."
          >
            <Toggle
              checked={controllerSettings.enabled}
              onChange={() =>
                dispatch({
                  type: "set-controller-settings",
                  settings: { enabled: !controllerSettings.enabled },
                })
              }
              label="Toggle controller support"
            />
          </SettingRow>
          <SettingRow
            icon={ChevronRight}
            title="Deck Mode Layout"
            description="Larger touch targets and controller-first focus affordances."
          >
            <Toggle
              checked={state.deckMode}
              onChange={() => dispatch({ type: "toggle-deck-mode" })}
              label="Toggle Deck Mode"
            />
          </SettingRow>
          <SettingRow
            icon={Palette}
            title="Show Controller Hints"
            description="Keep contextual controller prompts visible at Steam Deck resolution."
          >
            <Toggle
              checked={controllerSettings.showHints}
              onChange={() =>
                dispatch({
                  type: "set-controller-settings",
                  settings: { showHints: !controllerSettings.showHints },
                })
              }
              label="Toggle controller hints"
            />
          </SettingRow>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3">
              <span className="mb-2 block text-xs font-semibold text-nd-text-primary">
                Preferred profile
              </span>
              <select
                value={controllerSettings.preferredProfile}
                onChange={(event) =>
                  dispatch({
                    type: "set-controller-settings",
                    settings: {
                      preferredProfile: event.target
                        .value as typeof controllerSettings.preferredProfile,
                    },
                  })
                }
                className="w-full rounded-xl border border-nd-border-subtle bg-nd-surface-app/50 px-3 py-2 text-sm text-nd-text-primary outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/40"
              >
                <option value="steam_deck">Steam Deck</option>
                <option value="xbox">Xbox</option>
                <option value="playstation">PlayStation</option>
                <option value="generic">Generic</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3">
              <span className="mb-2 block text-xs font-semibold text-nd-text-primary">
                Glyph style
              </span>
              <select
                value={controllerSettings.glyphStyle}
                onChange={(event) =>
                  dispatch({
                    type: "set-controller-settings",
                    settings: {
                      glyphStyle: event.target.value as typeof controllerSettings.glyphStyle,
                    },
                  })
                }
                className="w-full rounded-xl border border-nd-border-subtle bg-nd-surface-app/50 px-3 py-2 text-sm text-nd-text-primary outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/40"
              >
                <option value="auto">Auto detect</option>
                <option value="steam_deck">Steam Deck</option>
                <option value="xbox">Xbox</option>
                <option value="playstation">PlayStation</option>
                <option value="generic">Generic</option>
              </select>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              [
                "Stick deadzone",
                controllerSettings.stickDeadzone,
                0.1,
                0.5,
                0.01,
                "stickDeadzone",
              ],
              [
                "Trigger threshold",
                controllerSettings.triggerThreshold,
                0.1,
                1,
                0.01,
                "triggerThreshold",
              ],
              [
                "Repeat delay",
                controllerSettings.initialRepeatDelayMs,
                150,
                700,
                10,
                "initialRepeatDelayMs",
              ],
              [
                "Repeat rate",
                controllerSettings.repeatIntervalMs,
                40,
                180,
                5,
                "repeatIntervalMs",
              ],
            ].map(([label, value, min, max, step, key]) => (
              <label
                key={String(key)}
                className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3"
              >
                <span className="flex items-center justify-between text-xs font-semibold text-nd-text-primary">
                  <span>{label}</span>
                  <span className="font-mono text-nd-accent-primary">{value}</span>
                </span>
                <input
                  type="range"
                  min={Number(min)}
                  max={Number(max)}
                  step={Number(step)}
                  value={Number(value)}
                  onChange={(event) =>
                    dispatch({
                      type: "set-controller-settings",
                      settings: { [key]: Number(event.target.value) } as never,
                    })
                  }
                  className="mt-2 w-full accent-nd-accent-primary"
                />
              </label>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <SettingRow
              icon={Sliders}
              title="Haptics"
              description="Light confirm and warning pulses when supported."
            >
              <Toggle
                checked={controllerSettings.hapticsEnabled}
                onChange={() =>
                  dispatch({
                    type: "set-controller-settings",
                    settings: { hapticsEnabled: !controllerSettings.hapticsEnabled },
                  })
                }
                label="Toggle haptics"
              />
            </SettingRow>
            <SettingRow
              icon={Gamepad2}
              title="Text Input Assist"
              description="Keep fields visible and optimize for Steam + X on-screen keyboard flow."
            >
              <Toggle
                checked={controllerSettings.textInputAssistEnabled}
                onChange={() =>
                  dispatch({
                    type: "set-controller-settings",
                    settings: {
                      textInputAssistEnabled: !controllerSettings.textInputAssistEnabled,
                    },
                  })
                }
                label="Toggle text input assist"
              />
            </SettingRow>
          </div>
          <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4 space-y-2 text-xs text-nd-text-muted">
            <p className="font-semibold text-nd-text-primary text-sm">Default bindings</p>
            {[
              ["A / Cross", "Confirm and activate"],
              ["B / Circle", "Back, cancel, close modal"],
              ["X / Square", "Reload or secondary action"],
              ["Y / Triangle", "Search or focus input"],
              ["LB/RB", "Previous and next section"],
              ["LT/RT", "Page and scroll"],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span>{desc}</span>
                <kbd className="rounded border border-nd-border-subtle bg-nd-surface-secondary/60 px-2 py-0.5 font-mono text-nd-accent-primary text-[10px]">
                  {key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel eyebrow="Diagnostics" title="Controller Runtime">
        <div className="space-y-3 p-4">
          <div className="grid gap-2 md:grid-cols-2">
            {[
              ["Connection", runtime.connectionStatus],
              ["Last input", runtime.lastInputSource],
              ["Screen", runtime.currentScreenId],
              ["Focus zone", runtime.currentFocusZone ?? "unknown"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 px-3 py-2"
              >
                <p className="text-[11px] uppercase tracking-[0.18em] text-nd-text-muted">
                  {label}
                </p>
                <p className="mt-1 text-sm font-semibold text-nd-text-primary">{value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4 space-y-2 text-xs text-nd-text-muted">
            <p className="font-semibold text-nd-text-primary text-sm">Detected devices</p>
            {runtime.devices.length === 0 && (
              <p>No controller detected. Keyboard and mouse remain available.</p>
            )}
            {runtime.devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between gap-3">
                <span>{device.name}</span>
                <kbd className="rounded border border-nd-text-muted/20 bg-nd-surface/60 px-2 py-0.5 font-mono text-nd-accent-primary text-[10px]">
                  {device.kind}
                </kbd>
              </div>
            ))}
          </div>
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => setDebugOverlayOpen(true)}
          >
            Open Controller Diagnostics Overlay
          </Button>
        </div>
      </Panel>
    </div>
  );
}
