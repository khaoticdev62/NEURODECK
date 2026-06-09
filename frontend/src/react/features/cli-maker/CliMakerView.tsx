import { useState } from 'react';
import { TerminalSquare, Plus, Copy, Wand2, Command } from 'lucide-react';

export function CliMakerView() {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [script, setScript] = useState('#!/bin/bash\n# Your custom command\necho "Hello NEURODECK"');
  const [commands, setCommands] = useState([
    { name: 'hello', desc: 'Say hello', script: 'echo "Hello"' },
    { name: 'status', desc: 'System status', script: 'neurodeck status' },
  ]);

  const save = () => {
    if (!name.trim()) return;
    setCommands([...commands, { name: name.trim(), desc: desc.trim(), script }]);
    setName('');
    setDesc('');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neuro/20 bg-neuro/10">
          <TerminalSquare className="h-5 w-5 text-neuro" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-50">CLI Maker</h2>
          <p className="text-xs text-slate-500">Custom command builder and script generator</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex w-64 flex-col gap-2 overflow-auto rounded-2xl border border-white/10 bg-white/[0.02] p-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Commands</span>
          {commands.map((cmd, i) => (
            <div key={i} className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
              <div className="flex items-center gap-2">
                <Command className="h-3.5 w-3.5 text-neuro" />
                <span className="text-xs font-medium text-slate-200">/{cmd.name}</span>
              </div>
              <p className="mt-1 text-[10px] text-slate-600">{cmd.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Command name..."
                className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-neuro/40"
              />
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Description..."
                className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-neuro/40"
              />
            </div>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={6}
              className="w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 font-mono text-sm text-slate-100 outline-none focus:border-neuro/40"
            />
            <div className="flex gap-2">
              <button type="button" onClick={save} className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-2 text-sm font-medium text-success hover:bg-success/20">
                <Plus className="h-4 w-4" /> Save Command
              </button>
              <button type="button" onClick={() => navigator.clipboard.writeText(script)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-400 hover:bg-white/[0.04]">
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
