import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ApplicationStore } from '../ApplicationStore'
import { FlatpakAdapter, type FlatpakExec } from '../FlatpakAdapter'
import { PackageLifecycleService } from '../PackageLifecycleService'
import { TransactionManager } from '../../transactions/TransactionManager'

let dir: string
let store: ApplicationStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-package-lifecycle-'))
  store = new ApplicationStore(join(dir, 'applications.json'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

function exec(responses: Record<string, { stdout: string; stderr: string }>): FlatpakExec {
  return async (args) => {
    const key = args[0]
    return responses[key] ?? { stdout: '', stderr: '' }
  }
}

describe('PackageLifecycleService', () => {
  it('install() succeeds only after verifying the app is really in the installed list', async () => {
    const flatpak = new FlatpakAdapter(
      exec({
        install: { stdout: '', stderr: '' },
        list: { stdout: 'org.gimp.GIMP\tGIMP\t2.10.34\n', stderr: '' }
      })
    )
    const transactions = new TransactionManager()
    const service = new PackageLifecycleService(flatpak, transactions, store)

    const result = await service.install('org.gimp.GIMP')

    expect(result.status).toBe('succeeded')
    expect(await store.get('flatpak:org.gimp.GIMP')).toBeDefined()
  })

  it('install() fails (does not fabricate success) when the app is not verified afterward', async () => {
    const flatpak = new FlatpakAdapter(
      exec({
        install: { stdout: '', stderr: '' },
        list: { stdout: '', stderr: '' }
      })
    )
    const transactions = new TransactionManager()
    const service = new PackageLifecycleService(flatpak, transactions, store)

    const result = await service.install('org.gimp.GIMP')

    expect(result.status).toBe('failed')
    expect(result.message).toMatch(/refusing to report success/)
  })

  it('install() fails when the real flatpak command itself fails', async () => {
    const flatpak = new FlatpakAdapter(async () => {
      throw new Error('remote not found')
    })
    const transactions = new TransactionManager()
    const service = new PackageLifecycleService(flatpak, transactions, store)

    const result = await service.install('org.gimp.GIMP')

    expect(result.status).toBe('failed')
    expect(result.message).toBe('remote not found')
  })

  it('uninstall() succeeds only after verifying the app is really gone', async () => {
    await store.upsert({
      id: 'flatpak:org.gimp.GIMP',
      source: 'flatpak',
      name: 'GIMP',
      executableRef: 'org.gimp.GIMP',
      launchArguments: [],
      categories: [],
      installed: true,
      workspaceIds: [],
      launchMode: 'windowed',
      capabilityRequirements: []
    })
    const flatpak = new FlatpakAdapter(
      exec({ uninstall: { stdout: '', stderr: '' }, list: { stdout: '', stderr: '' } })
    )
    const transactions = new TransactionManager()
    const service = new PackageLifecycleService(flatpak, transactions, store)

    const result = await service.uninstall('org.gimp.GIMP')

    expect(result.status).toBe('succeeded')
    expect(await store.get('flatpak:org.gimp.GIMP')).toBeUndefined()
  })

  it('uninstall() fails when the app still appears installed afterward', async () => {
    const flatpak = new FlatpakAdapter(
      exec({
        uninstall: { stdout: '', stderr: '' },
        list: { stdout: 'org.gimp.GIMP\tGIMP\t2.10.34\n', stderr: '' }
      })
    )
    const transactions = new TransactionManager()
    const service = new PackageLifecycleService(flatpak, transactions, store)

    const result = await service.uninstall('org.gimp.GIMP')

    expect(result.status).toBe('failed')
  })

  it('creates non-cancellable transactions, an honest statement about the real flatpak CLI', async () => {
    const flatpak = new FlatpakAdapter(exec({}))
    const transactions = new TransactionManager()
    const service = new PackageLifecycleService(flatpak, transactions, store)

    const result = await service.update('org.gimp.GIMP')

    expect(result.cancellable).toBe(false)
  })
})
