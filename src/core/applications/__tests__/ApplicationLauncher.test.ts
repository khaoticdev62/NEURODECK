import { describe, expect, it, vi } from 'vitest'
import type { ApplicationRecord } from '@shared/contracts'
import { ApplicationLauncher } from '../ApplicationLauncher'

function record(overrides: Partial<ApplicationRecord>): ApplicationRecord {
  return {
    id: 'app-1',
    source: 'internal',
    name: 'Demo',
    launchArguments: [],
    categories: [],
    installed: true,
    workspaceIds: [],
    launchMode: 'windowed',
    capabilityRequirements: [],
    createdAt: 1,
    updatedAt: 1,
    ...overrides
  }
}

describe('ApplicationLauncher', () => {
  it('opens the real steam:// URI for a steam-sourced record', async () => {
    const openUrl = vi.fn().mockResolvedValue(undefined)
    const launcher = new ApplicationLauncher({ openUrl })

    const result = await launcher.launch(
      record({ source: 'steam', executableRef: 'steam://rungameid/440' })
    )

    expect(openUrl).toHaveBeenCalledWith('steam://rungameid/440')
    expect(result.launched).toBe(true)
  })

  it('fails honestly when a steam record has no real reference', async () => {
    const launcher = new ApplicationLauncher({ openUrl: vi.fn() })
    const result = await launcher.launch(record({ source: 'steam', executableRef: undefined }))

    expect(result.launched).toBe(false)
    expect(result.message).toMatch(/No steam/)
  })

  it('fails honestly when a non-steam record has no executableRef', async () => {
    const launcher = new ApplicationLauncher({ openUrl: vi.fn() })
    const result = await launcher.launch(record({ executableRef: undefined }))

    expect(result.launched).toBe(false)
    expect(result.message).toMatch(/no recorded executable/)
  })

  it('spawns a real detached process for a desktop-entry/internal/appimage record', async () => {
    const launcher = new ApplicationLauncher({ openUrl: vi.fn() })
    // Use a real, always-present executable so this exercises the actual
    // spawn() path rather than mocking child_process.
    const result = await launcher.launch(
      record({
        source: 'internal',
        executableRef: process.execPath,
        launchArguments: ['--version']
      })
    )

    expect(result.launched).toBe(true)
    expect(result.pid).toBeGreaterThan(0)
  })

  it('fails honestly when the executable does not exist', async () => {
    const launcher = new ApplicationLauncher({ openUrl: vi.fn() })
    const result = await launcher.launch(
      record({ executableRef: '/definitely/does/not/exist/binary' })
    )

    expect(result.launched).toBe(false)
  })
})
