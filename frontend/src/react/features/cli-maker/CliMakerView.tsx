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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <TerminalSquare className="h-5 w-5 text-nd-accent" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-nd-text">CLI Maker</h2>
          <p className="text-xs text-nd-text-muted">Custom command builder and script generator</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex w-64 flex-col gap-2 overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-nd-text-muted">Commands</span>
          {commands.map((cmd, i) => (
            <div key={i} className="rounded-lg border border-nd-text-muted/15 bg-nd-surface/50 p-2">
              <div className="flex items-center gap-2">
                <Command className="h-3.5 w-3.5 text-nd-accent" />
                <span className="text-xs font-medium text-nd-text/90">/{cmd.name}</span>
              </div>
              <p className="mt-1 text-[10px] text-nd-text-muted/70">{cmd.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="space-y-2 rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Command name..."
                aria-label="Command name"
                className="flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40"
              />
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Description..."
                aria-label="Command description"
                className="flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40"
              />
            </div>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={6}
              aria-label="Command script"
              className="w-full resize-none rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3 font-mono text-sm text-nd-text outline-none focus:border-nd-accent/40"
            />
            <div className="flex gap-2">
              <button type="button" onClick={save} className="flex items-center gap-2 rounded-xl border border-nd-success/30 bg-nd-success/10 px-4 py-2 text-sm font-medium text-nd-success hover:bg-nd-success/20">
                <Plus className="h-4 w-4" /> Save Command
              </button>
              <button type="button" onClick={() => navigator.clipboard.writeText(script)} className="rounded-xl border border-nd-text-muted/15 px-3 py-2 text-sm text-nd-text-muted hover:bg-nd-surface/50">
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
