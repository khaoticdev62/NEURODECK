import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NotificationPolicyStore } from '../NotificationPolicyStore'

describe('NotificationPolicyStore', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'notification-policy-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('defaults to no muted categories and quiet hours off', async () => {
    const store = new NotificationPolicyStore(join(dir, 'notification-policy.json'))
    expect(await store.get()).toEqual({
      mutedCategories: [],
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00'
    })
  })

  it('persists a real change across store instances', async () => {
    const path = join(dir, 'notification-policy.json')
    const first = new NotificationPolicyStore(path)
    await first.set({
      mutedCategories: ['information'],
      quietHoursEnabled: true,
      quietHoursStart: '21:00',
      quietHoursEnd: '08:00'
    })

    const second = new NotificationPolicyStore(path)
    expect(await second.get()).toEqual({
      mutedCategories: ['information'],
      quietHoursEnabled: true,
      quietHoursStart: '21:00',
      quietHoursEnd: '08:00'
    })
  })
})
