import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildAppImageRecord, verifyAppImage } from '../AppImageVerifier'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-appimage-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('verifyAppImage', () => {
  it('accepts a real file starting with the ELF magic number', async () => {
    const path = join(dir, 'Demo-x86_64.AppImage')
    await writeFile(path, Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01]))

    const result = await verifyAppImage(path)

    expect(result.valid).toBe(true)
    expect(result.sizeBytes).toBe(7)
  })

  it('rejects a file that does not start with the ELF magic number', async () => {
    const path = join(dir, 'not-an-appimage.AppImage')
    await writeFile(path, 'just some text')

    const result = await verifyAppImage(path)

    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/ELF magic/)
  })

  it('honestly fails when the file does not exist', async () => {
    const result = await verifyAppImage(join(dir, 'missing.AppImage'))
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/Could not open file/)
  })

  it('rejects a file shorter than the magic number itself', async () => {
    const path = join(dir, 'tiny.AppImage')
    await writeFile(path, Buffer.from([0x7f, 0x45]))

    const result = await verifyAppImage(path)
    expect(result.valid).toBe(false)
  })
})

describe('buildAppImageRecord', () => {
  it('derives a real name from the file path and strips the .AppImage suffix', () => {
    const record = buildAppImageRecord('/home/deck/Apps/Krita-5.2.x86_64.AppImage', 52428800)

    expect(record.name).toBe('Krita-5.2.x86_64')
    expect(record.source).toBe('appimage')
    expect(record.executableRef).toBe('/home/deck/Apps/Krita-5.2.x86_64.AppImage')
    expect(record.description).toBe('50 MB')
  })
})
