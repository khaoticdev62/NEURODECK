import type { Dispatch } from "react";
import { useEffect, useState } from "react";
import { Sliders } from "lucide-react";
import { Panel } from "../../../components/primitives/Panel";
import { Toggle } from "../../../components/primitives/Toggle";
import { useTheme } from "../../../theme/useTheme";
import type { NeuroDeckAction, NeuroDeckState } from "../../../types/neurodeck";
import { LiveWallpaperPanel } from "../LiveWallpaperPanel";
import { SettingRow } from "../components/SettingRow";

export interface AppearanceSettingsPanelProps {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
}

export function AppearanceSettingsPanel({ state, dispatch }: AppearanceSettingsPanelProps) {
  const { settings, updateSettings } = useTheme();
  const [fontScale, setFontScale] = useState(100);
  const [compactMode, setCompactMode] = useState(false);

  useEffect(() => {
    setFontScale(settings.fontScale);
    setCompactMode(settings.compactMode);
  }, [settings.compactMode, settings.fontScale]);

  const applyFontScale = (val: number) => {
    setFontScale(val);
    void updateSettings({ fontScale: val });
    document.documentElement.style.fontSize = `${val}%`;
  };

  const applyCompactMode = (val: boolean) => {
    setCompactMode(val);
    void updateSettings({ compactMode: val });
    if (state.deckMode !== val) {
      dispatch({ type: "toggle-deck-mode" });
    }
  };

  return (
    <div id="sp-appearance" className="settings-panel active space-y-4">
      <Panel eyebrow="Display" title="Font Scale">
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between text-sm text-nd-text-muted">
            <span className="font-medium">Scale</span>
            <span className="font-mono text-nd-accent-primary">{fontScale}%</span>
          </div>
          <input
            type="range"
            min={75}
            max={130}
            step={5}
            value={fontScale}
            onChange={(e) => applyFontScale(Number(e.target.value))}
            className="w-full accent-nd-accent-primary"
            aria-label="Font scale percentage"
          />
          <div className="flex justify-between text-xs text-nd-text-muted/70">
            <span>75%</span>
            <span>100%</span>
            <span>130%</span>
          </div>
        </div>
      </Panel>

      <Panel eyebrow="Layout" title="Compact Mode">
        <div className="p-4">
          <SettingRow
            icon={Sliders}
            title="Compact Layout"
            description="Tighter spacing for maximum information density."
          >
            <Toggle
              checked={compactMode}
              onChange={() => applyCompactMode(!compactMode)}
              label="Toggle compact mode"
            />
          </SettingRow>
        </div>
      </Panel>

      <Panel eyebrow="Appearance" title="Live Wallpaper">
        <div className="p-4">
          <LiveWallpaperPanel />
        </div>
      </Panel>
    </div>
  );
}
