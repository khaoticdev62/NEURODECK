/* NEURODECK chat workspace — conversation viewport with role-tagged response cards. */

import * as React from "react";
import { Copy, RefreshCw, Terminal } from "lucide-react";
import { StatusChip } from "../../components/core/StatusChip";
import { IconButton } from "../../components/core/IconButton";

export interface ChatMessage {
  id: string | number;
  role: string;
  model?: string;
  text?: string;
  streaming?: boolean;
  time?: string;
  tokens?: number;
  latency?: string;
}

export interface ChatWorkspaceProps {
  messages: ChatMessage[];
}

interface RoleTagProps {
  role: string;
  model?: string;
}

function RoleTag({ role, model }: RoleTagProps): React.ReactNode {
  const map: Record<string, { label: string; color: string }> = {
    user: { label: "You", color: "var(--nd-text-secondary)" },
    assistant: { label: model || "Assistant", color: "var(--nd-accent-primary)" },
    agent: { label: model || "Agent", color: "var(--nd-accent-agent)" },
    system: { label: "System", color: "var(--nd-text-muted)" },
  };
  const r = map[role] || map.assistant;
  return (
    <span
      style={{
        fontFamily: "var(--nd-font-hud)",
        textTransform: "uppercase",
        letterSpacing: "0.16em",
        fontSize: 10,
        fontWeight: 700,
        color: r.color,
      }}
    >
      {r.label}
    </span>
  );
}

interface ResponseCardProps {
  msg: ChatMessage;
}

function ResponseCard({ msg }: ResponseCardProps): React.ReactNode {
  const isUser = msg.role === "user";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 14,
        background: isUser ? "transparent" : "var(--nd-surface-secondary)",
        border: "1px solid",
        borderColor: isUser ? "transparent" : "var(--nd-border-subtle)",
        borderRadius: "var(--nd-radius-lg)",
        boxShadow: isUser ? "none" : "var(--nd-elevation-panel)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <RoleTag role={msg.role} model={msg.model} />
        {msg.streaming ? (
          <StatusChip tone="info" size="sm" pulse>
            Streaming
          </StatusChip>
        ) : null}
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--nd-font-mono)",
            fontSize: 10,
            color: "var(--nd-text-muted)",
          }}
        >
          {msg.time}
        </span>
      </div>
      <div
        style={{
          fontSize: 15,
          lineHeight: "22px",
          color: isUser ? "var(--nd-text-primary)" : "var(--nd-text-secondary)",
          whiteSpace: "pre-wrap",
        }}
      >
        {msg.text}
        {msg.streaming ? <span className="nd-caret">▍</span> : null}
      </div>
      {!isUser && !msg.streaming ? (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
          <IconButton label="Copy" icon={<Copy size={15} />} size="sm" />
          <IconButton label="Regenerate" icon={<RefreshCw size={15} />} size="sm" />
          {msg.tokens ? (
            <span
              style={{
                marginLeft: 6,
                fontFamily: "var(--nd-font-mono)",
                fontSize: 10,
                color: "var(--nd-text-muted)",
              }}
            >
              {msg.tokens} tok · {msg.latency}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ChatWorkspace({ messages }: ChatWorkspaceProps): React.ReactNode {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages]);
  return (
    <div
      ref={ref}
      style={{
        flex: 1,
        overflowY: "auto",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {messages.length === 0 ? (
        <div style={{ margin: "auto", textAlign: "center", color: "var(--nd-text-muted)" }}>
          <Terminal size={32} />
          <div style={{ marginTop: 12, fontSize: 15, color: "var(--nd-text-secondary)" }}>
            Local intelligence layer, online.
          </div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Send a prompt to start the session.</div>
        </div>
      ) : (
        messages.map((m) => <ResponseCard key={m.id} msg={m} />)
      )}
    </div>
  );
}
