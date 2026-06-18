import { useCallback, useReducer } from "react";
import { neurodeckApi } from "../services/bridgeAdapter";
import { STORE_KEY } from "../types/seed";
import { neurodeckReducer } from "./neurodeckReducer";
import { initialState } from "./stateUtils";
import { useNeurodeckHydration } from "./useNeurodeckHydration";
import { useNeurodeckPersistence } from "./useNeurodeckPersistence";
import { useNeuroDeckSelectors } from "./useNeuroDeckSelectors";

export function useNeuroDeckState() {
  const [state, dispatch] = useReducer(neurodeckReducer, initialState);

  useNeurodeckHydration(dispatch);
  useNeurodeckPersistence(state);

  const resetLocalState = useCallback(async () => {
    await neurodeckApi.store.reset(STORE_KEY);
    dispatch({ type: "reset-local-state" });
  }, []);

  const selectors = useNeuroDeckSelectors(state);

  return { state, dispatch, resetLocalState, selectors };
}
