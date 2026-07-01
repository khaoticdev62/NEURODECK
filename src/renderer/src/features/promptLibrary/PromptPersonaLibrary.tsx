import { useEffect, useState } from 'react'
import type {
  Persona,
  PromptRiskClass,
  PromptTemplate,
  UpsertPersonaRequest,
  UpsertPromptTemplateRequest
} from '@shared/contracts'
import { ConfirmationDialog } from '../../components/overlays/ConfirmationDialog'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { StatusBadge, type StatusTone } from '../../components/primitives/StatusBadge'
import { NdxSpatialLockup } from '../../components/workbench'
import {
  listPersonas,
  listPromptTemplates,
  removePersona,
  removePromptTemplate,
  upsertPersona,
  upsertPromptTemplate
} from '../../services/ipc/promptLibraryClient'

const RISK_CLASSES: PromptRiskClass[] = ['low', 'medium', 'high']
const RISK_TONE: Record<PromptRiskClass, StatusTone> = {
  low: 'success',
  medium: 'warning',
  high: 'error'
}
const EXPLANATION_DEPTHS: Persona['explanationDepth'][] = ['concise', 'standard', 'detailed']
const REVIEW_STRICTNESS: Persona['reviewStrictness'][] = ['standard', 'strict']

interface TemplateFormState {
  id: string | null
  name: string
  purpose: string
  inputs: string
  requiredTools: string
  workspaceScoped: boolean
  modelRequirements: string
  outputSchema: string
  riskClass: PromptRiskClass
  version: string
  author: string
  testCases: { input: string; expectedOutcome: string }[]
}

const EMPTY_TEMPLATE_FORM: TemplateFormState = {
  id: null,
  name: '',
  purpose: '',
  inputs: '',
  requiredTools: '',
  workspaceScoped: false,
  modelRequirements: '',
  outputSchema: '',
  riskClass: 'low',
  version: '1.0.0',
  author: '',
  testCases: []
}

interface PersonaFormState {
  id: string | null
  name: string
  communicationStyle: string
  explanationDepth: Persona['explanationDepth']
  defaultModelProfile: string
  suggestedToolIds: string
  reviewStrictness: Persona['reviewStrictness']
}

const EMPTY_PERSONA_FORM: PersonaFormState = {
  id: null,
  name: '',
  communicationStyle: '',
  explanationDepth: 'standard',
  defaultModelProfile: '',
  suggestedToolIds: '',
  reviewStrictness: 'standard'
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

/**
 * ND-X016 Prompt and Persona Library (supplemental spec §14.1/§14.2).
 * `PromptTemplateStore`/`PersonaStore` and their typed IPC were already
 * real with no renderer consumer — this is that closeout, following the
 * same CRUD pattern the Clipboard and Snippet Center established.
 * Personas render only the fields the schema actually allows (style,
 * depth, default model profile, suggested tools, review strictness) —
 * there is no field here that could expand permissions, bypass policy,
 * hide impact, or auto-confirm a destructive action (spec §14.2), so
 * this UI has no way to construct one even if it wanted to.
 */
export function PromptPersonaLibrary(): React.JSX.Element {
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [templatesError, setTemplatesError] = useState<string | null>(null)
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(EMPTY_TEMPLATE_FORM)
  const [testCaseInput, setTestCaseInput] = useState('')
  const [testCaseOutcome, setTestCaseOutcome] = useState('')
  const [removeTemplateReview, setRemoveTemplateReview] = useState<PromptTemplate | null>(null)

  const [personas, setPersonas] = useState<Persona[]>([])
  const [personasLoading, setPersonasLoading] = useState(true)
  const [personasError, setPersonasError] = useState<string | null>(null)
  const [personaForm, setPersonaForm] = useState<PersonaFormState>(EMPTY_PERSONA_FORM)
  const [removePersonaReview, setRemovePersonaReview] = useState<Persona | null>(null)

  async function refreshTemplates(): Promise<void> {
    const result = await listPromptTemplates()
    if (result.ok) {
      setTemplates(result.data)
      setTemplatesError(null)
    } else {
      setTemplatesError(result.error.userMessage)
    }
  }

  async function refreshPersonas(): Promise<void> {
    const result = await listPersonas()
    if (result.ok) {
      setPersonas(result.data)
      setPersonasError(null)
    } else {
      setPersonasError(result.error.userMessage)
    }
  }

  useEffect(() => {
    let active = true
    void listPromptTemplates().then((result) => {
      if (!active) return
      if (result.ok) setTemplates(result.data)
      else setTemplatesError(result.error.userMessage)
      setTemplatesLoading(false)
    })
    void listPersonas().then((result) => {
      if (!active) return
      if (result.ok) setPersonas(result.data)
      else setPersonasError(result.error.userMessage)
      setPersonasLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  function handleAddTestCase(): void {
    if (!testCaseInput.trim() || !testCaseOutcome.trim()) return
    setTemplateForm((form) => ({
      ...form,
      testCases: [
        ...form.testCases,
        { input: testCaseInput.trim(), expectedOutcome: testCaseOutcome.trim() }
      ]
    }))
    setTestCaseInput('')
    setTestCaseOutcome('')
  }

  function handleRemoveTestCase(index: number): void {
    setTemplateForm((form) => ({
      ...form,
      testCases: form.testCases.filter((_, testCaseIndex) => testCaseIndex !== index)
    }))
  }

  async function handleSaveTemplate(): Promise<void> {
    if (!templateForm.name.trim() || !templateForm.purpose.trim() || !templateForm.version.trim())
      return
    if (!templateForm.author.trim()) return
    const request: UpsertPromptTemplateRequest = {
      id: templateForm.id ?? crypto.randomUUID(),
      name: templateForm.name.trim(),
      purpose: templateForm.purpose.trim(),
      inputs: splitList(templateForm.inputs),
      requiredTools: splitList(templateForm.requiredTools),
      workspaceScoped: templateForm.workspaceScoped,
      modelRequirements: templateForm.modelRequirements.trim() || undefined,
      outputSchema: templateForm.outputSchema.trim() || undefined,
      riskClass: templateForm.riskClass,
      version: templateForm.version.trim(),
      author: templateForm.author.trim(),
      testCases: templateForm.testCases
    }
    const result = await upsertPromptTemplate(request)
    if (result.ok) {
      setTemplateForm(EMPTY_TEMPLATE_FORM)
      await refreshTemplates()
    } else {
      setTemplatesError(result.error.userMessage)
    }
  }

  function handleEditTemplate(template: PromptTemplate): void {
    setTemplateForm({
      id: template.id,
      name: template.name,
      purpose: template.purpose,
      inputs: template.inputs.join(', '),
      requiredTools: template.requiredTools.join(', '),
      workspaceScoped: template.workspaceScoped,
      modelRequirements: template.modelRequirements ?? '',
      outputSchema: template.outputSchema ?? '',
      riskClass: template.riskClass,
      version: template.version,
      author: template.author,
      testCases: template.testCases
    })
  }

  async function handleRemoveTemplate(template: PromptTemplate): Promise<void> {
    setRemoveTemplateReview(null)
    const result = await removePromptTemplate({ id: template.id })
    if (result.ok) await refreshTemplates()
    else setTemplatesError(result.error.userMessage)
  }

  async function handleSavePersona(): Promise<void> {
    if (!personaForm.name.trim() || !personaForm.communicationStyle.trim()) return
    const request: UpsertPersonaRequest = {
      id: personaForm.id ?? crypto.randomUUID(),
      name: personaForm.name.trim(),
      communicationStyle: personaForm.communicationStyle.trim(),
      explanationDepth: personaForm.explanationDepth,
      defaultModelProfile: personaForm.defaultModelProfile.trim() || undefined,
      suggestedToolIds: splitList(personaForm.suggestedToolIds),
      reviewStrictness: personaForm.reviewStrictness
    }
    const result = await upsertPersona(request)
    if (result.ok) {
      setPersonaForm(EMPTY_PERSONA_FORM)
      await refreshPersonas()
    } else {
      setPersonasError(result.error.userMessage)
    }
  }

  function handleEditPersona(persona: Persona): void {
    setPersonaForm({
      id: persona.id,
      name: persona.name,
      communicationStyle: persona.communicationStyle,
      explanationDepth: persona.explanationDepth,
      defaultModelProfile: persona.defaultModelProfile ?? '',
      suggestedToolIds: persona.suggestedToolIds.join(', '),
      reviewStrictness: persona.reviewStrictness
    })
  }

  async function handleRemovePersona(persona: Persona): Promise<void> {
    setRemovePersonaReview(null)
    const result = await removePersona({ id: persona.id })
    if (result.ok) await refreshPersonas()
    else setPersonasError(result.error.userMessage)
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div>
        <p className="text-title font-semibold text-text-primary">Prompt and Persona Library</p>
        <p className="text-meta text-text-tertiary">
          Manage reusable prompt templates and reviewer personas. Personas can only change style —
          never permissions, policy, impact visibility, or approval requirements.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <p className="text-body font-semibold text-text-primary">Prompt Templates</p>
        {templatesError && (
          <ErrorState title="Prompt template error" description={templatesError} />
        )}

        <NdxSpatialLockup>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              void handleSaveTemplate()
            }}
          >
            <p className="text-meta font-semibold text-text-primary">
              {templateForm.id ? 'Edit template' : 'New template'}
            </p>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={templateForm.name}
                onChange={(event) =>
                  setTemplateForm((form) => ({ ...form, name: event.target.value }))
                }
                placeholder="Name"
                aria-label="Template name"
                className="min-w-[14rem] flex-1 rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
              />
              <input
                type="text"
                value={templateForm.version}
                onChange={(event) =>
                  setTemplateForm((form) => ({ ...form, version: event.target.value }))
                }
                placeholder="Version"
                aria-label="Template version"
                className="w-32 rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
              />
              <input
                type="text"
                value={templateForm.author}
                onChange={(event) =>
                  setTemplateForm((form) => ({ ...form, author: event.target.value }))
                }
                placeholder="Author"
                aria-label="Template author"
                className="w-48 rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
              />
              <select
                value={templateForm.riskClass}
                onChange={(event) =>
                  setTemplateForm((form) => ({
                    ...form,
                    riskClass: event.target.value as PromptRiskClass
                  }))
                }
                aria-label="Template risk class"
                className="rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
              >
                {RISK_CLASSES.map((riskClass) => (
                  <option key={riskClass} value={riskClass}>
                    {riskClass}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={templateForm.purpose}
              onChange={(event) =>
                setTemplateForm((form) => ({ ...form, purpose: event.target.value }))
              }
              placeholder="Purpose"
              aria-label="Template purpose"
              rows={2}
              className="rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
            />
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={templateForm.inputs}
                onChange={(event) =>
                  setTemplateForm((form) => ({ ...form, inputs: event.target.value }))
                }
                placeholder="Inputs (comma-separated)"
                aria-label="Template inputs"
                className="min-w-[14rem] flex-1 rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
              />
              <input
                type="text"
                value={templateForm.requiredTools}
                onChange={(event) =>
                  setTemplateForm((form) => ({ ...form, requiredTools: event.target.value }))
                }
                placeholder="Required tools (comma-separated)"
                aria-label="Template required tools"
                className="min-w-[14rem] flex-1 rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={templateForm.modelRequirements}
                onChange={(event) =>
                  setTemplateForm((form) => ({ ...form, modelRequirements: event.target.value }))
                }
                placeholder="Model requirements (optional)"
                aria-label="Template model requirements"
                className="min-w-[14rem] flex-1 rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
              />
              <input
                type="text"
                value={templateForm.outputSchema}
                onChange={(event) =>
                  setTemplateForm((form) => ({ ...form, outputSchema: event.target.value }))
                }
                placeholder="Output schema (optional)"
                aria-label="Template output schema"
                className="min-w-[14rem] flex-1 rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
              />
            </div>
            <label className="flex items-center gap-2 text-meta text-text-secondary">
              <input
                type="checkbox"
                checked={templateForm.workspaceScoped}
                onChange={(event) =>
                  setTemplateForm((form) => ({ ...form, workspaceScoped: event.target.checked }))
                }
              />
              Workspace scoped
            </label>

            <div className="flex flex-col gap-2 border-t border-border pt-2">
              <p className="text-meta font-semibold text-text-primary">Test cases</p>
              {templateForm.testCases.map((testCase, index) => (
                <div
                  key={`${testCase.input}-${index}`}
                  className="flex items-center justify-between gap-2 text-caption text-text-secondary"
                >
                  <span className="truncate">
                    {testCase.input} → {testCase.expectedOutcome}
                  </span>
                  <ControllerButton variant="ghost" onClick={() => handleRemoveTestCase(index)}>
                    Remove
                  </ControllerButton>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={testCaseInput}
                  onChange={(event) => setTestCaseInput(event.target.value)}
                  placeholder="Test input"
                  aria-label="New test case input"
                  className="min-w-[10rem] flex-1 rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
                />
                <input
                  type="text"
                  value={testCaseOutcome}
                  onChange={(event) => setTestCaseOutcome(event.target.value)}
                  placeholder="Expected outcome"
                  aria-label="New test case expected outcome"
                  className="min-w-[10rem] flex-1 rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
                />
                <ControllerButton variant="secondary" onClick={handleAddTestCase}>
                  Add test case
                </ControllerButton>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <ControllerButton
                type="submit"
                variant="primary"
                disabled={
                  !templateForm.name.trim() ||
                  !templateForm.purpose.trim() ||
                  !templateForm.version.trim() ||
                  !templateForm.author.trim()
                }
              >
                {templateForm.id ? 'Save changes' : 'Add template'}
              </ControllerButton>
              {templateForm.id && (
                <ControllerButton
                  variant="ghost"
                  onClick={() => setTemplateForm(EMPTY_TEMPLATE_FORM)}
                >
                  Cancel edit
                </ControllerButton>
              )}
            </div>
          </form>
        </NdxSpatialLockup>

        {templatesLoading ? (
          <p className="text-meta text-text-secondary">Loading prompt templates...</p>
        ) : templates.length === 0 ? (
          <EmptyState
            title="No prompt templates yet"
            description="Add a reusable prompt template above."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <NdxSpatialLockup key={template.id}>
                <article className="flex h-full flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-body font-semibold text-text-primary">{template.name}</p>
                    <StatusBadge tone={RISK_TONE[template.riskClass]} label={template.riskClass} />
                  </div>
                  <p className="text-caption text-text-tertiary">
                    v{template.version} · {template.author}
                    {template.workspaceScoped ? ' · workspace scoped' : ''}
                  </p>
                  <p className="max-h-20 overflow-auto text-meta text-text-secondary">
                    {template.purpose}
                  </p>
                  {template.inputs.length > 0 && (
                    <p className="text-caption text-text-tertiary">
                      Inputs: {template.inputs.join(', ')}
                    </p>
                  )}
                  {template.requiredTools.length > 0 && (
                    <p className="text-caption text-text-tertiary">
                      Required tools: {template.requiredTools.join(', ')}
                    </p>
                  )}
                  {template.testCases.length > 0 && (
                    <p className="text-caption text-text-tertiary">
                      {template.testCases.length} test case
                      {template.testCases.length === 1 ? '' : 's'}
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap gap-2">
                    <ControllerButton onClick={() => handleEditTemplate(template)}>
                      Edit
                    </ControllerButton>
                    <ControllerButton
                      variant="destructive"
                      onClick={() => setRemoveTemplateReview(template)}
                    >
                      Delete
                    </ControllerButton>
                  </div>
                </article>
              </NdxSpatialLockup>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-body font-semibold text-text-primary">Personas</p>
        {personasError && <ErrorState title="Persona error" description={personasError} />}

        <NdxSpatialLockup>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              void handleSavePersona()
            }}
          >
            <p className="text-meta font-semibold text-text-primary">
              {personaForm.id ? 'Edit persona' : 'New persona'}
            </p>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={personaForm.name}
                onChange={(event) =>
                  setPersonaForm((form) => ({ ...form, name: event.target.value }))
                }
                placeholder="Name"
                aria-label="Persona name"
                className="min-w-[14rem] flex-1 rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
              />
              <select
                value={personaForm.explanationDepth}
                onChange={(event) =>
                  setPersonaForm((form) => ({
                    ...form,
                    explanationDepth: event.target.value as Persona['explanationDepth']
                  }))
                }
                aria-label="Persona explanation depth"
                className="rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
              >
                {EXPLANATION_DEPTHS.map((depth) => (
                  <option key={depth} value={depth}>
                    {depth}
                  </option>
                ))}
              </select>
              <select
                value={personaForm.reviewStrictness}
                onChange={(event) =>
                  setPersonaForm((form) => ({
                    ...form,
                    reviewStrictness: event.target.value as Persona['reviewStrictness']
                  }))
                }
                aria-label="Persona review strictness"
                className="rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
              >
                {REVIEW_STRICTNESS.map((strictness) => (
                  <option key={strictness} value={strictness}>
                    {strictness}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={personaForm.communicationStyle}
              onChange={(event) =>
                setPersonaForm((form) => ({ ...form, communicationStyle: event.target.value }))
              }
              placeholder="Communication style"
              aria-label="Persona communication style"
              rows={2}
              className="rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
            />
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={personaForm.defaultModelProfile}
                onChange={(event) =>
                  setPersonaForm((form) => ({ ...form, defaultModelProfile: event.target.value }))
                }
                placeholder="Default model profile (optional)"
                aria-label="Persona default model profile"
                className="min-w-[14rem] flex-1 rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
              />
              <input
                type="text"
                value={personaForm.suggestedToolIds}
                onChange={(event) =>
                  setPersonaForm((form) => ({ ...form, suggestedToolIds: event.target.value }))
                }
                placeholder="Suggested tool ids (comma-separated)"
                aria-label="Persona suggested tools"
                className="min-w-[14rem] flex-1 rounded-md border border-border bg-canvas p-2 text-meta text-text-primary"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <ControllerButton
                type="submit"
                variant="primary"
                disabled={!personaForm.name.trim() || !personaForm.communicationStyle.trim()}
              >
                {personaForm.id ? 'Save changes' : 'Add persona'}
              </ControllerButton>
              {personaForm.id && (
                <ControllerButton
                  variant="ghost"
                  onClick={() => setPersonaForm(EMPTY_PERSONA_FORM)}
                >
                  Cancel edit
                </ControllerButton>
              )}
            </div>
          </form>
        </NdxSpatialLockup>

        {personasLoading ? (
          <p className="text-meta text-text-secondary">Loading personas...</p>
        ) : personas.length === 0 ? (
          <EmptyState title="No personas yet" description="Add a reviewer persona above." />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {personas.map((persona) => (
              <NdxSpatialLockup key={persona.id}>
                <article className="flex h-full flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-body font-semibold text-text-primary">{persona.name}</p>
                    <StatusBadge
                      tone={persona.reviewStrictness === 'strict' ? 'warning' : 'neutral'}
                      label={persona.reviewStrictness}
                    />
                  </div>
                  <p className="text-caption text-text-tertiary">{persona.explanationDepth}</p>
                  <p className="max-h-20 overflow-auto text-meta text-text-secondary">
                    {persona.communicationStyle}
                  </p>
                  {persona.defaultModelProfile && (
                    <p className="text-caption text-text-tertiary">
                      Default model profile: {persona.defaultModelProfile}
                    </p>
                  )}
                  {persona.suggestedToolIds.length > 0 && (
                    <p className="text-caption text-text-tertiary">
                      Suggested tools: {persona.suggestedToolIds.join(', ')}
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap gap-2">
                    <ControllerButton onClick={() => handleEditPersona(persona)}>
                      Edit
                    </ControllerButton>
                    <ControllerButton
                      variant="destructive"
                      onClick={() => setRemovePersonaReview(persona)}
                    >
                      Delete
                    </ControllerButton>
                  </div>
                </article>
              </NdxSpatialLockup>
            ))}
          </div>
        )}
      </section>

      <ConfirmationDialog
        open={removeTemplateReview !== null}
        title="Delete prompt template?"
        action={`Delete "${removeTemplateReview?.name ?? ''}".`}
        consequence="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => removeTemplateReview && void handleRemoveTemplate(removeTemplateReview)}
        onCancel={() => setRemoveTemplateReview(null)}
      />

      <ConfirmationDialog
        open={removePersonaReview !== null}
        title="Delete persona?"
        action={`Delete "${removePersonaReview?.name ?? ''}".`}
        consequence="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => removePersonaReview && void handleRemovePersona(removePersonaReview)}
        onCancel={() => setRemovePersonaReview(null)}
      />
    </div>
  )
}
