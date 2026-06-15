/* NEURODECK workstation shell — composes status bar, nav rail, workspace,
   context panel, input console, and command palette into the 1280×800 app. */

import * as React from "react";
import {
  Activity,
  Bot,
  Box,
  Database,
  History,
  Plus,
  Puzzle,
  Settings,
  Terminal,
} from "lucide-react";
import { Panel } from "../../components/core/Panel";
import { ChatWorkspace, type ChatMessage } from "./ChatWorkspace";
import { CommandPalette, type CommandPaletteCommand } from "./CommandPalette";
import { DiagnosticsView } from "./FeatureViews";
import { AgentsView } from "./FeatureViews";
import { ModelsView } from "./FeatureViews";
import { SessionsView } from "./FeatureViews";
import { InputConsole } from "./InputConsole";
import { NavRail } from "./NavRail";
import { StatusBar } from "./StatusBar";
import { IconChip } from "./icons";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

const NAV: NavItem[] = [
  { id: "workspace", label: "Chat", icon: Terminal },
  { id: "models", label: "Models", icon: Box },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "memory", label: "Memory", icon: Database },
  { id: "sessions", label: "Sessions", icon: History },
  { id: "plugins", label: "Plugins", icon: Puzzle },
  { id: "diag", label: "Doctor", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
];

interface SeedMessage {
  id: number;
  role: string;
  model?: string;
  time?: string;
  tokens?: number;
  latency?: string;
  text: string;
  streaming?: boolean;
}

const SEED: SeedMessage[] = [
  {
    id: 1,
    role: "user",
    text: "Summarize the open security warnings on this device.",
    time: "14:02",
  },
  {
    id: 2,
    role: "assistant",
    model: "Llama 3.1 8B",
    time: "14:02",
    tokens: 86,
    latency: "180ms",
    text: 'Two items need attention:\n\n1. One Hermes plugin ("net-probe") requests shell access and is unsigned — review before enabling.\n2. Network is offline; queued prompts will sync when a connection returns.\n\nNo failed model or agent states detected.',
  },
];

interface ContextPanelProps {
  model: string;
}

function ContextPanel({ model }: ContextPanelProps): React.ReactNode {
  return (
    <aside
      style={{
        width: 280,
        flex: "none",
        borderLeft: "1px solid var(--nd-border-subtle)",
        background: "var(--nd-surface-app)",
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        overflowY: "auto",
      }}
    >
      <div style={hudHead}>Context</div>
      <Panel density="compact" emphasis="active">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Box size={15} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--nd-text-primary)" }}>
            {model}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 14,
            fontFamily: "var(--nd-font-mono)",
            fontSize: 11,
            color: "var(--nd-text-muted)",
          }}
        >
          <span>
            <b style={{ color: "var(--nd-accent-primary)" }}>8192</b> ctx
          </span>
          <span>
            <b style={{ color: "var(--nd-accent-primary)" }}>3.1k</b> used
          </span>
        </div>
      </Panel>

      <div style={hudHead}>Pinned memory</div>
      {[
        "Project: NEURODECK renderer",
        "Prefer terse, technical answers",
        "Steam Deck target 1280×800",
      ].map((m, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            padding: "8px 10px",
            background: "var(--nd-surface-secondary)",
            border: "1px solid var(--nd-border-subtle)",
            borderRadius: "var(--nd-radius-md)",
            fontSize: 12,
            color: "var(--nd-text-secondary)",
            lineHeight: "17px",
          }}
        >
          <Database size={13} /> {m}
        </div>
      ))}

      <div style={hudHead}>Retrieved</div>
      <div
        style={{
          fontFamily: "var(--nd-font-mono)",
          fontSize: 11,
          color: "var(--nd-text-muted)",
          lineHeight: "17px",
        }}
      >
        diagnostics/doctor.log · plugins/net-probe/manifest.json
      </div>
    </aside>
  );
}

const hudHead = {
  fontFamily: "var(--nd-font-hud)",
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  fontSize: 10,
  fontWeight: 600,
  color: "var(--nd-text-muted)",
};

interface ShellCommand {
  id: string;
  label: string;
  group: string;
  icon: React.ComponentType<{ size?: number }>;
  run?: () => void;
  disabled?: boolean;
}

export function Shell(): React.ReactNode {
  const [view, setView] = React.useState("workspace");
  const [messages, setMessages] = React.useState<ChatMessage[]>(SEED);
  const [draft, setDraft] = React.useState("");
  const [model, setModel] = React.useState("Llama 3.1 8B");
  const [busy, setBusy] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const send = () => {
    const now = new Date();
    const t = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const userMsg: ChatMessage = { id: Date.now(), role: "user", text: draft, time: t };
    const botId = Date.now() + 1;
    setMessages((m) => [
      ...m,
      userMsg,
      { id: botId, role: "assistant", model, time: t, text: "", streaming: true },
    ]);
    setDraft("");
    setBusy(true);
    const full =
      "Acknowledged. Running locally on " +
      model +
      ". This is a NEURODECK design-system mock, so the response is simulated — the real renderer streams tokens here with the same tactical-glass response card, copy/regenerate actions, and latency readout.";
    let i = 0;
    const iv = setInterval(() => {
      i += 4;
      setMessages((m) => m.map((x) => (x.id === botId ? { ...x, text: full.slice(0, i) } : x)));
      if (i >= full.length) {
        clearInterval(iv);
        setMessages((m) =>
          m.map((x) =>
            x.id === botId ? { ...x, streaming: false, tokens: 64, latency: "160ms" } : x
          )
        );
        setBusy(false);
      }
    }, 22);
  };

  const COMMANDS: ShellCommand[] = [
    {
      id: "new",
      label: "New session",
      group: "Session",
      icon: Plus,
      run: () => {
        setMessages([]);
        setView("workspace");
      },
    },
    {
      id: "models",
      label: "Open model manager",
      group: "Navigate",
      icon: Box,
      run: () => setView("models"),
    },
    {
      id: "agents",
      label: "Open agents",
      group: "Navigate",
      icon: Bot,
      run: () => setView("agents"),
    },
    {
      id: "diag",
      label: "Run diagnostics doctor",
      group: "Ops",
      icon: Activity,
      run: () => setView("diag"),
    },
    {
      id: "swap",
      label: "Switch model → Qwen 2.5 14B",
      group: "Model",
      icon: IconChip,
      run: () => setModel("Qwen 2.5 14B"),
    },
    {
      id: "plugin",
      label: "Enable plugin: net-probe",
      group: "Plugins",
      icon: Puzzle,
      disabled: true,
    },
  ];

  const placeholder = (label: string): React.ReactNode => (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        color: "var(--nd-text-muted)",
      }}
    >
      <IconChip size={30} />
      <div style={{ fontSize: 15, color: "var(--nd-text-secondary)" }}>{label}</div>
      <div style={{ fontSize: 13 }}>Not part of this design-system mock.</div>
    </div>
  );

  let main: React.ReactNode;
  if (view === "workspace") {
    main = (
      <div style={{ flex: 1, display: "flex", minWidth: 0 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <ChatWorkspace messages={messages} />
          <InputConsole
            value={draft}
            onChange={setDraft}
            onSubmit={send}
            onOpenPalette={() => setPaletteOpen(true)}
            model={model}
            persona="Default"
            busy={busy}
          />
        </div>
        <ContextPanel model={model} />
      </div>
    );
  } else if (view === "models") main = <ModelsView selected={model} onSelect={setModel} />;
  else if (view === "agents") main = <AgentsView />;
  else if (view === "sessions") main = <SessionsView onOpen={() => setView("workspace")} />;
  else if (view === "diag") main = <DiagnosticsView />;
  else if (view === "memory") main = placeholder("Memory & context");
  else if (view === "plugins") main = placeholder("Plugin manager");
  else main = placeholder("Settings");

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--nd-surface-primary)",
      }}
    >
      <StatusBar
        session="Security Lab Notes"
        model={model}
        offline
        tokensPerSec="42"
        vram="6.2 GB"
        clock="14:08"
      />
      <div style={{ flex: 1, display: "flex", minHeight: 0, position: "relative" }}>
        <NavRail items={NAV} active={view} onSelect={setView} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>{main}</div>
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          commands={COMMANDS as CommandPaletteCommand[]}
          onRun={(c: CommandPaletteCommand) => c.run && c.run()}
        />
      </div>
      <ControllerHints />
    </div>
  );
}

export function ControllerHints(): React.ReactNode {
  const hints: [string, string, string][] = [
    ["A", "Confirm", "var(--nd-accent-success)"],
    ["B", "Back", "var(--nd-accent-error)"],
    ["X", "Command", "var(--nd-accent-primary)"],
    ["Y", "Context", "var(--nd-accent-warning)"],
    ["L1/R1", "Tabs", "var(--nd-text-muted)"],
  ];
  return (
    <div
      style={{
        height: 30,
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "0 14px",
        background: "var(--nd-surface-app)",
        borderTop: "1px solid var(--nd-border-subtle)",
      }}
    >
      {hints.map(([b, l, c]) => (
        <span key={b} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontFamily: "var(--nd-font-mono)",
              fontSize: 11,
              fontWeight: 700,
              color: c,
              border: "1px solid var(--nd-border-default)",
              borderRadius: 999,
              padding: "1px 6px",
            }}
          >
            {b}
          </span>
          <span
            style={{
              fontFamily: "var(--nd-font-hud)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              fontSize: 9,
              color: "var(--nd-text-muted)",
            }}
          >
            {l}
          </span>
        </span>
      ))}
    </div>
  );
}
