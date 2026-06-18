import type { Dispatch } from "react";
import { useState } from "react";
import { Check, Volume2 } from "lucide-react";
import { Button } from "../../../components/primitives/Button";
import { Panel } from "../../../components/primitives/Panel";
import { bridgeInvoke } from "../../../services/bridgeAdapter";
import type { NeuroDeckAction, NeuroDeckState } from "../../../types/neurodeck";

export interface VoiceSettingsPanelProps {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
}

export function VoiceSettingsPanel(_props: VoiceSettingsPanelProps) {
  const [ttsMode, setTtsMode] = useState<"off" | "complete" | "stream">(() => {
    const saved = localStorage.getItem("neurodeck_tts_mode");
    return (saved === "complete" || saved === "stream" ? saved : "off") as
      | "off"
      | "complete"
      | "stream";
  });
  const [ttsTesting, setTtsTesting] = useState(false);

  const handleTtsModeChange = (mode: "off" | "complete" | "stream") => {
    setTtsMode(mode);
    localStorage.setItem("neurodeck_tts_mode", mode);
  };

  const handleTtsTest = async () => {
    setTtsTesting(true);
    try {
      await bridgeInvoke("speak_text", {
        text: "NEURODECK voice output test. Text-to-speech is working.",
      });
    } catch (_) {
      // Ignore — TTS may not be available on this platform
    } finally {
      setTtsTesting(false);
    }
  };

  return (
    <div id="sp-voice" className="settings-panel active space-y-4">
      <Panel eyebrow="Text-to-Speech" title="TTS Mode">
        <div className="space-y-3 p-4">
          <p className="text-xs text-nd-text-muted leading-5">
            Choose when NEURODECK speaks AI responses aloud. Requires espeak-ng (Linux), say
            (macOS), or Windows Speech API.
          </p>
          {(
            [
              { value: "off", label: "Off", desc: "No voice output." },
              {
                value: "complete",
                label: "After Response",
                desc: "Speaks the full response once generation finishes.",
              },
              {
                value: "stream",
                label: "Stream Sentences",
                desc: "Speaks each sentence as it arrives — minimum latency.",
              },
            ] as const
          ).map(({ value, label, desc }) => (
            <label
              key={value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                ttsMode === value
                  ? "border-nd-accent-primary/40 bg-nd-accent-primary/[0.07]"
                  : "border-nd-border-subtle bg-nd-surface-secondary/40 hover:border-nd-accent-primary/20"
              }`}
            >
              <input
                type="radio"
                name="tts-mode"
                value={value}
                checked={ttsMode === value}
                onChange={() => handleTtsModeChange(value)}
                className="mt-0.5 accent-nd-accent-primary"
              />
              <div>
                <p className="font-semibold text-sm text-nd-text-primary">{label}</p>
                <p className="text-xs text-nd-text-muted mt-0.5">{desc}</p>
              </div>
              {ttsMode === value && (
                <Check
                  className="ml-auto h-4 w-4 shrink-0 text-nd-accent-primary"
                  aria-hidden="true"
                />
              )}
            </label>
          ))}
        </div>
      </Panel>

      <Panel eyebrow="Test" title="Voice Output Test">
        <div className="p-4 space-y-3">
          <p className="text-xs text-nd-text-muted">
            Plays a short sample phrase through the TTS engine to verify it is working.
          </p>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            loading={ttsTesting}
            disabled={ttsTesting}
            icon={Volume2}
            onClick={() => void handleTtsTest()}
          >
            {ttsTesting ? "Speaking…" : "Test Voice Output"}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
