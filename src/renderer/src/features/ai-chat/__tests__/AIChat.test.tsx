import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../__tests__/testUtils'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Conversation, NdxBridge, Workspace } from '@shared/contracts'
import { ToastProvider } from '../../../components/overlays/Toast'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { WorkspaceContext, type WorkspaceContextValue } from '../../workspaces/WorkspaceContext'
import { AIChat } from '../AIChat'

const WORKSPACE: Workspace = {
  id: 'workspace-1',
  name: 'Neurodeck',
  rootPath: 'C:\\Projects\\Neurodeck',
  createdAt: 1
}

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

function makeWorkspaceValue(overrides: Partial<WorkspaceContextValue> = {}): WorkspaceContextValue {
  return {
    workspaces: [WORKSPACE],
    activeWorkspaceId: WORKSPACE.id,
    activeWorkspace: WORKSPACE,
    loading: false,
    error: null,
    refresh: vi.fn(async () => undefined),
    addFromPicker: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    setActive: vi.fn(),
    ...overrides
  }
}

function renderChat(workspaceValue = makeWorkspaceValue()): ReturnType<typeof renderWithProviders> {
  return renderWithProviders(
    <ToastProvider>
      <FocusEngineProvider adapters={[new TestAdapter()]}>
        <WorkspaceContext.Provider value={workspaceValue}>
          <Routes>
            <Route path="/ai/chat" element={<AIChat />} />
            <Route path="/ai" element={<p>Command Canvas placeholder</p>} />
          </Routes>
        </WorkspaceContext.Provider>
      </FocusEngineProvider>
    </ToastProvider>,
    { initialEntries: ['/ai/chat'] }
  )
}

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conversation-1',
    workspaceId: WORKSPACE.id,
    title: 'New conversation',
    profileId: 'balanced',
    messages: [],
    createdAt: 1,
    updatedAt: 1,
    ...overrides
  }
}

describe('AIChat', () => {
  it('shows the real no-active-workspace empty state', () => {
    renderChat(
      makeWorkspaceValue({ workspaces: [], activeWorkspace: null, activeWorkspaceId: null })
    )

    expect(screen.getByText('No active workspace')).toBeInTheDocument()
  })

  it('lists real conversations and shows an empty transcript prompt when none is selected', async () => {
    stubBridge({
      conversations: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] })
      } as never
    })

    renderChat()

    expect(await screen.findByText('No conversations yet')).toBeInTheDocument()
    expect(screen.getByText('Select or start a conversation')).toBeInTheDocument()
  })

  it('starts a new conversation via the real IPC client', async () => {
    const create = vi.fn().mockResolvedValue({ ok: true, data: conversation() })
    stubBridge({
      conversations: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        create
      } as never
    })

    const user = userEvent.setup()
    renderChat()
    await screen.findByText('No conversations yet')

    await user.click(screen.getByRole('button', { name: 'New chat' }))

    expect(create).toHaveBeenCalledWith({ workspaceId: WORKSPACE.id, profileId: 'balanced' })
    expect(await screen.findByText('Say something to start this conversation.')).toBeInTheDocument()
  })

  it('sends a real message and renders both the user turn and the real assistant reply', async () => {
    const existing = conversation()
    const afterSend = conversation({
      messages: [
        { id: 'm1', role: 'user', content: 'Hello there', createdAt: 1 },
        {
          id: 'm2',
          role: 'assistant',
          content: 'Hello! How can I help?',
          createdAt: 2,
          providerId: 'provider-1',
          modelId: 'model-1'
        }
      ]
    })
    const sendMessage = vi.fn().mockResolvedValue({ ok: true, data: afterSend })
    stubBridge({
      conversations: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [existing] }),
        sendMessage
      } as never
    })

    const user = userEvent.setup()
    renderChat()
    await screen.findByText('Say something to start this conversation.')

    await user.type(screen.getByPlaceholderText('Message the AI assistant...'), 'Hello there')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(sendMessage).toHaveBeenCalledWith({
      workspaceId: WORKSPACE.id,
      conversationId: existing.id,
      content: 'Hello there'
    })
    expect(await screen.findByText('Hello! How can I help?')).toBeInTheDocument()
  })

  it('shows a real error message for a failed turn instead of dropping it', async () => {
    const existing = conversation({
      messages: [
        { id: 'm1', role: 'user', content: 'Hello?', createdAt: 1 },
        { id: 'm2', role: 'assistant', content: '', createdAt: 2, error: 'Provider unavailable.' }
      ]
    })
    stubBridge({
      conversations: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [existing] })
      } as never
    })

    renderChat()

    expect(
      await screen.findByText(/The model call failed: Provider unavailable\./)
    ).toBeInTheDocument()
  })

  it('removes a conversation via the real IPC client', async () => {
    const existing = conversation()
    const remove = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubBridge({
      conversations: {
        list: vi.fn().mockResolvedValue({ ok: true, data: [existing] }),
        remove
      } as never
    })

    const user = userEvent.setup()
    renderChat()
    await screen.findByText('Say something to start this conversation.')

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    expect(remove).toHaveBeenCalledWith({ workspaceId: WORKSPACE.id, conversationId: existing.id })
    expect(await screen.findByText('No conversations yet')).toBeInTheDocument()
  })

  it('navigates to the AI Command Canvas', async () => {
    stubBridge({
      conversations: { list: vi.fn().mockResolvedValue({ ok: true, data: [] }) } as never
    })
    const user = userEvent.setup()
    renderChat()
    await screen.findByText('No conversations yet')

    await user.click(screen.getByRole('button', { name: 'Open Command Canvas' }))

    expect(screen.getByText('Command Canvas placeholder')).toBeInTheDocument()
  })
})
