import type { ExtensionRecord, ExtensionTrust, InstallExtensionRequest } from '@shared/contracts'
import { loadManifest } from './ManifestLoader'
import { verifyManifestSignature } from './ManifestSignature'
import type { ExtensionHost } from './ExtensionHost'
import type { ExtensionStore } from './ExtensionStore'
import type { TrustedPublisherStore } from './TrustedPublisherStore'

const QUARANTINE_FAULT_THRESHOLD = 3

export interface ExtensionRuntimeNotify {
  (record: ExtensionRecord): void
}

/**
 * Real Epic X3 extension lifecycle orchestrator (supplemental spec
 * §9.5). Ties `ManifestLoader` (verification), `ExtensionStore`
 * (persisted state), and `ExtensionHost` (the real process-isolated
 * execution boundary) together. Install is explicitly scoped to "from a
 * local unpacked directory" — there is no real marketplace/registry
 * protocol to download from yet (see the ledger), and fabricating one
 * would violate the supplemental non-negotiables' "no package-manager
 * lies."
 */
export class ExtensionRuntime {
  constructor(
    private readonly store: ExtensionStore,
    private readonly host: ExtensionHost,
    private readonly notify: ExtensionRuntimeNotify,
    /** Optional so existing call sites/tests built before Epic X15's real signature verification are unaffected. */
    private readonly trustedPublishers?: TrustedPublisherStore
  ) {}

  async install(request: InstallExtensionRequest): Promise<ExtensionRecord> {
    const result = await loadManifest(request.directoryPath)
    if (!result.valid || !result.manifest) {
      throw new Error(result.reason ?? 'Invalid extension manifest.')
    }

    const trust = await this.resolveTrust(result.manifest)

    const requestedCapabilities = new Set(result.manifest.capabilities.map((c) => c.capability))
    const grantedCapabilities = request.approvedCapabilities.filter((capability) =>
      requestedCapabilities.has(capability)
    )

    const now = Date.now()
    const record: ExtensionRecord = {
      manifest: result.manifest,
      installPath: request.directoryPath,
      state: 'installed',
      trust,
      grantedCapabilities,
      faultCount: 0,
      installedAt: now,
      updatedAt: now
    }
    const saved = await this.store.upsert(record)
    this.notify(saved)
    return saved
  }

  /**
   * Real Epic X15 signature verification. `unsigned` and `signed` (a
   * signature is present but its fingerprint is not in the local
   * trusted-publisher keystore) never block install — they are
   * informational trust tiers, matching this codebase's pre-existing
   * behavior. A fingerprint that *does* match a trusted publisher is
   * cryptographically checked: a forged signature claiming a trusted
   * publisher's identity fails install outright rather than silently
   * downgrading to a lower trust tier, since that specific case is
   * tamper evidence, not merely "unverified."
   */
  private async resolveTrust(
    manifest: NonNullable<Awaited<ReturnType<typeof loadManifest>>['manifest']>
  ): Promise<ExtensionTrust> {
    if (!manifest.signature) return 'unsigned'
    if (!this.trustedPublishers) return 'signed'

    const publisher = await this.trustedPublishers.get(manifest.signature.publicKeyFingerprint)
    if (!publisher) return 'signed'
    if (publisher.revoked) return 'revoked'

    const valid = verifyManifestSignature(manifest, publisher.publicKeyPem)
    if (!valid) {
      throw new Error(
        `This extension's signature claims to be from the trusted publisher "${publisher.publisherName}" but does not cryptographically verify against that publisher's key. Refusing to install.`
      )
    }
    return 'verified-publisher'
  }

  async setEnabled(id: string, enabled: boolean): Promise<ExtensionRecord> {
    const record = await this.store.get(id)
    if (!record) throw new Error('That extension is not installed.')
    if (record.state === 'quarantined' && enabled) {
      throw new Error(
        'A quarantined extension must be explicitly cleared before it can be re-enabled.'
      )
    }

    if (enabled) {
      this.host.start(record)
    } else {
      this.host.stop(id)
    }

    const updated = await this.store.upsert({ ...record, state: enabled ? 'enabled' : 'disabled' })
    this.notify(updated)
    return updated
  }

  async remove(id: string): Promise<void> {
    this.host.stop(id)
    await this.store.remove(id)
  }

  /** Real fault handling (supplemental §9.6) — `ExtensionHost`'s real fault count drives this, not a cosmetic counter. */
  async handleFault(id: string, message: string, faultCountInWindow: number): Promise<void> {
    const record = await this.store.get(id)
    if (!record) return

    if (faultCountInWindow >= QUARANTINE_FAULT_THRESHOLD) {
      this.host.stop(id)
      const quarantined = await this.store.upsert({
        ...record,
        state: 'quarantined',
        faultCount: faultCountInWindow,
        lastFaultAt: Date.now(),
        quarantineReason: `Automatically quarantined after ${faultCountInWindow} faults within 60s. Last fault: ${message}`
      })
      this.notify(quarantined)
      return
    }

    const updated = await this.store.upsert({
      ...record,
      faultCount: faultCountInWindow,
      lastFaultAt: Date.now()
    })
    this.notify(updated)
  }

  /** Real "clear extension data" (supplemental §9.5) — resets fault state so a previously quarantined extension can be deliberately re-enabled, without resetting `grantedCapabilities` (capability grants stay an explicit, separate decision). */
  async clearQuarantine(id: string): Promise<ExtensionRecord> {
    const record = await this.store.get(id)
    if (!record) throw new Error('That extension is not installed.')
    const updated = await this.store.upsert({
      ...record,
      state: 'disabled',
      faultCount: 0,
      lastFaultAt: undefined,
      quarantineReason: undefined
    })
    this.notify(updated)
    return updated
  }
}
