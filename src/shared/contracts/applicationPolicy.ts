import { z } from 'zod'

/**
 * Epic X14 Application Sandbox and Policy (supplemental spec §47).
 * "Where the OS cannot enforce a permission, label it as advisory
 * rather than pretending it is enforced" — and for every category
 * below except `launch-environment`, that is the honest, structural
 * truth here: NeuroDeck launches external applications as ordinary
 * detached OS processes (`ApplicationLauncher.spawnDetached()`); it
 * does not run them inside any sandbox it controls, so it has no real
 * mechanism to enforce file/network/clipboard/microphone/camera/
 * notification/AI-context/extension/download-location restrictions on
 * an already-launched external process. These are real, persisted,
 * user-visible *declarations of intent* — useful as a record of what
 * the user expects from an app — never a fabricated enforcement
 * boundary. `launch-environment` is the one real exception: NeuroDeck's
 * own launcher controls the real environment variables a process is
 * spawned with, so that one *is* genuinely enforced. "Workspace
 * association" is also already real, via the existing
 * `ApplicationRecord.workspaceIds` field and `application.upsert` IPC
 * — not duplicated here.
 */
export const applicationPolicyCategorySchema = z.enum([
  'file-roots',
  'network',
  'clipboard',
  'microphone',
  'camera',
  'notifications',
  'ai-context',
  'extension-access',
  'download-location'
])
export type ApplicationPolicyCategory = z.infer<typeof applicationPolicyCategorySchema>

export const applicationPolicyEntrySchema = z.object({
  category: applicationPolicyCategorySchema,
  allowed: z.boolean()
})
export type ApplicationPolicyEntry = z.infer<typeof applicationPolicyEntrySchema>

export const launchEnvironmentSchema = z.record(z.string().min(1), z.string())
export type LaunchEnvironment = z.infer<typeof launchEnvironmentSchema>

export const applicationPolicySchema = z.object({
  applicationId: z.string().min(1),
  entries: z.array(applicationPolicyEntrySchema),
  launchEnvironment: launchEnvironmentSchema,
  updatedAt: z.number()
})
export type ApplicationPolicy = z.infer<typeof applicationPolicySchema>

export const applicationPolicyIdRequestSchema = z.object({ applicationId: z.string().min(1) })
export type ApplicationPolicyIdRequest = z.infer<typeof applicationPolicyIdRequestSchema>

export const setApplicationPolicyRequestSchema = z.object({
  applicationId: z.string().min(1),
  entries: z.array(applicationPolicyEntrySchema),
  launchEnvironment: launchEnvironmentSchema
})
export type SetApplicationPolicyRequest = z.infer<typeof setApplicationPolicyRequestSchema>
