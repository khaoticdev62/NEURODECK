/**
 * Haptics controller — Gamepad Vibration API wrapper.
 *
 * Provides lightweight, categorized haptic feedback for Steam Deck
 * and other controllers that expose vibrationActuator.
 *
 * Usage: triggerHaptic('light') from any module. No-ops gracefully
 * when no gamepad is connected or haptics are disabled.
 */

import { state } from "./state.js";

const PRESETS = {
  /** Subtle bump — focus changes, hover ticks */
  light: { duration: 30, strongMagnitude: 0.15, weakMagnitude: 0.1 },
  /** Standard confirmation — button presses, tab switches */
  medium: { duration: 50, strongMagnitude: 0.35, weakMagnitude: 0.25 },
  /** Heavy thump — major actions, errors */
  heavy: { duration: 80, strongMagnitude: 0.7, weakMagnitude: 0.5 },
  /** Two short pulses — success / completion */
  success: [
    { duration: 40, strongMagnitude: 0.3, weakMagnitude: 0.2 },
    { duration: 40, strongMagnitude: 0.5, weakMagnitude: 0.35 },
  ],
  /** Three sharp pulses — errors / denials */
  error: [
    { duration: 50, strongMagnitude: 0.6, weakMagnitude: 0.4 },
    { duration: 50, strongMagnitude: 0.6, weakMagnitude: 0.4 },
    { duration: 50, strongMagnitude: 0.6, weakMagnitude: 0.4 },
  ],
  /** Single crisp tick — streaming chunks, step advances */
  tick: { duration: 15, strongMagnitude: 0.1, weakMagnitude: 0.05 },
  /** Two rapid ticks — copy, minor confirmations */
  doubleTick: [
    { duration: 20, strongMagnitude: 0.15, weakMagnitude: 0.1 },
    { duration: 20, strongMagnitude: 0.25, weakMagnitude: 0.15 },
  ],
};

let lastHapticTime = 0;
const MIN_INTERVAL_MS = 40; // prevent overlap spam

/**
 * Trigger a haptic pulse on the first available gamepad actuator.
 *
 * @param {keyof PRESETS} type
 * @param {boolean} [force] — bypass debounce interval
 */
export function triggerHaptic(type, force = false) {
  if (state.hapticsEnabled === false) return;

  const now = performance.now();
  if (!force && now - lastHapticTime < MIN_INTERVAL_MS) return;
  lastHapticTime = now;

  const preset = PRESETS[type];
  if (!preset) return;

  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = Array.from(gamepads).find((g) => g && g.connected && g.vibrationActuator);
  if (!gp) return;

  const actuator = gp.vibrationActuator;
  if (Array.isArray(preset)) {
    // sequenced pattern
    let delay = 0;
    for (const p of preset) {
      setTimeout(() => {
        actuator.pulse(p.strongMagnitude, p.duration).catch(() => {
          /* ignore unsupported */
        });
      }, delay);
      delay += p.duration + 30;
    }
  } else {
    actuator.pulse(preset.strongMagnitude, preset.duration).catch(() => {
      /* ignore unsupported */
    });
  }
}

/** Enable or disable all haptic feedback. */
export function setHapticsEnabled(enabled) {
  state.hapticsEnabled = enabled;
}
