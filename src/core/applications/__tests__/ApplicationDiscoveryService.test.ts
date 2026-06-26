import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UpsertApplicationRequest } from '@shared/contracts'
import { ApplicationDiscoveryService } from '../ApplicationDiscoveryService'
import { ApplicationStore } from '../ApplicationStore'

let dir: string
let store: ApplicationStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-discovery-'))
  store = new ApplicationStore(join(dir, 'applications.json'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

function fakeRequest(id: string): UpsertApplicationRequest {
  return {
    id,
    source: 'desktop-entry',
    name: id,
    launchArguments: [],
    categories: [],
    installed: true,
    workspaceIds: [],
    launchMode: 'windowed',
    capabilityRequirements: []
  }
}

describe('ApplicationDiscoveryService', () => {
  it('runs every real scanner and upserts results into the registry', async () => {
    const desktopEntryScanner = { scan: vi.fn().mockResolvedValue([fakeRequest('desktop-1')]) }
    const steamLibraryScanner = { scan: vi.fn().mockResolvedValue([fakeRequest('steam-1')]) }
    const flatpakAdapter = { listInstalled: vi.fn().mockResolvedValue([fakeRequest('flatpak-1')]) }

    const service = new ApplicationDiscoveryService(
      store,
      desktopEntryScanner as never,
      steamLibraryScanner as never,
      flatpakAdapter as never
    )

    const records = await service.discover()

    expect(records.map((record) => record.id).sort()).toEqual(['desktop-1', 'flatpak-1', 'steam-1'])
    expect(await store.list()).toHaveLength(3)
  })

  it('only runs the requested sources', async () => {
    const desktopEntryScanner = { scan: vi.fn().mockResolvedValue([fakeRequest('desktop-1')]) }
    const steamLibraryScanner = { scan: vi.fn().mockResolvedValue([fakeRequest('steam-1')]) }
    const flatpakAdapter = { listInstalled: vi.fn().mockResolvedValue([fakeRequest('flatpak-1')]) }

    const service = new ApplicationDiscoveryService(
      store,
      desktopEntryScanner as never,
      steamLibraryScanner as never,
      flatpakAdapter as never
    )

    await service.discover(['desktop-entry'])

    expect(desktopEntryScanner.scan).toHaveBeenCalled()
    expect(steamLibraryScanner.scan).not.toHaveBeenCalled()
    expect(flatpakAdapter.listInstalled).not.toHaveBeenCalled()
  })

  it('does not let one failing scanner abort the others', async () => {
    const desktopEntryScanner = { scan: vi.fn().mockRejectedValue(new Error('boom')) }
    const steamLibraryScanner = { scan: vi.fn().mockResolvedValue([fakeRequest('steam-1')]) }
    const flatpakAdapter = { listInstalled: vi.fn().mockResolvedValue([]) }

    const service = new ApplicationDiscoveryService(
      store,
      desktopEntryScanner as never,
      steamLibraryScanner as never,
      flatpakAdapter as never
    )

    const records = await service.discover()

    expect(records.map((record) => record.id)).toEqual(['steam-1'])
  })
})
