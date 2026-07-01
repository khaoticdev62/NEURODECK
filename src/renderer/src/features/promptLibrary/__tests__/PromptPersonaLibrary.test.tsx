import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, Persona, PromptTemplate } from '@shared/contracts'
import { PromptPersonaLibrary } from '../PromptPersonaLibrary'

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

afterEach(() => {
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

const sampleTemplate: PromptTemplate = {
  id: 'template-1',
  name: 'Bug triage',
  purpose: 'Summarize a bug report into a structured ticket.',
  inputs: ['report text'],
  requiredTools: ['knowledge.search'],
  workspaceScoped: false,
  riskClass: 'low',
  version: '1.0.0',
  author: 'Ada',
  testCases: [],
  createdAt: Date.UTC(2026, 5, 28, 12, 0, 0),
  updatedAt: Date.UTC(2026, 5, 28, 12, 0, 0)
}

const samplePersona: Persona = {
  id: 'persona-1',
  name: 'Careful Reviewer',
  communicationStyle: 'Terse and precise.',
  explanationDepth: 'detailed',
  suggestedToolIds: [],
  reviewStrictness: 'strict',
  createdAt: Date.UTC(2026, 5, 28, 12, 0, 0),
  updatedAt: Date.UTC(2026, 5, 28, 12, 0, 0)
}

describe('PromptPersonaLibrary', () => {
  it('shows empty states for both templates and personas', async () => {
    stubBridge({
      promptLibrary: {
        listTemplates: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        listPersonas: vi.fn().mockResolvedValue({ ok: true, data: [] })
      } as never
    })

    render(<PromptPersonaLibrary />)

    expect(await screen.findByText('No prompt templates yet')).toBeInTheDocument()
    expect(await screen.findByText('No personas yet')).toBeInTheDocument()
  })

  it('lists a real prompt template with its risk class', async () => {
    stubBridge({
      promptLibrary: {
        listTemplates: vi.fn().mockResolvedValue({ ok: true, data: [sampleTemplate] }),
        listPersonas: vi.fn().mockResolvedValue({ ok: true, data: [] })
      } as never
    })

    render(<PromptPersonaLibrary />)

    expect(await screen.findByText('Bug triage')).toBeInTheDocument()
    expect(screen.getByText('low', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText(/v1\.0\.0/)).toBeInTheDocument()
  })

  it('creates a new prompt template from the form', async () => {
    const upsertPromptTemplate = vi.fn().mockResolvedValue({ ok: true, data: sampleTemplate })
    stubBridge({
      promptLibrary: {
        listTemplates: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        listPersonas: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        upsertTemplate: upsertPromptTemplate
      } as never
    })
    const user = userEvent.setup()

    render(<PromptPersonaLibrary />)
    await screen.findByText('No prompt templates yet')

    await user.type(screen.getByLabelText('Template name'), 'Bug triage')
    await user.type(screen.getByLabelText('Template purpose'), 'Summarize a bug report.')
    await user.clear(screen.getByLabelText('Template version'))
    await user.type(screen.getByLabelText('Template version'), '1.0.0')
    await user.type(screen.getByLabelText('Template author'), 'Ada')
    await user.type(screen.getByLabelText('Template inputs'), 'report text, severity')
    await user.click(screen.getByRole('button', { name: 'Add template' }))

    expect(upsertPromptTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Bug triage',
        purpose: 'Summarize a bug report.',
        version: '1.0.0',
        author: 'Ada',
        riskClass: 'low',
        inputs: ['report text', 'severity']
      })
    )
  })

  it('adds and removes a test case before saving a template', async () => {
    stubBridge({
      promptLibrary: {
        listTemplates: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        listPersonas: vi.fn().mockResolvedValue({ ok: true, data: [] })
      } as never
    })
    const user = userEvent.setup()

    render(<PromptPersonaLibrary />)
    await screen.findByText('No prompt templates yet')

    await user.type(screen.getByLabelText('New test case input'), 'empty report')
    await user.type(screen.getByLabelText('New test case expected outcome'), 'rejects politely')
    await user.click(screen.getByRole('button', { name: 'Add test case' }))

    expect(screen.getByText(/empty report.*rejects politely/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(screen.queryByText(/empty report.*rejects politely/)).not.toBeInTheDocument()
  })

  it('removes a prompt template only after confirmation', async () => {
    const removePromptTemplate = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubBridge({
      promptLibrary: {
        listTemplates: vi.fn().mockResolvedValue({ ok: true, data: [sampleTemplate] }),
        listPersonas: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        removeTemplate: removePromptTemplate
      } as never
    })
    const user = userEvent.setup()

    render(<PromptPersonaLibrary />)
    await screen.findByText('Bug triage')

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(removePromptTemplate).not.toHaveBeenCalled()

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    await user.click(deleteButtons[deleteButtons.length - 1])

    expect(removePromptTemplate).toHaveBeenCalledWith({ id: 'template-1' })
  })

  it('lists a real persona with its review strictness', async () => {
    stubBridge({
      promptLibrary: {
        listTemplates: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        listPersonas: vi.fn().mockResolvedValue({ ok: true, data: [samplePersona] })
      } as never
    })

    render(<PromptPersonaLibrary />)

    expect(await screen.findByText('Careful Reviewer')).toBeInTheDocument()
    expect(screen.getByText('strict', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('detailed', { selector: 'p' })).toBeInTheDocument()
  })

  it('creates a new persona from the form', async () => {
    const upsertPersona = vi.fn().mockResolvedValue({ ok: true, data: samplePersona })
    stubBridge({
      promptLibrary: {
        listTemplates: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        listPersonas: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        upsertPersona
      } as never
    })
    const user = userEvent.setup()

    render(<PromptPersonaLibrary />)
    await screen.findByText('No personas yet')

    await user.type(screen.getByLabelText('Persona name'), 'Careful Reviewer')
    await user.type(screen.getByLabelText('Persona communication style'), 'Terse and precise.')
    await user.click(screen.getByRole('button', { name: 'Add persona' }))

    expect(upsertPersona).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Careful Reviewer',
        communicationStyle: 'Terse and precise.',
        explanationDepth: 'standard',
        reviewStrictness: 'standard'
      })
    )
  })

  it('removes a persona only after confirmation', async () => {
    const removePersona = vi.fn().mockResolvedValue({ ok: true, data: null })
    stubBridge({
      promptLibrary: {
        listTemplates: vi.fn().mockResolvedValue({ ok: true, data: [] }),
        listPersonas: vi.fn().mockResolvedValue({ ok: true, data: [samplePersona] }),
        removePersona
      } as never
    })
    const user = userEvent.setup()

    render(<PromptPersonaLibrary />)
    await screen.findByText('Careful Reviewer')

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(removePersona).not.toHaveBeenCalled()

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    await user.click(deleteButtons[deleteButtons.length - 1])

    expect(removePersona).toHaveBeenCalledWith({ id: 'persona-1' })
  })
})
