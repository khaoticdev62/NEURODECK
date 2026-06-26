import type {
  ApplicationDiscoverySource,
  ApplicationRecord,
  UpsertApplicationRequest
} from '@shared/contracts'
import type { ApplicationStore } from './ApplicationStore'
import type { DesktopEntryScanner } from './discovery/DesktopEntryScanner'
import type { FlatpakAdapter } from './FlatpakAdapter'
import type { SteamLibraryScanner } from './discovery/SteamLibraryScanner'

/**
 * Real Epic X2 discovery orchestrator (supplemental spec §6.1) — runs
 * every real scanner/adapter and upserts results into the Epic X1
 * `ApplicationStore`. AppImage records are deliberately excluded here:
 * the spec scopes them to "AppImages registered by the user," a real
 * file-picker action (`application.registerAppImage`), not something
 * this orchestrator scans for automatically. "NeuroDeck internal tools"
 * and "user-created shortcuts" are also not synthesized here — there is
 * no real registry of either yet to discover from, and inventing
 * placeholder entries for them would be exactly the fabricated-record
 * pattern this epic's own non-negotiables forbid.
 */
export class ApplicationDiscoveryService {
  constructor(
    private readonly store: ApplicationStore,
    private readonly desktopEntryScanner: DesktopEntryScanner,
    private readonly steamLibraryScanner: SteamLibraryScanner,
    private readonly flatpakAdapter: FlatpakAdapter
  ) {}

  async discover(sources?: ApplicationDiscoverySource[]): Promise<ApplicationRecord[]> {
    const wanted = new Set(sources ?? ['desktop-entry', 'steam-library', 'flatpak'])
    const batches: UpsertApplicationRequest[][] = []

    if (wanted.has('desktop-entry')) {
      batches.push(await this.desktopEntryScanner.scan().catch(() => []))
    }
    if (wanted.has('steam-library')) {
      batches.push(await this.steamLibraryScanner.scan().catch(() => []))
    }
    if (wanted.has('flatpak')) {
      batches.push(await this.flatpakAdapter.listInstalled().catch(() => []))
    }

    const results: ApplicationRecord[] = []
    for (const batch of batches) {
      for (const request of batch) {
        results.push(await this.store.upsert(request))
      }
    }
    return results
  }
}
