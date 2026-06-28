import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ProfileStore } from '../ProfileStore'

let dir: string
let now = 1_000

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'profile-store-'))
  now = 1_000
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

function store(): ProfileStore {
  let id = 0
  return new ProfileStore(
    join(dir, 'profiles.json'),
    () => now,
    () => `profile-${++id}`
  )
}

describe('ProfileStore', () => {
  it('creates a durable owner profile by default', async () => {
    const first = store()
    const state = await first.getState()

    expect(state.profiles).toHaveLength(1)
    expect(state.profiles[0]).toMatchObject({ id: 'owner', name: 'Owner', mode: 'owner' })
    expect(state.session.activeProfileId).toBe('owner')
  })

  it('creates and starts a guest profile session', async () => {
    const profiles = store()
    const guest = await profiles.create({ name: 'Guest', mode: 'guest', color: 'green' })
    now = 2_000

    const state = await profiles.startSession({ id: guest.id, privateMode: false })

    expect(state.session).toMatchObject({
      activeProfileId: guest.id,
      guestModeActive: true,
      privateModeActive: false,
      startedAt: 2_000
    })
  })

  it('tracks explicit private sessions without deleting shared data', async () => {
    const profiles = store()
    const work = await profiles.create({ name: 'Work', mode: 'work', color: 'blue' })

    const privateState = await profiles.startSession({ id: work.id, privateMode: true })
    expect(privateState.session.privateModeActive).toBe(true)

    const ended = await profiles.endPrivateSession()
    expect(ended.session.activeProfileId).toBe(work.id)
    expect(ended.session.privateModeActive).toBe(false)
  })

  it('refuses to remove the owner profile', async () => {
    const profiles = store()

    await expect(profiles.remove('owner')).rejects.toThrow('owner profile cannot be removed')
  })
})
