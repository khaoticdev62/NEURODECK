import { useEffect, useState } from 'react'
import type { OperatingMode, ProfileState, UserProfile } from '@shared/contracts'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import {
  createProfile,
  deleteProfile,
  endPrivateProfileSession,
  getProfileState,
  startProfileSession
} from '../../services/ipc/profileClient'

const MODE_OPTIONS: Array<{ mode: OperatingMode; label: string; description: string }> = [
  { mode: 'work', label: 'Work', description: 'Workspaces, tools, and professional defaults.' },
  { mode: 'creator', label: 'Creator', description: 'Creative workflows and media-heavy tasks.' },
  { mode: 'guest', label: 'Guest', description: 'Temporary local session identity.' },
  { mode: 'private', label: 'Private', description: 'Private-mode session marker.' }
]

const PROFILE_COLORS = ['cyan', 'blue', 'green', 'amber', 'rose']

/**
 * Epic X10 operating profile foundation. This screen manages real persisted
 * profile metadata and session mode. Existing stores are not profile-scoped
 * yet, so the UI states that boundary honestly instead of implying complete
 * isolation.
 */
export function Profiles(): React.JSX.Element {
  const [state, setState] = useState<ProfileState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleteReview, setDeleteReview] = useState<UserProfile | null>(null)

  async function refresh(): Promise<void> {
    const result = await getProfileState()
    if (result.ok) {
      setState(result.data)
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
  }

  useEffect(() => {
    let active = true
    void getProfileState().then((result) => {
      if (!active) return
      if (result.ok) setState(result.data)
      else setError(result.error.userMessage)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  async function handleCreate(input: {
    name: string
    mode: OperatingMode
    color: string
  }): Promise<void> {
    const result = await createProfile(input)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setCreating(false)
    await refresh()
  }

  async function handleStart(profile: UserProfile, privateMode: boolean): Promise<void> {
    const result = await startProfileSession({ id: profile.id, privateMode })
    if (result.ok) setState(result.data)
    else setError(result.error.userMessage)
  }

  async function handleEndPrivateSession(): Promise<void> {
    const result = await endPrivateProfileSession()
    if (result.ok) setState(result.data)
    else setError(result.error.userMessage)
  }

  async function handleDelete(profile: UserProfile): Promise<void> {
    setDeleteReview(null)
    const result = await deleteProfile({ id: profile.id })
    if (result.ok) setState(result.data)
    else setError(result.error.userMessage)
  }

  const activeProfile = state?.profiles.find(
    (profile) => profile.id === state.session.activeProfileId
  )

  return (
    <div className="grid h-full min-w-[72rem] grid-cols-[20rem_minmax(36rem,1fr)_18rem] gap-2 overflow-auto">
      <NdxToolWindow title="Profile Session" subtitle={activeProfile?.mode ?? 'No active profile'}>
        <p className="text-meta text-text-secondary">
          Real persisted profile metadata and guest/private session state.
        </p>
        {activeProfile && state && (
          <div className="border-t border-border pt-3">
            <p className="text-meta font-semibold text-text-primary">Active</p>
            <p className="text-meta text-text-tertiary">
              {activeProfile.mode}
              {state.session.guestModeActive ? ' / guest mode' : ''}
              {state.session.privateModeActive ? ' / private mode' : ''}
            </p>
          </div>
        )}
      </NdxToolWindow>

      <NdxEditorShell title="Profile Manager">
        <div className="flex min-h-full flex-col gap-4 p-4">
          <header className="flex items-start justify-between gap-3">
            <div>
              <p className="text-title font-semibold text-text-primary">Profiles and Identity</p>
              <p className="text-meta text-text-secondary">
                Real persisted profile metadata and guest/private session state.
              </p>
            </div>
            <ControllerButton
              variant="primary"
              disabled={creating}
              onClick={() => setCreating(true)}
            >
              Add Profile
            </ControllerButton>
          </header>

          {error && <ErrorState title="Profile request failed" description={error} />}

          {activeProfile && state && (
            <section className="border border-border bg-surface p-3">
              <p className="text-body font-semibold text-text-primary">Active session</p>
              <p className="text-meta text-text-secondary">
                {activeProfile.name} / {activeProfile.mode}
                {state.session.guestModeActive ? ' / guest mode' : ''}
                {state.session.privateModeActive ? ' / private mode' : ''}
              </p>
              {state.session.privateModeActive && (
                <ControllerButton
                  variant="secondary"
                  onClick={() => void handleEndPrivateSession()}
                >
                  End private session
                </ControllerButton>
              )}
            </section>
          )}

          <section className="border border-status-warning bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Scope boundary</p>
            <p className="text-meta text-text-secondary">
              This pass does not migrate existing workspaces, settings, memory, knowledge,
              extensions, or notifications into per-profile stores. Those remain shared until each
              owner service is made profile-aware.
            </p>
          </section>

          {creating && (
            <CreateProfileForm
              onCancel={() => setCreating(false)}
              onSubmit={(input) => void handleCreate(input)}
            />
          )}

          <section className="grid gap-2">
            {loading ? (
              <p className="text-meta text-text-secondary">Loading profiles...</p>
            ) : !state || state.profiles.length === 0 ? (
              <EmptyState title="No profiles" description="The profile store has no entries." />
            ) : (
              state.profiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  active={profile.id === state.session.activeProfileId}
                  onStart={() => void handleStart(profile, false)}
                  onStartPrivate={() => void handleStart(profile, true)}
                  onDelete={() => setDeleteReview(profile)}
                />
              ))
            )}
          </section>

          <ConfirmationDialog
            open={deleteReview !== null}
            title="Delete profile"
            action={`Delete "${deleteReview?.name ?? 'this profile'}"`}
            scope={deleteReview?.mode}
            consequence="This removes only the profile metadata. Shared app data is not deleted."
            confirmLabel="Delete"
            onConfirm={() => {
              if (deleteReview) void handleDelete(deleteReview)
            }}
            onCancel={() => setDeleteReview(null)}
          />
        </div>
      </NdxEditorShell>

      <NdxToolWindow title="Profile Scope" subtitle="Shared services" side="right">
        <p className="text-meta text-text-tertiary">
          Existing workspaces, settings, memory, knowledge, extensions, and notifications remain
          shared until their owner services become profile-aware.
        </p>
      </NdxToolWindow>
    </div>
  )
}

function CreateProfileForm({
  onSubmit,
  onCancel
}: {
  onSubmit: (input: { name: string; mode: OperatingMode; color: string }) => void
  onCancel: () => void
}): React.JSX.Element {
  const [name, setName] = useState('')
  const [mode, setMode] = useState<OperatingMode>('work')
  const [color, setColor] = useState(PROFILE_COLORS[0])

  return (
    <section className="flex flex-col gap-2 border border-border bg-surface p-3">
      <p className="text-body font-semibold text-text-primary">New profile</p>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Profile name"
        className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
      />
      <select
        value={mode}
        onChange={(event) => setMode(event.target.value as OperatingMode)}
        className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
      >
        {MODE_OPTIONS.map((option) => (
          <option key={option.mode} value={option.mode}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        value={color}
        onChange={(event) => setColor(event.target.value)}
        className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
      >
        {PROFILE_COLORS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <ControllerButton
          variant="primary"
          disabled={name.trim().length === 0}
          onClick={() => onSubmit({ name, mode, color })}
        >
          Save profile
        </ControllerButton>
        <ControllerButton variant="secondary" onClick={onCancel}>
          Cancel
        </ControllerButton>
      </div>
    </section>
  )
}

function ProfileCard({
  profile,
  active,
  onStart,
  onStartPrivate,
  onDelete
}: {
  profile: UserProfile
  active: boolean
  onStart: () => void
  onStartPrivate: () => void
  onDelete: () => void
}): React.JSX.Element {
  return (
    <article className="flex items-center justify-between gap-3 border border-border bg-surface p-3">
      <div>
        <p className="text-body font-semibold text-text-primary">
          {profile.name} {active ? '(active)' : ''}
        </p>
        <p className="text-meta text-text-secondary">
          {profile.mode} / {profile.color}
        </p>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <ControllerButton variant={active ? 'secondary' : 'primary'} onClick={onStart}>
          {active ? 'Restart session' : 'Use profile'}
        </ControllerButton>
        <ControllerButton variant="secondary" onClick={onStartPrivate}>
          Private session
        </ControllerButton>
        {profile.mode !== 'owner' && (
          <ControllerButton variant="destructive" onClick={onDelete}>
            Delete
          </ControllerButton>
        )}
      </div>
    </article>
  )
}
