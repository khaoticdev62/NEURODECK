import type { Monaco } from '@monaco-editor/react'
import type * as monacoEditor from 'monaco-editor'
import { useCallback, useEffect, useRef, useState } from 'react'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { NeuralPulse } from '../../components/primitives/NeuralPulse'
import {
  NdxBreadcrumbs,
  NdxEditorShell,
  NdxEditorTab,
  NdxEditorTabs,
  NdxToolWindow
} from '../../components/workbench'
import { useFocusable } from '../../controller/focus/useFocusable'
import { getGitStatus } from '../../services/ipc/gitClient'
import { completeModel } from '../../services/ipc/modelClient'
import { WorkspaceRequiredState } from '../workspaces/WorkspaceRequiredState'
import { useWorkspaces } from '../workspaces/useWorkspaces'
import { useWorkbenchStore } from '../../state/useWorkbenchStore'
import { CodeEditor } from './CodeEditor'
import { DiagnosticsPanel, type DiagnosticItem } from './DiagnosticsPanel'
import { ProjectTree } from './ProjectTree'
import { SymbolNavigator, type SymbolItem } from './SymbolNavigator'
import {
  organizeSingleLineImports,
  parsePredictiveEditProposal,
  summarizeRange,
  wrapSelectionInTryCatch,
  type PredictiveEditProposal,
  type TextRange
} from './editorTransforms'
import { useOpenFiles, type UseOpenFilesResult } from './useOpenFiles'

const SEVERITY_BY_MONACO_LEVEL: Record<number, DiagnosticItem['severity']> = {
  8: 'error',
  4: 'warning',
  2: 'info',
  1: 'hint'
}

/**
 * ND-021 Build Studio shell. Real regions: project tree, editor stack
 * (tabs, real editing + save as of Epic 11), problems panel, symbol
 * navigator, and a minimal Git summary (branch + change count, reusing
 * the real `GitService` from Epic 6). Task runner and AI coding panel are
 * not built — task runner needs a real "run configuration" concept this
 * slice doesn't define, and the AI coding panel needs Epic 9's model
 * router. The Terminal region is reachable via the existing `/terminal`
 * route instead of being duplicated inline.
 */
export function BuildStudio(): React.JSX.Element {
  const { activeWorkspace } = useWorkspaces()

  if (!activeWorkspace) {
    return <WorkspaceRequiredState purpose="edit code in Build Studio" />
  }

  return <BuildStudioWorkspace key={activeWorkspace.id} workspaceId={activeWorkspace.id} />
}

function BuildStudioWorkspace({ workspaceId }: { workspaceId: string }): React.JSX.Element {
  const { openFiles, activePath, openFile, closeFile, setActivePath, updateContent, saveFile } =
    useOpenFiles(workspaceId)
  const saveFileRef = useRef<UseOpenFilesResult['saveFile']>(saveFile)
  useEffect(() => {
    saveFileRef.current = saveFile
  }, [saveFile])
  const [diagnosticsByPath, setDiagnosticsByPath] = useState<Record<string, DiagnosticItem[]>>({})
  const [symbolsByPath, setSymbolsByPath] = useState<Record<string, SymbolItem[]>>({})
  const [gitSummary, setGitSummary] = useState<{
    branch: string | null
    changeCount: number
  } | null>(null)
  const [pendingReveal, setPendingReveal] = useState<{
    path: string
    line: number
    nonce: number
  } | null>(null)
  const [editorInstance, setEditorInstance] =
    useState<monacoEditor.editor.IStandaloneCodeEditor | null>(null)
  const [selectionActive, setSelectionActive] = useState(false)
  const [structuralMessage, setStructuralMessage] = useState<string | null>(null)
  const [predictionPrompt, setPredictionPrompt] = useState('')
  const [predictionBusy, setPredictionBusy] = useState(false)
  const [predictionError, setPredictionError] = useState<string | null>(null)
  const [predictionProposal, setPredictionProposal] = useState<
    (PredictiveEditProposal & { range: TextRange; rangeLabel: string; provider: string }) | null
  >(null)

  useEffect(() => {
    void getGitStatus({ workspaceId }).then((result) => {
      if (result.ok)
        setGitSummary({ branch: result.data.branch, changeCount: result.data.changes.length })
    })
  }, [workspaceId])

  const handleEditorMount = useCallback(
    (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: Monaco) => {
      setEditorInstance(editor)
      const model = editor.getModel()
      if (!model) return
      const path = model.uri.path.replace(/^\//, '')

      const readMarkers = (): void => {
        const markers = monaco.editor.getModelMarkers({ resource: model.uri })
        setDiagnosticsByPath((current) => ({
          ...current,
          [path]: markers.map((marker) => ({
            severity: SEVERITY_BY_MONACO_LEVEL[marker.severity] ?? 'info',
            message: marker.message,
            code: typeof marker.code === 'object' ? marker.code?.value : marker.code,
            line: marker.startLineNumber,
            path
          }))
        }))
      }
      readMarkers()
      const subscription = monaco.editor.onDidChangeMarkers((uris) => {
        if (uris.some((uri) => uri.toString() === model.uri.toString())) readMarkers()
      })

      void loadSymbols(monaco, model, path).then((symbols) => {
        setSymbolsByPath((current) => ({ ...current, [path]: symbols }))
      })

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        void saveFileRef.current(path, `Edit ${path} in Build Studio`)
      })

      const selectionSubscription = editor.onDidChangeCursorSelection(() => {
        setSelectionActive(!editor.getSelection()?.isEmpty())
      })

      editor.onDidDispose(() => {
        subscription.dispose()
        selectionSubscription.dispose()
        setSelectionActive(false)
      })
    },
    []
  )

  useEffect(() => {
    if (!pendingReveal || !editorInstance || pendingReveal.path !== activePath) return
    editorInstance.revealLineInCenter(pendingReveal.line)
    editorInstance.setPosition({ lineNumber: pendingReveal.line, column: 1 })
  }, [pendingReveal, editorInstance, activePath])

  const activeFile = openFiles.find((file) => file.path === activePath) ?? null
  const isTsOrJs = activePath ? /\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/.test(activePath) : false

  const replaceEditorRange = useCallback(
    (range: TextRange, text: string, source: string) => {
      if (!editorInstance) return
      editorInstance.executeEdits(source, [{ range, text, forceMoveMarkers: true }])
      editorInstance.focus()
    },
    [editorInstance]
  )

  const handleOrganizeImports = useCallback(() => {
    const model = editorInstance?.getModel()
    if (!model) return
    const current = model.getValue()
    const organized = organizeSingleLineImports(current)
    if (organized === current) {
      setStructuralMessage('No single-line imports needed sorting.')
      return
    }
    const fullRange = model.getFullModelRange()
    replaceEditorRange(fullRange, organized, 'build-studio.organizeImports')
    setStructuralMessage('Sorted and deduplicated top-level single-line imports.')
  }, [editorInstance, replaceEditorRange])

  const handleFormatDocument = useCallback(() => {
    const action = editorInstance?.getAction('editor.action.formatDocument')
    if (!action) {
      setStructuralMessage('No formatter is available for this language.')
      return
    }
    void action.run().then(() => {
      setStructuralMessage('Ran the active Monaco formatter for this file.')
    })
  }, [editorInstance])

  const handleWrapSelection = useCallback(() => {
    const model = editorInstance?.getModel()
    const selection = editorInstance?.getSelection()
    if (!model || !selection || selection.isEmpty()) {
      setStructuralMessage('Select code before wrapping it in try/catch.')
      return
    }
    const selectedText = model.getValueInRange(selection)
    replaceEditorRange(
      selection,
      wrapSelectionInTryCatch(selectedText),
      'build-studio.wrapTryCatch'
    )
    setStructuralMessage(`Wrapped ${summarizeRange(selection)} in a try/catch block.`)
  }, [editorInstance, replaceEditorRange])

  const handleRequestPrediction = useCallback(async () => {
    const model = editorInstance?.getModel()
    const selection = editorInstance?.getSelection()
    if (!activeFile || !model || !selection || predictionBusy) return

    const selectedText = selection.isEmpty() ? '' : model.getValueInRange(selection)
    const range = selection.isEmpty()
      ? {
          startLineNumber: selection.startLineNumber,
          startColumn: selection.startColumn,
          endLineNumber: selection.startLineNumber,
          endColumn: selection.startColumn
        }
      : selection
    const windowStart = Math.max(1, selection.startLineNumber - 30)
    const windowEnd = Math.min(model.getLineCount(), selection.endLineNumber + 30)
    const context = model.getValueInRange({
      startLineNumber: windowStart,
      startColumn: 1,
      endLineNumber: windowEnd,
      endColumn: model.getLineMaxColumn(windowEnd)
    })

    setPredictionBusy(true)
    setPredictionError(null)
    setPredictionProposal(null)
    const result = await completeModel({
      profileId: 'fast-coding',
      workspacePrivate: true,
      temperature: 0.1,
      maxTokens: 1600,
      messages: [
        {
          role: 'system',
          content:
            'You propose small code edits. Return only JSON with string fields "replacement" and "explanation". The replacement must be the exact text to insert for the requested range. Do not include markdown.'
        },
        {
          role: 'user',
          content: [
            `File: ${activeFile.path}`,
            `Target: ${summarizeRange(range)}`,
            `User request: ${predictionPrompt.trim() || 'Improve the selected code.'}`,
            selectedText
              ? `Selected text:\n${selectedText}`
              : 'No text is selected; insert at cursor.',
            `Nearby context:\n${context}`
          ].join('\n\n')
        }
      ]
    })
    setPredictionBusy(false)

    if (!result.ok) {
      setPredictionError(result.error.userMessage)
      return
    }

    try {
      const proposal = parsePredictiveEditProposal(result.data.content)
      setPredictionProposal({
        ...proposal,
        range,
        rangeLabel: summarizeRange(range),
        provider: `${result.data.providerName} / ${result.data.modelId}`
      })
    } catch (error) {
      setPredictionError(error instanceof Error ? error.message : 'Could not parse model response.')
    }
  }, [activeFile, editorInstance, predictionBusy, predictionPrompt])

  const handleApplyPrediction = useCallback(() => {
    if (!predictionProposal) return
    replaceEditorRange(
      predictionProposal.range,
      predictionProposal.replacement,
      'build-studio.predictiveEdit'
    )
    setPredictionPrompt('')
    setPredictionProposal(null)
    setPredictionError(null)
  }, [predictionProposal, replaceEditorRange])

  const breadcrumbItems = activePath?.split(/[/\\]/).filter(Boolean) ?? []

  const setPrimary = useWorkbenchStore((state) => state.setPrimary)
  const setSecondary = useWorkbenchStore((state) => state.setSecondary)

  useEffect(() => {
    setPrimary('Project', gitSummary?.branch ?? 'Workspace', (
      <NdxToolWindow title="Project" subtitle={gitSummary?.branch ?? 'Workspace'}>
        <ProjectTree workspaceId={workspaceId} onOpenFile={(path) => void openFile(path)} />
        {gitSummary && (
          <p className="mt-auto px-1 text-meta text-text-tertiary">
            {gitSummary.branch ?? 'detached HEAD'} · {gitSummary.changeCount} change
            {gitSummary.changeCount === 1 ? '' : 's'}
          </p>
        )}
      </NdxToolWindow>
    ))
    return () => setPrimary('Command Deck', undefined, null)
  }, [gitSummary, workspaceId, openFile, setPrimary])

  useEffect(() => {
    setSecondary(
      <NdxToolWindow title="Inspector" subtitle="Symbols, problems, AI edits" side="right">
        <section className="flex flex-col gap-2 border-b border-border pb-3">
          <p className="px-1 text-meta font-semibold text-text-primary">Structural edits</p>
          <div className="grid gap-2">
            <ControllerButton disabled={!activeFile || !isTsOrJs} onClick={handleOrganizeImports}>
              Organize imports
            </ControllerButton>
            <ControllerButton disabled={!activeFile} onClick={handleFormatDocument}>
              Format file
            </ControllerButton>
            <ControllerButton
              disabled={!activeFile || !selectionActive}
              onClick={handleWrapSelection}
            >
              Wrap selection
            </ControllerButton>
          </div>
          {structuralMessage && (
            <p className="px-1 text-meta text-text-tertiary">{structuralMessage}</p>
          )}
        </section>

        <section className="flex flex-col gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2 px-1">
            <NeuralPulse size={16} state={predictionBusy ? 'analyzing' : 'idle'} />
            <p className="text-meta font-semibold text-text-primary">Predictive edit</p>
          </div>
          <textarea
            value={predictionPrompt}
            onChange={(event) => setPredictionPrompt(event.target.value)}
            disabled={!activeFile || predictionBusy}
            className="min-h-20 resize-none border border-border bg-canvas px-2 py-1 text-body text-text-primary"
            placeholder="Describe the edit to propose"
          />
          <ControllerButton
            variant="primary"
            disabled={!activeFile || predictionBusy}
            onClick={() => void handleRequestPrediction()}
          >
            {predictionBusy ? 'Requesting…' : 'Propose edit'}
          </ControllerButton>
          {predictionError && <p className="text-meta text-status-error">{predictionError}</p>}
          {predictionProposal && (
            <div className="ndx-hairline-top grid gap-2 rounded-[var(--radius-md)] border border-[var(--ndx-workbench-border)] border-l-[3px] border-l-[var(--ndx-accent)] bg-canvas p-2">
              <p className="text-meta text-text-tertiary">
                {predictionProposal.provider} · {predictionProposal.rangeLabel}
              </p>
              <p className="text-body text-text-primary">{predictionProposal.explanation}</p>
              <pre className="max-h-36 overflow-auto whitespace-pre-wrap border border-border bg-surface p-2 text-meta text-text-secondary">
                {predictionProposal.replacement}
              </pre>
              <div className="flex gap-2">
                <ControllerButton variant="primary" onClick={handleApplyPrediction}>
                  Apply
                </ControllerButton>
                <ControllerButton variant="secondary" onClick={() => setPredictionProposal(null)}>
                  Discard
                </ControllerButton>
              </div>
            </div>
          )}
        </section>

        <section className="min-h-0 flex-1 overflow-auto">
          <p className="mb-1 px-1 text-meta font-semibold text-text-primary">Symbols</p>
          <SymbolNavigator
            symbols={activePath ? (symbolsByPath[activePath] ?? []) : []}
            supported={isTsOrJs}
            onJump={(line) =>
              activePath && setPendingReveal({ path: activePath, line, nonce: Date.now() })
            }
          />
        </section>
        <section className="min-h-0 flex-1 overflow-auto">
          <p className="mb-1 px-1 text-meta font-semibold text-text-primary">Problems</p>
          <DiagnosticsPanel
            diagnostics={Object.values(diagnosticsByPath).flat()}
            onSelect={(diagnostic) =>
              setPendingReveal({ path: diagnostic.path, line: diagnostic.line, nonce: Date.now() })
            }
          />
        </section>
      </NdxToolWindow>
    )
    return () => setSecondary(null)
  }, [
    activeFile,
    isTsOrJs,
    structuralMessage,
    predictionPrompt,
    predictionBusy,
    predictionError,
    predictionProposal,
    symbolsByPath,
    activePath,
    diagnosticsByPath,
    handleOrganizeImports,
    handleFormatDocument,
    handleWrapSelection,
    handleRequestPrediction,
    handleApplyPrediction,
    setPredictionPrompt,
    setPredictionProposal,
    setPendingReveal,
    setSecondary
  ])

  return (
    <div className="h-full flex-1">
      <NdxEditorShell title={activePath ?? 'Build Studio'}>
        <div className="ndx-hairline-top flex items-center justify-between border-b border-border px-2 py-1">
          <NdxEditorTabs>
            {openFiles.map((file) => (
              <Tab
                key={file.path}
                path={file.path}
                active={file.path === activePath}
                dirty={file.content !== file.savedContent}
                onSelect={() => setActivePath(file.path)}
                onClose={() => closeFile(file.path)}
              />
            ))}
          </NdxEditorTabs>
          {activeFile && !activeFile.error && (
            <div className="flex shrink-0 items-center gap-2 pl-2">
              {activeFile.saveError && (
                <span className="text-meta text-status-error">{activeFile.saveError}</span>
              )}
              <ControllerButton
                variant="primary"
                disabled={activeFile.saving || activeFile.content === activeFile.savedContent}
                onClick={() =>
                  void saveFile(activeFile.path, `Edit ${activeFile.path} in Build Studio`)
                }
              >
                {activeFile.saving ? 'Saving…' : 'Save'}
              </ControllerButton>
            </div>
          )}
        </div>
        <NdxBreadcrumbs items={breadcrumbItems} />
        <div className="min-h-0 flex-1">
          {!activeFile ? (
            <EmptyState
              title="No file open"
              description="Choose a file from the project tree to view it here."
            />
          ) : activeFile.error ? (
            <ErrorState title="Couldn't open this file" description={activeFile.error} />
          ) : (
            <CodeEditor
              path={activeFile.path}
              content={activeFile.content}
              onMount={handleEditorMount}
              onChange={(content) => updateContent(activeFile.path, content)}
            />
          )}
        </div>
      </NdxEditorShell>
    </div>
  )
}

async function loadSymbols(
  monaco: Monaco,
  model: monacoEditor.editor.ITextModel,
  path: string
): Promise<SymbolItem[]> {
  const isTsx = /\.(ts|tsx|mts|cts)$/.test(path)
  const isJsx = /\.(js|jsx|mjs|cjs)$/.test(path)
  if (!isTsx && !isJsx) return []

  try {
    const workerAccessor = isTsx
      ? await monaco.languages.typescript.getTypeScriptWorker()
      : await monaco.languages.typescript.getJavaScriptWorker()
    const client = await workerAccessor(model.uri)
    const navigationTree = await client.getNavigationTree(model.uri.toString())
    return convertNavigationTree(navigationTree, model)
  } catch {
    return []
  }
}

interface NavigationTreeLike {
  text: string
  kind: string
  spans: Array<{ start: number; length: number }>
  childItems?: NavigationTreeLike[]
}

function convertNavigationTree(
  tree: NavigationTreeLike,
  model: monacoEditor.editor.ITextModel
): SymbolItem[] {
  const items = tree.childItems ?? []
  return items.map((item) => {
    const offset = item.spans[0]?.start ?? 0
    const line = model.getPositionAt(offset).lineNumber
    return {
      name: item.text,
      kind: item.kind,
      line,
      children: convertNavigationTree(item, model)
    }
  })
}

function Tab({
  path,
  active,
  dirty,
  onSelect,
  onClose
}: {
  path: string
  active: boolean
  dirty: boolean
  onSelect: () => void
  onClose: () => void
}): React.JSX.Element {
  const { ref } = useFocusable<HTMLButtonElement>({
    id: `build-tab:${path}`,
    groupId: 'build-studio-tabs',
    onActivate: onSelect
  })
  const name = path.split(/[/\\]/).pop() ?? path

  return (
    <div className="flex shrink-0 items-center">
      <NdxEditorTab ref={ref} active={active} dirty={dirty} onClick={onSelect}>
        {name}
      </NdxEditorTab>
      <button
        type="button"
        aria-label={`Close ${name}`}
        onClick={onClose}
        className="h-[var(--ndx-workbench-tabbar-height)] border-r border-[var(--ndx-workbench-border)] px-2 text-meta text-text-tertiary hover:bg-surface-raised hover:text-text-primary"
      >
        ×
      </button>
    </div>
  )
}
