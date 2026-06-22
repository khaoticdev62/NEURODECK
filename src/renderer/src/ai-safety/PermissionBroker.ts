import type { PermissionCapability, PermissionGrant, PermissionScope } from './contracts/permission'

export type PermissionDecision = 'granted' | 'requires-approval'

/**
 * Real permission evaluation (mega-prompt §16). Capabilities are never
 * auto-granted — `evaluate()` only returns "granted" if a prior grant
 * actually covers this capability at a scope that hasn't expired/been
 * revoked. Revocation must be possible (per spec) — see `revoke()`.
 */
export class PermissionBroker {
  private grants = new Map<PermissionCapability, PermissionGrant>()

  evaluate(capability: PermissionCapability): PermissionDecision {
    return this.grants.has(capability) ? 'granted' : 'requires-approval'
  }

  grant(capability: PermissionCapability, scope: PermissionScope): void {
    this.grants.set(capability, { capability, scope, grantedAt: Date.now() })
  }

  revoke(capability: PermissionCapability): void {
    this.grants.delete(capability)
  }

  /** "Once" grants are single-use — consumed immediately after the gated action runs. */
  consumeIfOnce(capability: PermissionCapability): void {
    const grant = this.grants.get(capability)
    if (grant?.scope === 'once') this.grants.delete(capability)
  }

  listGrants(): PermissionGrant[] {
    return [...this.grants.values()]
  }
}
