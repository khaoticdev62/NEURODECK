import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorker: (moduleId: string, label: string) => Worker
    }
  }
}

/**
 * Bundles Monaco's language workers locally via Vite's `?worker` import
 * (vitejs.dev/guide/features.html#web-workers) instead of loading them from
 * a CDN — required by the offline-first/no-cloud-dependency rule (spec §3.6).
 * Must be imported exactly once, before the first Monaco editor instance is
 * created. Only loaded as part of the lazy Build Studio route chunk, so it
 * never affects the app's initial bundle size.
 */
export function installMonacoWorkers(): void {
  self.MonacoEnvironment = {
    getWorker(_moduleId: string, label: string) {
      switch (label) {
        case 'json':
          return new JsonWorker()
        case 'css':
        case 'scss':
        case 'less':
          return new CssWorker()
        case 'html':
        case 'handlebars':
        case 'razor':
          return new HtmlWorker()
        case 'typescript':
        case 'javascript':
          return new TsWorker()
        default:
          return new EditorWorker()
      }
    }
  }
}
