import { useController } from "./ControllerProvider";

export function useGamepadState() {
  const { runtime } = useController();
  return runtime;
}
