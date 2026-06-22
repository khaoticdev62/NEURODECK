import type { Monaco } from '@monaco-editor/react'
import type * as monacoEditor from 'monaco-editor'
import { useCallback, useEffect, useState } from 'react'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { useFocusable } from '../../controller/focus/useFocusable'
import { getGitStatus } from '../../services/ipc/gitClient'
import { useWorkspaces } from '../workspaces/useWorkspaces'
import { CodeEditor } from './CodeEditor'
import { DiagnosticsPanel, type DiagnosticItem } from './DiagnosticsPanel'
import { ProjectTree } from './ProjectTree'
import { SymbolNavigator, type SymbolItem } from './SymbolNavigator'
import { useOpenFiles } from './useOpenFiles'

const SEVERITY_BY_MONACO_LEVEL: Record<number, DiagnosticItem['severity']> = {
  8: 'error',
  4: 'warning',
  2: 'info',
  1: 'hint'
}

/**
 * ND-021 Build Studio shell. Real regions: project tree, editor stack
 * (tabs), problems panel, symbol navigator, and a minimal Git summary
 * (branch + change count, reusing the real `GitService` from Epic 6).
 * Task runner and AI coding panel are not built — task runner needs a
 * real "run configuration" concept this slice doesn't define, and the AI
 * coding panel needs Epic 9's model router. The Terminal region is
 * reachable via the existing `/terminal` route instead of being
 * duplicated inline. Read-only: see the ledger's Epic 7 scope decision —
 * saving waits for Epic 11's Recovery Service.
 */
export function BuildStudio(): React.JSX.Element {
  const { activeWorkspace } = useWorkspaces()

  if (!activeWorkspace) {
    return (
      <EmptyState
        title="No active workspace"
        description="Open a workspace before using Build Studio."
      />
    )
  }

  return <BuildStudioWorkspace key={activeWorkspace.id} workspaceId={activeWorkspace.id} />
}

function BuildStudioWorkspace({ workspaceId }: { workspaceId: string }): React.JSX.Element {
  const { openFiles, activePath, openFile, closeFile, setActivePath } = useOpenFiles(workspaceId)
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

      editor.onDidDispose(() => subscription.dispose())
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

  return (
    <div className="grid h-full min-w-[64rem] grid-cols-[14rem_minmax(28rem,1fr)_16rem] gap-3 overflow-auto">
      <div className="flex min-h-0 flex-col gap-2 overflow-auto border border-border bg-surface p-2">
        <p className="px-1 text-meta font-semibold text-text-primary">Project</p>
        <ProjectTree workspaceId={workspaceId} onOpenFile={(path) => void openFile(path)} />
        {gitSummary && (
          <p className="mt-auto px-1 text-meta text-text-tertiary">
            {gitSummary.branch ?? 'detached HEAD'} · {gitSummary.changeCount} change
            {gitSummary.changeCount === 1 ? '' : 's'}
          </p>
        )}
      </div>

      <div className="flex min-h-0 flex-col border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-2 py-1">
          <div className="flex min-w-0 gap-1 overflow-x-auto">
            {openFiles.map((file) => (
              <Tab
                key={file.path}
                path={file.path}
                active={file.path === activePath}
                onSelect={() => setActivePath(file.path)}
                onClose={() => closeFile(file.path)}
              />
            ))}
          </div>
          <span className="shrink-0 pl-2 text-meta uppercase tracking-[0.14em] text-text-tertiary">
            View only
          </span>
        </div>
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
            />
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-3 overflow-auto border border-border bg-surface p-2">
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
      </div>
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
  onSelect,
  onClose
}: {
  path: string
  active: boolean
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
      <ControllerButton ref={ref} variant={active ? 'secondary' : 'ghost'} onClick={onSelect}>
        {name}
      </ControllerButton>
      <button
        type="button"
        aria-label={`Close ${name}`}
        onClick={onClose}
        className="px-1 text-meta text-text-tertiary hover:text-text-primary"
      >
        ×
      </button>
    </div>
  )
}
