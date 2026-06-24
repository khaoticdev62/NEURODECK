import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Monaco } from '@monaco-editor/react'
import type * as monacoEditor from 'monaco-editor'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NdxBridge, Workspace } from '@shared/contracts'
import { FocusEngineProvider } from '../../../controller/focus/FocusEngineProvider'
import { TestAdapter } from '../../../controller/testing/testAdapter'
import { WorkspaceContext, type WorkspaceContextValue } from '../../workspaces/WorkspaceContext'
import { BuildStudio } from '../BuildStudio'

const editorHarness = vi.hoisted(() => {
  const selection = {
    startLineNumber: 1,
    startColumn: 7,
    endLineNumber: 1,
    endColumn: 13,
    isEmpty: () => false
  }
  const model = {
    uri: { path: '/src/app.ts', toString: () => 'file:///src/app.ts' },
    getValue: () => 'const oldName = 1',
    getValueInRange: vi.fn(() => 'oldName'),
    getFullModelRange: () => ({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 18
    }),
    getLineCount: () => 1,
    getLineMaxColumn: () => 18
  }
  return {
    executeEdits: vi.fn(),
    editor: {
      getModel: () => model,
      getSelection: () => selection,
      executeEdits: vi.fn((...args: unknown[]) => editorHarness.executeEdits(...args)),
      focus: vi.fn(),
      addCommand: vi.fn(),
      getAction: vi.fn(() => ({ run: vi.fn().mockResolvedValue(undefined) })),
      onDidChangeCursorSelection: vi.fn(() => ({ dispose: vi.fn() })),
      onDidDispose: vi.fn()
    },
    monaco: {
      KeyMod: { CtrlCmd: 1 },
      KeyCode: { KeyS: 49 },
      editor: {
        getModelMarkers: vi.fn(() => []),
        onDidChangeMarkers: vi.fn(() => ({ dispose: vi.fn() }))
      }
    }
  }
})

vi.mock('../CodeEditor', () => ({
  CodeEditor: ({
    path,
    content,
    onMount
  }: {
    path: string
    content: string
    onMount?: (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: Monaco) => void
  }) => {
    useEffect(() => {
      onMount?.(
        editorHarness.editor as unknown as monacoEditor.editor.IStandaloneCodeEditor,
        editorHarness.monaco as unknown as Monaco
      )
    }, [onMount])
    return <textarea aria-label={`Mock editor ${path}`} readOnly value={content} />
  }
}))

function stubBridge(partial: Partial<NdxBridge>): void {
  window.ndx = partial as NdxBridge
}

const workspace: Workspace = {
  id: 'w1',
  name: 'Project',
  rootPath: '/workspace/project',
  createdAt: 1
}

function renderStudio(): ReturnType<typeof render> {
  const context: WorkspaceContextValue = {
    workspaces: [workspace],
    activeWorkspaceId: workspace.id,
    activeWorkspace: workspace,
    loading: false,
    error: null,
    refresh: vi.fn(),
    addFromPicker: vi.fn(),
    remove: vi.fn(),
    setActive: vi.fn()
  }

  return render(
    <FocusEngineProvider adapters={[new TestAdapter()]}>
      <WorkspaceContext.Provider value={context}>
        <BuildStudio />
      </WorkspaceContext.Provider>
    </FocusEngineProvider>
  )
}

afterEach(() => {
  editorHarness.executeEdits.mockClear()
  // @ts-expect-error test-only cleanup of a global the real preload script injects
  delete window.ndx
})

describe('BuildStudio', () => {
  it('requests a reviewed predictive edit and applies it through the active editor', async () => {
    const complete = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        providerId: 'p1',
        providerName: 'Local Model',
        modelId: 'coder',
        content:
          '{"replacement":"newName","explanation":"Rename the selected identifier for clarity."}',
        local: true,
        profileId: 'fast-coding',
        usage: {},
        durationMs: 25
      }
    })
    stubBridge({
      files: {
        list: vi.fn().mockResolvedValue({
          ok: true,
          data: [
            {
              name: 'app.ts',
              path: 'src/app.ts',
              isDirectory: false,
              sizeBytes: 17,
              modifiedAt: 1
            }
          ]
        }),
        read: vi.fn().mockResolvedValue({
          ok: true,
          data: { content: 'const oldName = 1', truncated: false, sizeBytes: 17 }
        })
      } as never,
      git: {
        status: vi.fn().mockResolvedValue({ ok: true, data: { branch: 'main', changes: [] } })
      } as never,
      modelProviders: { complete } as never
    })

    const user = userEvent.setup()
    renderStudio()

    await user.click(await screen.findByRole('button', { name: /app\.ts/ }))
    await user.type(screen.getByPlaceholderText('Describe the edit to propose'), 'rename it')
    await user.click(screen.getByRole('button', { name: 'Propose edit' }))

    expect(
      await screen.findByText('Rename the selected identifier for clarity.')
    ).toBeInTheDocument()
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: 'fast-coding',
        workspacePrivate: true
      })
    )

    await user.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() => {
      expect(editorHarness.executeEdits).toHaveBeenCalledWith(
        'build-studio.predictiveEdit',
        expect.arrayContaining([expect.objectContaining({ text: 'newName' })])
      )
    })
  })
})
