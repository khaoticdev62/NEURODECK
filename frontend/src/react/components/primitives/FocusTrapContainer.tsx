import {
  forwardRef,
  useEffect,
  useRef,
  type ReactNode,
  type HTMLAttributes,
} from "react";
import { FocusTrap } from "../../../focus-trap.js";

interface FocusTrapContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  active: boolean;
  onEscape?: () => void;
  restoreFocus?: boolean;
}

/**
 * Wraps a panel/dropdown/overlay and traps focus inside while active.
 * Escape calls onEscape if provided. Focus is restored on deactivation.
 * Supports ref forwarding so callers can query or restore focus to the container.
 */
export const FocusTrapContainer = forwardRef<HTMLDivElement, FocusTrapContainerProps>(
  function FocusTrapContainer(
    { children, active, onEscape, restoreFocus = true, ...props },
    forwardedRef
  ) {
    const localRef = useRef<HTMLDivElement>(null);
    const trapRef = useRef<FocusTrap | null>(null);

    useEffect(() => {
      if (!active || !localRef.current) return;
      trapRef.current = new FocusTrap(localRef.current);
      trapRef.current.activate();
      return () => {
        trapRef.current?.deactivate(restoreFocus);
        trapRef.current = null;
      };
    }, [active, restoreFocus]);

    useEffect(() => {
      if (!active || !onEscape) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onEscape();
        }
      };
      document.addEventListener("keydown", onKey, true);
      return () => document.removeEventListener("keydown", onKey, true);
    }, [active, onEscape]);

    return (
      <div ref={forwardedRef ?? localRef} {...props}>
        {children}
      </div>
    );
  }
);
