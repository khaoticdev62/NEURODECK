import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

  describe('real launch-environment enforcement (Epic X14 §47)', () => {
    let dir: string

    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), 'app-launch-env-'))
    })

    afterEach(async () => {
      await rm(dir, { recursive: true, force: true })
    })

    it('merges the policy-provided environment into the real spawned process', async () => {
      const outputFile = join(dir, 'env-output.txt')
      const getLaunchEnvironment = vi.fn().mockResolvedValue({ NDX_TEST_VAR: 'hello-policy' })
      const launcher = new ApplicationLauncher({ openUrl: vi.fn(), getLaunchEnvironment })

      const result = await launcher.launch(
        record({
          executableRef: process.execPath,
          launchArguments: [
            '-e',
            `require('fs').writeFileSync(${JSON.stringify(outputFile)}, process.env.NDX_TEST_VAR || '')`
          ]
        })
      )

      expect(result.launched).toBe(true)
      expect(getLaunchEnvironment).toHaveBeenCalledWith('app-1')
      // The detached child writes the file asynchronously after this
      // function resolves — poll briefly for the real file to appear
      // rather than assuming a fixed delay is always enough.
      await vi.waitFor(async () => {
        const content = await readFile(outputFile, 'utf-8')
        expect(content).toBe('hello-policy')
      })
    })

    it('still launches normally when no launch-environment policy is configured', async () => {
      const launcher = new ApplicationLauncher({
        openUrl: vi.fn(),
        getLaunchEnvironment: vi.fn().mockResolvedValue({})
      })

      const result = await launcher.launch(
        record({ executableRef: process.execPath, launchArguments: ['--version'] })
      )

      expect(result.launched).toBe(true)
    })
  })
})
