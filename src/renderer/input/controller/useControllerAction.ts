import { useEffect } from "react";
import type { ControllerAction } from "../../../shared/types/controller";
import { useController } from "./ControllerProvider";

export function useControllerAction(
  action: ControllerAction,
  handler: () => boolean | void | Promise<boolean | void>,
  enabled = true
) {
  const { registerActionHandler } = useController();

  useEffect(() => {
    if (!enabled) return;
    return registerActionHandler(action, handler);
  }, [action, enabled, handler, registerActionHandler]);
}
