import { z } from 'zod'

/** Real Git porcelain operations (mega-prompt §22), scoped to a workspace root. */
export const gitFileChangeSchema = z.object({
  path: z.string(),
  /** Raw two-letter porcelain v2 status code (e.g. "M.", ".M", "??", "A."). */
  status: z.string(),
  staged: z.boolean()
})
export type GitFileChange = z.infer<typeof gitFileChangeSchema>

/** Porcelain v2 XY codes for unmerged paths — both sides touched the same path during a merge/rebase. Shared so `GitService.ts` (status detection) and the renderer (conflict-resolution UI) never drift against two separately-maintained copies of the same set. */
export const UNMERGED_STATUS_CODES = new Set(['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU'])

export function isUnmergedStatus(status: string): boolean {
  return UNMERGED_STATUS_CODES.has(status)
}

export const gitStatusSchema = z.object({
  isRepository: z.boolean(),
  branch: z.string().nullable(),
  ahead: z.number(),
  behind: z.number(),
  changes: z.array(gitFileChangeSchema),
  hasConflicts: z.boolean()
})
export type GitStatus = z.infer<typeof gitStatusSchema>

export const gitBranchSchema = z.object({
  name: z.string(),
  current: z.boolean()
})
export type GitBranch = z.infer<typeof gitBranchSchema>

export const gitCommitSchema = z.object({
  hash: z.string(),
  shortHash: z.string(),
  author: z.string(),
  date: z.string(),
  message: z.string()
})
export type GitCommit = z.infer<typeof gitCommitSchema>

export const workspaceGitRequestSchema = z.object({
  workspaceId: z.string().min(1)
})
export type WorkspaceGitRequest = z.infer<typeof workspaceGitRequestSchema>

export const gitDiffRequestSchema = z.object({
  workspaceId: z.string().min(1),
  path: z.string().min(1),
  staged: z.boolean()
})
export type GitDiffRequest = z.infer<typeof gitDiffRequestSchema>

export const gitStagePathsRequestSchema = z.object({
  workspaceId: z.string().min(1),
  paths: z.array(z.string().min(1)).min(1)
})
export type GitStagePathsRequest = z.infer<typeof gitStagePathsRequestSchema>

export const gitCommitRequestSchema = z.object({
  workspaceId: z.string().min(1),
  message: z.string().min(1)
})
export type GitCommitRequest = z.infer<typeof gitCommitRequestSchema>

export const gitResolveConflictRequestSchema = z.object({
  workspaceId: z.string().min(1),
  path: z.string().min(1),
  resolution: z.enum(['ours', 'theirs'])
})
export type GitResolveConflictRequest = z.infer<typeof gitResolveConflictRequestSchema>

export const gitCheckoutRequestSchema = z.object({
  workspaceId: z.string().min(1),
  branch: z.string().min(1)
})
export type GitCheckoutRequest = z.infer<typeof gitCheckoutRequestSchema>

export const gitDiffResultSchema = z.object({
  diff: z.string()
})
export type GitDiffResult = z.infer<typeof gitDiffResultSchema>

export const gitRemoteSchema = z.object({
  name: z.string(),
  fetchUrl: z.string(),
  pushUrl: z.string()
})
export type GitRemote = z.infer<typeof gitRemoteSchema>

export const gitStashEntrySchema = z.object({
  index: z.number().int().nonnegative(),
  message: z.string()
})
export type GitStashEntry = z.infer<typeof gitStashEntrySchema>

export const gitRemoteOperationRequestSchema = z.object({
  workspaceId: z.string().min(1),
  remote: z.string().min(1),
  branch: z.string().min(1)
})
export type GitRemoteOperationRequest = z.infer<typeof gitRemoteOperationRequestSchema>

export const gitFetchRequestSchema = z.object({
  workspaceId: z.string().min(1),
  remote: z.string().min(1)
})
export type GitFetchRequest = z.infer<typeof gitFetchRequestSchema>

export const gitStashSaveRequestSchema = z.object({
  workspaceId: z.string().min(1),
  message: z.string().min(1).optional()
})
export type GitStashSaveRequest = z.infer<typeof gitStashSaveRequestSchema>

export const gitStashPopRequestSchema = z.object({
  workspaceId: z.string().min(1),
  index: z.number().int().nonnegative().default(0)
})
export type GitStashPopRequest = z.infer<typeof gitStashPopRequestSchema>

/** Discards real, uncommitted working-tree changes — irreversible without the recovery checkpoint the IPC handler records before running it. */
export const gitRestorePathsRequestSchema = z.object({
  workspaceId: z.string().min(1),
  paths: z.array(z.string().min(1)).min(1)
})
export type GitRestorePathsRequest = z.infer<typeof gitRestorePathsRequestSchema>

export const gitCreateBranchRequestSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  fromRef: z.string().min(1).optional()
})
export type GitCreateBranchRequest = z.infer<typeof gitCreateBranchRequestSchema>

export const gitDeleteBranchRequestSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  force: z.boolean().default(false)
})
export type GitDeleteBranchRequest = z.infer<typeof gitDeleteBranchRequestSchema>

/** Force push uses `--force-with-lease`, never raw `--force` — it fails closed if the remote ref moved since our last fetch, rather than silently clobbering someone else's concurrent push. */
export const gitForcePushRequestSchema = z.object({
  workspaceId: z.string().min(1),
  remote: z.string().min(1),
  branch: z.string().min(1)
})
export type GitForcePushRequest = z.infer<typeof gitForcePushRequestSchema>
