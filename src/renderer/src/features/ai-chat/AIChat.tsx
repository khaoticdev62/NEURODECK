import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Conversation, RoutingProfileId } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { NdxEditorShell, NdxFocusSurface } from '../../components/workbench'
import { useFocusable } from '../../controller/focus/useFocusable'
import {
  createConversation,
  listConversations,
  removeConversation,
  sendConversationMessage
} from '../../services/ipc/conversationClient'
import { WorkspaceRequiredState } from '../workspaces/WorkspaceRequiredState'
import { useWorkspaces } from '../workspaces/useWorkspaces'
import { useWorkbenchStore } from '../../state/useWorkbenchStore'

const ROUTING_PROFILES: RoutingProfileId[] = [
  'balanced',
  'local-first',
  'offline',
  'battery-saver',
  'maximum-quality',
  'fast-coding',
  'private-workspace',
  'low-cost'
]

/**
 * Phase 3 AI Chat: a persistent, multi-turn conversation surface, distinct
 * from the AI Command Canvas's single-turn intent -> plan -> approve flow.
 * This screen never proposes or executes tools — it's real model dialogue
 * only (see `ChatRuntime`'s system prompt) — so no approval/review gate is
 * needed here; the Command Canvas remains the only path to real actions.
 * Each turn is a real, non-streamed `ModelRouter.complete()` call (no
 * token-streaming infrastructure exists in this codebase yet — see
 * `docs/implementation/NDX_IMPLEMENTATION_LEDGER.md`), and messages render
 * as plain `whitespace-pre-wrap` text, matching `AgentDetail`'s existing
 * convention rather than adding a new markdown-rendering dependency.
 */
export function AIChat(): React.JSX.Element {
  const { activeWorkspace } = useWorkspaces()

  if (!activeWorkspace) {
    return <WorkspaceRequiredState purpose="start an AI chat" />
  }

  return <AIChatWorkspace key={activeWorkspace.id} workspaceId={activeWorkspace.id} />
}

function AIChatWorkspace({ workspaceId }: { workspaceId: string }): React.JSX.Element {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<RoutingProfileId>('balanced')
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const setPrimary = useWorkbenchStore((state) => state.setPrimary)
  const setSecondary = useWorkbenchStore((state) => state.setSecondary)

  useEffect(() => {
    let active = true
    void Promise.resolve()
      .then(async () => {
        if (!active) return null
        setLoading(true)
        return listConversations({ workspaceId })
      })
      .then((result) => {
        if (!active || !result) return
        setLoading(false)
        if (result.ok) {
          setConversations(result.data)
          setSelectedId((current) => current ?? result.data[0]?.id ?? null)
          setError(null)
        } else {
          setError(result.error.userMessage)
        }
      })
    return () => {
      active = false
    }
  }, [workspaceId])

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? null

  const handleNewConversation = useCallback(async (): Promise<void> => {
    setCreating(true)
    setError(null)
    const result = await createConversation({ workspaceId, profileId })
    setCreating(false)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setConversations((current) => [result.data, ...current])
    setSelectedId(result.data.id)
  }, [workspaceId, profileId])

  async function handleSend(): Promise<void> {
    if (!selected || !draft.trim() || sending) return
    const content = draft.trim()
    setDraft('')
    setSending(true)
    setError(null)
    const result = await sendConversationMessage({
      workspaceId,
      conversationId: selected.id,
      content
    })
    setSending(false)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === result.data.id ? result.data : conversation
      )
    )
  }

  const handleRemove = useCallback(
    async (conversationId: string): Promise<void> => {
      const result = await removeConversation({ workspaceId, conversationId })
      if (!result.ok) {
        setError(result.error.userMessage)
        return
      }
      setConversations((current) =>
        current.filter((conversation) => conversation.id !== conversationId)
      )
      setSelectedId((current) => (current === conversationId ? null : current))
    },
    [workspaceId]
  )

  const lastAssistantMessage = selected
    ? [...selected.messages].reverse().find((message) => message.role === 'assistant')
    : undefined

  useEffect(() => {
    setPrimary('Conversations', `${conversations.length} saved`, (
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        <div className="flex gap-2">
          <select
            value={profileId}
            onChange={(event) => setProfileId(event.target.value as RoutingProfileId)}
            className="ndx-input min-w-0 flex-1 px-2 text-meta"
          >
            {ROUTING_PROFILES.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>
        <NewConversationButton
          disabled={creating}
          onActivate={() => void handleNewConversation()}
        />
        <ControllerButton variant="ghost" onClick={() => navigate('/ai')}>
          Open Command Canvas
        </ControllerButton>
        {loading ? (
          <p className="text-meta text-text-secondary">Loading conversations...</p>
        ) : conversations.length === 0 ? (
          <EmptyState
            title="No conversations yet"
            description="Start a new chat to talk with the AI assistant."
            className="ndx-hairline-top min-h-32 rounded-sm border border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-panel-bg)]"
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto pr-1">
            {conversations.map((conversation, index) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                index={index}
                selected={conversation.id === selectedId}
                onSelect={() => setSelectedId(conversation.id)}
                onRemove={() => void handleRemove(conversation.id)}
              />
            ))}
          </div>
        )}
      </div>
    ))
    return () => setPrimary('Command Deck', undefined, null)
  }, [conversations, selectedId, profileId, creating, loading, navigate, handleNewConversation, handleRemove, setPrimary])

  useEffect(() => {
    setSecondary(
      <div className="space-y-3 p-3 text-meta text-text-secondary">
        <p>
          This chat cannot execute tools, run commands, or edit files — it can only reply with
          text. For real actions, use the AI Command Canvas.
        </p>
        {selected && (
          <>
            <p>
              Messages: <span className="text-text-primary">{selected.messages.length}</span>
            </p>
            {lastAssistantMessage?.providerId && (
              <p>
                Last reply from{' '}
                <span className="text-text-primary">{lastAssistantMessage.providerId}</span> /{' '}
                <span className="text-text-primary">{lastAssistantMessage.modelId}</span>
              </p>
            )}
          </>
        )}
      </div>
    )
    return () => setSecondary(null)
  }, [selected, lastAssistantMessage, setSecondary])

  return (
    <div className="h-full bg-[var(--ndx-workbench-editor-bg)]">
      <NdxEditorShell title={selected ? selected.title : 'Chat'}>
        <div className="flex min-h-full min-w-0 flex-col gap-3 overflow-hidden p-3 deck:p-4">
          {error && <ErrorState title="AI Chat error" description={error} />}

          {!selected ? (
            <EmptyState
              className="flex-1"
              title="Select or start a conversation"
              description="Pick a conversation on the left, or start a new chat."
            />
          ) : (
            <>
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
                {selected.messages.length === 0 ? (
                  <p className="text-meta text-text-secondary">
                    Say something to start this conversation.
                  </p>
                ) : (
                  selected.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`ndx-os-panel max-w-[85%] p-3 ${
                        message.role === 'user' ? 'ml-auto' : 'mr-auto'
                      }`}
                    >
                      <p className="text-meta uppercase tracking-wide text-text-tertiary">
                        {message.role === 'user' ? 'You' : 'Assistant'}
                      </p>
                      {message.error ? (
                        <p className="mt-1 text-meta text-status-error">
                          The model call failed: {message.error}
                        </p>
                      ) : (
                        <p className="mt-1 whitespace-pre-wrap text-body text-text-primary">
                          {message.content}
                        </p>
                      )}
                    </div>
                  ))
                )}
                {sending && <p className="text-meta text-text-tertiary">Waiting for a reply...</p>}
              </div>

              <div className="flex flex-col gap-2 border-t border-[var(--ndx-workbench-border)] pt-3">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void handleSend()
                    }
                  }}
                  placeholder="Message the AI assistant..."
                  rows={3}
                  className="ndx-input resize-none p-3 text-body"
                />
                <ControllerButton
                  variant="primary"
                  disabled={!draft.trim() || sending}
                  onClick={() => void handleSend()}
                >
                  {sending ? 'Sending...' : 'Send'}
                </ControllerButton>
              </div>
            </>
          )}
        </div>
      </NdxEditorShell>
    </div>
  )
}

function NewConversationButton({
  disabled,
  onActivate
}: {
  disabled: boolean
  onActivate: () => void
}): React.JSX.Element {
  const { ref } = useFocusable<HTMLButtonElement>({
    id: 'ai-chat:new-conversation',
    groupId: 'ai-chat',
    priority: 1,
    initialFocus: true,
    disabled,
    onActivate
  })

  return (
    <ControllerButton ref={ref} variant="primary" disabled={disabled} onClick={onActivate}>
      {disabled ? 'Starting...' : 'New chat'}
    </ControllerButton>
  )
}

function ConversationRow({
  conversation,
  index,
  selected,
  onSelect,
  onRemove
}: {
  conversation: Conversation
  index: number
  selected: boolean
  onSelect: () => void
  onRemove: () => void
}): React.JSX.Element {
  const { ref } = useFocusable<HTMLButtonElement>({
    id: `ai-chat:conversation:${conversation.id}`,
    groupId: 'ai-chat',
    priority: index === 0 ? 1 : 0,
    onActivate: onSelect
  })

  return (
    <NdxFocusSurface density="spatial" selected={selected} className="w-full">
      <div className="flex items-center gap-2 p-2">
        <button ref={ref} type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
          <p className="truncate text-body font-semibold text-text-primary">{conversation.title}</p>
          <p className="text-meta text-text-tertiary">
            {conversation.messages.length} message
            {conversation.messages.length === 1 ? '' : 's'}
          </p>
        </button>
        <ControllerButton variant="ghost" onClick={onRemove}>
          Remove
        </ControllerButton>
      </div>
    </NdxFocusSurface>
  )
}
