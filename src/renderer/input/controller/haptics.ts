export async function pulseHaptics(
  gamepad: Gamepad | null,
  enabled: boolean,
  intensity = 0.3,
  duration = 35
) {
  if (!enabled || !gamepad) return;

  const actuator = (
    gamepad as Gamepad & {
      vibrationActuator?: {
        playEffect?: (
          type: "dual-rumble",
          params: {
            startDelay: number;
            duration: number;
            weakMagnitude: number;
            strongMagnitude: number;
          }
        ) => Promise<void>;
      };
      hapticActuators?: Array<{
        pulse?: (value: number, duration: number) => Promise<boolean>;
      }>;
    }
  ).vibrationActuator;

  try {
    if (actuator?.playEffect) {
      await actuator.playEffect("dual-rumble", {
        startDelay: 0,
        duration,
        weakMagnitude: intensity,
        strongMagnitude: intensity,
      });
      return;
    }

    const legacyActuator = (
      gamepad as Gamepad & {
        hapticActuators?: Array<{ pulse?: (value: number, duration: number) => Promise<boolean> }>;
      }
    ).hapticActuators?.[0];
    if (legacyActuator?.pulse) {
      await legacyActuator.pulse(intensity, duration);
    }
  } catch {
    // Haptics are best-effort only.
  }
}
