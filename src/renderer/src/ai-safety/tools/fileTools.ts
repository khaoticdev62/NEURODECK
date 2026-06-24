import { z } from 'zod'
import { deleteFile, writeFile } from '../../services/ipc/fileClient'
import type { ToolDefinition } from '../ToolRegistry'

const writeArgsSchema = z.object({
  workspaceId: z.string().min(1),
  relativePath: z.string().min(1),
  content: z.string(),
  description: z.string().min(1)
})

const deleteArgsSchema = z.object({
  workspaceId: z.string().min(1),
  relativePath: z.string().min(1)
})

/**
 * Real `files.write`/`files.delete` tools (mega-prompt §15.3) — the gap
 * Workflow Forge's own comment and the checklist's "Checkpoints deferred
 * from the workflow-step level" item both named: no tool-action could
 * perform a file write, so there was nothing for a recovery checkpoint to
 * link to. Both tools call the same real, already-checkpointed IPC path
 * `FileManager.tsx`'s own Delete button and Build Studio's own Save action
 * use (`registerFileHandlers.ts` records a `RecoveryService` checkpoint
 * before every write or delete, unconditionally, regardless of caller) —
 * there is no separate, weaker write path for tools.
 *
 * Trust model matches `terminalCommandTools.ts` exactly: `workspaceId` and
 * `relativePath` come from whoever submitted the tool call, same as
 * `sessionId` does for terminal tools. For a Workflow Forge step, that's
 * the human author who typed the JSON arguments at design time (Workflow
 * Forge has no model in the loop — see its own scope note). For an Agent
 * Runtime tool call, that's the strict model-emitted JSON, gated by the
 * same `toolAllowlist`/`permissionCeiling` grant a human had to configure
 * for that agent first — the existing, already-accepted risk boundary
 * every other granted tool capability uses, not a new one. `FileService`'s
 * own path-traversal protection (`PathOutsideWorkspaceError`) still applies
 * underneath either way: no caller, human-authored or model-emitted, can
 * write outside the named workspace's root.
 */
export function createFileTools(): ToolDefinition[] {
  return [
    {
      id: 'files-write',
      title: 'Write workspace file',
      description: 'Writes content to a file in a workspace, checkpointed for recovery first.',
      requiredCapability: 'files.write',
      risk: 'medium',
      reversible: true,
      run: async (args) => {
        const parsed = writeArgsSchema.safeParse(args)
        if (!parsed.success) return { success: false, message: 'File write arguments are invalid.' }
        const result = await writeFile(parsed.data)
        return result.ok
          ? { success: true, message: `Wrote ${parsed.data.relativePath}.` }
          : { success: false, message: result.error.userMessage }
      }
    },
    {
      id: 'files-delete',
      title: 'Delete workspace file',
      description: 'Deletes a single file in a workspace, checkpointed for recovery first.',
      requiredCapability: 'files.delete',
      risk: 'high',
      reversible: true,
      run: async (args) => {
        const parsed = deleteArgsSchema.safeParse(args)
        if (!parsed.success)
          return { success: false, message: 'File delete arguments are invalid.' }
        const result = await deleteFile(parsed.data)
        return result.ok
          ? { success: true, message: `Deleted ${parsed.data.relativePath}.` }
          : { success: false, message: result.error.userMessage }
      }
    }
  ]
}
