import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BackupRecord, BackupScheduleSettings, NdxBridge } from '@shared/contracts'
import { BackupAndRestore } from '../BackupAndRestore'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

const defaultSchedule: BackupScheduleSettings = {
  enabled: false,
  intervalHours: 24,
  lastRunAt: null,
  nextRunAt: null
}

function stubBackups(partial: Partial<NdxBridge['backups']> = {}): void {
  stubBridge({
    backups: {
      list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      create: vi.fn(),
      verify: vi.fn(),
      restore: vi.fn(),
      importLocal: vi.fn(),
      migrate: vi.fn(),
      getSchedule: vi.fn().mockResolvedValue({ ok: true, data: defaultSchedule }),
      setSchedule: vi.fn(),
      ...partial
    } as never
  })
}

describe('BackupAndRestore', () => {
  it('shows the empty state when no backups exist', async () => {
    stubBackups()
    render(<BackupAndRestore />)
    expect(await screen.findByText('No backups yet')).toBeInTheDocument()
  })

  it('shows the real schedule state once loaded', async () => {
    stubBackups({
      getSchedule: vi.fn().mockResolvedValue({
        ok: true,
        data: { enabled: true, intervalHours: 6, lastRunAt: null, nextRunAt: Date.now() + 1000 }
      })
    })
    render(<BackupAndRestore />)

    expect(await screen.findByText('Scheduled backups: On')).toBeInTheDocument()
  })

  it('toggles scheduled backups on through the real IPC client', async () => {
    const setSchedule = vi.fn().mockResolvedValue({
      ok: true,
      data: { enabled: true, intervalHours: 24, lastRunAt: null, nextRunAt: Date.now() + 1000 }
    })
    stubBackups({ setSchedule })
    const user = userEvent.setup()

    render(<BackupAndRestore />)
    await user.click(await screen.findByText('Scheduled backups: Off'))

    expect(setSchedule).toHaveBeenCalledWith({ enabled: true, intervalHours: 24 })
    expect(await screen.findByText('Scheduled backups: On')).toBeInTheDocument()
  })

  it('changes the schedule interval through the real IPC client', async () => {
    const setSchedule = vi.fn().mockResolvedValue({
      ok: true,
      data: { enabled: false, intervalHours: 6, lastRunAt: null, nextRunAt: null }
    })
    stubBackups({ setSchedule })
    const user = userEvent.setup()

    render(<BackupAndRestore />)
    await user.click(await screen.findByText('Every 6 hours'))

    expect(setSchedule).toHaveBeenCalledWith({ enabled: false, intervalHours: 6 })
  })

  it('creates a real backup through the typed bridge', async () => {
    const created: BackupRecord = {
      id: 'b1',
      schemaVersion: '1.0.0',
      label: 'Manual app-state backup',
      createdAt: Date.now(),
      scope: 'app-state',
      path: '/tmp/b1.ndx-backup.json',
      fileCount: 3,
      totalBytes: 1024,
      sha256: 'a'.repeat(64),
      verified: false,
      excludedSecretPaths: ['vault.json']
    }
    const create = vi.fn().mockResolvedValue({ ok: true, data: created })
    stubBackups({ create })
    const user = userEvent.setup()

    render(<BackupAndRestore />)
    await screen.findByText('No backups yet')
    await user.click(screen.getByRole('button', { name: 'Create Backup' }))

    expect(create).toHaveBeenCalledWith({ label: 'Manual app-state backup' })
    expect(await screen.findByText('Manual app-state backup')).toBeInTheDocument()
  })
})
