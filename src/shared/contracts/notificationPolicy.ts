import { z } from 'zod'

/**
 * Epic X14 Notification Policy and Interruption Management
 * (supplemental spec §43), scoped to what the existing real toast
 * system already supports: per-category muting (reusing
 * `ToastContext.muteCategory()`/`unmuteCategory()`, the same real
 * mechanism Presentation Mode already reuses) and a real quiet-hours
 * window. `error` and `approval-required` are never offered as
 * mutable here — spec §43 itself says "Critical security events
 * remain visible," so this is a deliberate omission from the
 * schema's own category list, not a missing feature. Sound/haptic
 * routing, per-workspace/per-agent policy, and external routing
 * through extensions are deliberately not implemented — see the
 * ledger for the named reasons (no audio/haptic-on-notification
 * pipeline, no workspace/agent-scoped notification concept, and no
 * extension notification API exist yet in this codebase).
 */
export const mutableToastCategorySchema = z.enum([
  'information',
  'success',
  'warning',
  'background-task-complete'
])
export type MutableToastCategory = z.infer<typeof mutableToastCategorySchema>

/** `HH:mm`, 24-hour, validated structurally rather than via a full date parse. */
export const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

export const notificationPolicySchema = z.object({
  mutedCategories: z.array(mutableToastCategorySchema),
  quietHoursEnabled: z.boolean(),
  quietHoursStart: timeOfDaySchema,
  quietHoursEnd: timeOfDaySchema
})
export type NotificationPolicy = z.infer<typeof notificationPolicySchema>

export const setNotificationPolicyRequestSchema = notificationPolicySchema
export type SetNotificationPolicyRequest = z.infer<typeof setNotificationPolicyRequestSchema>
