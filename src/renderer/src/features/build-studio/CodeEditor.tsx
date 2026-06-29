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
      'editor.background': '#0b0d13',
      'editor.foreground': '#f5f6fa',
      'editorLineNumber.foreground': '#5f687a',
      'editorLineNumber.activeForeground': '#d0d4de',
      'editorCursor.foreground': '#7aa2ff',
      'editor.selectionBackground': '#314263',
      'editor.inactiveSelectionBackground': '#263248',
      'editor.lineHighlightBackground': '#111722',
      'editor.lineHighlightBorder': '#2f3748',
      'editorIndentGuide.background1': '#2f3748',
      'editorIndentGuide.activeBackground1': '#7aa2ff',
      'editorWidget.background': '#121720',
      'editorWidget.border': '#2f3748',
      'editorSuggestWidget.background': '#121720',
      'editorSuggestWidget.border': '#2f3748',
      'editorSuggestWidget.selectedBackground': '#1a2130',
      'editorSuggestWidget.highlightForeground': '#7aa2ff',
      'editorHoverWidget.background': '#121720',
      'editorHoverWidget.border': '#2f3748',
      'editorHoverWidget.foreground': '#f5f6fa',
      'editorMarkerNavigation.background': '#121720',
      'editorMarkerNavigationError.background': '#f05b6e',
      'editorMarkerNavigationWarning.background': '#f2b84b',
      'editorError.foreground': '#f05b6e',
      'editorWarning.foreground': '#f2b84b',
      'editorInfo.foreground': '#5ea8ff',
      'editorGutter.background': '#0b0d13',
      'editorGutter.modifiedBackground': '#5ea8ff',
      'editorGutter.addedBackground': '#4fd18b',
      'editorGutter.deletedBackground': '#f05b6e',
      'menu.background': '#121720',
      'menu.foreground': '#f5f6fa',
      'menu.selectionBackground': '#1a2130',
      'menu.selectionForeground': '#f5f6fa',
      'menu.border': '#2f3748',
      'list.activeSelectionBackground': '#1a2130',
      'list.activeSelectionForeground': '#f5f6fa',
      'list.hoverBackground': '#111722',
      focusBorder: '#7aa2ff',
      'input.background': '#0b0c10',
      'input.border': '#2f3748',
      'input.foreground': '#f5f6fa',
      'inputOption.activeBorder': '#7aa2ff',
      'peekView.border': '#2f3748',
      'peekViewEditor.background': '#0b0d13',
      'peekViewResult.background': '#121720',
      'peekViewResult.selectionBackground': '#1a2130',
      'quickInput.background': '#121720',
      'quickInput.foreground': '#f5f6fa',
      'scrollbarSlider.background': '#3a3f4c80',
      'scrollbarSlider.hoverBackground': '#5a607080',
      'scrollbarSlider.activeBackground': '#7aa2ff80'
    },
    rules: [
      { token: 'comment', foreground: '7f8796' },
      { token: 'keyword', foreground: 'b48bff' },
      { token: 'string', foreground: '4fd18b' },
      { token: 'number', foreground: 'f2b84b' },
      { token: 'type', foreground: '5ea8ff' }
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
