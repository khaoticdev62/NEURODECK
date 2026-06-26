import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DesktopEntryScanner } from '../DesktopEntryScanner'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-desktop-entries-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

async function writeEntry(name: string, content: string): Promise<void> {
  await writeFile(join(dir, name), content, 'utf-8')
}

describe('DesktopEntryScanner', () => {
  it('parses a real .desktop file into an ApplicationRecord', async () => {
    await writeEntry(
      'demo.desktop',
      [
        '[Desktop Entry]',
        'Type=Application',
        'Name=Demo App',
        'Comment=A demo application',
        'Exec=/usr/bin/demo --flag %U',
        'Icon=demo-icon',
        'Categories=Utility;Development;'
      ].join('\n')
    )

    const scanner = new DesktopEntryScanner([dir])
    const records = await scanner.scan()

    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      name: 'Demo App',
      description: 'A demo application',
      executableRef: '/usr/bin/demo',
      launchArguments: ['--flag', '%U'],
      iconRef: 'demo-icon',
      categories: ['Utility', 'Development'],
      source: 'desktop-entry',
      installed: true
    })
  })

  it('skips entries marked NoDisplay or Hidden', async () => {
    await writeEntry(
      'hidden.desktop',
      ['[Desktop Entry]', 'Type=Application', 'Name=Hidden', 'Exec=/bin/x', 'NoDisplay=true'].join(
        '\n'
      )
    )
    await writeEntry(
      'reallyhidden.desktop',
      ['[Desktop Entry]', 'Type=Application', 'Name=Hidden2', 'Exec=/bin/y', 'Hidden=true'].join(
        '\n'
      )
    )

    const scanner = new DesktopEntryScanner([dir])
    expect(await scanner.scan()).toEqual([])
  })

  it('skips non-Application entries and entries missing Name/Exec', async () => {
    await writeEntry(
      'link.desktop',
      ['[Desktop Entry]', 'Type=Link', 'Name=Some Link', 'URL=https://example.com'].join('\n')
    )
    await writeEntry(
      'broken.desktop',
      ['[Desktop Entry]', 'Type=Application', 'Name=NoExec'].join('\n')
    )

    const scanner = new DesktopEntryScanner([dir])
    expect(await scanner.scan()).toEqual([])
  })

  it('ignores files that are not .desktop entries', async () => {
    await writeEntry('readme.txt', 'not a desktop entry')
    const scanner = new DesktopEntryScanner([dir])
    expect(await scanner.scan()).toEqual([])
  })

  it('continues scanning other directories when one does not exist', async () => {
    await writeEntry(
      'demo.desktop',
      ['[Desktop Entry]', 'Type=Application', 'Name=Demo', 'Exec=/bin/demo'].join('\n')
    )

    const scanner = new DesktopEntryScanner([join(dir, 'missing'), dir])
    const records = await scanner.scan()

    expect(records).toHaveLength(1)
    expect(records[0].name).toBe('Demo')
  })

  it('returns an empty list when no directories have any entries', async () => {
    const emptyDir = await mkdtemp(join(tmpdir(), 'ndx-desktop-empty-'))
    await mkdir(emptyDir, { recursive: true })
    const scanner = new DesktopEntryScanner([emptyDir])
    expect(await scanner.scan()).toEqual([])
    await rm(emptyDir, { recursive: true, force: true })
  })
})
