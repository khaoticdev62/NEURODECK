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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neuro/20 bg-neuro/10">
          <Code className="h-5 w-5 text-neuro" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-50">IDE</h2>
          <p className="text-xs text-slate-500">Integrated code workspace</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="flex w-48 flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <FolderOpen className="h-3.5 w-3.5" /> Explorer
          </div>
          <div className="space-y-0.5">
            {DEMO_FILES.map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() => setActiveFile(f.name)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs ${activeFile === f.name ? 'bg-neuro/10 text-neuro' : 'text-slate-400 hover:bg-white/[0.04]'}`}
              >
                {f.type === 'folder' ? <FolderOpen className="h-3.5 w-3.5" /> : <FileCode className="h-3.5 w-3.5" />}
                {f.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-white/10 bg-black/20">
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <FileCode className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs text-slate-400">{activeFile}</span>
          </div>
          <pre className="min-h-0 flex-1 overflow-auto p-4 font-mono text-sm text-slate-300">
            {code}
          </pre>
        </div>
      </div>
    </div>
  );
}
