import { Editor, loader, type Monaco } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { useEffect } from 'react'
import { detectLanguage } from './detectLanguage'
import { installMonacoWorkers } from './monacoWorkers'

let initialized = false

/** Runs once: bundles Monaco locally (no CDN, per the offline-first rule) and wires its language workers. */
function ensureMonacoInitialized(): void {
  if (initialized) return
  initialized = true
  installMonacoWorkers()
  loader.config({ monaco })
}

export interface CodeEditorProps {
  path: string
  content: string
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: Monaco) => void
  onChange?: (content: string) => void
}

/**
 * ND-022 Code Editor — real editing as of Epic 11 (the Recovery Service
 * unblocked saving; see `useOpenFiles.saveFile`). TypeScript/JavaScript
 * files get real diagnostics, hover, and navigation from Monaco's bundled
 * TypeScript language service (a real compiler-backed worker, not a
 * fake). Other languages get real Monarch syntax highlighting only —
 * Monaco ships no semantic language service for them, and standing up
 * real LSP servers per language is out of scope for this slice.
 */
export function CodeEditor({
  path,
  content,
  onMount,
  onChange
}: CodeEditorProps): React.JSX.Element {
  useEffect(() => {
    ensureMonacoInitialized()
  }, [])

  return (
    <Editor
      key={path}
      path={path}
      language={detectLanguage(path)}
      value={content}
      theme="vs-dark"
      options={{ minimap: { enabled: false }, fontSize: 13 }}
      onMount={onMount}
      onChange={(value) => onChange?.(value ?? '')}
    />
  )
}
