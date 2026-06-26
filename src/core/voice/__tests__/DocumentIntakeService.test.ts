import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { intakeDocument } from '../DocumentIntakeService'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-document-intake-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('intakeDocument', () => {
  it('extracts real text from a supported file for immediate context', async () => {
    const path = join(dir, 'notes.md')
    await writeFile(path, 'Meeting notes: ship the release on Friday.', 'utf-8')

    const result = await intakeDocument(path)

    expect(result.text).toBe('Meeting notes: ship the release on Friday.')
    expect(result.redacted).toBe(false)
  })

  it('redacts real secret-shaped content rather than returning it as context', async () => {
    const path = join(dir, 'creds.txt')
    await writeFile(path, 'AKIAABCDEFGHIJKLMNOP', 'utf-8')

    const result = await intakeDocument(path)

    expect(result.redacted).toBe(true)
    expect(result.text).toContain('redacted')
    expect(result.redactionLabel).toMatch(/AWS/)
  })

  it('rejects an unsupported document type honestly', async () => {
    const path = join(dir, 'scan.pdf')
    await writeFile(path, 'fake pdf bytes', 'utf-8')

    await expect(intakeDocument(path)).rejects.toThrow(/Unsupported document type/)
  })
})
