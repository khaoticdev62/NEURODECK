import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TerminalSession } from '@shared/contracts'
import type { PermissionCapability } from '../../ai-safety/contracts/permission'
import type { RiskLevel } from '../../ai-safety/contracts/plan'
import { useAiSafety } from '../../ai-safety/useAiSafety'
import { EmptyState } from '../../components/feedback/UXState'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge, type StatusTone } from '../../components/primitives/StatusBadge'
import { useFocusable } from '../../controller/focus/useFocusable'
import { completeModel } from '../../services/ipc/modelClient'
import { listTerminalSessions, onTerminalExit } from '../../services/ipc/terminalClient'
import { useWorkspaces } from '../workspaces/useWorkspaces'
import {
  classifyCommand,
  COMMAND_BLOCK_TYPES,
  headlessToolIdForRisk,
  parseCommandProposal,
  serializeCommand,
  toolIdForRisk,
  type CommandBlock,
  type CommandBlockType
} from './commandBuilderModel'

const SAVED_ACTIONS_KEY_PREFIX = 'ndx.commandBuilder.savedActions.'
const RISK_TONES: Record<RiskLevel, StatusTone> = {
  low: 'success',
  medium: 'warning',
  high: 'error',
  critical: 'error'
}

const BLOCK_HELP: Record<CommandBlockType, string> = {
  program: 'Executable, such as git or npm',
  subcommand: 'Program operation, such as status or test',
  flag: 'Named option, such as --watch',
  value: 'Literal argument; quoted for the selected shell',
  path: 'File or directory; quoted for the selected shell',
  pipe: 'Pass output to another program',
  redirect: 'Write output to a file',
  conditional: 'Run the next command conditionally',
  environment: 'Environment assignment, such as NODE_ENV=test'
}

let blockSequence = 0

interface SavedCommandAction {
  id: string
  name: string
  command: string
  blocks: CommandBlock[]
  createdAt: number
}

/** ND-029 structured command proposal builder. Every execution enters ActionQueue review. */
export function CommandBuilder(): React.JSX.Element {
  const { activeWorkspace } = useWorkspaces()
  const { queue, broker } = useAiSafety()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<TerminalSession[]>([])
  const [sessionId, setSessionId] = useState('')
  const [blocks, setBlocks] = useState<CommandBlock[]>([
    { id: nextBlockId(), type: 'program', value: '' }
  ])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savedActions, setSavedActions] = useState<SavedCommandAction[]>([])
  const [intent, setIntent] = useState('')
  const [proposalBusy, setProposalBusy] = useState(false)
  const [proposal, setProposal] = useState<{
    blocks: Array<Omit<CommandBlock, 'id'>>
    explanation: string
    command: string
    provider: string
  } | null>(null)

  useEffect(() => {
    if (!activeWorkspace) return
    let active = true
    const unsubscribeExit = onTerminalExit((event) => {
      if (!active || event.session.workspaceId !== activeWorkspace.id) return
      setSessions((current) => current.filter((session) => session.id !== event.session.id))
      setSessionId((current) => (current === event.session.id ? '' : current))
    })
    void listTerminalSessions({ workspaceId: activeWorkspace.id }).then((result) => {
      if (!active) return
      setLoading(false)
      if (!result.ok) {
        setError(result.error.userMessage)
        return
      }
      const running = result.data.filter((session) => session.status === 'running')
      setSessions(running)
      setSessionId(running[0]?.id ?? '')
    })
    return () => {
      active = false
      unsubscribeExit()
    }
  }, [activeWorkspace])

  useEffect(() => {
    if (!activeWorkspace) return
    let active = true
    void Promise.resolve().then(() => {
      if (active) setSavedActions(loadSavedActions(activeWorkspace.id))
    })
    return () => {
      active = false
    }
  }, [activeWorkspace])

  const selectedSession = sessions.find((session) => session.id === sessionId) ?? null
  const command = useMemo(
    () => serializeCommand(blocks, selectedSession?.shell ?? 'sh'),
    [blocks, selectedSession?.shell]
  )
  const risk = useMemo(() => classifyCommand(command), [command])

  if (!activeWorkspace) {
    return (
      <EmptyState
        title="No active workspace"
        description="Open a workspace before building a terminal command."
      />
    )
  }

  if (loading) {
    return <p className="p-4 text-meta text-text-secondary">Loading terminal sessions…</p>
  }

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No running terminal"
        description="Start a Direct mode terminal session before sending a structured command."
        action={
          <FocusableButton id="builder-open-terminal" onClick={() => navigate('/terminal')}>
            Open Universal Terminal
          </FocusableButton>
        }
      />
    )
  }

  function updateBlock(id: string, update: Partial<CommandBlock>): void {
    setBlocks((current) =>
      current.map((block) => (block.id === id ? { ...block, ...update } : block))
    )
  }

  function addBlock(): void {
    setBlocks((current) => [
      ...current,
      { id: nextBlockId(), type: current.length === 1 ? 'subcommand' : 'value', value: '' }
    ])
  }

  function removeBlock(id: string): void {
    setBlocks((current) => current.filter((block) => block.id !== id))
  }

  async function copyCommand(): Promise<void> {
    try {
      await navigator.clipboard.writeText(command)
      setError(null)
    } catch {
      setError('Clipboard access is unavailable. The exact command remains visible below.')
    }
  }

  function saveCurrentAction(): void {
    if (!activeWorkspace) return
    if (!command) {
      setError('Complete a command before saving it as an action.')
      return
    }
    const next: SavedCommandAction = {
      id: `saved-${Date.now()}`,
      name: command,
      command,
      blocks,
      createdAt: Date.now()
    }
    const updated = [next, ...savedActions].slice(0, 20)
    setSavedActions(updated)
    saveSavedActions(activeWorkspace.id, updated)
    setError(null)
  }

  function loadSavedAction(action: SavedCommandAction): void {
    setBlocks(action.blocks.map((block) => ({ ...block, id: nextBlockId() })))
    setError(null)
  }

  function deleteSavedAction(actionId: string): void {
    if (!activeWorkspace) return
    const updated = savedActions.filter((action) => action.id !== actionId)
    setSavedActions(updated)
    saveSavedActions(activeWorkspace.id, updated)
  }

  async function requestCommandProposal(): Promise<void> {
    if (!activeWorkspace) return
    if (!intent.trim() || proposalBusy) return
    setProposalBusy(true)
    setProposal(null)
    setError(null)
    const shell = selectedSession?.shell ?? 'sh'
    const result = await completeModel({
      profileId: 'fast-coding',
      workspacePrivate: true,
      temperature: 0.1,
      maxTokens: 1200,
      messages: [
        {
          role: 'system',
          content:
            'You propose terminal commands as structured blocks. Return only JSON with fields "blocks" and "explanation". Blocks must use these types only: program, subcommand, flag, value, path, pipe, redirect, conditional, environment. Do not include markdown.'
        },
        {
          role: 'user',
          content: [
            `Shell: ${shell}`,
            `Workspace: ${activeWorkspace.name}`,
            `Intent: ${intent.trim()}`,
            'Return a safe, minimal command proposal. The host will review it before running.'
          ].join('\n')
        }
      ]
    })
    setProposalBusy(false)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    try {
      const parsed = parseCommandProposal(result.data.content)
      const command = serializeCommand(
        parsed.blocks.map((block) => ({ ...block, id: nextBlockId() })),
        shell
      )
      setProposal({
        ...parsed,
        command,
        provider: `${result.data.providerName} / ${result.data.modelId}`
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not parse command proposal.')
    }
  }

  function useCommandProposal(): void {
    if (!proposal) return
    setBlocks(proposal.blocks.map((block) => ({ ...block, id: nextBlockId() })))
    setProposal(null)
    setError(null)
  }

  function submitForReview(): void {
    if (!selectedSession || !command) {
      setError('Choose a running session and complete the command before review.')
      return
    }
    const capability: PermissionCapability = risk.privileged
      ? 'terminal.privileged'
      : 'terminal.execute'
    broker.revoke(capability)
    const result = queue.submit(
      toolIdForRisk(risk),
      {
        sessionId: selectedSession.id,
        command,
        target: `${selectedSession.shell} · ${selectedSession.cwd}`
      },
      `Run exact command: ${command}`
    )
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate('/ai/approvals')
  }

  function runHeadless(): void {
    if (!activeWorkspace || !command) {
      setError('Complete a command before running it headlessly.')
      return
    }
    const capability: PermissionCapability = risk.privileged
      ? 'terminal.privileged'
      : 'terminal.execute'
    broker.revoke(capability)
    const result = queue.submit(
      headlessToolIdForRisk(risk),
      { workspaceId: activeWorkspace.id, command },
      `Run headless (no terminal): ${command}`
    )
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate('/ai/approvals')
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <header className="flex items-end justify-between border-b border-border pb-3">
        <div>
          <p className="text-meta uppercase tracking-[0.18em] text-text-tertiary">ND-029</p>
          <h1 className="text-title font-semibold text-text-primary">Command Builder</h1>
          <p className="text-meta text-text-secondary">
            Build shell syntax as reviewable blocks. Nothing runs from this screen.
          </p>
        </div>
        <StatusBadge tone={RISK_TONES[risk.level]} label={`${risk.label} risk`} />
      </header>

      {error && (
        <div role="alert" className="border border-status-error/40 bg-status-error/10 px-3 py-2">
          <p className="text-meta text-status-error">{error}</p>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_18rem] gap-3">
        <section className="min-h-0 overflow-auto border border-border bg-surface p-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-body font-semibold text-text-primary">Command blocks</h2>
            <FocusableButton id="builder-add-block" variant="secondary" onClick={addBlock}>
              Add block
            </FocusableButton>
          </div>
          <ol className="flex flex-col gap-2">
            {blocks.map((block, index) => (
              <CommandBlockRow
                key={block.id}
                block={block}
                position={index + 1}
                removable={blocks.length > 1}
                onChange={(update) => updateBlock(block.id, update)}
                onRemove={() => removeBlock(block.id)}
              />
            ))}
          </ol>
        </section>

        <aside className="flex flex-col gap-3 border border-border bg-surface p-3">
          <label className="text-meta font-semibold text-text-primary" htmlFor="builder-session">
            Target session
          </label>
          <FocusableSelect
            id="builder-session"
            value={sessionId}
            onChange={setSessionId}
            options={sessions.map((session) => ({
              value: session.id,
              label: `${session.shell} · PID ${session.pid}`
            }))}
          />
          <div className="border-t border-border pt-3">
            <p className="text-meta font-semibold text-text-primary">Risk analysis</p>
            <p className="mt-1 text-meta text-text-secondary">{risk.reason}</p>
          </div>
          <div className="border-t border-border pt-3">
            <label className="text-meta font-semibold text-text-primary" htmlFor="builder-intent">
              AI proposal
            </label>
            <textarea
              id="builder-intent"
              value={intent}
              onChange={(event) => setIntent(event.target.value)}
              placeholder="Describe the command to propose"
              className="mt-2 min-h-20 w-full resize-none border border-border bg-canvas px-2 py-1 text-meta text-text-primary"
            />
            <FocusableButton
              id="builder-propose"
              variant="secondary"
              disabled={!intent.trim() || proposalBusy}
              onClick={() => void requestCommandProposal()}
            >
              {proposalBusy ? 'Proposing…' : 'Propose blocks'}
            </FocusableButton>
          </div>
          {proposal && (
            <div className="border border-border bg-canvas p-2">
              <p className="text-meta text-text-tertiary">{proposal.provider}</p>
              <p className="mt-1 text-meta text-text-secondary">{proposal.explanation}</p>
              <code className="mt-2 block truncate font-mono text-meta text-text-primary">
                {proposal.command}
              </code>
              <div className="mt-2 flex gap-2">
                <FocusableButton
                  id="builder-use-proposal"
                  variant="primary"
                  onClick={useCommandProposal}
                >
                  Use proposal
                </FocusableButton>
                <FocusableButton
                  id="builder-discard-proposal"
                  variant="ghost"
                  onClick={() => setProposal(null)}
                >
                  Discard
                </FocusableButton>
              </div>
            </div>
          )}
          <div className="mt-auto flex flex-col gap-2">
            <FocusableButton
              id="builder-copy"
              variant="secondary"
              disabled={!command}
              onClick={() => void copyCommand()}
            >
              Copy without running
            </FocusableButton>
            <FocusableButton
              id="builder-save-action"
              variant="secondary"
              disabled={!command}
              onClick={saveCurrentAction}
            >
              Save action
            </FocusableButton>
            <FocusableButton
              id="builder-run-headless"
              variant="secondary"
              disabled={!command}
              onClick={runHeadless}
            >
              Run headless (capture output)
            </FocusableButton>
            <FocusableButton
              id="builder-review"
              variant="primary"
              disabled={!command || !selectedSession}
              onClick={submitForReview}
            >
              Send to approval review
            </FocusableButton>
          </div>
        </aside>
      </div>

      {savedActions.length > 0 && (
        <section className="border border-border bg-surface p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-meta uppercase tracking-[0.16em] text-text-tertiary">
              Saved actions
            </p>
            <p className="text-meta text-text-tertiary">{savedActions.length}/20</p>
          </div>
          <ol className="grid gap-2">
            {savedActions.map((action) => (
              <li
                key={action.id}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border border-border/60 bg-canvas p-2"
              >
                <code className="truncate font-mono text-meta text-text-primary">
                  {action.command}
                </code>
                <FocusableButton
                  id={`builder-load-${action.id}`}
                  variant="secondary"
                  onClick={() => loadSavedAction(action)}
                >
                  Load
                </FocusableButton>
                <FocusableButton
                  id={`builder-delete-${action.id}`}
                  variant="ghost"
                  onClick={() => deleteSavedAction(action.id)}
                >
                  Delete
                </FocusableButton>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-label="Exact command preview" className="border border-border bg-canvas p-3">
        <p className="text-meta uppercase tracking-[0.16em] text-text-tertiary">Exact command</p>
        <code className="mt-1 block min-h-6 overflow-x-auto whitespace-pre font-mono text-body text-text-primary">
          {command || 'Complete the first block to preview shell syntax.'}
        </code>
      </section>
    </div>
  )
}

function CommandBlockRow({
  block,
  position,
  removable,
  onChange,
  onRemove
}: {
  block: CommandBlock
  position: number
  removable: boolean
  onChange: (update: Partial<CommandBlock>) => void
  onRemove: () => void
}): React.JSX.Element {
  const typeIndex = COMMAND_BLOCK_TYPES.indexOf(block.type)
  const cycleType = (): void => {
    const nextType = COMMAND_BLOCK_TYPES[(typeIndex + 1) % COMMAND_BLOCK_TYPES.length]
    const operators: Partial<Record<CommandBlockType, string>> = {
      pipe: '|',
      redirect: '>',
      conditional: '&&'
    }
    onChange({ type: nextType, value: operators[nextType] ?? '' })
  }
  return (
    <li className="grid grid-cols-[2rem_9rem_minmax(0,1fr)_auto] items-center gap-2 border border-border bg-surface-raised/40 p-2">
      <span className="font-mono text-meta text-text-tertiary">
        {String(position).padStart(2, '0')}
      </span>
      <FocusableButton
        id={`builder-type-${block.id}`}
        variant="ghost"
        className="justify-start px-2 text-meta capitalize"
        onClick={cycleType}
      >
        {block.type}
      </FocusableButton>
      <div>
        <FocusableInput
          id={`builder-value-${block.id}`}
          value={block.value}
          placeholder={BLOCK_HELP[block.type]}
          onChange={(value) => onChange({ value })}
        />
        <p className="mt-1 text-meta text-text-tertiary">{BLOCK_HELP[block.type]}</p>
      </div>
      {removable && (
        <FocusableButton
          id={`builder-remove-${block.id}`}
          variant="ghost"
          className="px-2"
          onClick={onRemove}
        >
          Remove
        </FocusableButton>
      )}
    </li>
  )
}

function FocusableInput({
  id,
  value,
  placeholder,
  onChange
}: {
  id: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}): React.JSX.Element {
  const { ref } = useFocusable<HTMLInputElement>({
    id,
    groupId: 'command-builder',
    role: 'field',
    onActivate: () => document.getElementById(id)?.focus()
  })
  return (
    <input
      ref={ref}
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="min-h-[var(--ndx-target-min)] w-full border border-border bg-canvas px-3 font-mono text-body text-text-primary outline-none focus-visible:border-border-focus"
    />
  )
}

function FocusableSelect({
  id,
  value,
  options,
  onChange
}: {
  id: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}): React.JSX.Element {
  const { ref } = useFocusable<HTMLSelectElement>({
    id,
    groupId: 'command-builder',
    role: 'field',
    onActivate: () => document.getElementById(id)?.focus()
  })
  return (
    <select
      ref={ref}
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-[var(--ndx-target-min)] border border-border bg-canvas px-2 text-meta text-text-primary outline-none focus-visible:border-border-focus"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function FocusableButton({
  id,
  children,
  onClick,
  variant = 'primary',
  className,
  disabled = false
}: {
  id: string
  children: React.ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
  disabled?: boolean
}): React.JSX.Element {
  const { ref } = useFocusable<HTMLButtonElement>({
    id,
    groupId: 'command-builder',
    disabled,
    onActivate: onClick
  })
  return (
    <ControllerButton
      ref={ref}
      variant={variant}
      className={className}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </ControllerButton>
  )
}

function nextBlockId(): string {
  blockSequence += 1
  return `command-block-${blockSequence}`
}

function savedActionsKey(workspaceId: string): string {
  return `${SAVED_ACTIONS_KEY_PREFIX}${workspaceId}`
}

function loadSavedActions(workspaceId: string): SavedCommandAction[] {
  try {
    const raw = localStorage.getItem(savedActionsKey(workspaceId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedCommandAction[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isSavedCommandAction).slice(0, 20)
  } catch {
    return []
  }
}

function saveSavedActions(workspaceId: string, actions: SavedCommandAction[]): void {
  localStorage.setItem(savedActionsKey(workspaceId), JSON.stringify(actions))
}

function isSavedCommandAction(value: unknown): value is SavedCommandAction {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<SavedCommandAction>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.command === 'string' &&
    typeof candidate.createdAt === 'number' &&
    Array.isArray(candidate.blocks)
  )
}
