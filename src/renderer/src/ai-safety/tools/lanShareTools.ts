import { z } from 'zod'
import { sendLanShareFiles } from '../../services/ipc/lanShareClient'
import type { ToolDefinition } from '../ToolRegistry'

const sendArgsSchema = z.object({
  peerId: z.string().min(1),
  sourcePaths: z.array(z.string().min(1)).min(1)
})

/**
 * Real LAN Share "Send Files" tool for the LAN-8 workflow integration.
 * Registered through the shared typed Tool Registry, so Workflow Forge and
 * Agent Runtime calls reach the same send engine and approval path as the
 * Send Composer UI.
 */
export function createLanShareTools(): ToolDefinition[] {
  return [
    {
      id: 'lan-share-send-files',
      title: 'Send files via LAN Share',
      description:
        'Sends one or more real files or folders to an already-known LAN Share peer over the network.',
      requiredCapability: 'external.send',
      risk: 'high',
      reversible: false,
      run: async (args) => {
        const parsed = sendArgsSchema.safeParse(args)
        if (!parsed.success) {
          return { success: false, message: 'LAN Share send arguments are invalid.' }
        }
        const result = await sendLanShareFiles(parsed.data)
        return result.ok
          ? { success: true, message: `Started sending to peer ${parsed.data.peerId}.` }
          : { success: false, message: result.error.userMessage }
      }
    }
  ]
}
