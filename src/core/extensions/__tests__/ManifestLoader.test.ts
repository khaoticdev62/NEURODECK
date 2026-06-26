import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadManifest } from '../ManifestLoader'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-manifest-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const VALID_MANIFEST = {
  schemaVersion: '1',
  id: 'ext.demo',
  name: 'Demo Extension',
  version: '1.0.0',
  publisher: 'demo-publisher',
  description: 'A demo extension',
  type: 'command',
  entrypoints: { main: 'index.js' },
  capabilities: [],
  minimumNdxVersion: '0.1.0',
  supportedPlatforms: []
}

describe('loadManifest', () => {
  it('loads and validates a real manifest.json', async () => {
    await writeFile(join(dir, 'manifest.json'), JSON.stringify(VALID_MANIFEST), 'utf-8')

    const result = await loadManifest(dir)

    expect(result.valid).toBe(true)
    expect(result.manifest?.id).toBe('ext.demo')
  })

  it('rejects a missing manifest.json honestly', async () => {
    const result = await loadManifest(dir)
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/Could not read manifest.json/)
  })

  it('rejects malformed JSON', async () => {
    await writeFile(join(dir, 'manifest.json'), '{ not json', 'utf-8')
    const result = await loadManifest(dir)
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/not valid JSON/)
  })

  it('rejects a manifest that fails schema validation', async () => {
    await writeFile(join(dir, 'manifest.json'), JSON.stringify({ id: 'ext.demo' }), 'utf-8')
    const result = await loadManifest(dir)
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/schema validation/)
  })

  it('rejects an entrypoint that escapes the install directory via traversal', async () => {
    await writeFile(
      join(dir, 'manifest.json'),
      JSON.stringify({ ...VALID_MANIFEST, entrypoints: { main: '../../../etc/passwd' } }),
      'utf-8'
    )
    const result = await loadManifest(dir)
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/escapes/)
  })

  it('rejects an absolute entrypoint path', async () => {
    await writeFile(
      join(dir, 'manifest.json'),
      JSON.stringify({ ...VALID_MANIFEST, entrypoints: { main: '/etc/passwd' } }),
      'utf-8'
    )
    const result = await loadManifest(dir)
    expect(result.valid).toBe(false)
  })

  it('accepts a real nested entrypoint inside the install directory', async () => {
    await mkdir(join(dir, 'dist'), { recursive: true })
    await writeFile(
      join(dir, 'manifest.json'),
      JSON.stringify({ ...VALID_MANIFEST, entrypoints: { main: 'dist/index.js' } }),
      'utf-8'
    )
    const result = await loadManifest(dir)
    expect(result.valid).toBe(true)
  })
})
