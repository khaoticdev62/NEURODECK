import { useEffect } from 'react'
import { useFocusEngine } from '../controller/focus/useFocusEngine'
import { createResetHapticsIntensityTool } from './tools/resetHapticsIntensityTool'
import { createTerminalCommandTools } from './tools/terminalCommandTools'
import { createTutorialAcknowledgeTool } from './tools/tutorialAcknowledgeTool'
import { useAiSafety } from './useAiSafety'

/**
 * Registers the real tools that exist today. Rendered once, globally
 * (`ShellLayout`) — adding a new real tool later means adding one more
 * `registry.register(...)` call here, not building new plumbing.
 */
export function CoreToolsBootstrap(): null {
  const { registry } = useAiSafety()
  const { haptics } = useFocusEngine()

  useEffect(() => {
    registry.register(createResetHapticsIntensityTool(haptics))
    registry.register(createTutorialAcknowledgeTool())
    createTerminalCommandTools().forEach((tool) => registry.register(tool))
  }, [registry, haptics])

  return null
}
