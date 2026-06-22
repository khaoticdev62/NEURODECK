import { useContext } from 'react'
import { FocusEngineContext, type FocusEngineContextValue } from './FocusEngineContext'

/** For components that require the engine (e.g. registering a focus node). */
export function useFocusEngine(): FocusEngineContextValue {
  const context = useContext(FocusEngineContext)
  if (!context) throw new Error('useFocusEngine must be used within a FocusEngineProvider')
  return context
}

/** For components with an optional integration (e.g. Modal's back-to-close, which must still work in isolation/tests without a provider). */
export function useOptionalFocusEngine(): FocusEngineContextValue | null {
  return useContext(FocusEngineContext)
}
