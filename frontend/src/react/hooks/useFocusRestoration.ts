import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const DEFAULT_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Manages focus for overlay panels: stores the trigger element when opening,
 * moves focus into the dialog, and restores focus to the trigger on close.
 *
 * @param dialogRef  Ref to the dialog/panel root element.
 * @param isOpen     Whether the overlay is currently open.
 * @param onOpen     Optional side-effect to run immediately after the trigger is
 *                   captured (e.g. resetting a keyboard focus index).
 * @param selector   Optional CSS selector for the first element to focus inside
 *                   the dialog. Defaults to the standard focusable-elements selector.
 */
export function useFocusRestoration(
  dialogRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onOpen?: () => void,
  selector?: string
): void {
  const triggerRef = useRef<HTMLElement | null>(null);
  // Use a ref for onOpen so it never needs to be a dependency
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      onOpenRef.current?.();
      requestAnimationFrame(() => {
        const sel = selector ?? DEFAULT_SELECTOR;
        const el = dialogRef.current?.querySelector<HTMLElement>(sel);
        (el ?? dialogRef.current)?.focus();
      });
    } else {
      triggerRef.current?.focus();
    }
    // dialogRef is a stable React ref object; selector is a string constant at each call site.
    // Only isOpen and selector changes should re-trigger the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selector]);
}
