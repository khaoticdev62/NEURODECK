import type { Dispatch } from "react";
import { Gamepad2, MonitorPlay, Rocket } from "lucide-react";
import { Button } from "../../../components/primitives/Button";
import { Panel } from "../../../components/primitives/Panel";
import { Toggle } from "../../../components/primitives/Toggle";
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState } from "../../../types/neurodeck";
import { SettingRow } from "../components/SettingRow";
import { ThemePicker } from "../components/ThemePicker";

export interface GeneralSettingsPanelProps {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
  actions: NeuroDeckAppActions;
  onClose?: () => void;
}

export function GeneralSettingsPanel({ state, dispatch }: GeneralSettingsPanelProps) {
  return (
    <div id="sp-general" className="settings-panel active space-y-4">
      <Panel eyebrow="Application" title="General Settings">
        <div className="space-y-2 p-4">
          <SettingRow
            icon={Rocket}
            title="Onboarding Wizard"
            description="Display the welcome wizard on next app launch."
          >
            <Toggle
              checked={state.showOnboarding}
              onChange={() => dispatch({ type: "toggle-onboarding" })}
              label="Toggle onboarding wizard"
            />
          </SettingRow>
          <div className="grid gap-2 md:grid-cols-2">
            <Button
              variant="primary"
              size="md"
              fullWidth
              icon={MonitorPlay}
              onClick={() => dispatch({ type: "open-onboarding", mode: "tour" })}
            >
              Replay Tour
            </Button>
            <Button
              variant="secondary"
              size="md"
              fullWidth
              icon={Rocket}
              onClick={() => dispatch({ type: "open-onboarding", mode: "contextual" })}
            >
              Show Current Tool
            </Button>
          </div>
          <SettingRow
            icon={Gamepad2}
            title="Deck Mode"
            description="Controller-first layout — larger targets, tighter density."
          >
            <Toggle
              checked={state.deckMode}
              onChange={() => dispatch({ type: "toggle-deck-mode" })}
              label="Toggle Deck Mode"
            />
          </SettingRow>
        </div>
      </Panel>

      <Panel eyebrow="Theme Engine" title="Quick Theme Picker">
        <ThemePicker />
      </Panel>
    </div>
  );
}
