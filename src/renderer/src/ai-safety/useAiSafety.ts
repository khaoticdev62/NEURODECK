import { useContext } from 'react'
import { AiSafetyContext, type AiSafetyContextValue } from './AiSafetyContext'

export function useAiSafety(): AiSafetyContextValue {
  const context = useContext(AiSafetyContext)
  if (!context) throw new Error('useAiSafety must be used within an AiSafetyProvider')
  return context
}
