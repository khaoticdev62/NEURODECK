import type {
  ApplicationPolicy,
  ApplicationPolicyEntry,
  LaunchEnvironment
} from '@shared/contracts'
import { JsonStore } from '../persistence/JsonStore'

interface ApplicationPolicyIndex {
  policies: Record<string, ApplicationPolicy>
}

const DEFAULT_INDEX: ApplicationPolicyIndex = { policies: {} }

/**
 * Real Epic X14 Application Sandbox and Policy persisted store
 * (supplemental spec §47). See `shared/contracts/applicationPolicy.ts`
 * for why every category except `launchEnvironment` is a real,
 * persisted declaration of intent rather than an enforced boundary —
 * NeuroDeck has no sandbox around the external processes it launches.
 */
export class ApplicationPolicyStore {
  private readonly store: JsonStore<ApplicationPolicyIndex>

  constructor(filePath: string) {
    this.store = new JsonStore<ApplicationPolicyIndex>(filePath, DEFAULT_INDEX)
  }

  async get(applicationId: string): Promise<ApplicationPolicy | undefined> {
    const index = await this.store.read()
    return index.policies[applicationId]
  }

  async set(
    applicationId: string,
    entries: ApplicationPolicyEntry[],
    launchEnvironment: LaunchEnvironment
  ): Promise<ApplicationPolicy> {
    const index = await this.store.read()
    const policy: ApplicationPolicy = {
      applicationId,
      entries,
      launchEnvironment,
      updatedAt: Date.now()
    }
    await this.store.write({ policies: { ...index.policies, [applicationId]: policy } })
    return policy
  }

  /** The one real enforcement point — used by `ApplicationLauncher` to merge into the actual spawned process's environment. */
  async getLaunchEnvironment(applicationId: string): Promise<LaunchEnvironment> {
    const policy = await this.get(applicationId)
    return policy?.launchEnvironment ?? {}
  }
}
