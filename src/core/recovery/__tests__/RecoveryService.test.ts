import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { RecoveryService } from '../RecoveryService'

let dir: string
let service: RecoveryService

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-recovery-'))
  service = new RecoveryService(dir)
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('RecoveryService', () => {
  it('starts with no checkpoints', async () => {
    expect(await service.list('w1')).toEqual([])
  })

  it('records a real checkpoint with a previous-content snapshot', async () => {
    const checkpoint = await service.recordCheckpoint('w1', 'a.ts', 'old content', 'edit a.ts')

    expect(checkpoint.hadPreviousContent).toBe(true)
    expect(checkpoint.reversibility).toBe('fully-reversible')
    expect(await service.getSnapshotContent('w1', checkpoint.id)).toBe('old content')
  })

  it('records a checkpoint for a brand-new file with no snapshot content', async () => {
    const checkpoint = await service.recordCheckpoint('w1', 'new.ts', null, 'create new.ts')

    expect(checkpoint.hadPreviousContent).toBe(false)
    expect(await service.getSnapshotContent('w1', checkpoint.id)).toBeNull()
  })

  it('lists checkpoints newest first', async () => {
    await service.recordCheckpoint('w1', 'a.ts', 'v1', 'first edit')
    await service.recordCheckpoint('w1', 'a.ts', 'v2', 'second edit')

    const checkpoints = await service.list('w1')
    expect(checkpoints.map((c) => c.description)).toEqual(['second edit', 'first edit'])
  })

  it('keeps workspaces isolated', async () => {
    await service.recordCheckpoint('w1', 'a.ts', 'x', 'edit')
    expect(await service.list('w2')).toEqual([])
  })

  it('reports a real storage summary including snapshot byte sizes', async () => {
    await service.recordCheckpoint('w1', 'a.ts', 'hello', 'edit')
    await service.recordCheckpoint('w1', 'b.ts', null, 'create')

    const summary = await service.storageSummary('w1')
    expect(summary.checkpointCount).toBe(2)
    expect(summary.totalBytes).toBe(Buffer.byteLength('hello'))
  })

  it('prunes checkpoints beyond the retention limit and deletes their real snapshot files', async () => {
    for (let i = 0; i < 55; i += 1) {
      await service.recordCheckpoint('w1', 'a.ts', `content-${i}`, `edit ${i}`)
    }

    const checkpoints = await service.list('w1')
    expect(checkpoints).toHaveLength(50)
    expect(checkpoints[0].description).toBe('edit 54')

    const files = await readdir(join(dir, 'w1'))
    const snapshotFiles = files.filter((file) => file.endsWith('.snapshot'))
    expect(snapshotFiles).toHaveLength(50)
  })
})
