import type { ExtensionCapability } from '@shared/contracts'

export interface CapabilityHandlerContext {
  extensionId: string
  method: string
  args: Record<string, unknown>
}

export type CapabilityHandler = (context: CapabilityHandlerContext) => Promise<unknown>

/**
 * Real Epic X3 Capability API broker (supplemental spec §9.4) —
 * "Capabilities must be denied by default" is enforced here, not by
 * convention: a call for a capability the extension was never granted,
 * or with no registered real handler, is rejected before any handler
 * code runs. Mirrors the existing AI-safety `PermissionBroker`'s
 * deny-by-default posture, applied to the separate extension-capability
 * namespace (these are not AI tool-execution capabilities).
 */
export class CapabilityBroker {
  private readonly handlers = new Map<ExtensionCapability, CapabilityHandler>()

  register(capability: ExtensionCapability, handler: CapabilityHandler): void {
    this.handlers.set(capability, handler)
  }

  async call(
    extensionId: string,
    grantedCapabilities: ExtensionCapability[],
    capability: ExtensionCapability,
    method: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    if (!grantedCapabilities.includes(capability)) {
      throw new Error(`Capability "${capability}" was not granted to this extension.`)
    }
    const handler = this.handlers.get(capability)
    if (!handler) {
      throw new Error(`Capability "${capability}" has no real handler implemented yet.`)
    }
    return handler({ extensionId, method, args })
  }
}
