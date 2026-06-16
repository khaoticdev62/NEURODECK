import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Paintbrush, Play, Copy, Trash2, RefreshCw, Sparkles, Users } from "lucide-react";
import { neurodeckApi, listenBridge } from "../../services/bridgeAdapter";
import type { CodeLang } from "../../services/bridgeAdapter";
import { Button } from "../../components/primitives/Button";
import { IconButton } from "../../components/primitives/IconButton";
import { Select } from "../../components/primitives/Select";
import { Badge } from "../../components/primitives/Badge";
import { Panel } from "../../components/primitives/Panel";
import { EmptyState } from "../../components/primitives/EmptyState";

const LANG_OPTIONS: { value: CodeLang; label: string }[] = [
  { value: "html", label: "HTML" },
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "bash", label: "Bash" },
  { value: "powershell", label: "PowerShell" },
];

const DEFAULT_CODE: Partial<Record<CodeLang, string>> = {
  html: '<!-- Try editing this HTML -->\n<div style="padding: 20px; color: #5EEBFF;">\n  <h1>Hello NEURODECK</h1>\n  <p>Edit and click Run to preview</p>\n</div>',
  python:
    '# Python code execution\nprint("Hello from NEURODECK Canvas")\nfor i in range(3):\n    print(f"Line {i+1}")',
  javascript:
    '// JavaScript execution\nconsole.log("Hello from NEURODECK Canvas");\nconst arr = [1, 2, 3];\narr.map(x => x * 2);',
  bash: '#!/bin/bash\necho "Hello from NEURODECK Canvas"\nls -la',
  powershell: '# PowerShell\nWrite-Host "Hello from NEURODECK Canvas"\nGet-Date',
};

export function CanvasView() {
  const [lang, setLang] = useState<CodeLang>("html");
  const [code, setCode] = useState(DEFAULT_CODE.html ?? "");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const unsubLine = listenBridge("canvas_exec_line", (payload: unknown) => {
      const line =
        typeof payload === "object" && payload !== null && "line" in payload
          ? String((payload as Record<string, unknown>).line)
          : String(payload);
      setOutput((prev) => {
        const next = prev + line + "\n";
        requestAnimationFrame(() => {
          if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
          }
        });
        return next;
      });
    });
    const unsubDone = listenBridge("canvas_exec_done", () => {
      setRunning(false);
    });
    return () => {
      unsubLine();
      unsubDone();
    };
  }, []);

  useEffect(() => {
    setCode((prev) => {
      const defaults = Object.values(DEFAULT_CODE);
      const isDefault = defaults.includes(prev);
      return isDefault ? (DEFAULT_CODE[lang] ?? "") : prev;
    });
  }, [lang]);

  const run = useCallback(async () => {
    setRunning(true);
    setOutput("");
    if (lang === "html") {
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
    setOutput("");
    setCode(DEFAULT_CODE[lang] ?? "");
  };

  const copyCode = () => navigator.clipboard.writeText(code);

  const htmlBlob = useMemo(() => {
    if (lang !== "html") return null;
    return URL.createObjectURL(new Blob([code], { type: "text/html" }));
  }, [lang, previewKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (htmlBlob) URL.revokeObjectURL(htmlBlob);
    };
  }, [htmlBlob]);

  return (
    <div className="flex h-full flex-col">
      <header className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-primary/20 bg-accent-primary/10">
          <Paintbrush className="h-5 w-5 text-accent-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-muted">
            Canvas
          </p>
          <h2 className="text-lg font-semibold text-text-primary">Live Code Canvas</h2>
          <p className="text-xs text-text-muted">Edit, run, and preview code in split view.</p>
        </div>
        <div className="canvas-toolbar flex items-center gap-2">
          <Badge tone="accent" variant="outline">
            {lang.toUpperCase()}
          </Badge>
          <Select
            aria-label="Select language"
            value={lang}
            onChange={(e) => setLang(e.target.value as CodeLang)}
            options={LANG_OPTIONS}
            className="w-36"
          />
          <Button
            id="canvas-run-btn"
            variant="success"
            size="md"
            loading={running}
            onClick={run}
            icon={running ? RefreshCw : Play}
          >
            Run
          </Button>
          <IconButton
            id="canvas-copy-btn"
            aria-label="Copy code"
            variant="subtle"
            onClick={copyCode}
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton
            id="canvas-clear-btn"
            aria-label="Reset canvas to default"
            variant="subtle"
            onClick={clear}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton
            id="canvas-ai-edit-btn"
            aria-label="AI edit (requires active session)"
            title="AI edit — connect to a session to enable"
            variant="subtle"
            disabled
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton
            id="canvas-collab-btn"
            aria-label="Collaborate (requires active session)"
            title="Collaborate — connect to a session to enable"
            variant="subtle"
            disabled
          >
            <Users className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-3">
        <Panel
          className="flex min-w-0 flex-1 flex-col"
          title="Editor"
          eyebrow="Source"
          bodyClassName="flex flex-1 flex-col min-h-0 p-0"
        >
          <textarea
            id="canvas-monaco"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            aria-label="Code editor"
            className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-sm leading-relaxed text-text-primary outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-accent-primary/30"
          />
        </Panel>

        <Panel
          className="flex min-w-0 flex-1 flex-col"
          title={lang === "html" ? "Preview" : "Output"}
          eyebrow={lang === "html" ? "Render" : "Stream"}
          bodyClassName="flex flex-1 flex-col min-h-0 p-0"
        >
          {lang === "html" ? (
            <iframe
              id="canvas-preview-frame"
              key={previewKey}
              src={htmlBlob ?? undefined}
              title="Canvas Preview"
              sandbox="allow-scripts allow-forms allow-pointer-lock allow-top-navigation-by-user-activation"
              className="min-h-0 flex-1 w-full border-none bg-surface-app"
            />
          ) : (
            <div className="relative min-h-0 flex-1">
              {output ? (
                <pre
                  ref={outputRef}
                  className="h-full overflow-auto p-3 font-mono text-sm leading-relaxed text-text-secondary"
                >
                  {output}
                </pre>
              ) : (
                <EmptyState
                  icon={Play}
                  title="Ready to run"
                  description={`Click Run to execute your ${lang} code. Output streams here in real time.`}
                  compact
                  className="h-full"
                />
              )}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
