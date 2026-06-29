import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ApplicationPolicyStore } from '../ApplicationPolicyStore'

describe('ApplicationPolicyStore', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'application-policy-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('returns undefined for an application with no real configured policy', async () => {
    const store = new ApplicationPolicyStore(join(dir, 'app-policies.json'))
    expect(await store.get('app-1')).toBeUndefined()
    expect(await store.getLaunchEnvironment('app-1')).toEqual({})
  })

  it('persists a real policy and its launch environment across store instances', async () => {
    const path = join(dir, 'app-policies.json')
    const first = new ApplicationPolicyStore(path)
    await first.set(
      'app-1',
      [
        { category: 'network', allowed: false },
        { category: 'microphone', allowed: true }
      ],
      { NDX_PROFILE: 'sandboxed' }
    )

    const second = new ApplicationPolicyStore(path)
    const policy = await second.get('app-1')
    expect(policy?.entries).toEqual([
      { category: 'network', allowed: false },
      { category: 'microphone', allowed: true }
    ])
    expect(await second.getLaunchEnvironment('app-1')).toEqual({ NDX_PROFILE: 'sandboxed' })
  })

  it('keeps policies for different applications independent', async () => {
    const store = new ApplicationPolicyStore(join(dir, 'app-policies.json'))
    await store.set('app-1', [], { A: '1' })
    await store.set('app-2', [], { B: '2' })

    expect(await store.getLaunchEnvironment('app-1')).toEqual({ A: '1' })
    expect(await store.getLaunchEnvironment('app-2')).toEqual({ B: '2' })
  })
})
