import { useState, useEffect } from 'react';
import {
  TerminalSquare, Plus, Copy, Play, Trash2, Save, Upload, Code, Sparkles,
  Command, Settings, Folder, ArrowRight, HelpCircle, Check, AlertCircle,
  Search, FileText, Globe, Activity, Layers, Cpu
} from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';
import type { CliCommandDef, CliAction } from '../../types/neurodeck';

const LOCAL_STORAGE_KEY = 'neurodeck:cli_commands_fallback';

const AVAILABLE_ICONS = [
  'zap', 'message-square', 'code-2', 'terminal', 'server', 'route', 'globe',
  'bot', 'brain', 'share-2', 'panel-right-open', 'sparkles', 'file-text', 'git-branch', 'send',
  'copy', 'play', 'settings-2', 'search', 'trash-2', 'cpu', 'layers', 'box', 'rocket', 'activity'
];

function getFallbackCommands(): CliCommandDef[] {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (_) {}
  }
  return [
    {
      id: 'cmd-hello',
      name: 'hello',
      description: 'Say hello to NEURODECK',
      icon: 'zap',
      category: 'prompt',
      action: { type: 'Prompt', data: { template: 'Hello user, welcome to NEURODECK!', use_llm: false } },
      shortcut: 'Ctrl+H',
      radial_bind: 1
    },
    {
      id: 'cmd-status',
      name: 'status',
      description: 'Check sidecar system health',
      icon: 'activity',
      category: 'shell',
      action: { type: 'Shell', data: { command: 'get_system_health', cwd: null } },
      shortcut: null,
      radial_bind: null
    }
  ];
}

function saveFallbackCommands(cmds: CliCommandDef[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cmds));
}

export function CliMakerView() {
  // Commands List State
  const [commands, setCommands] = useState<CliCommandDef[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Form Fields State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('zap');
  const [category, setCategory] = useState('prompt');
  const [shortcut, setShortcut] = useState('');
  const [radialBind, setRadialBind] = useState<string>('');

  // Dynamic Fields
  const [promptTemplate, setPromptTemplate] = useState('');
  const [promptUseLlm, setPromptUseLlm] = useState(false);
  const [shellCommand, setShellCommand] = useState('');
  const [shellCwd, setShellCwd] = useState('');
  const [viewName, setViewName] = useState('chat');
  const [chainSteps, setChainSteps] = useState<string[]>([]);
  const [pluginLuaCode, setPluginLuaCode] = useState('-- Lua code\nregisterCommand("mycommand", function(args)\n  return args\nend)');

  // Testing & Status State
  const [testArgs, setTestArgs] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [testError, setTestError] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusIsError, setStatusIsError] = useState(false);

  // Import State
  const [importPath, setImportPath] = useState('');

  // Load commands from live API or fallback
  const loadCommands = async () => {
    setLoading(true);
    try {
      const list = await neurodeckApi.cliMaker.list();
      setCommands(list);
    } catch (_) {
      // Offline fallback
      setCommands(getFallbackCommands());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommands();
  }, []);

  const showStatus = (text: string, isErr = false) => {
    setStatusMessage(text);
    setStatusIsError(isErr);
    setTimeout(() => {
      setStatusMessage('');
    }, 5000);
  };

  const handleShortcutKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.key.length === 1) {
      parts.push(e.key.toUpperCase());
    } else if (!['Control', 'Alt', 'Shift'].includes(e.key)) {
      parts.push(e.key);
    }
    setShortcut(parts.join('+'));
  };

  // Helper to compile form state into CliCommandDef
  const gatherDef = (forcedId?: string | null): CliCommandDef => {
    const activeId = forcedId !== undefined ? forcedId : editingId;
    const finalId = activeId || `cmd-${Date.now()}`;
    const cleanName = name.trim() || 'untitled';

    let action: CliAction = { type: 'Prompt', data: { template: '', use_llm: false } };
    if (category === 'prompt') {
      action = { type: 'Prompt', data: { template: promptTemplate, use_llm: promptUseLlm } };
    } else if (category === 'shell') {
      action = { type: 'Shell', data: { command: shellCommand, cwd: shellCwd.trim() || null } };
    } else if (category === 'view') {
      action = { type: 'View', data: { view_name: viewName } };
    } else if (category === 'chain') {
      action = { type: 'Chain', data: { steps: chainSteps } };
    } else if (category === 'plugin') {
      action = { type: 'Plugin', data: { lua_code: pluginLuaCode } };
    }

    return {
      id: finalId,
      name: cleanName,
      description: description.trim(),
      icon,
      category,
      action,
      shortcut: shortcut.trim() || null,
      radial_bind: radialBind ? parseInt(radialBind, 10) : null
    };
  };

  const handleNewCommand = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setIcon('zap');
    setCategory('prompt');
    setShortcut('');
    setRadialBind('');
    setPromptTemplate('');
    setPromptUseLlm(false);
    setShellCommand('');
    setShellCwd('');
    setViewName('chat');
    setChainSteps([]);
    setPluginLuaCode('-- Lua code\nregisterCommand("mycommand", function(args)\n  return args\nend)');
    setTestOutput('');
  };

  const handleEditCommand = (cmd: CliCommandDef) => {
    setEditingId(cmd.id);
    setName(cmd.name);
    setDescription(cmd.description);
    setIcon(cmd.icon || 'zap');
    setCategory(cmd.category);
    setShortcut(cmd.shortcut || '');
    setRadialBind(cmd.radial_bind != null ? String(cmd.radial_bind) : '');

    // Action specific fields
    if (cmd.action.type === 'Prompt') {
      setPromptTemplate(cmd.action.data.template || '');
      setPromptUseLlm(cmd.action.data.use_llm || false);
    } else if (cmd.action.type === 'Shell') {
      setShellCommand(cmd.action.data.command || '');
      setShellCwd(cmd.action.data.cwd || '');
    } else if (cmd.action.type === 'View') {
      setViewName(cmd.action.data.view_name || 'chat');
    } else if (cmd.action.type === 'Chain') {
      setChainSteps(cmd.action.data.steps || []);
    } else if (cmd.action.type === 'Plugin') {
      setPluginLuaCode(cmd.action.data.lua_code || '');
    }
    setTestOutput('');
  };

  const handleSaveCommand = async () => {
    if (!name.trim()) {
      showStatus('Command name is required', true);
      return;
    }
    const def = gatherDef();
    try {
      if (editingId) {
        await neurodeckApi.cliMaker.update(editingId, def);
        showStatus(`Updated command /${def.name}`);
      } else {
        const res = await neurodeckApi.cliMaker.create(def);
        setEditingId(res.id);
        showStatus(`Created command /${def.name}`);
      }
      await loadCommands();
    } catch (_) {
      // Local fallback saving
      const currentFallback = getFallbackCommands();
      let updatedFallback: CliCommandDef[];
      if (editingId) {
        updatedFallback = currentFallback.map(c => c.id === editingId ? def : c);
      } else {
        updatedFallback = [...currentFallback, def];
        setEditingId(def.id);
      }
      saveFallbackCommands(updatedFallback);
      setCommands(updatedFallback);
      showStatus(`Saved locally (Offline Mode): /${def.name}`);
    }
  };

  const handleDeleteCommand = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this command?')) return;
    try {
      await neurodeckApi.cliMaker.delete(id);
      showStatus('Deleted command successfully');
      if (editingId === id) handleNewCommand();
      await loadCommands();
    } catch (_) {
      // Local fallback delete
      const updatedFallback = getFallbackCommands().filter(c => c.id !== id);
      saveFallbackCommands(updatedFallback);
      setCommands(updatedFallback);
      if (editingId === id) handleNewCommand();
      showStatus('Deleted locally (Offline Mode)');
    }
  };

  const handleTestCommand = async () => {
    const def = gatherDef();
    setLoadingTest(true);
    setTestOutput('Executing command...');
    setTestError(false);
    try {
      // Save it first so it exists in backend run environment
      let runId = editingId;
      if (!runId) {
        const res = await neurodeckApi.cliMaker.create(def);
        runId = res.id;
        setEditingId(res.id);
      } else {
        await neurodeckApi.cliMaker.update(runId, def);
      }

      const res = await neurodeckApi.cliMaker.run(runId, testArgs);
      setTestOutput(res.output);
    } catch (err) {
      setTestOutput(String(err));
      setTestError(true);
    } finally {
      setLoadingTest(false);
    }
  };

  const handleCopyLua = async () => {
    if (!editingId) {
      showStatus('Save the command first', true);
      return;
    }
    try {
      const res = await neurodeckApi.cliMaker.exportLua(editingId);
      await navigator.clipboard.writeText(res.lua);
      showStatus('Lua script copied to clipboard');
    } catch (err) {
      showStatus(`Copy failed: ${err}`, true);
    }
  };

  const handleSaveAsPlugin = async () => {
    const def = gatherDef();
    try {
      let runId = editingId;
      if (!runId) {
        const res = await neurodeckApi.cliMaker.create(def);
        runId = res.id;
        setEditingId(res.id);
      }
      const res = await neurodeckApi.cliMaker.saveAsPlugin(runId);
      showStatus(`Saved to plugins: ${res.path.split(/[\\/]/).pop()}`);
    } catch (err) {
      showStatus(`Plugin save failed: ${err}`, true);
    }
  };

  const handleExportScript = async (format: 'sh' | 'py' | 'lua') => {
    const def = gatherDef();
    try {
      let runId = editingId;
      if (!runId) {
        const res = await neurodeckApi.cliMaker.create(def);
        runId = res.id;
        setEditingId(res.id);
      }
      const res = await neurodeckApi.cliMaker.exportScript(runId, format);
      showStatus(`Exported script to: ${res.path}`);
    } catch (err) {
      showStatus(`Export failed: ${err}`, true);
    }
  };

  const handleImportLua = async () => {
    if (!importPath.trim()) {
      showStatus('Please enter a file path', true);
      return;
    }
    try {
      const imported = await neurodeckApi.cliMaker.importLua(importPath.trim());
      showStatus(`Successfully imported ${imported.length} command(s)`);
      setImportPath('');
      await loadCommands();
    } catch (err) {
      showStatus(`Import failed: ${err}`, true);
    }
  };

  // Filter & Search
  const filteredCommands = commands.filter(cmd => {
    const matchesSearch = cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || cmd.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Help Preview Lines
  const getHelpPreview = () => {
    const cmdName = name.trim() || 'mycommand';
    const cmdDesc = description.trim() || '(no description)';
    const lines = [
      'USAGE',
      `  /${cmdName} [OPTIONS]${chainSteps.length ? ' <steps>' : ''} [ARGS...]`,
      '',
      'DESCRIPTION',
      `  ${cmdDesc}`
    ];

    if (shortcut) {
      lines.push('', 'SHORTCUT', `  ${shortcut}`);
    }

    if (radialBind) {
      lines.push('', 'RADIAL BIND', `  Segment #${radialBind}`);
    }

    if (category === 'shell' && shellCommand) {
      lines.push('', 'EXECUTES', `  ${shellCommand}`);
      if (shellCwd) {
        lines.push(`  CWD: ${shellCwd}`);
      }
    }

    return lines.join('\n');
  };

  return (
    <div className="flex h-full flex-col min-h-0 bg-transparent">
      {/* View Header */}
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
            <TerminalSquare className="h-5 w-5 text-nd-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-nd-text">CLI Maker</h2>
            <p className="text-xs text-nd-text-muted">Build custom commands, macros, and plugin scripts</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statusMessage && (
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs border ${
              statusIsError
                ? 'border-nd-danger/30 bg-nd-danger/10 text-nd-danger'
                : 'border-nd-success/30 bg-nd-success/10 text-nd-success'
            }`}>
              {statusIsError ? <AlertCircle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
              <span>{statusMessage}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleNewCommand}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-nd-accent/30 bg-nd-accent/10 px-4 text-sm font-medium text-nd-accent hover:bg-nd-accent/20 transition-all duration-150 cursor-pointer min-h-[40px] min-w-[120px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
          >
            <Plus className="h-4 w-4" /> New Command
          </button>
        </div>
      </div>

      {/* Main Workspace split */}
      <div className="flex flex-1 gap-6 min-h-0">
        {/* Left Side: Commands List */}
        <div className="flex w-80 flex-col gap-3 min-h-0">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-nd-text-muted/65" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search commands..."
              className="w-full h-10 rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 pl-10 pr-4 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40 transition-colors duration-150 min-h-[40px]"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-1">
            {['all', 'prompt', 'shell', 'view', 'chain', 'plugin'].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setCategoryFilter(filter)}
                className={`rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all duration-150 min-h-[30px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
                  categoryFilter === filter
                    ? 'bg-nd-accent/20 text-nd-accent border border-nd-accent/35'
                    : 'bg-nd-surface/30 text-nd-text-muted border border-nd-text-muted/10 hover:border-nd-text-muted/25'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* List container */}
          <div className="flex-1 overflow-y-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/20 p-2 space-y-1.5 scrollbar-thin">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 text-nd-text-muted">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-nd-accent border-t-transparent mb-2" />
                <span className="text-xs">Loading commands...</span>
              </div>
            ) : filteredCommands.length === 0 ? (
              <div className="text-center py-10 text-xs text-nd-text-muted">
                No commands found.
              </div>
            ) : (
              filteredCommands.map((cmd) => (
                <div
                  key={cmd.id}
                  onClick={() => handleEditCommand(cmd)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleEditCommand(cmd)}
                  className={`group relative flex items-center justify-between gap-3 rounded-xl border p-3 cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
                    editingId === cmd.id
                      ? 'border-nd-accent/40 bg-nd-accent/5 shadow-[0_0_10px_rgba(94,235,255,0.05)]'
                      : 'border-nd-text-muted/15 bg-nd-surface/40 hover:border-nd-text-muted/30 hover:bg-nd-surface/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-nd-text-muted/10 bg-nd-bg/60 text-nd-accent">
                      {cmd.category === 'prompt' && <Sparkles className="h-4 w-4" />}
                      {cmd.category === 'shell' && <Command className="h-4 w-4" />}
                      {cmd.category === 'view' && <Globe className="h-4 w-4" />}
                      {cmd.category === 'chain' && <Layers className="h-4 w-4" />}
                      {cmd.category === 'plugin' && <Code className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-nd-text/90">/{cmd.name}</div>
                      <div className="text-[10px] text-nd-text-muted truncate max-w-[160px]">
                        {cmd.description || 'No description'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="rounded px-1.5 py-0.5 text-[9px] font-medium bg-nd-bg text-nd-text-muted uppercase">
                      {cmd.category}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCommand(cmd.id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-nd-danger p-1 transition-all duration-150 min-w-[30px] min-h-[30px] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-danger/40"
                      aria-label="Delete command"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Form Editor */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 min-w-0 scrollbar-thin">
          {/* Card 1: Command Profile */}
          <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-nd-text-muted flex items-center gap-2">
              <Settings className="h-4 w-4" /> Command Profile
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-nd-text-muted">Command Trigger</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-sm font-semibold text-nd-text-muted">/</span>
                  <input
                    type="text"
                    aria-label="Command trigger"
                    value={name}
                    onChange={(e) => setName(e.target.value.replace(/\s+/g, '-').toLowerCase())}
                    placeholder="my-command"
                    className="w-full h-10 rounded-xl border border-nd-text-muted/15 bg-nd-bg/50 pl-6 pr-4 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40 min-h-[40px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-nd-text-muted">Short Description</label>
                <input
                  type="text"
                  aria-label="Short description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this command do?"
                  className="w-full h-10 rounded-xl border border-nd-text-muted/15 bg-nd-bg/50 px-3.5 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40 min-h-[40px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-nd-text-muted">Action Category</label>
                <select
                  aria-label="Action category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 rounded-xl border border-nd-text-muted/15 bg-nd-bg/50 px-3 text-sm text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 min-h-[40px]"
                >
                  <option value="prompt">AI Prompt Template</option>
                  <option value="shell">Shell Command</option>
                  <option value="view">View Switcher</option>
                  <option value="chain">Command Chain</option>
                  <option value="plugin">Lua Plugin Script</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-nd-text-muted">Radial Bind (Menu Slot)</label>
                <select
                  aria-label="Radial menu bind slot"
                  value={radialBind}
                  onChange={(e) => setRadialBind(e.target.value)}
                  className="w-full h-10 rounded-xl border border-nd-text-muted/15 bg-nd-bg/50 px-3 text-sm text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 min-h-[40px]"
                >
                  <option value="">No Radial Bind</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>Slot {i + 1}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-nd-text-muted">Shortcut Hotkey</label>
                <input
                  type="text"
                  aria-label="Shortcut hotkey"
                  value={shortcut}
                  onKeyDown={handleShortcutKeyDown}
                  onChange={(e) => setShortcut(e.target.value)}
                  placeholder="Click to type hotkey (e.g. Ctrl+Alt+N)"
                  className="w-full h-10 rounded-xl border border-nd-text-muted/15 bg-nd-bg/50 px-3.5 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40 min-h-[40px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-nd-text-muted">Command Icon</label>
                <select
                  aria-label="Command icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="w-full h-10 rounded-xl border border-nd-text-muted/15 bg-nd-bg/50 px-3 text-sm text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 min-h-[40px]"
                >
                  {AVAILABLE_ICONS.map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Action Details */}
          <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-nd-text-muted flex items-center gap-2">
              <Code className="h-4 w-4" /> Action Implementation
            </h3>

            {category === 'prompt' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-nd-text-muted">Prompt Template</label>
                  <textarea
                    value={promptTemplate}
                    onChange={(e) => setPromptTemplate(e.target.value)}
                    placeholder="Enter prompt content. Use {{input}} to insert custom runner arguments at runtime."
                    rows={4}
                    aria-label="Prompt template"
                    className="w-full rounded-xl border border-nd-text-muted/15 bg-nd-bg/50 p-3 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40 resize-none"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={promptUseLlm}
                    onChange={(e) => setPromptUseLlm(e.target.checked)}
                    className="rounded border-nd-text-muted/30 bg-nd-bg/60 text-nd-accent focus-visible:ring-2 focus-visible:ring-nd-accent/40 focus:ring-nd-accent/30 h-4 w-4"
                  />
                  <span className="text-xs text-nd-text-muted">Send output directly to LLM for response streaming</span>
                </label>
              </div>
            )}

            {category === 'shell' && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-nd-text-muted">Shell Command</label>
                    <input
                      type="text"
                      value={shellCommand}
                      onChange={(e) => setShellCommand(e.target.value)}
                      placeholder="e.g. git status or node build.js"
                      aria-label="Shell command"
                      className="w-full h-10 rounded-xl border border-nd-text-muted/15 bg-nd-bg/50 px-3.5 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40 min-h-[40px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-nd-text-muted">Working Directory (CWD - Optional)</label>
                    <input
                      type="text"
                      value={shellCwd}
                      onChange={(e) => setShellCwd(e.target.value)}
                      placeholder="Absolute path, or blank for default workspace"
                      aria-label="Working directory"
                      className="w-full h-10 rounded-xl border border-nd-text-muted/15 bg-nd-bg/50 px-3.5 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40 min-h-[40px]"
                    />
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-xl border border-nd-warning/20 bg-nd-warning/5 p-3 text-xs text-nd-warning/90">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Shell commands are executed directly on the host machine. Ensure you audit inputs properly. Use <code>"&#123;&#123;input&#125;&#125;"</code> to safely pass runner arguments.</span>
                </div>
              </div>
            )}

            {category === 'view' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-nd-text-muted">Target Screen View</label>
                <select
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  aria-label="Target screen view"
                  className="w-full h-10 rounded-xl border border-nd-text-muted/15 bg-nd-bg/50 px-3 text-sm text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 min-h-[40px]"
                >
                  {['chat', 'canvas', 'terminal', 'ssh', 'tunnel', 'share', 'browser', 'agent', 'memory',
                    'prompt-lab', 'remote', 'docs', 'git', 'api-lab', 'cli-maker', 'graph', 'scheduler',
                    'workflow', 'ide', 'orchestrator'].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            )}

            {category === 'chain' && (
              <div className="space-y-3">
                <label className="text-xs font-medium text-nd-text-muted">Step Sequences</label>
                <div className="space-y-2">
                  {chainSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-nd-text-muted font-mono w-6">#{idx + 1}</span>
                      <select
                        value={step}
                        onChange={(e) => {
                          const nextSteps = [...chainSteps];
                          nextSteps[idx] = e.target.value;
                          setChainSteps(nextSteps);
                        }}
                        aria-label={`Chain step ${idx + 1}`}
                        className="flex-1 h-9 rounded-xl border border-nd-text-muted/15 bg-nd-bg/50 px-3 text-xs text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                      >
                        <option value="">Select Command...</option>
                        {commands.filter(c => c.id !== editingId).map(c => (
                          <option key={c.id} value={c.id}>/{c.name} ({c.description || 'No description'})</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setChainSteps(chainSteps.filter((_, i) => i !== idx))}
                        aria-label={`Remove chain step ${idx + 1}`}
                        className="rounded-lg border border-nd-danger/30 text-nd-danger hover:bg-nd-danger/10 px-2 py-1.5 text-xs transition duration-150 min-w-[30px] min-h-[30px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-danger/40"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setChainSteps([...chainSteps, ''])}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 text-xs text-nd-text-muted hover:border-nd-accent/25 hover:text-nd-accent transition duration-150 min-h-[35px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Chain Step
                </button>
              </div>
            )}

            {category === 'plugin' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-nd-text-muted">Lua Code Snippet</label>
                <textarea
                  value={pluginLuaCode}
                  onChange={(e) => setPluginLuaCode(e.target.value)}
                  rows={8}
                  spellCheck={false}
                  aria-label="Lua code snippet"
                  className="w-full rounded-xl border border-nd-text-muted/15 bg-nd-bg/50 p-3 font-mono text-xs text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40 resize-none"
                />
              </div>
            )}
          </div>

          {/* Card 3: Save, Test, and Export Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Left Actions: Save and Test */}
            <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-nd-text-muted flex items-center gap-2">
                <Play className="h-4 w-4" /> Save &amp; Run Test
              </h3>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveCommand}
                  className="flex-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-nd-success/30 bg-nd-success/10 px-4 text-sm font-semibold text-nd-success hover:bg-nd-success/20 transition-all duration-150 cursor-pointer min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  <Save className="h-4 w-4" /> Save Command
                </button>
              </div>

              <div className="space-y-3 pt-2 border-t border-nd-text-muted/10">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-nd-text-muted">Test Input Args</label>
                  <input
                    type="text"
                    value={testArgs}
                    onChange={(e) => setTestArgs(e.target.value)}
                    placeholder="Arguments passed to {{input}}"
                    aria-label="Test input args"
                    className="w-full h-10 rounded-xl border border-nd-text-muted/15 bg-nd-bg/50 px-3.5 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40 min-h-[40px]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleTestCommand}
                  disabled={loadingTest}
                  className="w-full inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-nd-accent/30 bg-nd-accent/10 px-4 text-sm font-semibold text-nd-accent hover:bg-nd-accent/20 transition-all duration-150 cursor-pointer disabled:opacity-50 min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  {loadingTest ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-nd-accent border-t-transparent" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Run Test
                </button>
              </div>
            </div>

            {/* Right Actions: Export and Imports */}
            <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-nd-text-muted flex items-center gap-2">
                <Folder className="h-4 w-4" /> Import &amp; Export
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyLua}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-nd-text-muted/15 bg-nd-bg/50 px-3 text-xs text-nd-text-muted hover:border-nd-accent/25 hover:text-nd-accent transition duration-150 min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                  aria-label="Copy Lua wrapper to clipboard"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy Lua
                </button>
                <button
                  type="button"
                  onClick={handleSaveAsPlugin}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-nd-text-muted/15 bg-nd-bg/50 px-3 text-xs text-nd-text-muted hover:border-nd-accent/25 hover:text-nd-accent transition duration-150 min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                  aria-label="Save wrapper to sidecar plugins"
                >
                  <Code className="h-3.5 w-3.5" aria-hidden="true" /> Save Plugin
                </button>
              </div>

              {/* Export Script */}
              <div className="flex gap-2">
                <select
                  id="export-script-format"
                  defaultValue="sh"
                  aria-label="Export script format"
                  className="w-24 h-10 rounded-xl border border-nd-text-muted/15 bg-nd-bg/50 px-2 text-xs text-nd-text outline-none focus:border-nd-accent/40 min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  <option value="sh">Bash (.sh)</option>
                  <option value="py">Python (.py)</option>
                  <option value="lua">Lua (.lua)</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const sel = document.getElementById('export-script-format') as HTMLSelectElement;
                    handleExportScript((sel?.value || 'sh') as 'sh' | 'py' | 'lua');
                  }}
                  className="flex-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-nd-text-muted/15 bg-nd-bg/50 px-3 text-xs text-nd-text hover:border-nd-accent/25 hover:text-nd-accent transition duration-150 min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  Export Standalone Script
                </button>
              </div>

              {/* Import Lua */}
              <div className="space-y-1.5 pt-2 border-t border-nd-text-muted/10 flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-medium text-nd-text-muted">Import from Lua File</label>
                  <input
                    type="text"
                    value={importPath}
                    onChange={(e) => setImportPath(e.target.value)}
                    placeholder="Absolute file path on host..."
                    className="w-full h-10 rounded-xl border border-nd-text-muted/15 bg-nd-bg/50 px-3.5 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40 min-h-[40px]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleImportLua}
                  className="inline-flex h-10 items-center gap-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 text-xs text-nd-text-muted hover:border-nd-accent/25 hover:text-nd-accent transition duration-150 min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  <Upload className="h-3.5 w-3.5" /> Import
                </button>
              </div>
            </div>
          </div>

          {/* Card 4: Help Preview & Output Terminal */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Help Preview */}
            <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-5 space-y-2 flex flex-col h-64">
              <h3 className="text-xs font-bold uppercase tracking-wider text-nd-text-muted flex items-center gap-2 shrink-0">
                <HelpCircle className="h-4 w-4" /> Command Help Preview
              </h3>
              <pre className="flex-1 overflow-auto rounded-xl bg-nd-bg/40 p-3 font-mono text-[11px] text-nd-text-muted leading-relaxed select-text whitespace-pre scrollbar-thin">
                {getHelpPreview()}
              </pre>
            </div>

            {/* Test Run Output */}
            <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-5 space-y-2 flex flex-col h-64">
              <h3 className="text-xs font-bold uppercase tracking-wider text-nd-text-muted flex items-center gap-2 shrink-0">
                <Activity className="h-4 w-4" /> Test Execution Output
              </h3>
              <pre className={`flex-1 overflow-auto rounded-xl bg-nd-bg/40 p-3 font-mono text-[11px] leading-relaxed select-text whitespace-pre-wrap scrollbar-thin ${
                testError ? 'text-nd-danger' : 'text-nd-success'
              }`}>
                {testOutput || 'No execution outputs recorded yet. Fill out parameters and click "Run Test".'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
