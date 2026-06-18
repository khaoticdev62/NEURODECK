import type { FocusZoneKind } from "../../../shared/types/controller";

export function useFocusZone(
  zone: FocusZoneKind,
  options?: { screenId?: string; defaultFocus?: boolean }
) {
  return {
    "data-controller-zone": zone,
    "data-controller-screen": options?.screenId,
    "data-controller-default": options?.defaultFocus ? "true" : undefined,
  } as const;
}
