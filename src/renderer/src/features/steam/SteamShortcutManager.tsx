import { useEffect, useState } from 'react'
import type {
  SteamRunningState,
  SteamShortcutBackup,
  SteamShortcutEntry,
  SteamUserProfile
} from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge } from '../../components/primitives/StatusBadge'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import {
  checkSteamRunning,
  createSteamShortcut,
  listSteamProfiles,
  listSteamShortcutBackups,
  listSteamShortcuts,
  removeSteamShortcut,
  restoreSteamShortcutBackup,
  updateSteamShortcut
} from '../../services/ipc/steamShortcutClient'

/**
 * Real Steam Shortcut Manager (supplemental §8), implementing §8.3's
 * safety requirements end to end rather than deferring them: every
 * write goes through `SteamShortcutService`'s real backup → validate
 * → atomic-write → re-verify pipeline (`core/steam/`). This screen's
 * job is to make that pipeline's real state visible and reviewable —
 * the real running-state check before write, the real backup list
 * with restore, and an explicit restart note (Steam only reads
 * `shortcuts.vdf` at startup) — never to fake any of those signals.
 *
 * Honestly deferred: launch profiles (§8.2 — resolution, performance
 * profile, network/VPN policy, pre/post-launch workflows) need their
 * own design on top of this real foundation; artwork references and
 * controller-profile guidance are not wired in this pass either.
 */
export function SteamShortcutManager(): React.JSX.Element {
  const [profiles, setProfiles] = useState<SteamUserProfile[]>([])
  const [selectedVdfPath, setSelectedVdfPath] = useState<string | null>(null)
  const [shortcuts, setShortcuts] = useState<SteamShortcutEntry[]>([])
  const [backups, setBackups] = useState<SteamShortcutBackup[]>([])
  const [runningState, setRunningState] = useState<SteamRunningState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [removeReview, setRemoveReview] = useState<SteamShortcutEntry | null>(null)
  const [restoreReview, setRestoreReview] = useState<SteamShortcutBackup | null>(null)
  const [appName, setAppName] = useState('')
  const [exe, setExe] = useState('')
  const [startDir, setStartDir] = useState('')
  const [launchOptions, setLaunchOptions] = useState('')

  useEffect(() => {
    let active = true
    void listSteamProfiles().then((result) => {
      if (!active) return
      setLoading(false)
      if (result.ok) {
        setProfiles(result.data)
        if (result.data.length > 0) setSelectedVdfPath(result.data[0].vdfPath)
        setError(null)
      } else {
        setError(result.error.userMessage)
      }
    })
    return () => {
      active = false
    }
  }, [])

  async function refresh(vdfPath: string): Promise<void> {
    const [shortcutsResult, backupsResult, runningResult] = await Promise.all([
      listSteamShortcuts({ vdfPath }),
      listSteamShortcutBackups({ vdfPath }),
      checkSteamRunning({ vdfPath })
    ])
    if (shortcutsResult.ok) setShortcuts(shortcutsResult.data)
    else setError(shortcutsResult.error.userMessage)
    if (backupsResult.ok) setBackups(backupsResult.data)
    if (runningResult.ok) setRunningState(runningResult.data)
  }

  useEffect(() => {
    if (!selectedVdfPath) return
    let active = true
    void Promise.all([
      listSteamShortcuts({ vdfPath: selectedVdfPath }),
      listSteamShortcutBackups({ vdfPath: selectedVdfPath }),
      checkSteamRunning({ vdfPath: selectedVdfPath })
    ]).then(([shortcutsResult, backupsResult, runningResult]) => {
      if (!active) return
      if (shortcutsResult.ok) setShortcuts(shortcutsResult.data)
      else setError(shortcutsResult.error.userMessage)
      if (backupsResult.ok) setBackups(backupsResult.data)
      if (runningResult.ok) setRunningState(runningResult.data)
    })
    return () => {
      active = false
    }
  }, [selectedVdfPath])

  async function handleCreate(): Promise<void> {
    if (!selectedVdfPath || !appName.trim() || !exe.trim()) return
    const result = await createSteamShortcut({
      vdfPath: selectedVdfPath,
      appName: appName.trim(),
      exe: exe.trim(),
      startDir: startDir.trim(),
      launchOptions: launchOptions.trim()
    })
    if (result.ok) {
      setShortcuts(result.data)
      setAppName('')
      setExe('')
      setStartDir('')
      setLaunchOptions('')
      setCreating(false)
      setStatus('Shortcut created. Restart Steam to see it in your library.')
      setError(null)
      await refresh(selectedVdfPath)
    } else {
      setError(result.error.userMessage)
    }
  }

  async function handleToggleHidden(entry: SteamShortcutEntry): Promise<void> {
    if (!selectedVdfPath) return
    const result = await updateSteamShortcut({
      vdfPath: selectedVdfPath,
      index: entry.index,
      patch: { isHidden: !entry.isHidden }
    })
    if (result.ok) {
      setShortcuts(result.data)
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
  }

  async function handleRemove(entry: SteamShortcutEntry): Promise<void> {
    setRemoveReview(null)
    if (!selectedVdfPath) return
    const result = await removeSteamShortcut({ vdfPath: selectedVdfPath, index: entry.index })
    if (result.ok) {
      setShortcuts(result.data)
      setStatus('Shortcut removed. Restart Steam for the change to take effect.')
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
  }

  async function handleRestore(backup: SteamShortcutBackup): Promise<void> {
    setRestoreReview(null)
    if (!selectedVdfPath) return
    const result = await restoreSteamShortcutBackup({
      vdfPath: selectedVdfPath,
      fileName: backup.fileName
    })
    if (result.ok) {
      setShortcuts(result.data)
      setStatus('Backup restored. Restart Steam for the change to take effect.')
      setError(null)
      await refresh(selectedVdfPath)
    } else {
      setError(result.error.userMessage)
    }
  }

  if (loading) {
    return <p className="p-4 text-meta text-text-secondary">Looking for Steam profiles…</p>
  }

  if (profiles.length === 0) {
    return (
      <EmptyState
        title="No Steam profiles found"
        description="No Steam userdata directory was found on this machine. Make sure Steam has been signed into at least once."
      />
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-title font-semibold text-text-primary">Steam Shortcut Manager</p>
          <p className="text-meta text-text-secondary">
            Real, safe edits to shortcuts.vdf — every change is backed up first. Steam only reads
            this file at startup, so restart Steam to see your changes.
          </p>
        </div>
        {profiles.length > 1 && (
          <select
            value={selectedVdfPath ?? ''}
            onChange={(event) => setSelectedVdfPath(event.target.value)}
            className="rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
          >
            {profiles.map((profile) => (
              <option key={profile.vdfPath} value={profile.vdfPath}>
                Steam user {profile.userId}
              </option>
            ))}
          </select>
        )}
      </header>

      {runningState === 'running' && (
        <p role="alert" className="text-meta text-status-warning">
          Steam is currently running. Changes are saved safely, but Steam will not see them until it
          is restarted — and if Steam itself writes to shortcuts.vdf while it is open, that could
          overwrite this change.
        </p>
      )}

      {error && <ErrorState title="Steam shortcut error" description={error} />}
      {status && <p className="text-meta text-status-success">{status}</p>}

      <section className="border border-border bg-surface p-3">
        <div className="flex items-center justify-between">
          <p className="text-body font-semibold text-text-primary">Shortcuts</p>
          <ControllerButton variant="primary" disabled={creating} onClick={() => setCreating(true)}>
            Add Shortcut
          </ControllerButton>
        </div>

        {creating && (
          <div className="mt-3 flex flex-col gap-2 border border-border bg-canvas p-3">
            <input
              value={appName}
              onChange={(event) => setAppName(event.target.value)}
              placeholder="Name"
              className="rounded-md border border-border bg-surface p-2 text-meta text-text-primary"
            />
            <input
              value={exe}
              onChange={(event) => setExe(event.target.value)}
              placeholder="Executable path"
              className="rounded-md border border-border bg-surface p-2 text-meta text-text-primary"
            />
            <input
              value={startDir}
              onChange={(event) => setStartDir(event.target.value)}
              placeholder="Working directory (optional)"
              className="rounded-md border border-border bg-surface p-2 text-meta text-text-primary"
            />
            <input
              value={launchOptions}
              onChange={(event) => setLaunchOptions(event.target.value)}
              placeholder="Launch options (optional)"
              className="rounded-md border border-border bg-surface p-2 text-meta text-text-primary"
            />
            <div className="flex gap-2">
              <ControllerButton
                variant="primary"
                disabled={!appName.trim() || !exe.trim()}
                onClick={() => void handleCreate()}
              >
                Save Shortcut
              </ControllerButton>
              <ControllerButton variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </ControllerButton>
            </div>
          </div>
        )}

        {shortcuts.length === 0 ? (
          <EmptyState
            title="No shortcuts yet"
            description="Add a non-Steam shortcut to make it launchable from Steam/Game Mode."
            className="mt-3"
          />
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {shortcuts.map((entry) => (
              <li
                key={entry.index}
                className="flex items-center justify-between gap-3 border border-border bg-canvas p-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-meta font-semibold text-text-primary">
                    {entry.appName}
                  </p>
                  <p className="truncate text-caption text-text-tertiary">{entry.exe}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    tone={entry.isHidden ? 'neutral' : 'success'}
                    label={entry.isHidden ? 'Hidden' : 'Visible'}
                  />
                  <ControllerButton
                    variant="secondary"
                    onClick={() => void handleToggleHidden(entry)}
                  >
                    {entry.isHidden ? 'Unhide' : 'Hide'}
                  </ControllerButton>
                  <ControllerButton variant="destructive" onClick={() => setRemoveReview(entry)}>
                    Remove
                  </ControllerButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border border-border bg-surface p-3">
        <p className="text-body font-semibold text-text-primary">Backups ({backups.length})</p>
        <p className="text-meta text-text-tertiary">
          A real backup of shortcuts.vdf is saved before every change here.
        </p>
        {backups.length === 0 ? (
          <p className="mt-2 text-meta text-text-tertiary">No backups yet.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {backups.slice(0, 10).map((backup) => (
              <li
                key={backup.fileName}
                className="flex items-center justify-between gap-2 text-meta text-text-secondary"
              >
                <span>{new Date(backup.createdAt).toLocaleString()}</span>
                <ControllerButton variant="ghost" onClick={() => setRestoreReview(backup)}>
                  Restore
                </ControllerButton>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmationDialog
        open={removeReview !== null}
        title="Remove shortcut"
        action={`Remove "${removeReview?.appName ?? 'this shortcut'}"`}
        scope="shortcuts.vdf"
        consequence="The shortcut will no longer appear in Steam after it restarts. A backup of the prior file is saved automatically."
        confirmLabel="Remove"
        onConfirm={() => {
          if (removeReview) void handleRemove(removeReview)
        }}
        onCancel={() => setRemoveReview(null)}
      />

      <ConfirmationDialog
        open={restoreReview !== null}
        title="Restore backup"
        action={`Restore shortcuts.vdf to its state from ${
          restoreReview ? new Date(restoreReview.createdAt).toLocaleString() : ''
        }`}
        scope="shortcuts.vdf"
        consequence="This overwrites the current shortcuts.vdf with the selected backup. The current state is itself backed up first, so this can be undone."
        confirmLabel="Restore"
        onConfirm={() => {
          if (restoreReview) void handleRestore(restoreReview)
        }}
        onCancel={() => setRestoreReview(null)}
      />
    </div>
  )
}
