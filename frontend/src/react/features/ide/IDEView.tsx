import { useState } from 'react';
import { Code, FileCode, FolderOpen, Settings } from 'lucide-react';

const DEMO_FILES = [
  { name: 'main.rs', type: 'file' },
  { name: 'lib.rs', type: 'file' },
  { name: 'Cargo.toml', type: 'file' },
  { name: 'src', type: 'folder' },
  { name: 'assets', type: 'folder' },
];

export function IDEView() {
  const [activeFile, setActiveFile] = useState('main.rs');
  const [code] = useState(`// NEURODECK Integrated Development Environment\n// Full Monaco editor integration coming soon\n\nfn main() {\n    println!("Hello from NEURODECK IDE");\n}`);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <Code className="h-5 w-5 text-nd-accent" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-nd-text">IDE</h2>
          <p className="text-xs text-nd-text0">Integrated code workspace</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="flex w-48 flex-col rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-nd-text0">
            <FolderOpen className="h-3.5 w-3.5" /> Explorer
          </div>
          <div className="space-y-0.5">
            {DEMO_FILES.map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() => setActiveFile(f.name)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs ${activeFile === f.name ? 'bg-nd-accent/10 text-nd-accent' : 'text-nd-text-muted hover:bg-nd-surface/50'}`}
              >
                {f.type === 'folder' ? <FolderOpen className="h-3.5 w-3.5" /> : <FileCode className="h-3.5 w-3.5" />}
                {f.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40">
          <div className="flex items-center gap-2 border-b border-nd-text-muted/15 px-3 py-2">
            <FileCode className="h-3.5 w-3.5 text-nd-text0" />
            <span className="text-xs text-nd-text-muted">{activeFile}</span>
          </div>
          <pre className="min-h-0 flex-1 overflow-auto p-4 font-mono text-sm text-nd-text/80">
            {code}
          </pre>
        </div>
      </div>
    </div>
  );
}
