import { Editor, loader, type Monaco } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { useEffect } from 'react'
import { detectLanguage } from './detectLanguage'
import { installMonacoWorkers } from './monacoWorkers'

let initialized = false
let themeDefined = false

const HYBRID_MONACO_THEME = 'ndx-hybrid-dark'

function defineHybridMonacoTheme(monacoInstance: Monaco): void {
  if (themeDefined) return
  themeDefined = true
  monacoInstance.editor.defineTheme(HYBRID_MONACO_THEME, {
    base: 'vs-dark',
    inherit: true,
    colors: {
      'editor.background': '#14121a',
      'editor.foreground': '#e5e0ec',
      'editorLineNumber.foreground': '#484553',
      'editorLineNumber.activeForeground': '#c9c4d6',
      'editorCursor.foreground': '#917eff',
      'editor.selectionBackground': '#35343c',
      'editor.inactiveSelectionBackground': '#2b2931',
      'editor.lineHighlightBackground': '#1c1b22',
      'editor.lineHighlightBorder': '#484553',
      'editorIndentGuide.background1': '#484553',
      'editorIndentGuide.activeBackground1': '#917eff',
      'editorWidget.background': '#201f27',
      'editorWidget.border': '#484553',
      'editorSuggestWidget.background': '#201f27',
      'editorSuggestWidget.border': '#484553',
      'editorSuggestWidget.selectedBackground': '#2b2931',
      'editorSuggestWidget.highlightForeground': '#917eff',
      'editorHoverWidget.background': '#201f27',
      'editorHoverWidget.border': '#484553',
      'editorHoverWidget.foreground': '#e5e0ec',
      'editorMarkerNavigation.background': '#201f27',
      'editorMarkerNavigationError.background': '#93000a',
      'editorMarkerNavigationWarning.background': '#f4c95d',
      'editorError.foreground': '#ffb4ab',
      'editorWarning.foreground': '#f4c95d',
      'editorInfo.foreground': '#4dd6fd',
      'editorGutter.background': '#14121a',
      'editorGutter.modifiedBackground': '#4dd6fd',
      'editorGutter.addedBackground': '#59dbbd',
      'editorGutter.deletedBackground': '#ffb4ab',
      'menu.background': '#201f27',
      'menu.foreground': '#e5e0ec',
      'menu.selectionBackground': '#2b2931',
      'menu.selectionForeground': '#e5e0ec',
      'menu.border': '#484553',
      'list.activeSelectionBackground': '#2b2931',
      'list.activeSelectionForeground': '#e5e0ec',
      'list.hoverBackground': '#1c1b22',
      focusBorder: '#917eff',
      'input.background': '#14121a',
      'input.border': '#484553',
      'input.foreground': '#e5e0ec',
      'inputOption.activeBorder': '#917eff',
      'peekView.border': '#484553',
      'peekViewEditor.background': '#14121a',
      'peekViewResult.background': '#201f27',
      'peekViewResult.selectionBackground': '#2b2931',
      'quickInput.background': '#201f27',
      'quickInput.foreground': '#e5e0ec',
      'scrollbarSlider.background': '#48455380',
      'scrollbarSlider.hoverBackground': '#928e9f80',
      'scrollbarSlider.activeBackground': '#917eff80'
    },
    rules: [
      { token: 'comment', foreground: '928e9f' },
      { token: 'keyword', foreground: '917eff' },
      { token: 'string', foreground: '59dbbd' },
      { token: 'number', foreground: 'f4c95d' },
      { token: 'type', foreground: '4dd6fd' }
    ]
  })
}

/** Runs once: bundles Monaco locally (no CDN, per the offline-first rule) and wires its language workers. */
function ensureMonacoInitialized(): void {
  if (initialized) return
  initialized = true
  installMonacoWorkers()
  loader.config({ monaco })
  defineHybridMonacoTheme(monaco)
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
      theme={HYBRID_MONACO_THEME}
      beforeMount={defineHybridMonacoTheme}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        lineHeight: 20,
        scrollBeyondLastLine: false,
        roundedSelection: false,
        renderLineHighlight: 'line',
        renderWhitespace: 'selection',
        fixedOverflowWidgets: true,
        overviewRulerBorder: false,
        padding: { top: 12, bottom: 12 },
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
          useShadows: false
        },
        suggest: {
          showStatusBar: true,
          preview: true
        }
      }}
      onMount={onMount}
      onChange={(value) => onChange?.(value ?? '')}
    />
  )
}
