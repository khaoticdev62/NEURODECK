import { z } from 'zod'

/** Real listing/read/metadata (mega-prompt §20). Write and delete requests live in `recovery.ts` since both are recovery-checkpoint-orchestrated by the IPC layer. Copy/move/rename/compress/extract wait on a real multi-path checkpoint shape that doesn't exist yet. */
export const fileEntrySchema = z.object({
  name: z.string(),
  path: z.string(),
  isDirectory: z.boolean(),
  sizeBytes: z.number(),
  modifiedAt: z.number()
})
export type FileEntry = z.infer<typeof fileEntrySchema>

export const listFilesRequestSchema = z.object({
  workspaceId: z.string().min(1),
  relativePath: z.string().default('')
})
export type ListFilesRequest = z.infer<typeof listFilesRequestSchema>

export const readFileRequestSchema = z.object({
  workspaceId: z.string().min(1),
  relativePath: z.string().min(1)
})
export type ReadFileRequest = z.infer<typeof readFileRequestSchema>

export const readFileResultSchema = z.object({
  content: z.string(),
  truncated: z.boolean(),
  sizeBytes: z.number()
})
export type ReadFileResult = z.infer<typeof readFileResultSchema>
