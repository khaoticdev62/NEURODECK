import { z } from 'zod'

/**
 * Real Browser System (mega-prompt §24), scoped to: tabs, workspace
 * grouping, persisted tab metadata across restarts, real navigation
 * (back/forward/reload/address-bar), and `shell.openExternal()` for
 * "open externally." Reader mode, downloads, site profiles, AI
 * summarization, and "add page to workspace context" are deferred — see
 * the ledger for why each one needs infrastructure this slice doesn't
 * build. Only one tab's `WebContentsView` is attached to the window at a
 * time (the active one); switching tabs reloads the URL rather than
 * keeping every tab's content process resident, a deliberate scope
 * simplification documented in the ledger.
 */
export const browserTabSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  url: z.string(),
  title: z.string(),
  loading: z.boolean(),
  canGoBack: z.boolean(),
  canGoForward: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number()
})
export type BrowserTab = z.infer<typeof browserTabSchema>

export const workspaceBrowserRequestSchema = z.object({ workspaceId: z.string().min(1) })
export type WorkspaceBrowserRequest = z.infer<typeof workspaceBrowserRequestSchema>

export const createBrowserTabRequestSchema = z.object({
  workspaceId: z.string().min(1),
  url: z.string().min(1)
})
export type CreateBrowserTabRequest = z.infer<typeof createBrowserTabRequestSchema>

export const browserTabIdRequestSchema = z.object({ tabId: z.string().min(1) })
export type BrowserTabIdRequest = z.infer<typeof browserTabIdRequestSchema>

export const navigateBrowserTabRequestSchema = z.object({
  tabId: z.string().min(1),
  url: z.string().min(1)
})
export type NavigateBrowserTabRequest = z.infer<typeof navigateBrowserTabRequestSchema>

export const setBrowserTabBoundsRequestSchema = z.object({
  tabId: z.string().min(1),
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative()
})
export type SetBrowserTabBoundsRequest = z.infer<typeof setBrowserTabBoundsRequestSchema>

export const browserPermissionSchema = z.object({
  origin: z.string().min(1),
  permission: z.string().min(1),
  granted: z.boolean(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative()
})
export type BrowserPermission = z.infer<typeof browserPermissionSchema>

export const browserPermissionRequestSchema = z.object({
  requestId: z.string().min(1),
  tabId: z.string().min(1),
  origin: z.string().min(1),
  permission: z.string().min(1)
})
export type BrowserPermissionRequest = z.infer<typeof browserPermissionRequestSchema>

export const browserPermissionResponseSchema = z.object({
  requestId: z.string().min(1),
  granted: z.boolean()
})
export type BrowserPermissionResponse = z.infer<typeof browserPermissionResponseSchema>

export const browserPermissionKeyRequestSchema = z.object({
  origin: z.string().min(1),
  permission: z.string().min(1)
})
export type BrowserPermissionKeyRequest = z.infer<typeof browserPermissionKeyRequestSchema>
