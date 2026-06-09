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
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neuro/20 bg-neuro/10">
          <Paintbrush className="h-5 w-5 text-neuro" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-50">Canvas</h2>
          <p className="text-xs text-slate-500">Live code editor and execution</p>
        </div>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as CodeLang)}
          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none"
        >
          {LANG_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button type="button" onClick={run} disabled={running} className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm font-medium text-success hover:bg-success/20 disabled:opacity-50">
          {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run
        </button>
        <button type="button" onClick={copyCode} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/[0.04] hover:text-slate-100">
          <Copy className="h-4 w-4" />
        </button>
        <button type="button" onClick={clear} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/[0.04] hover:text-slate-100">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/20">
          <div className="border-b border-white/10 px-3 py-2 text-xs font-medium text-slate-500">Editor</div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-sm text-slate-200 outline-none"
          />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/20">
          <div className="border-b border-white/10 px-3 py-2 text-xs font-medium text-slate-500">
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
              className="min-h-0 flex-1 overflow-auto p-3 font-mono text-sm text-slate-300"
            >
              {output || <span className="text-slate-600">Output will appear here...</span>}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
