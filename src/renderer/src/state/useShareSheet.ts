import { useContext } from 'react'
import { ShareSheetContext, type ShareSheetContextValue } from './shareSheetContext'

export function useShareSheet(): ShareSheetContextValue {
  const context = useContext(ShareSheetContext)
  if (!context) throw new Error('useShareSheet must be used within a ShareSheetProvider')
  return context
}
