import { useEffect } from "react";
import { neurodeckApi } from "../services/bridgeAdapter";
import { STORE_KEY } from "../types/seed";
import type { NeuroDeckState } from "../types/neurodeck";

export function useNeurodeckPersistence(state: NeuroDeckState) {
  useEffect(() => {
    if (!state.hydrated) return;
    const {
      commandOpen,
      hydrated,
      busyLabel,
      diagnostics,
      diagnosticLogs,
      lastError,
      showOnboarding,
      onboardingMode,
      ...persistable
    } = state;
    const handle = window.setTimeout(() => {
      neurodeckApi.store.set(STORE_KEY, {
        ...persistable,
        lastSavedAt: new Date().toISOString(),
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [state]);
}
