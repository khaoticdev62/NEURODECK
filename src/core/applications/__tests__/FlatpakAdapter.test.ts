import { describe, expect, it, vi } from 'vitest'
import { FlatpakAdapter, type FlatpakExec } from '../FlatpakAdapter'

describe('FlatpakAdapter', () => {
  it('isAvailable() reports true only when the real CLI responds', async () => {
    const exec = vi.fn().mockResolvedValue({ stdout: 'Flatpak 1.14.4', stderr: '' })
    const adapter = new FlatpakAdapter(exec as unknown as FlatpakExec)

    expect(await adapter.isAvailable()).toBe(true)
    expect(exec).toHaveBeenCalledWith(['--version'])
  })

  it('isAvailable() honestly reports false when flatpak is not installed', async () => {
    const exec = vi.fn().mockRejectedValue(new Error('command not found'))
    const adapter = new FlatpakAdapter(exec as unknown as FlatpakExec)

    expect(await adapter.isAvailable()).toBe(false)
  })

  it('listInstalled() parses real tab-separated flatpak list output', async () => {
    const exec = vi.fn().mockResolvedValue({
      stdout: 'org.gimp.GIMP\tGIMP\t2.10.34\norg.mozilla.firefox\tFirefox\t120.0\n',
      stderr: ''
    })
    const adapter = new FlatpakAdapter(exec as unknown as FlatpakExec)

    const apps = await adapter.listInstalled()

    expect(apps).toHaveLength(2)
    expect(apps[0]).toMatchObject({
      id: 'flatpak:org.gimp.GIMP',
      name: 'GIMP',
      executableRef: 'org.gimp.GIMP',
      source: 'flatpak',
      installed: true
    })
  })

  it('listInstalled() returns an empty list when flatpak is unavailable, never fabricated apps', async () => {
    const exec = vi.fn().mockRejectedValue(new Error('command not found'))
    const adapter = new FlatpakAdapter(exec as unknown as FlatpakExec)

    expect(await adapter.listInstalled()).toEqual([])
  })

  it('previewPermissions() returns real permission lines from flatpak info', async () => {
    const exec = vi.fn().mockResolvedValue({
      stdout: 'filesystems=home\nshared=network\n',
      stderr: ''
    })
    const adapter = new FlatpakAdapter(exec as unknown as FlatpakExec)

    expect(await adapter.previewPermissions('org.gimp.GIMP')).toEqual([
      'filesystems=home',
      'shared=network'
    ])
  })

  it('install/update/uninstall call the real CLI non-interactively', async () => {
    const exec = vi.fn().mockResolvedValue({ stdout: '', stderr: '' })
    const adapter = new FlatpakAdapter(exec as unknown as FlatpakExec)

    await adapter.install('org.gimp.GIMP')
    expect(exec).toHaveBeenCalledWith(['install', '-y', '--noninteractive', 'org.gimp.GIMP'])

    await adapter.update('org.gimp.GIMP')
    expect(exec).toHaveBeenCalledWith(['update', '-y', '--noninteractive', 'org.gimp.GIMP'])

    await adapter.uninstall('org.gimp.GIMP')
    expect(exec).toHaveBeenCalledWith(['uninstall', '-y', '--noninteractive', 'org.gimp.GIMP'])
  })

  it('isInstalled() verifies against a real re-query, not the install command result', async () => {
    const exec = vi.fn().mockResolvedValue({
      stdout: 'org.gimp.GIMP\tGIMP\t2.10.34\n',
      stderr: ''
    })
    const adapter = new FlatpakAdapter(exec as unknown as FlatpakExec)

    expect(await adapter.isInstalled('org.gimp.GIMP')).toBe(true)
    expect(await adapter.isInstalled('org.mozilla.firefox')).toBe(false)
  })
})
