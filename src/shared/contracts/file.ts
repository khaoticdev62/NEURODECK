import { z } from 'zod'

/** Real listing/read/metadata only (mega-prompt §20) — write/copy/move/rename/delete/compress/extract wait for the Recovery Service (Epic 11) so destructive operations always have a real recovery path first. */
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
