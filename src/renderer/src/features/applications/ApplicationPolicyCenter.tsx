import { useEffect, useState } from 'react'
import type {
  ApplicationPolicyCategory,
  ApplicationRecord,
  LaunchEnvironment
} from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { listApplications, upsertApplication } from '../../services/ipc/applicationClient'
import {
  getApplicationPolicy,
  setApplicationPolicy
} from '../../services/ipc/applicationPolicyClient'
import { useWorkspaces } from '../workspaces/useWorkspaces'

const ADVISORY_CATEGORIES: ApplicationPolicyCategory[] = [
  'file-roots',
  'network',
  'clipboard',
  'microphone',
  'camera',
  'notifications',
  'ai-context',
  'extension-access',
  'download-location'
]

const CATEGORY_LABELS: Record<ApplicationPolicyCategory, string> = {
  'file-roots': 'File roots',
  network: 'Network',
  clipboard: 'Clipboard',
  microphone: 'Microphone',
  camera: 'Camera',
  notifications: 'Notifications',
  'ai-context': 'AI context',
  'extension-access': 'Extension access',
  'download-location': 'Download location'
}

/**
 * Epic X14 Application Sandbox and Policy (supplemental spec §47).
 * Every category above is real and persisted, but — per the spec's
 * own instruction, "Where the OS cannot enforce a permission, label
 * it as advisory rather than pretending it is enforced" — every one
 * of them is structurally advisory: NeuroDeck launches external
 * applications as ordinary detached OS processes
 * (`ApplicationLauncher.spawnDetached()`), never inside a sandbox it
 * controls, so it has no real mechanism to enforce any of these once
 * an external process starts. "Launch environment" below is the one
 * real exception — NeuroDeck's own launcher controls the actual
 * environment a process is spawned with. "Workspace association"
 * reuses the existing real `ApplicationRecord.workspaceIds` field via
 * the existing `application.upsert` IPC, rather than a new mechanism.
 */
export function ApplicationPolicyCenter(): React.JSX.Element {
  const { workspaces } = useWorkspaces()
  const [applications, setApplications] = useState<ApplicationRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deniedCategories, setDeniedCategories] = useState<Set<ApplicationPolicyCategory>>(
    new Set()
  )
  const [launchEnvironment, setLaunchEnvironment] = useState<LaunchEnvironment>({})
  const [newEnvKey, setNewEnvKey] = useState('')
  const [newEnvValue, setNewEnvValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void listApplications().then((result) => {
      if (!active) return
      if (result.ok) setApplications(result.data)
      else setError(result.error.userMessage)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!selectedId) return
    let active = true
    void getApplicationPolicy({ applicationId: selectedId }).then((result) => {
      if (!active) return
      if (result.ok) {
        const denied = new Set<ApplicationPolicyCategory>(
          (result.data?.entries ?? [])
            .filter((entry) => !entry.allowed)
            .map((entry) => entry.category)
        )
        setDeniedCategories(denied)
        setLaunchEnvironment(result.data?.launchEnvironment ?? {})
      } else {
        setError(result.error.userMessage)
      }
    })
    return () => {
      active = false
    }
  }, [selectedId])

  async function persist(
    nextDenied: Set<ApplicationPolicyCategory>,
    nextEnv: LaunchEnvironment
  ): Promise<void> {
    if (!selectedId) return
    const entries = ADVISORY_CATEGORIES.map((category) => ({
      category,
      allowed: !nextDenied.has(category)
    }))
    const result = await setApplicationPolicy({
      applicationId: selectedId,
      entries,
      launchEnvironment: nextEnv
    })
    if (!result.ok) setError(result.error.userMessage)
  }

  function toggleCategory(category: ApplicationPolicyCategory): void {
    const next = new Set(deniedCategories)
    if (next.has(category)) next.delete(category)
    else next.add(category)
    setDeniedCategories(next)
    void persist(next, launchEnvironment)
  }

  function handleAddEnvVar(): void {
    if (!newEnvKey.trim()) return
    const next = { ...launchEnvironment, [newEnvKey.trim()]: newEnvValue }
    setLaunchEnvironment(next)
    setNewEnvKey('')
    setNewEnvValue('')
    void persist(deniedCategories, next)
  }

  function handleRemoveEnvVar(key: string): void {
    const next = { ...launchEnvironment }
    delete next[key]
    setLaunchEnvironment(next)
    void persist(deniedCategories, next)
  }

  async function handleToggleWorkspace(
    application: ApplicationRecord,
    workspaceId: string
  ): Promise<void> {
    const has = application.workspaceIds.includes(workspaceId)
    const workspaceIds = has
      ? application.workspaceIds.filter((id) => id !== workspaceId)
      : [...application.workspaceIds, workspaceId]
    const result = await upsertApplication({ ...application, workspaceIds })
    if (result.ok) {
      setApplications((current) =>
        current.map((candidate) => (candidate.id === application.id ? result.data : candidate))
      )
      setStatus('Workspace association updated.')
    } else {
      setError(result.error.userMessage)
    }
  }

  const selectedApplication = applications.find((application) => application.id === selectedId)

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <p className="text-title font-semibold text-text-primary">Application Sandbox and Policy</p>
      <p className="text-meta text-text-secondary">
        Most categories below are advisory — NeuroDeck launches external applications as ordinary
        processes and cannot enforce them. &ldquo;Launch environment&rdquo; is the one category
        NeuroDeck genuinely enforces.
      </p>

      {error && <ErrorState title="Application policy error" description={error} />}
      {status && <p className="text-meta text-status-success">{status}</p>}

      {applications.length === 0 ? (
        <EmptyState
          title="No applications registered"
          description="Discover or register an application first."
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {applications.map((application) => (
            <ControllerButton
              key={application.id}
              variant={selectedId === application.id ? 'primary' : 'secondary'}
              onClick={() => setSelectedId(application.id)}
            >
              {application.name}
            </ControllerButton>
          ))}
        </div>
      )}

      {selectedApplication && (
        <>
          <section className="flex flex-col gap-2 border border-border bg-surface p-3">
            <p className="text-meta font-semibold text-text-primary">
              Advisory policy for {selectedApplication.name}
            </p>
            <div className="flex flex-wrap gap-2">
              {ADVISORY_CATEGORIES.map((category) => (
                <ControllerButton
                  key={category}
                  variant={deniedCategories.has(category) ? 'destructive' : 'secondary'}
                  onClick={() => toggleCategory(category)}
                >
                  {CATEGORY_LABELS[category]}:{' '}
                  {deniedCategories.has(category) ? 'Denied' : 'Allowed'}
                </ControllerButton>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2 border border-border bg-surface p-3">
            <p className="text-meta font-semibold text-text-primary">
              Launch environment (real, enforced)
            </p>
            {Object.entries(launchEnvironment).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-meta text-text-secondary">
                  {key}={value}
                </span>
                <ControllerButton variant="destructive" onClick={() => handleRemoveEnvVar(key)}>
                  Remove
                </ControllerButton>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={newEnvKey}
                onChange={(event) => setNewEnvKey(event.target.value)}
                placeholder="VARIABLE_NAME"
                className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
              />
              <input
                value={newEnvValue}
                onChange={(event) => setNewEnvValue(event.target.value)}
                placeholder="value"
                className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
              />
              <ControllerButton variant="primary" onClick={handleAddEnvVar}>
                Add
              </ControllerButton>
            </div>
          </section>

          <section className="flex flex-col gap-2 border border-border bg-surface p-3">
            <p className="text-meta font-semibold text-text-primary">
              Workspace association (real)
            </p>
            <div className="flex flex-wrap gap-2">
              {workspaces.map((workspace) => (
                <ControllerButton
                  key={workspace.id}
                  variant={
                    selectedApplication.workspaceIds.includes(workspace.id)
                      ? 'primary'
                      : 'secondary'
                  }
                  onClick={() => void handleToggleWorkspace(selectedApplication, workspace.id)}
                >
                  {workspace.name}
                </ControllerButton>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
