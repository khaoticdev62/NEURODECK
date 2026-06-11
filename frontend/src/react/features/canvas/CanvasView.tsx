import { useCallback, useEffect, useRef, useState } from 'react';
import { Paintbrush, Play, Copy, Trash2, RefreshCw } from 'lucide-react';
import { neurodeckApi, listenBridge } from '../../services/bridgeAdapter';
import type { CodeLang } from '../../services/bridgeAdapter';

const LANG_OPTIONS: { value: CodeLang; label: string }[] = [
  { value: 'html', label: 'HTML' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'bash', label: 'Bash' },
  { value: 'powershell', label: 'PowerShell' },
];

const DEFAULT_CODE: Record<CodeLang, string> = {
  html: '<!-- Try editing this HTML -->>\n<div style="padding: 20px; color: #5EEBFF;">\n  <h1>Hello NEURODECK</h1>\n  <p>Edit and click Run to preview</p>\n</div>',
  python: '# Python code execution\nprint("Hello from NEURODECK Canvas")\nfor i in range(3):\n    print(f"Line {i+1}")',
  javascript: '// JavaScript execution\nconsole.log("Hello from NEURODECK Canvas");\nconst arr = [1, 2, 3];\narr.map(x => x * 2);',
  js: '// JavaScript execution\nconsole.log("Hello from NEURODECK Canvas");\nconst arr = [1, 2, 3];\narr.map(x => x * 2);',
  bash: '#!/bin/bash\necho "Hello from NEURODECK Canvas"\nls -la',
  powershell: '# PowerShell\nWrite-Host "Hello from NEURODECK Canvas"\nGet-Date',
};

export function CanvasView() {
  const [lang, setLang] = useState<CodeLang>('html');
  const [code, setCode] = useState(DEFAULT_CODE.html);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const unsubLine = listenBridge('canvas_exec_line', (payload: any) => {
      setOutput((prev) => prev + (payload.line ?? String(payload)) + '\n');
    });
    const unsubDone = listenBridge('canvas_exec_done', () => {
      setRunning(false);
    });
    return () => {
      unsubLine();
      unsubDone();
    };
  }, []);

  useEffect(() => {
    setCode((prev) => {
      const isDefault = Object.values(DEFAULT_CODE).includes(prev);
      return isDefault ? DEFAULT_CODE[lang] : prev;
    });
  }, [lang]);

  const run = useCallback(async () => {
    setRunning(true);
    setOutput('');
    if (lang === 'html') {
      setPreviewKey((k) => k + 1);
      setRunning(false);
      return;
    }
    try {
      await neurodeckApi.canvas.execStream(code, lang);
    } catch (e) {
      setOutput(String(e));
      setRunning(false);
    }
  }, [code, lang]);

  const clear = () => {
    setOutput('');
    setCode('');
  };

  const copyCode = () => navigator.clipboard.writeText(code);

  const htmlBlob = lang === 'html' ? URL.createObjectURL(new Blob([code], { type: 'text/html' })) : null;

  useEffect(() => {
    return () => { if (htmlBlob) URL.revokeObjectURL(htmlBlob); };
  }, [htmlBlob]);

  return (
    <div className="canvas-container flex h-full flex-col">
      <div className="canvas-toolbar mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <Paintbrush className="h-5 w-5 text-nd-accent" />
        </div>
        <div className="flex-1">
          <div className="canvas-kicker text-[10px] font-semibold uppercase tracking-[0.28em] text-nd-text-muted">Canvas</div>
          <h2 className="text-lg font-semibold text-nd-text">Canvas</h2>
          <p className="text-xs text-nd-text-muted">Live code editor and execution</p>
        </div>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as CodeLang)}
          aria-label="Select language"
          className="rounded-lg border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none"
        >
          {LANG_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button id="canvas-run-btn" type="button" onClick={run} disabled={running} className="flex items-center gap-2 rounded-lg border border-nd-success/30 bg-nd-success/10 px-3 py-2 text-sm font-medium text-nd-success hover:bg-nd-success/20 disabled:opacity-50">
          {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run
        </button>
        <button id="canvas-copy-btn" type="button" onClick={copyCode} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text">
          <Copy className="h-4 w-4" />
        </button>
        <button id="canvas-clear-btn" type="button" onClick={clear} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text">
          <Trash2 className="h-4 w-4" />
        </button>
        <button id="canvas-ai-edit-btn" type="button" onClick={() => setOutput((prev) => prev || 'AI edit queued...')} className="rounded-lg border border-nd-text-muted/15 px-3 py-2 text-sm text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text">
          AI Edit
        </button>
        <button id="canvas-collab-btn" type="button" onClick={() => setOutput((prev) => prev || 'Collab ready...')} className="rounded-lg border border-nd-text-muted/15 px-3 py-2 text-sm text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text">
          Collab
        </button>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40">
          <div className="border-b border-nd-text-muted/15 px-3 py-2 text-xs font-medium text-nd-text-muted">Editor</div>
          <textarea
            id="canvas-monaco"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-sm text-nd-text/90 outline-none"
          />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40">
          <div className="border-b border-nd-text-muted/15 px-3 py-2 text-xs font-medium text-nd-text-muted">
            {lang === 'html' ? 'Preview' : 'Output'}
          </div>
          {lang === 'html' ? (
            <iframe
              key={previewKey}
              src={htmlBlob || undefined}
              title="Canvas Preview"
              sandbox="allow-scripts allow-forms allow-pointer-lock allow-top-navigation-by-user-activation"
              className="min-h-0 flex-1 w-full border-none bg-white"
            />
          ) : (
            <pre
              ref={outputRef}
              className="min-h-0 flex-1 overflow-auto p-3 font-mono text-sm text-nd-text/80"
            >
              {output || <span className="text-nd-text-muted/70">Output will appear here...</span>}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
