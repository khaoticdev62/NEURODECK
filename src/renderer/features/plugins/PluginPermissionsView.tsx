import { useCallback, useEffect, useState } from "react";
import { RefreshCcw, ShieldCheck } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { Panel } from "../../components/primitives/Panel";
import { Skeleton } from "../../components/primitives/Skeleton";
import { Toggle } from "../../components/primitives/Toggle";
import { neurodeckApi } from "../../services/bridgeAdapter";
import type { NeuroDeckState } from "../../types/neurodeck";

type LuaScope =
  | "registerCommand"
  | "setPersona"
  | "sendPrompt"
  | "execute"
  | "print"
  | "memory"
  | "system";

interface PluginPermission {
  pluginId: string;
  pluginName: string;
  scopes: Record<LuaScope, boolean>;
}

const SCOPE_META: Record<LuaScope, { label: string; description: string; risk: "low" | "medium" | "high" }> = {
  print: { label: "Console Output", description: "Write to the NEURODECK console log.", risk: "low" },
  registerCommand: { label: "Register Commands", description: "Add slash commands to the command palette.", risk: "low" },
  setPersona: { label: "Switch Persona", description: "Change the active AI persona.", risk: "medium" },
  sendPrompt: { label: "Send AI Prompts", description: "Trigger LLM inference with custom prompts.", risk: "medium" },
  memory: { label: "Read/Write Memory", description: "Access and modify the vector memory database.", risk: "medium" },
  execute: { label: "Execute Commands", description: "Run shell commands on the host OS.", risk: "high" },
  system: { label: "System Access", description: "Access system APIs (process, filesystem).", risk: "high" },
};

const RISK_COLORS: Record<"low" | "medium" | "high", string> = {
  low: "text-nd-status-success",
  medium: "text-nd-status-warning",
  high: "text-nd-status-error",
};

const STORAGE_KEY = "nd:plugin-permissions";

function loadPermissions(): Record<string, Record<LuaScope, boolean>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Record<LuaScope, boolean>>) : {};
  } catch {
    return {};
  }
}

function savePermissions(data: Record<string, Record<LuaScope, boolean>>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage unavailable
  }
}

export function PluginPermissionsView({ state: _state }: { state: NeuroDeckState }) {
  const [plugins, setPlugins] = useState<PluginPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const stored = loadPermissions();
    try {
      const result = await neurodeckApi.plugins.list();
      const res = result as { plugins?: Array<{ id?: string | null; name?: string; file_name?: string }> } | null;
      const rawList: Array<{ id?: string | null; name?: string; file_name?: string }> = res?.plugins ?? FALLBACK_PLUGINS;
      const list = rawList.map((p) => ({ id: (p.id ?? p.file_name) ?? "", name: (p.name ?? p.file_name) ?? "" }));
      setPlugins(
        list.map((p: { id: string; name: string }) => ({
          pluginId: p.id,
          pluginName: p.name,
          scopes: {
            ...(DEFAULT_SCOPES),
            ...(stored[p.id] ?? {}),
          },
        }))
      );
    } catch {
      setPlugins(
        FALLBACK_PLUGINS.map((p) => ({
          pluginId: p.id,
          pluginName: p.name,
          scopes: {
            ...(DEFAULT_SCOPES),
            ...(stored[p.id] ?? {}),
          },
        }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggle = (pluginId: string, scope: LuaScope, value: boolean) => {
    setPlugins((prev) =>
      prev.map((p) =>
        p.pluginId === pluginId ? { ...p, scopes: { ...p.scopes, [scope]: value } } : p
      )
    );
  };

  const handleSave = () => {
    const data: Record<string, Record<LuaScope, boolean>> = {};
    plugins.forEach((p) => { data[p.pluginId] = p.scopes; });
    savePermissions(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Panel
      eyebrow="Plugins"
      title="Plugin Permissions"
      data-testid="plugin-permissions-view"
      className="h-full overflow-hidden"
      scrollable
      action={
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={RefreshCcw} onClick={() => void load()} aria-label="Refresh" />
          <Button variant="primary" size="sm" onClick={handleSave} aria-label="Save permissions">
            {saved ? "Saved ✓" : "Save"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm text-nd-text-muted">
          Control which Lua globals each plugin is allowed to call. Changes take effect on next
          plugin reload.
        </p>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : plugins.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No plugins loaded"
            description="Install plugins first to manage their permissions."
          />
        ) : (
          plugins.map((plugin) => (
            <section
              key={plugin.pluginId}
              aria-label={`${plugin.pluginName} permissions`}
              className="rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/20 overflow-hidden"
            >
              <div className="border-b border-nd-border-subtle/50 bg-nd-surface-secondary/40 px-4 py-3">
                <h2 className="font-bold text-nd-text-primary">{plugin.pluginName}</h2>
                <p className="text-xs text-nd-text-muted font-mono">{plugin.pluginId}</p>
              </div>
              <div className="divide-y divide-nd-border-subtle/30">
                {(Object.keys(SCOPE_META) as LuaScope[]).map((scope) => {
                  const meta = SCOPE_META[scope];
                  return (
                    <div
                      key={scope}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 text-xs font-bold uppercase ${RISK_COLORS[meta.risk]}`}>
                          {meta.risk}
                        </span>
                        <div>
                          <p className="font-medium text-nd-text-primary">{meta.label}</p>
                          <p className="text-xs text-nd-text-muted">{meta.description}</p>
                        </div>
                      </div>
                      <Toggle
                        checked={plugin.scopes[scope]}
                        onChange={() => handleToggle(plugin.pluginId, scope, !plugin.scopes[scope])}
                        label={`Allow ${plugin.pluginName} to ${meta.label}`}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </Panel>
  );
}

const DEFAULT_SCOPES: Record<LuaScope, boolean> = {
  print: true,
  registerCommand: true,
  setPersona: true,
  sendPrompt: true,
  memory: false,
  execute: false,
  system: false,
};

const FALLBACK_PLUGINS = [
  { id: "bmad", name: "BMAD Personas" },
  { id: "promptgen", name: "Prompt Generator" },
];
