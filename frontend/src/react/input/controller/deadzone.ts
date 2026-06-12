export function applyDeadzone(value: number, deadzone: number): number {
  const magnitude = Math.abs(value);
  if (magnitude < deadzone) {
    return 0;
  }

  const normalized = (magnitude - deadzone) / (1 - deadzone);
  return Math.sign(value) * Math.min(1, normalized);
}

export function axisToStep(value: number, deadzone: number): -1 | 0 | 1 {
  const normalized = applyDeadzone(value, deadzone);
  if (normalized > 0.55) return 1;
  if (normalized < -0.55) return -1;
  return 0;
}
