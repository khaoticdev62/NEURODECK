import type { CapabilityState, FeatureDescriptor, FeatureState } from '@shared/contracts'

export interface FeatureVisibilityContext {
  /** Real `CapabilityRegistry.list()` output — `undefined` entries are treated as `dependency-required` (capability not yet checked), never silently `visible`. */
  capabilities: CapabilityState[]
  /** Active profile id, once Epic X10 exists — `undefined` today since no profile system is built yet. */
  activeProfileId?: string
  /** Set of extension ids currently enabled, once Epic X3 exists. */
  enabledExtensionIds?: Set<string>
  safeModeActive?: boolean
  guestModeActive?: boolean
}

/**
 * Epic X1 Feature Registry (supplemental spec §34) — computes real
 * visibility for a catalog of `FeatureDescriptor`s (`FEATURE_CATALOG`) so
 * navigation adapts instead of leaving a dead route or a screen that
 * crashes on a missing capability. The primary nav rail's
 * `NAVIGATION_DESTINATIONS` and the Search/Command Palette results are
 * both derived from this same catalog rather than duplicating it; every
 * current entry has zero capability/profile/extension dependencies, which
 * is the honest truth today — no Phase A screen is hardware- or
 * profile-gated yet. The computation below is
 * real and tested now so the Phase B epics that *do* introduce gated
 * features (Bluetooth Center needing `bluetooth`, Voice Assistant
 * needing `microphone`, profile-scoped screens) extend this one real
 * mechanism rather than each screen inventing its own hide/show logic.
 */
export class FeatureRegistry {
  constructor(private readonly catalog: FeatureDescriptor[]) {}

  list(context: FeatureVisibilityContext): FeatureState[] {
    return this.catalog.map((descriptor) => this.computeOne(descriptor, context))
  }

  private computeOne(
    descriptor: FeatureDescriptor,
    context: FeatureVisibilityContext
  ): FeatureState {
    if (context.safeModeActive) {
      return { descriptor, visibility: 'hidden', reason: 'Safe Mode is active.' }
    }

    if (
      descriptor.extensionOwnerId &&
      context.enabledExtensionIds &&
      !context.enabledExtensionIds.has(descriptor.extensionOwnerId)
    ) {
      return { descriptor, visibility: 'hidden', reason: 'Owning extension is disabled.' }
    }

    if (
      descriptor.profileVisibility.length > 0 &&
      context.activeProfileId &&
      !descriptor.profileVisibility.includes(context.activeProfileId)
    ) {
      return { descriptor, visibility: 'hidden', reason: 'Hidden by the active profile.' }
    }

    if (context.guestModeActive && descriptor.profileVisibility.length > 0) {
      return { descriptor, visibility: 'hidden', reason: 'Hidden in guest mode.' }
    }

    for (const capabilityId of descriptor.capabilityDependencies) {
      const capability = context.capabilities.find((candidate) => candidate.id === capabilityId)
      const status = capability?.status ?? 'dependency-required'
      if (status === 'unsupported') {
        return {
          descriptor,
          visibility: 'hidden',
          reason: `Requires "${capabilityId}", which is unsupported on this device.`
        }
      }
      if (status === 'dependency-required' || status === 'permission-required') {
        return {
          descriptor,
          visibility: 'disabled',
          reason: `Requires "${capabilityId}" (${status}).`
        }
      }
    }

    return { descriptor, visibility: 'visible' }
  }
}
