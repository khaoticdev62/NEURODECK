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
import { listTerminalSessions, onTerminalExit } from '../../services/ipc/terminalClient'
import { useWorkspaces } from '../workspaces/useWorkspaces'
import {
  classifyCommand,
  COMMAND_BLOCK_TYPES,
  serializeCommand,
  toolIdForRisk,
  type CommandBlock,
  type CommandBlockType
} from './commandBuilderModel'

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
