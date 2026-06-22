import { z } from 'zod'

/**
 * A workspace record (mega-prompt §19, scoped to what's real today). The
 * full spec list (Git repos, open files, terminal/browser sessions, active
 * branch, model profile, agent permissions, ...) waits for the services
 * that own that state (Epics 6, 8, 9, 10) — a workspace today is just a
 * named, persisted root folder.
 */
export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  rootPath: z.string(),
  createdAt: z.number()
})
export type Workspace = z.infer<typeof workspaceSchema>

export const createWorkspaceRequestSchema = z.object({
  rootPath: z.string().min(1)
})
export type CreateWorkspaceRequest = z.infer<typeof createWorkspaceRequestSchema>

export const workspaceIdRequestSchema = z.object({
  id: z.string().min(1)
})
export type WorkspaceIdRequest = z.infer<typeof workspaceIdRequestSchema>
