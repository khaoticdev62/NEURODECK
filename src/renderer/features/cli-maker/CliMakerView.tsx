import { useState, useEffect, useCallback } from "react";
import {
  TerminalSquare,
  Plus,
  Copy,
  Play,
  Trash2,
  Save,
  Upload,
  Code,
  Sparkles,
  Command,
  Check,
  AlertCircle,
  Globe,
  Layers,
} from "lucide-react";
import { neurodeckApi } from "../../services/bridgeAdapter";
import type { CliCommandDef, CliAction } from "../../types/neurodeck";
import { ConfirmDialog } from "../../components/primitives/ConfirmDialog";
import { Button } from "../../components/primitives/Button";
import { IconButton } from "../../components/primitives/IconButton";
import { TextInput } from "../../components/primitives/TextInput";
import { Select } from "../../components/primitives/Select";
import { Badge } from "../../components/primitives/Badge";
import { Panel } from "../../components/primitives/Panel";
import { EmptyState } from "../../components/primitives/EmptyState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { LoadingState } from "../../components/primitives/LoadingState";
import { Toggle } from "../../components/primitives/Toggle";

const LOCAL_STORAGE_KEY = "neurodeck:cli_commands_fallback";

const AVAILABLE_ICONS = [
  "zap",
  "message-square",
  "code-2",
  "terminal",
  "server",
  "route",
  "globe",
  "bot",
  "brain",
  "share-2",
  "panel-right-open",
  "sparkles",
  "file-text",
  "git-branch",
  "send",
  "copy",
  "play",
  "settings-2",
  "search",
  "trash-2",
  "cpu",
  "layers",
  "box",
  "rocket",
  "activity",
];

const CATEGORIES = ["all", "prompt", "shell", "view", "chain", "plugin"];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  prompt: <Sparkles className="h-4 w-4" aria-hidden="true" />,
  shell: <Command className="h-4 w-4" aria-hidden="true" />,
  view: <Globe className="h-4 w-4" aria-hidden="true" />,
  chain: <Layers className="h-4 w-4" aria-hidden="true" />,
  plugin: <Code className="h-4 w-4" aria-hidden="true" />,
};

const VIEW_OPTIONS = [
  "chat",
  "canvas",
  "terminal",
  "ssh",
  "tunnel",
  "share",
  "browser",
  "agent",
  "memory",
  "prompt-lab",
  "remote",
  "docs",
  "git",
  "api-lab",
  "cli-maker",
  "graph",
  "scheduler",
  "workflow",
  "ide",
  "orchestrator",
].map((v) => ({ value: v, label: v }));

const CATEGORY_OPTIONS = [
  { value: "prompt", label: "AI Prompt Template" },
  { value: "shell", label: "Shell Command" },
  { value: "view", label: "View Switcher" },
  { value: "chain", label: "Command Chain" },
  { value: "plugin", label: "Lua Plugin Script" },
];

const ICON_OPTIONS = AVAILABLE_ICONS.map((i) => ({ value: i, label: i }));

function getFallbackCommands(): CliCommandDef[] {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (_) {}
  }
  return [
    {
      id: "cmd-hello",
      name: "hello",
      description: "Say hello to NEURODECK",
      icon: "zap",
      category: "prompt",
      action: {
        type: "Prompt",
        data: { template: "Hello user, welcome to NEURODECK!", use_llm: false },
      },
      shortcut: "Ctrl+H",
      radial_bind: 1,
    },
    {
      id: "cmd-status",
      name: "status",
      description: "Check sidecar system health",
      icon: "activity",
      category: "shell",
      action: { type: "Shell", data: { command: "get_system_health", cwd: null } },
      shortcut: null,
      radial_bind: null,
    },
  ];
}

function saveFallbackCommands(cmds: CliCommandDef[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cmds));
}

export function CliMakerView() {
  const [commands, setCommands] = useState<CliCommandDef[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("zap");
  const [category, setCategory] = useState("prompt");
  const [shortcut, setShortcut] = useState("");
  const [radialBind, setRadialBind] = useState<string>("");

  const [promptTemplate, setPromptTemplate] = useState("");
  const [promptUseLlm, setPromptUseLlm] = useState(false);
  const [shellCommand, setShellCommand] = useState("");
  const [shellCwd, setShellCwd] = useState("");
  const [viewName, setViewName] = useState("chat");
  const [chainSteps, setChainSteps] = useState<string[]>([]);
  const [pluginLuaCode, setPluginLuaCode] = useState(
    '-- Lua code\nregisterCommand("mycommand", function(args)\n  return args\nend)'
  );

  const [testArgs, setTestArgs] = useState("");
  const [testOutput, setTestOutput] = useState("");
  const [testError, setTestError] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusIsError, setStatusIsError] = useState(false);

  const [importPath, setImportPath] = useState("");
  const [exportFormat, setExportFormat] = useState<"sh" | "py" | "lua">("sh");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadCommands = useCallback(async () => {
    setLoading(true);
    try {
      const list = await neurodeckApi.cliMaker.list();
      setCommands(list);
      setLoadError(null);
    } catch (_) {
      setLoadError("Could not reach the sidecar. Showing locally saved commands.");
      setCommands(getFallbackCommands());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCommands();
  }, [loadCommands]);

  const showStatus = (text: string, isErr = false) => {
    setStatusMessage(text);
    setStatusIsError(isErr);
    setTimeout(() => {
      setStatusMessage("");
    }, 5000);
  };

  const handleShortcutKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const parts: string[] = [];
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");
    if (e.key.length === 1) {
      parts.push(e.key.toUpperCase());
    } else if (!["Control", "Alt", "Shift"].includes(e.key)) {
      parts.push(e.key);
    }
    setShortcut(parts.join("+"));
  };

  const gatherDef = (forcedId?: string | null): CliCommandDef => {
    const activeId = forcedId !== undefined ? forcedId : editingId;
    const finalId = activeId || `cmd-${Date.now()}`;
    const cleanName = name.trim() || "untitled";

    let action: CliAction = { type: "Prompt", data: { template: "", use_llm: false } };
    if (category === "prompt") {
      action = { type: "Prompt", data: { template: promptTemplate, use_llm: promptUseLlm } };
    } else if (category === "shell") {
      action = { type: "Shell", data: { command: shellCommand, cwd: shellCwd.trim() || null } };
    } else if (category === "view") {
      action = { type: "View", data: { view_name: viewName } };
    } else if (category === "chain") {
      action = { type: "Chain", data: { steps: chainSteps } };
    } else if (category === "plugin") {
      action = { type: "Plugin", data: { lua_code: pluginLuaCode } };
    }

    return {
      id: finalId,
      name: cleanName,
      description: description.trim(),
      icon,
      category,
      action,
      shortcut: shortcut.trim() || null,
      radial_bind: radialBind ? parseInt(radialBind, 10) : null,
    };
  };

  const handleNewCommand = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setIcon("zap");
    setCategory("prompt");
    setShortcut("");
    setRadialBind("");
    setPromptTemplate("");
    setPromptUseLlm(false);
    setShellCommand("");
    setShellCwd("");
    setViewName("chat");
    setChainSteps([]);
    setPluginLuaCode(
      '-- Lua code\nregisterCommand("mycommand", function(args)\n  return args\nend)'
    );
    setTestOutput("");
  };

  const handleEditCommand = (cmd: CliCommandDef) => {
    setEditingId(cmd.id);
    setName(cmd.name);
    setDescription(cmd.description);
    setIcon(cmd.icon || "zap");
    setCategory(cmd.category);
    setShortcut(cmd.shortcut || "");
    setRadialBind(cmd.radial_bind != null ? String(cmd.radial_bind) : "");

    if (cmd.action.type === "Prompt") {
      setPromptTemplate(cmd.action.data.template || "");
      setPromptUseLlm(cmd.action.data.use_llm || false);
    } else if (cmd.action.type === "Shell") {
      setShellCommand(cmd.action.data.command || "");
      setShellCwd(cmd.action.data.cwd || "");
    } else if (cmd.action.type === "View") {
      setViewName(cmd.action.data.view_name || "chat");
    } else if (cmd.action.type === "Chain") {
      setChainSteps(cmd.action.data.steps || []);
    } else if (cmd.action.type === "Plugin") {
      setPluginLuaCode(cmd.action.data.lua_code || "");
    }
    setTestOutput("");
  };

  const handleSaveCommand = async () => {
    if (!name.trim()) {
      showStatus("Command name is required", true);
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
      const currentFallback = getFallbackCommands();
      let updatedFallback: CliCommandDef[];
      if (editingId) {
        updatedFallback = currentFallback.map((c) => (c.id === editingId ? def : c));
      } else {
        updatedFallback = [...currentFallback, def];
        setEditingId(def.id);
      }
      saveFallbackCommands(updatedFallback);
      setCommands(updatedFallback);
      showStatus(`Saved locally (Offline Mode): /${def.name}`);
    }
  };

  const handleDeleteCommand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const confirmDeleteCommand = async () => {
    const id = confirmDeleteId;
    if (!id) return;
    setConfirmDeleteId(null);
    try {
      await neurodeckApi.cliMaker.delete(id);
      showStatus("Deleted command successfully");
      if (editingId === id) handleNewCommand();
      await loadCommands();
    } catch (_) {
      const updatedFallback = getFallbackCommands().filter((c) => c.id !== id);
      saveFallbackCommands(updatedFallback);
      setCommands(updatedFallback);
      if (editingId === id) handleNewCommand();
      showStatus("Deleted locally (Offline Mode)");
    }
  };

  const handleTestCommand = async () => {
    const def = gatherDef();
    setLoadingTest(true);
    setTestOutput("Executing command...");
    setTestError(false);
    try {
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
      showStatus("Save the command first", true);
      return;
    }
    try {
      const res = await neurodeckApi.cliMaker.exportLua(editingId);
      await navigator.clipboard.writeText(res.lua);
      showStatus("Lua script copied to clipboard");
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

  const handleExportScript = async (format: "sh" | "py" | "lua") => {
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

  const handleImportLua = async (overridePath?: string) => {
    const path = (overridePath ?? importPath).trim();
    if (!path) {
      showStatus("Please enter a file path", true);
      return;
    }
    try {
      const imported = await neurodeckApi.cliMaker.importLua(path);
      showStatus(`Successfully imported ${imported.length} command(s)`);
      setImportPath("");
      await loadCommands();
      if (imported.length > 0) handleEditCommand(imported[0]);
    } catch (err) {
      showStatus(`Import failed: ${err}`, true);
    }
  };

  const handleBrowseImport = async () => {
    const api = (
      window as unknown as {
        electronAPI?: {
          showOpenDialog?: (opts: unknown) => Promise<{ canceled: boolean; filePaths: string[] }>;
        };
      }
    ).electronAPI;
    if (!api?.showOpenDialog) {
      showStatus("File picker unavailable — enter path manually", true);
      return;
    }
    const result = await api.showOpenDialog({
      title: "Import Lua Plugin",
      properties: ["openFile"],
      filters: [
        { name: "Lua Scripts", extensions: ["lua"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (result.canceled || !result.filePaths?.[0]) return;
    await handleImportLua(result.filePaths[0]);
  };

  const filteredCommands = commands.filter((cmd) => {
    const matchesSearch =
      cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || cmd.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getHelpPreview = () => {
    const cmdName = name.trim() || "mycommand";
    const cmdDesc = description.trim() || "(no description)";
    const lines = [
      "USAGE",
      `  /${cmdName} [OPTIONS]${chainSteps.length ? " <steps>" : ""} [ARGS...]`,
      "",
      "DESCRIPTION",
      `  ${cmdDesc}`,
    ];

    if (shortcut) {
      lines.push("", "SHORTCUT", `  ${shortcut}`);
    }

    if (radialBind) {
      lines.push("", "RADIAL BIND", `  Segment #${radialBind}`);
    }

    if (category === "shell" && shellCommand) {
      lines.push("", "EXECUTES", `  ${shellCommand}`);
      if (shellCwd) {
        lines.push(`  CWD: ${shellCwd}`);
      }
    }

    return lines.join("\n");
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <header className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-nd-accent-primary/20 bg-nd-accent-primary/10">
            <TerminalSquare className="h-5 w-5 text-nd-accent-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">
              CLI Maker
            </p>
            <h2 className="text-lg font-semibold text-nd-text-primary">Command Builder</h2>
            <p className="text-xs text-nd-text-muted">
              Build custom commands, macros, and plugin scripts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statusMessage && (
            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                statusIsError
                  ? "border-nd-accent-error/30 bg-nd-accent-error/10 text-nd-accent-error"
                  : "border-nd-accent-success/30 bg-nd-accent-success/10 text-nd-accent-success"
              }`}
            >
              {statusIsError ? (
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{statusMessage}</span>
            </div>
          )}
          <Button variant="primary" onClick={handleNewCommand} icon={Plus}>
            New Command
          </Button>
        </div>
      </header>

      <div className="flex flex-1 gap-4 min-h-0">
        <aside className="flex w-80 flex-col gap-3 min-h-0">
          <TextInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commands..."
            className="w-full"
          />

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setCategoryFilter(filter)}
                className={`rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition min-h-touch min-w-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 ${
                  categoryFilter === filter
                    ? "border-nd-accent-primary/40 bg-nd-accent-primary/15 text-nd-accent-primary"
                    : "border-nd-border-subtle bg-nd-surface-secondary text-nd-text-muted hover:border-nd-border-strong"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <Panel className="flex-1 min-h-0 overflow-hidden">
            <div className="h-full overflow-y-auto space-y-2 p-3">
              {loadError && (
                <ErrorState
                  title="Sidecar unavailable"
                  message={loadError}
                  onRetry={() => void loadCommands()}
                  retryLabel="Retry"
                  fullHeight={false}
                />
              )}
              {loading ? (
                <LoadingState label="Loading commands..." />
              ) : filteredCommands.length === 0 ? (
                <EmptyState
                  icon={TerminalSquare}
                  title="No commands found"
                  description="Create a new command or adjust your search/filter."
                  compact
                  className="h-full"
                />
              ) : (
                filteredCommands.map((cmd) => (
                  <div
                    key={cmd.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={editingId === cmd.id}
                    aria-label={`Edit command /${cmd.name}`}
                    onClick={() => handleEditCommand(cmd)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleEditCommand(cmd);
                      }
                    }}
                    className={`group relative flex items-center justify-between gap-3 rounded-xl border p-3 cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 ${
                      editingId === cmd.id
                        ? "border-nd-accent-primary/40 bg-nd-accent-primary/5"
                        : "border-nd-border-subtle bg-nd-surface-secondary hover:border-nd-border-strong hover:bg-nd-surface-tertiary"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-nd-border-subtle bg-nd-surface-app text-nd-accent-primary">
                        {CATEGORY_ICONS[cmd.category] ?? (
                          <TerminalSquare className="h-4 w-4" aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-nd-text-primary">/{cmd.name}</div>
                        <div className="text-[10px] text-nd-text-muted truncate max-w-[160px]">
                          {cmd.description || "No description"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge tone="neutral" variant="outline" size="sm">
                        {cmd.category}
                      </Badge>
                      <IconButton
                        aria-label="Delete command"
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        onClick={(e) => handleDeleteCommand(cmd.id, e)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-nd-accent-error" aria-hidden="true" />
                      </IconButton>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </aside>

        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 min-w-0">
          <Panel eyebrow="Profile" title="Command Profile">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-nd-text-muted" htmlFor="cli-name">
                  Command Trigger
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-sm font-semibold text-nd-text-muted">/</span>
                  <input
                    id="cli-name"
                    type="text"
                    aria-label="Command trigger"
                    value={name}
                    onChange={(e) => setName(e.target.value.replace(/\s+/g, "-").toLowerCase())}
                    placeholder="my-command"
                    className="w-full h-10 rounded-xl border border-nd-border-subtle bg-nd-surface-app pl-6 pr-4 text-sm text-nd-text-primary outline-none focus:border-nd-accent-primary/40 focus-visible:ring-1 focus-visible:ring-nd-accent-primary/40 min-h-touch"
                  />
                </div>
              </div>

              <TextInput
                id="cli-description"
                label="Short Description"
                aria-label="Short description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this command do?"
              />

              <Select
                label="Action Category"
                aria-label="Action category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={CATEGORY_OPTIONS}
              />

              <Select
                label="Radial Bind"
                aria-label="Radial menu bind slot"
                value={radialBind}
                onChange={(e) => setRadialBind(e.target.value)}
                options={[
                  { value: "", label: "No Radial Bind" },
                  ...Array.from({ length: 12 }, (_, i) => ({
                    value: String(i + 1),
                    label: `Slot ${i + 1}`,
                  })),
                ]}
              />

              <TextInput
                label="Shortcut Hotkey"
                aria-label="Shortcut hotkey"
                value={shortcut}
                onKeyDown={handleShortcutKeyDown}
                onChange={(e) => setShortcut(e.target.value)}
                placeholder="Click to type hotkey"
              />

              <Select
                label="Command Icon"
                aria-label="Command icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                options={ICON_OPTIONS}
              />
            </div>
          </Panel>

          <Panel eyebrow="Implementation" title="Action Details">
            {category === "prompt" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="cli-prompt" className="text-xs font-medium text-nd-text-muted">
                    Prompt Template
                  </label>
                  <textarea
                    id="cli-prompt"
                    value={promptTemplate}
                    onChange={(e) => setPromptTemplate(e.target.value)}
                    placeholder="Enter prompt content. Use {{input}} to insert custom runner arguments at runtime."
                    rows={4}
                    aria-label="Prompt template"
                    className="w-full rounded-xl border border-nd-border-subtle bg-nd-surface-app p-3 text-sm text-nd-text-primary outline-none focus:border-nd-accent-primary/40 focus-visible:ring-1 focus-visible:ring-nd-accent-primary/40 resize-none"
                  />
                </div>
                <Toggle
                  checked={promptUseLlm}
                  onChange={() => setPromptUseLlm((v) => !v)}
                  label="Send output directly to LLM for response streaming"
                />
              </div>
            )}

            {category === "shell" && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput
                    label="Shell Command"
                    aria-label="Shell command"
                    value={shellCommand}
                    onChange={(e) => setShellCommand(e.target.value)}
                    placeholder="e.g. git status or node build.js"
                  />
                  <TextInput
                    label="Working Directory (optional)"
                    aria-label="Working directory"
                    value={shellCwd}
                    onChange={(e) => setShellCwd(e.target.value)}
                    placeholder="Absolute path, or blank for default workspace"
                  />
                </div>
                <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-nd-accent-warning/20 bg-nd-accent-warning/5 p-3 text-xs text-nd-accent-warning/90">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    Shell commands are executed directly on the host machine. Ensure you audit
                    inputs properly. Use <code className="font-mono">{"{{input}}"}</code> to safely
                    pass runner arguments.
                  </span>
                </div>
              </div>
            )}

            {category === "view" && (
              <Select
                label="Target Screen View"
                aria-label="Target screen view"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                options={VIEW_OPTIONS}
              />
            )}

            {category === "chain" && (
              <div className="space-y-3">
                <label className="text-xs font-medium text-nd-text-muted">Step Sequences</label>
                <div className="space-y-2">
                  {chainSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-nd-text-muted font-mono w-6">#{idx + 1}</span>
                      <Select
                        aria-label={`Chain step ${idx + 1}`}
                        value={step}
                        onChange={(e) => {
                          const nextSteps = [...chainSteps];
                          nextSteps[idx] = e.target.value;
                          setChainSteps(nextSteps);
                        }}
                        options={[
                          { value: "", label: "Select Command..." },
                          ...commands
                            .filter((c) => c.id !== editingId)
                            .map((c) => ({
                              value: c.id,
                              label: `/${c.name} (${c.description || "No description"})`,
                            })),
                        ]}
                        className="flex-1"
                      />
                      <IconButton
                        aria-label={`Remove chain step ${idx + 1}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => setChainSteps(chainSteps.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-nd-accent-error" aria-hidden="true" />
                      </IconButton>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setChainSteps([...chainSteps, ""])}
                  icon={Plus}
                >
                  Add Chain Step
                </Button>
              </div>
            )}

            {category === "plugin" && (
              <div className="space-y-1.5">
                <label htmlFor="cli-lua" className="text-xs font-medium text-nd-text-muted">
                  Lua Code Snippet
                </label>
                <textarea
                  id="cli-lua"
                  value={pluginLuaCode}
                  onChange={(e) => setPluginLuaCode(e.target.value)}
                  rows={8}
                  spellCheck={false}
                  aria-label="Lua code snippet"
                  className="w-full rounded-xl border border-nd-border-subtle bg-nd-surface-app p-3 font-mono text-xs text-nd-text-primary outline-none focus:border-nd-accent-primary/40 focus-visible:ring-1 focus-visible:ring-nd-accent-primary/40 resize-none"
                />
              </div>
            )}
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel eyebrow="Test" title="Save & Run Test">
              <div className="space-y-4">
                <Button variant="success" fullWidth onClick={handleSaveCommand} icon={Save}>
                  Save Command
                </Button>

                <div className="space-y-3 pt-4 border-t border-nd-border-subtle">
                  <TextInput
                    label="Test Input Args"
                    aria-label="Test input args"
                    value={testArgs}
                    onChange={(e) => setTestArgs(e.target.value)}
                    placeholder="Arguments passed to {{input}}"
                  />
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleTestCommand}
                    loading={loadingTest}
                    icon={Play}
                  >
                    Run Test
                  </Button>
                </div>
              </div>
            </Panel>

            <Panel eyebrow="Share" title="Import & Export">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" size="sm" onClick={handleCopyLua} icon={Copy}>
                    Copy Lua
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleSaveAsPlugin} icon={Code}>
                    Save Plugin
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Select
                    aria-label="Export script format"
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as "sh" | "py" | "lua")}
                    options={[
                      { value: "sh", label: "Bash (.sh)" },
                      { value: "py", label: "Python (.py)" },
                      { value: "lua", label: "Lua (.lua)" },
                    ]}
                    className="w-28"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => handleExportScript(exportFormat)}
                  >
                    Export Script
                  </Button>
                </div>

                <div className="space-y-2 pt-4 border-t border-nd-border-subtle">
                  <label
                    htmlFor="cli-import-path"
                    className="text-[10px] font-medium uppercase tracking-wider text-nd-text-muted"
                  >
                    Import from Lua File
                  </label>
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    onClick={() => void handleBrowseImport()}
                    icon={Upload}
                  >
                    Browse & Import Lua
                  </Button>
                  <div className="flex gap-2 items-center">
                    <TextInput
                      id="cli-import-path"
                      value={importPath}
                      onChange={(e) => setImportPath(e.target.value)}
                      placeholder="Or paste absolute file path..."
                      className="flex-1"
                    />
                    <Button variant="secondary" size="sm" onClick={() => void handleImportLua()}>
                      Import
                    </Button>
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel eyebrow="Help" title="Command Help Preview" className="h-64 flex flex-col">
              <pre className="flex-1 overflow-auto rounded-xl bg-nd-surface-app p-3 font-mono text-[11px] text-nd-text-muted leading-relaxed select-text whitespace-pre">
                {getHelpPreview()}
              </pre>
            </Panel>

            <Panel eyebrow="Output" title="Test Execution Output" className="h-64 flex flex-col">
              <pre
                className={`flex-1 overflow-auto rounded-xl bg-nd-surface-app p-3 font-mono text-[11px] leading-relaxed select-text whitespace-pre-wrap ${
                  testError ? "text-nd-accent-error" : "text-nd-accent-success"
                }`}
              >
                {testOutput ||
                  'No execution outputs recorded yet. Fill out parameters and click "Run Test".'}
              </pre>
            </Panel>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete command?"
        message={`Remove '${confirmDeleteId ?? ""}' permanently. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => void confirmDeleteCommand()}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
