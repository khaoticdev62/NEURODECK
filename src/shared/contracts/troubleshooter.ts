import { z } from 'zod'

/**
 * Epic X13 Guided Troubleshooter (supplemental spec §41.3). "The
 * troubleshooter must run real diagnostics and never pretend an issue
 * is fixed" — every issue below is backed by a real existing service
 * call (`NetworkService`, `ModelProviderService`, `CapabilityRegistry`,
 * `SystemMetricsService`, `ExtensionStore`, `UpdateService`); there is
 * no step here that fabricates a pass/fail. Issues from the spec's own
 * list with no real diagnostic source yet in this codebase (Focus
 * stuck, Steam shortcut broken, VPN failure, Display unusable,
 * Database recovery) are deliberately not included — see
 * `GuidedTroubleshooterService`'s doc comment. "Controller not
 * detected" is checked entirely client-side via the real browser
 * Gamepad API and never reaches this IPC surface.
 */
export const troubleshooterIssueIdSchema = z.enum([
  'no-network',
  'model-unavailable',
  'no-microphone',
  'storage-low',
  'extension-crash',
  'update-failure'
])
export type TroubleshooterIssueId = z.infer<typeof troubleshooterIssueIdSchema>

export const troubleshooterCheckStatusSchema = z.enum(['pass', 'fail', 'warning', 'unknown'])
export type TroubleshooterCheckStatus = z.infer<typeof troubleshooterCheckStatusSchema>

export const troubleshooterStepResultSchema = z.object({
  label: z.string(),
  status: troubleshooterCheckStatusSchema,
  detail: z.string()
})
export type TroubleshooterStepResult = z.infer<typeof troubleshooterStepResultSchema>

export const troubleshooterResultSchema = z.object({
  issueId: troubleshooterIssueIdSchema,
  ranAt: z.number(),
  steps: z.array(troubleshooterStepResultSchema),
  overallStatus: troubleshooterCheckStatusSchema,
  remediation: z.array(z.string())
})
export type TroubleshooterResult = z.infer<typeof troubleshooterResultSchema>

export const runTroubleshooterCheckRequestSchema = z.object({
  issueId: troubleshooterIssueIdSchema
})
export type RunTroubleshooterCheckRequest = z.infer<typeof runTroubleshooterCheckRequestSchema>
