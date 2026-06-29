import type { NotificationPolicy } from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'

const DEFAULT_POLICY: NotificationPolicy = {
  mutedCategories: [],
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00'
}

/**
 * Real Epic X14 Notification Policy persisted settings (supplemental
 * spec §43). Tiny by design — the real enforcement (muting/unmuting
 * via the existing `ToastContext`, the real quiet-hours window check)
 * lives in the renderer's `NotificationPolicyProvider`; this store
 * only remembers what the user configured, the same scope every
 * other small settings store in this codebase already uses.
 */
export class NotificationPolicyStore {
  private readonly store: JsonStore<NotificationPolicy>

  constructor(filePath: string) {
    this.store = new JsonStore<NotificationPolicy>(filePath, DEFAULT_POLICY)
  }

  async get(): Promise<NotificationPolicy> {
    return this.store.read()
  }

  async set(policy: NotificationPolicy): Promise<NotificationPolicy> {
    await this.store.write(policy)
    return policy
  }
}
