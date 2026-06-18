import { useCallback } from "react";
import { useController } from "./ControllerProvider";

export function useControllerFocus() {
  const { focusDefaultElement } = useController();
  return useCallback(() => {
    focusDefaultElement();
  }, [focusDefaultElement]);
}
