import { useCallback, useState } from "react";
import { Bot, X } from "lucide-react";
import { neurodeckApi } from "../../services/bridgeAdapter";
import type { AIProvider } from "../../types/neurodeck";
import { Button } from "../../components/primitives/Button";
import { ConfirmDialog } from "../../components/primitives/ConfirmDialog";
import { FocusTrapContainer } from "../../components/primitives/FocusTrapContainer";
import { Select } from "../../components/primitives/Select";
import { TextInput } from "../../components/primitives/TextInput";
import { Toggle } from "../../components/primitives/Toggle";

type AgentTool = "code_exec" | "browser" | "shell" | "file_access" | "memory_write" | "api_call";
type PermissionScope = "read_only" | "standard" | "elevated" | "unrestricted";

const TOOLS: { id: AgentTool; label: string; description: string }[] = [
  { id: "code_exec", label: "Code Execution", description: "Run code in a sandbox" },
  { id: "browser", label: "Browser Control", description: "Navigate and interact with web pages" },
  { id: "shell", label: "Shell Commands", description: "Execute terminal commands" },
  { id: "file_access", label: "File Access", description: "Read and write files" },
  { id: "memory_write", label: "Memory Write", description: "Save facts to vector memory" },
  { id: "api_call", label: "External APIs", description: "Make outbound HTTP requests" },
];

const MODEL_OPTIONS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "llama3.2", label: "Llama 3.2 (Local)" },
  { value: "mistral", label: "Mistral 7B (Local)" },
];

const RUNTIME_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "sandboxed", label: "Sandboxed (Safer)" },
  { value: "persistent", label: "Persistent (Stateful)" },
];

const PERMISSION_SCOPES: { value: PermissionScope; label: string }[] = [
  { value: "read_only", label: "Read Only" },
  { value: "standard", label: "Standard" },
  { value: "elevated", label: "Elevated" },
  { value: "unrestricted", label: "Unrestricted" },
];

const MAX_INSTRUCTIONS = 2000;

export interface AgentDefinition {
  name: string;
  instructions: string;
  model: string;
  runtime: string;
  tools: AgentTool[];
  memoryRead: boolean;
  memoryWrite: boolean;
  projectContext: boolean;
  permissionScope: PermissionScope;
}

interface AgentBuilderDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: (agent: AgentDefinition) => void;
}

export function AgentBuilderDrawer({ open, onClose, onSaved }: AgentBuilderDrawerProps) {
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [runtime, setRuntime] = useState("standard");
  const [selectedTools, setSelectedTools] = useState<Set<AgentTool>>(new Set());
  const [memoryRead, setMemoryRead] = useState(true);
  const [memoryWrite, setMemoryWrite] = useState(false);
  const [projectContext, setProjectContext] = useState(false);
  const [permissionScope, setPermissionScope] = useState<PermissionScope>("standard");
  const [testPrompt, setTestPrompt] = useState("");
  const [testOutput, setTestOutput] = useState("");
  const [testing, setTesting] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);

  const isDirty = name.length > 0 || instructions.length > 0;

  const handleClose = () => {
    if (isDirty) {
      setShowDiscard(true);
      return;
    }
    onClose();
  };

  const toggleTool = (tool: AgentTool) => {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(tool)) next.delete(tool);
      else next.add(tool);
      return next;
    });
  };

  const handleTest = useCallback(async () => {
    if (!testPrompt.trim()) return;
    setTesting(true);
    setTestOutput("");
    try {
      const result = await neurodeckApi.agents.run({
        agentId: `builder-preview-${Date.now()}`,
        agentName: name || "Unnamed Agent",
        agentRole: "assistant",
        provider: (model.startsWith("gemini") ? "openai_compat" : "ollama") as AIProvider,
        model,
        persona: "default",
        prompt: testPrompt.trim(),
        projectContext: null,
      });
      if (result.ok) {
        setTestOutput(result.run.result ?? "(no output)");
      } else {
        setTestOutput(`[Error] ${result.error ?? "Agent run failed"}`);
      }
    } catch (e) {
      setTestOutput(`[Error] ${String(e)}`);
    } finally {
      setTesting(false);
    }
  }, [testPrompt, name, model]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSaved({
      name: name.trim(),
      instructions,
      model,
      runtime,
      tools: [...selectedTools],
      memoryRead,
      memoryWrite,
      projectContext,
      permissionScope,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <div
        className="absolute inset-0 bg-nd-surface-bg/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />
      <FocusTrapContainer active={open}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Agent Builder"
          className="relative z-10 flex h-full w-full max-w-[560px] flex-col border-l border-nd-border-subtle bg-nd-surface-secondary/90 shadow-2xl backdrop-blur"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-nd-border-subtle p-5">
            <div className="flex items-center gap-3">
              <Bot className="h-5 w-5 text-nd-accent-primary" aria-hidden />
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-nd-text-muted">
                  Agents
                </p>
                <h2 className="text-lg font-black text-nd-text-primary">Build Agent</h2>
              </div>
            </div>
            <Button variant="ghost" size="sm" icon={X} onClick={handleClose} aria-label="Close" />
          </div>

          {/* Body */}
          <div className="flex-1 space-y-5 overflow-y-auto p-5 scrollbar-thin">
            <TextInput
              label="Agent Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Research Assistant"
              required
              fullWidth
            />

            {/* Instructions */}
            <div className="nd-field w-full">
              <div className="flex items-baseline justify-between">
                <label htmlFor="agent-instructions" className="nd-field__label">
                  Instructions
                </label>
                <span
                  className={`text-xs ${
                    instructions.length > MAX_INSTRUCTIONS * 0.9
                      ? "text-nd-status-warning"
                      : "text-nd-text-muted"
                  }`}
                >
                  {instructions.length}/{MAX_INSTRUCTIONS}
                </span>
              </div>
              <textarea
                id="agent-instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value.slice(0, MAX_INSTRUCTIONS))}
                placeholder="Describe what this agent should do, its persona, and any constraints…"
                rows={5}
                className="nd-input w-full resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                options={MODEL_OPTIONS}
              />
              <Select
                label="Runtime"
                value={runtime}
                onChange={(e) => setRuntime(e.target.value)}
                options={RUNTIME_OPTIONS}
              />
            </div>

            {/* Tool chips */}
            <div>
              <p className="mb-2 text-sm font-medium text-nd-text-secondary">Available Tools</p>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Agent tool access"
              >
                {TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    role="checkbox"
                    aria-checked={selectedTools.has(tool.id)}
                    onClick={() => toggleTool(tool.id)}
                    title={tool.description}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      selectedTools.has(tool.id)
                        ? "bg-nd-accent-primary/20 text-nd-accent-primary ring-1 ring-nd-accent-primary/40"
                        : "border border-nd-border-subtle text-nd-text-muted hover:text-nd-text-primary"
                    }`}
                  >
                    {tool.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Memory access */}
            <div>
              <p className="mb-2 text-sm font-medium text-nd-text-secondary">Memory Access</p>
              <div className="space-y-2 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/20 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-nd-text-primary">Read memory</span>
                  <Toggle
                    checked={memoryRead}
                    onChange={() => setMemoryRead((v) => !v)}
                    label="Read vector memory"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-nd-text-primary">Write memory</span>
                  <Toggle
                    checked={memoryWrite}
                    onChange={() => setMemoryWrite((v) => !v)}
                    label="Write to vector memory"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-nd-text-primary">Project context</span>
                  <Toggle
                    checked={projectContext}
                    onChange={() => setProjectContext((v) => !v)}
                    label="Access project context"
                  />
                </div>
              </div>
            </div>

            {/* Permission scope */}
            <div>
              <p className="mb-2 text-sm font-medium text-nd-text-secondary">Permission Scope</p>
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-label="Permission scope"
              >
                {PERMISSION_SCOPES.map((scope) => (
                  <button
                    key={scope.value}
                    role="radio"
                    aria-checked={permissionScope === scope.value}
                    onClick={() => setPermissionScope(scope.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      permissionScope === scope.value
                        ? "bg-nd-accent-primary/20 text-nd-accent-primary"
                        : "border border-nd-border-subtle text-nd-text-muted hover:text-nd-text-primary"
                    }`}
                  >
                    {scope.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Test prompt */}
            <div>
              <p className="mb-2 text-sm font-medium text-nd-text-secondary">Test Prompt</p>
              <div className="flex gap-2">
                <TextInput
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder="Enter a test task…"
                  fullWidth
                />
                <Button
                  variant="secondary"
                  size="sm"
                  loading={testing}
                  onClick={() => void handleTest()}
                  disabled={!testPrompt.trim()}
                >
                  Test
                </Button>
              </div>
              {testOutput && (
                <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3 font-mono text-xs text-nd-text-secondary">
                  {testOutput}
                </pre>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-nd-border-subtle p-4">
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!name.trim()}
            >
              Create Agent
            </Button>
          </div>
        </div>
      </FocusTrapContainer>

      <ConfirmDialog
        open={showDiscard}
        title="Discard Agent"
        message="You have unsaved agent configuration. Discard it and close?"
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          setShowDiscard(false);
          onClose();
        }}
        onCancel={() => setShowDiscard(false)}
      />
    </div>
  );
}
