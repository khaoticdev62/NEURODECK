import type { Dispatch, ReactNode } from "react";
import { createPortal } from "react-dom";
import { OnboardingOverlay } from "./OnboardingOverlay";
import type { NeuroDeckAction, NeuroDeckState } from "../types/neurodeck";

interface Props {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
  children: ReactNode;
}

/**
 * Mounts the guided-tour/contextual-help overlay via a portal when
 * onboardingMode is tour | contextual | whats-new.
 * The first-run setup wizard (OnboardingModal) is rendered separately
 * by App.tsx and handles the setup mode.
 */
export function OnboardingProvider({ state, dispatch, children }: Props) {
  const showTour =
    state.showOnboarding &&
    state.onboardingMode !== "setup";

  return (
    <>
      {children}
      {showTour &&
        createPortal(
          <OnboardingOverlay
            mode={state.onboardingMode as Exclude<typeof state.onboardingMode, "setup">}
            state={state}
            dispatch={dispatch}
          />,
          document.body,
        )}
    </>
  );
}
