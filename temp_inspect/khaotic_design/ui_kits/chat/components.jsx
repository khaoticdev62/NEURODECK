/* global React */
// Khaotic Labs · Chat UI Kit · Components
// All components exported to window so app.jsx can use them.

const { useState, useRef, useEffect, useMemo } = React;
const D = window.CHAT_DATA;

// ─── Tiny helpers ───────────────────────────────────────────

function cls(...xs) { return xs.filter(Boolean).join(" "); }

function Icon({ name, size = 14, className = "" }) {
  // Inline SVG icon set — sharp, 1.5px strokes, currentColor.
  const s = size;
  const common = { width: s, height: s, viewBox: "0 0 24 24", fill: "none",
                   stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "square",
                   strokeLinejoin: "miter", className };
  switch (name) {
    case "hash":    return <svg {...common}><path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/></svg>;
    case "lock":    return <svg {...common}><rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
    case "volume":  return <svg {...common}><path d="M3 9v6h4l5 4V5L7 9H3z"/><path d="M16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14"/></svg>;
    case "phone":   return <svg {...common}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>;
    case "video":   return <svg {...common}><rect x="3" y="6" width="13" height="12"/><path d="m16 10 5-3v10l-5-3z"/></svg>;
    case "search":  return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.5-4.5"/></svg>;
    case "pin":     return <svg {...common}><path d="M9 4h6l-1 6 4 4-3 1-3 6-3-6-3-1 4-4-1-6z"/></svg>;
    case "users":   return <svg {...common}><circle cx="9" cy="8" r="3.5"/><path d="M2 21a7 7 0 0 1 14 0"/><circle cx="17" cy="7" r="2.5"/><path d="M22 19a5 5 0 0 0-7-4.5"/></svg>;
    case "smile":   return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M9 10h0M15 10h0M8 15a5 5 0 0 0 8 0"/></svg>;
    case "plus":    return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case "paper":   return <svg {...common}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>;
    case "clip":    return <svg {...common}><path d="M21 12 12 21a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8.5-8.5"/></svg>;
    case "mic":     return <svg {...common}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>;
    case "gif":     return <svg {...common}><text x="3" y="17" fontSize="10" fontFamily="Share Tech Mono" fill="currentColor" stroke="none" letterSpacing="0.5">GIF</text><rect x="2" y="5" width="20" height="14"/></svg>;
    case "menu":    return <svg {...common}><circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/></svg>;
    case "reply":   return <svg {...common}><path d="M9 17 4 12l5-5M4 12h11a5 5 0 0 1 5 5v3"/></svg>;
    case "x":       return <svg {...common}><path d="M6 6l12 12M18 6 6 18"/></svg>;
    case "bell":    return <svg {...common}><path d="M18 16a3 3 0 0 0 1-2V11a7 7 0 1 0-14 0v3a3 3 0 0 0 1 2h12zM10 20a2 2 0 0 0 4 0"/></svg>;
    case "settings":return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.2-1.6l2-1.5-2-3.4-2.4.8a7 7 0 0 0-2.8-1.6L13 2h-4l-.6 2.7a7 7 0 0 0-2.8 1.6L3.2 5.5l-2 3.4 2 1.5A7 7 0 0 0 3 12c0 .5 0 1 .2 1.6l-2 1.5 2 3.4 2.4-.8a7 7 0 0 0 2.8 1.6L9 22h4l.6-2.7a7 7 0 0 0 2.8-1.6l2.4.8 2-3.4-2-1.5c.1-.5.2-1 .2-1.6z"/></svg>;
    case "shield":  return <svg {...common}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z"/></svg>;
    case "timer":   return <svg {...common}><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg>;
    default:        return <svg {...common}><circle cx="12" cy="12" r="9"/></svg>;
  }
}

// ─── Avatar ─────────────────────────────────────────────────

function Avatar({ user, size = 32, ring = true }) {
  if (!user) return null;
  const u = typeof user === "string" ? D.USERS[user] : user;
  if (!u) return null;
  const statusClass =
    u.status === "online"  ? "av-online" :
    u.status === "idle"    ? "av-idle"   :
    u.status === "dnd"     ? "av-dnd"    :
    u.status === "offline" ? "av-offline": "";
  return (
    <div
      className={cls("av", ring && statusClass)}
      style={{
        width: size, height: size,
        borderRadius: 2,
        background: `linear-gradient(135deg, ${u.color}1f, ${u.color}07)`,
        borderColor: `${u.color}3f`,
        fontSize: Math.max(11, size * 0.42),
        color: u.color,
      }}
    >
      {u.avatar}
    </div>
  );
}

// ─── Workspace rail (Discord-style) ────────────────────────

function WorkspaceRail() {
  return (
    <div className="w-[64px] hairline-r flex flex-col items-center py-3 gap-2 scroll-hidden" style={{ background: "var(--bg-0)" }}>
      {D.WORKSPACES.map(w => (
        <button
          key={w.id}
          className={cls("relative group flex items-center justify-center transition", w.active ? "snap-in" : "")}
          style={{
            width: 44, height: 44,
            borderRadius: w.active ? 2 : 8,
            background: w.active ? w.color : "var(--bg-2)",
            color: w.active ? "#0B0B0D" : w.color,
            border: w.active ? `1px solid ${w.color}` : "1px solid var(--line-1)",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 16,
            transition: "border-radius 180ms cubic-bezier(0.2,0.8,0.2,1)",
          }}
          title={w.name}
        >
          {w.mark}
          {/* active indicator bar (Discord) */}
          {w.active && <span style={{ position: "absolute", left: -10, top: 8, bottom: 8, width: 3, background: "var(--fg-0)", borderRadius: 2 }} />}
          {/* unread bar */}
          {!w.active && w.unread > 0 && <span style={{ position: "absolute", left: -10, top: 16, bottom: 16, width: 3, background: "var(--fg-0)", borderRadius: 2 }} />}
          {/* mention dot */}
          {w.mention && <span style={{ position: "absolute", right: -4, bottom: -4, width: 16, height: 16, borderRadius: 999, background: "var(--forge-400)", color: "#0B0B0D", border: "2px solid var(--bg-0)", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>!</span>}
        </button>
      ))}
      <button
        className="flex items-center justify-center transition"
        style={{ width: 44, height: 44, borderRadius: 8, background: "var(--bg-2)", color: "var(--phos-400)", border: "1px dashed var(--line-2)" }}
        title="Add workspace"
      >
        <Icon name="plus" size={18} />
      </button>
    </div>
  );
}

// ─── Channel / DM list (Telegram + Discord hybrid) ──────────

function ConversationItem({ item, active, onClick }) {
  const u = item.kind === "dm" ? D.USERS[item.user] : null;
  const name = item.kind === "dm" ? u.name : item.name;
  return (
    <button
      onClick={onClick}
      className={cls("w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition")}
      style={{
        background: active ? "rgba(163,230,53,0.08)" : "transparent",
        borderLeft: active ? "2px solid var(--forge-400)" : "2px solid transparent",
        color: active ? "var(--fg-0)" : (item.unread > 0 ? "var(--fg-0)" : "var(--fg-2)"),
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--bg-2)"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {item.kind === "dm" ? (
        <Avatar user={u} size={22} />
      ) : (
        <span style={{ width: 22, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", color: item.locked ? "var(--err-400)" : "var(--fg-3)" }}>
          {item.locked ? <Icon name="lock" size={13} /> : item.voice ? <Icon name="volume" size={13} /> : <Icon name="hash" size={13} />}
        </span>
      )}
      <span className="flex-1 truncate" style={{ fontSize: 12.5, fontWeight: item.unread > 0 ? 600 : 400, letterSpacing: "-0.005em" }}>
        {name}
      </span>
      {item.mention && (
        <span style={{ background: "var(--forge-400)", color: "#0B0B0D", fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 2 }}>@</span>
      )}
      {item.unread > 0 && !item.mention && (
        <span style={{ background: "var(--bg-3)", color: "var(--fg-0)", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, border: "1px solid var(--line-2)" }}>{item.unread}</span>
      )}
    </button>
  );
}

function ChannelList({ activeId, onSelect }) {
  return (
    <div className="w-[260px] hairline-r flex flex-col" style={{ background: "var(--bg-1)" }}>
      {/* Workspace header */}
      <div className="px-3 py-2.5 hairline-b flex items-center justify-between" style={{ height: 48 }}>
        <div className="flex flex-col">
          <span style={{ color: "var(--fg-0)", fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em" }}>Khaotic Labs</span>
          <span style={{ color: "var(--phos-400)", fontSize: 9.5, letterSpacing: "0.16em", textTransform: "uppercase" }}>● 4 online</span>
        </div>
        <button className="btn-ghost p-1.5"><Icon name="menu" size={14} /></button>
      </div>
      {/* Search */}
      <div className="px-3 py-2 hairline-b">
        <div className="flex items-center gap-2 px-2.5 py-1.5 input-flat" style={{ borderRadius: 2 }}>
          <Icon name="search" size={12} className="opacity-60" />
          <input className="bg-transparent border-0 outline-none flex-1" style={{ fontSize: 11.5, color: "var(--fg-0)" }} placeholder="search · ⌘K" />
          <kbd style={{ fontSize: 9, color: "var(--fg-3)", border: "1px solid var(--line-1)", padding: "1px 4px", borderRadius: 2 }}>⌘K</kbd>
        </div>
      </div>
      {/* List */}
      <div className="flex-1 scroll-y py-1">
        {D.CHANNELS.map(item => {
          if (item.kind === "header") {
            return (
              <div key={item.id} className="px-3 pt-3 pb-1 flex items-center justify-between">
                <span style={{ fontSize: 9.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-3)", fontWeight: 600 }}>{item.label}</span>
                <Icon name="plus" size={11} className="opacity-50" />
              </div>
            );
          }
          return (
            <ConversationItem
              key={item.id}
              item={item}
              active={item.id === activeId}
              onClick={() => onSelect(item.id)}
            />
          );
        })}
      </div>
      {/* Self status bar */}
      <div className="hairline-t flex items-center gap-2 px-3 py-2" style={{ background: "var(--bg-2)" }}>
        <Avatar user="me" size={28} />
        <div className="flex-1 min-w-0">
          <div className="truncate" style={{ fontSize: 12, color: "var(--fg-0)", fontWeight: 600 }}>you</div>
          <div className="flex items-center gap-1.5" style={{ fontSize: 10, color: "var(--phos-300)" }}>
            <span>●</span><span>online</span>
            <span style={{ color: "var(--fg-3)" }}>· typing in #sprint-board</span>
          </div>
        </div>
        <button className="btn-ghost p-1.5"><Icon name="mic" size={13} /></button>
        <button className="btn-ghost p-1.5"><Icon name="settings" size={13} /></button>
      </div>
    </div>
  );
}

// ─── Chat header (Signal padlock + Telegram channel info) ──

function ChatHeader({ channelId, conversation, onToggleMembers, membersOpen }) {
  const isDm = channelId.startsWith("dm-");
  const u = isDm ? D.USERS[D.CHANNELS.find(c => c.id === channelId).user] : null;
  const ch = !isDm ? D.CHANNELS.find(c => c.id === channelId) : null;

  return (
    <div className="win-bar" style={{ height: 48, padding: "0 16px" }}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="win-dots"><span className="dot r"></span><span className="dot y"></span><span className="dot g"></span></span>
        <span className="win-title truncate" style={{ fontSize: 12 }}>
          [<span className="host">root@khaotic</span><span className="at">:</span>
          <span className="path">
            ~/chat/{isDm ? "@" + u.handle : ch ? ch.prefix + ch.name : ""}
          </span>
          <span className="prompt">]$</span>
        </span>
        <span className="disappear ml-2">
          <Icon name="shield" size={10} />
          E2E · auto-purge 7d
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button className="btn-ghost px-2 py-1.5 text-xs flex items-center gap-1.5" title="Pinned"><Icon name="pin" size={13} /><span className="hidden md:inline">pinned</span></button>
        <button className="btn-ghost p-2" title="Voice call"><Icon name="phone" size={14} /></button>
        <button className="btn-ghost p-2" title="Video call"><Icon name="video" size={14} /></button>
        <button className="btn-ghost p-2" title="Search"><Icon name="search" size={14} /></button>
        <button
          onClick={onToggleMembers}
          className="btn-ghost p-2"
          title="Members"
          style={membersOpen ? { background: "var(--bg-3)", color: "var(--forge-300)" } : {}}
        >
          <Icon name="users" size={14} />
        </button>
        <button className="btn-ghost p-2" title="More"><Icon name="menu" size={14} /></button>
      </div>
    </div>
  );
}

// ─── Pinned banner ─────────────────────────────────────────

function PinnedBanner({ channelId, onDismiss }) {
  const pin = D.PINNED[channelId];
  if (!pin) return null;
  const u = D.USERS[pin.by];
  return (
    <div className="pin-banner px-4 py-2 flex items-center gap-3">
      <Icon name="pin" size={13} className="opacity-70" />
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 10, color: "var(--forge-300)", letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600 }}>
          pinned by {u.handle} · {pin.ts}
        </div>
        <div className="truncate" style={{ fontSize: 12, color: "var(--fg-1)" }}>{pin.preview}</div>
      </div>
      <button className="btn-ghost p-1" onClick={onDismiss}><Icon name="x" size={12} /></button>
    </div>
  );
}

// ─── Message components ────────────────────────────────────

function ReadReceipt({ status }) {
  if (!status) return null;
  return (
    <span className={cls("recpt", status)} title={status}>
      {status === "sent" && <svg viewBox="0 0 14 10"><path d="M1 5l3 3 9-7" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>}
      {(status === "delivered" || status === "read") && (
        <svg viewBox="0 0 18 10"><path d="M1 5l3 3 8-7M7 8l3 0M11 5l3 3 4-7" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
      )}
    </span>
  );
}

function ReactionPill({ glyph, count, mine }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 cursor-pointer transition"
      style={{
        fontSize: 11,
        background: mine ? "rgba(163,230,53,0.10)" : "var(--bg-2)",
        border: `1px solid ${mine ? "var(--forge-500)" : "var(--line-1)"}`,
        borderRadius: 2,
        color: mine ? "var(--forge-300)" : "var(--fg-1)",
        fontFamily: "var(--font-mono)",
      }}
    >
      <span>{glyph}</span><span style={{ fontWeight: 600 }}>{count}</span>
    </span>
  );
}

function ReactionTray({ reactions, onAdd }) {
  if (!reactions || reactions.length === 0) {
    return (
      <button className="btn-ghost px-1.5 py-0.5 mt-1" style={{ fontSize: 10, borderRadius: 2 }} onClick={onAdd}>
        + react
      </button>
    );
  }
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {reactions.map((r, i) => <ReactionPill key={i} {...r} />)}
      <button className="px-1.5 py-0.5 transition" onClick={onAdd} style={{ fontSize: 11, background: "var(--bg-2)", border: "1px dashed var(--line-1)", borderRadius: 2, color: "var(--fg-3)" }}>
        +
      </button>
    </div>
  );
}

function Reply({ replyMsg }) {
  if (!replyMsg) return null;
  const u = D.USERS[replyMsg.user];
  return (
    <div className="flex gap-2 mb-1.5 pl-2" style={{ borderLeft: `2px solid ${u.color}`, opacity: 0.7 }}>
      <span style={{ color: u.color, fontWeight: 600, fontSize: 11 }}>{u.handle}</span>
      <span className="truncate" style={{ fontSize: 11, color: "var(--fg-2)" }}>
        {replyMsg.text || (replyMsg.kind === "code" ? "· code snippet ·" : replyMsg.kind === "voice" ? "· voice memo ·" : "...")}
      </span>
    </div>
  );
}

function VoiceMessage({ duration }) {
  // Pseudo-random fixed bar heights for the waveform
  const bars = [4,8,14,18,12,16,20,10,6,12,16,22,18,8,14,10,16,20,12,6,10,18,14,8];
  return (
    <div className="flex items-center gap-3 mt-1 px-3 py-2" style={{ background: "var(--bg-2)", border: "1px solid var(--line-1)", borderRadius: 2, maxWidth: 360 }}>
      <button className="btn-forge flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: 999 }}>
        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 1l7 4-7 4z" fill="#0B0B0D"/></svg>
      </button>
      <div className="wave flex-1">
        {bars.map((h, i) => <i key={i} style={{ height: h, opacity: i < 8 ? 1 : 0.35 }} />)}
      </div>
      <span style={{ fontSize: 10, color: "var(--phos-300)", letterSpacing: "0.04em", fontFamily: "var(--font-mono)" }}>[ VOICE · {duration} ]</span>
    </div>
  );
}

function FileAttachment({ file }) {
  return (
    <div className="mt-1 flex items-center gap-3 px-3 py-2.5" style={{ background: "var(--bg-2)", border: "1px solid var(--line-1)", borderRadius: 2, maxWidth: 420 }}>
      <div style={{ width: 36, height: 36, background: "var(--bg-0)", border: "1px solid var(--line-2)", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--phos-400)", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.04em" }}>
        {file.kind?.toUpperCase() || "FILE"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="truncate" style={{ fontSize: 12, color: "var(--fg-0)", fontWeight: 600 }}>{file.name}</div>
        <div style={{ fontSize: 10, color: "var(--fg-3)" }}>{file.size} · download</div>
      </div>
      <button className="btn-ghost p-1.5"><Icon name="paper" size={13} /></button>
    </div>
  );
}

function SystemEvent({ icon, text, kind }) {
  const color = kind === "pin" ? "var(--forge-300)" : kind === "call" ? "var(--phos-300)" : "var(--fg-3)";
  return (
    <div className="day-sep" style={{ margin: "10px 0 6px" }}>
      <span style={{ color, display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Icon name={icon} size={11} />
        <span>{text}</span>
      </span>
    </div>
  );
}

function MessageText({ html }) {
  // Render html as-is from data (assumes trusted). Used so we can
  // embed <code class="inl"> and <span class="mention">.
  return <span style={{ fontSize: 13, color: "var(--fg-0)", lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: html }} />;
}

function CodeBlock({ html, lang }) {
  return (
    <div className="in-msg-code">
      <div style={{ fontSize: 9.5, color: "var(--fg-3)", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 4 }}>{lang || "code"}</div>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap" }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function Message({ msg, prev, allMsgs }) {
  const u = D.USERS[msg.user];
  const showHeader = !prev || prev.user !== msg.user || prev.kind === "day-sep" || prev.kind === "pin-evt" || prev.kind === "call-evt" || prev.kind === "reactions";
  const isMe = msg.user === "me";

  // Day separators and system events are special
  if (msg.kind === "day-sep") {
    return <div className="day-sep"><span>{msg.label}</span></div>;
  }
  if (msg.kind === "pin-evt") return <SystemEvent icon="pin" text={msg.text} kind="pin" />;
  if (msg.kind === "call-evt") return <SystemEvent icon="phone" text={msg.text} kind="call" />;

  // Reactions row attached to previous message — render inline w/ that bubble instead
  if (msg.kind === "reactions") return null;

  // Find reactions row that targets this message
  const reactionRow = allMsgs.find(m => m.kind === "reactions" && m.target === msg.id);
  const reactions = msg.reactions || (reactionRow ? reactionRow.reactions : null);

  const replyMsg = msg.kind === "reply" ? allMsgs.find(m => m.id === msg.replyTo) : null;

  return (
    <div className={cls("group flex gap-3 px-4 fade-up", showHeader ? "pt-3 pb-1" : "py-0.5")} style={{ transition: "background 120ms" }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-1)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      {/* Avatar gutter */}
      <div style={{ width: 36, flexShrink: 0 }}>
        {showHeader ? <Avatar user={u} size={36} ring={false} /> : (
          <span style={{ fontSize: 9, color: "var(--fg-4)", display: "block", textAlign: "right", paddingTop: 4, paddingRight: 6, opacity: 0 }} className="group-hover:opacity-100 transition">{msg.ts}</span>
        )}
      </div>
      {/* Body */}
      <div className="flex-1 min-w-0">
        {showHeader && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span style={{ color: u.color, fontWeight: 600, fontSize: 13, fontFamily: "var(--font-mono)" }}>
              {u.handle}
              {u.bot && <span style={{ marginLeft: 4, fontSize: 9, background: "var(--forge-400)", color: "#0B0B0D", padding: "0 4px", borderRadius: 2, letterSpacing: "0.04em", fontWeight: 700 }}>BOT</span>}
            </span>
            <span style={{ fontSize: 10, color: "var(--fg-3)" }}>{msg.ts}</span>
            {isMe && msg.receipt && <ReadReceipt status={msg.receipt} />}
          </div>
        )}
        {replyMsg && <Reply replyMsg={replyMsg} />}
        {msg.text && <MessageText html={msg.text} />}
        {msg.kind === "code" && <CodeBlock html={msg.codeHtml} lang={msg.lang} />}
        {msg.kind === "voice" && <VoiceMessage duration={msg.duration} />}
        {msg.kind === "file" && <FileAttachment file={msg.file} />}
        {reactions && <ReactionTray reactions={reactions} onAdd={() => {}} />}
      </div>
      {/* Hover actions */}
      <div className="opacity-0 group-hover:opacity-100 transition flex items-start gap-0 self-start -mt-2" style={{ position: "relative" }}>
        <div className="flex items-center" style={{ background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: 2 }}>
          <button className="p-1.5 btn-ghost" title="React"><Icon name="smile" size={12} /></button>
          <button className="p-1.5 btn-ghost" title="Reply"><Icon name="reply" size={12} /></button>
          <button className="p-1.5 btn-ghost" title="Pin"><Icon name="pin" size={12} /></button>
          <button className="p-1.5 btn-ghost" title="More"><Icon name="menu" size={12} /></button>
        </div>
      </div>
    </div>
  );
}

// ─── Typing indicator ──────────────────────────────────────

function TypingIndicator({ channelId }) {
  const ids = D.TYPING[channelId];
  if (!ids || ids.length === 0) return null;
  const names = ids.map(id => D.USERS[id].handle).join(", ");
  return (
    <div className="px-4 py-1.5 flex items-center gap-2" style={{ fontSize: 11, color: "var(--fg-3)" }}>
      <span><span className="typing-dot">●</span><span className="typing-dot">●</span><span className="typing-dot">●</span></span>
      <span>{names} {ids.length === 1 ? "is" : "are"} typing</span>
    </div>
  );
}

// ─── Composer ──────────────────────────────────────────────

function Composer({ onSend, channelLabel }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);

  const submit = (e) => {
    e?.preventDefault();
    if (!val.trim()) return;
    onSend(val.trim());
    setVal("");
    ref.current?.focus();
  };

  return (
    <form onSubmit={submit} className="px-4 py-3" style={{ background: "var(--bg-1)", borderTop: "1px solid var(--line-1)" }}>
      <div className="flex flex-col input-flat" style={{ borderRadius: 2, padding: "8px 10px" }}>
        <div className="flex items-start gap-2">
          <span style={{ color: "var(--forge-400)", fontWeight: 700, fontSize: 13, lineHeight: "22px" }}>$</span>
          <input
            ref={ref}
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder={`message ${channelLabel} · ⏎ to send · ⇧⏎ for newline`}
            style={{ flex: 1, background: "transparent", border: 0, outline: 0, color: "var(--fg-0)", fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: "22px" }}
          />
          {val && <span className="caret" style={{ display: "inline-block", width: 6, height: 16, background: "var(--forge-300)", marginTop: 4 }} />}
        </div>
        <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid var(--uv-border)" }}>
          <div className="flex items-center gap-0.5">
            <button type="button" className="btn-ghost p-1.5" title="Attach"><Icon name="clip" size={13} /></button>
            <button type="button" className="btn-ghost p-1.5" title="GIF"><Icon name="gif" size={13} /></button>
            <button type="button" className="btn-ghost p-1.5" title="Emoji"><Icon name="smile" size={13} /></button>
            <button type="button" className="btn-ghost p-1.5" title="Voice"><Icon name="mic" size={13} /></button>
            <span className="mx-2 divider-v" style={{ height: 14 }} />
            <span className="disappear">
              <Icon name="timer" size={9} />
              7d auto-purge
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.04em" }}>{val.length}/4000</span>
            <button type="submit" className="btn-forge px-3 py-1.5 flex items-center gap-1.5" style={{ borderRadius: 2, fontSize: 12, fontWeight: 600, opacity: val.trim() ? 1 : 0.5 }}>
              send <Icon name="paper" size={12} />
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

// ─── Members list (Discord-style) ──────────────────────────

function MembersList({ open }) {
  if (!open) return null;
  const groups = [
    { label: "online · 4", ids: D.MEMBERS_BY_STATUS.online },
    { label: "idle · 1",   ids: D.MEMBERS_BY_STATUS.idle },
    { label: "dnd · 1",    ids: D.MEMBERS_BY_STATUS.dnd },
    { label: "offline · 1",ids: D.MEMBERS_BY_STATUS.offline },
  ];
  return (
    <div className="w-[240px] hairline-l flex flex-col fade-up" style={{ background: "var(--bg-1)" }}>
      <div className="hairline-b px-3 flex items-center gap-2" style={{ height: 48 }}>
        <Icon name="users" size={13} className="opacity-70" />
        <span style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-2)", fontWeight: 600 }}>members</span>
      </div>
      <div className="flex-1 scroll-y py-2">
        {groups.map(g => (
          <div key={g.label} className="mb-3">
            <div className="px-3 pb-1.5" style={{ fontSize: 9.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-3)", fontWeight: 600 }}>{g.label}</div>
            {g.ids.map(uid => {
              const u = D.USERS[uid];
              if (!u) return null;
              return (
                <div key={uid} className="flex items-center gap-2 px-3 py-1.5 transition" onMouseEnter={e => e.currentTarget.style.background = "var(--bg-2)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <Avatar user={u} size={26} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate" style={{ fontSize: 12, color: u.status === "offline" ? "var(--fg-3)" : "var(--fg-0)", fontWeight: 500 }}>{u.handle}</span>
                      {u.bot && <span style={{ fontSize: 8, background: "var(--forge-400)", color: "#0B0B0D", padding: "0 3px", borderRadius: 1, fontWeight: 700, letterSpacing: "0.04em" }}>BOT</span>}
                    </div>
                    {u.role && <div style={{ fontSize: 9.5, color: "var(--fg-3)", letterSpacing: "0.04em" }}>{u.role}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Export ─────────────────────────────────────────────────

Object.assign(window, {
  cls, Icon, Avatar,
  WorkspaceRail, ChannelList,
  ChatHeader, PinnedBanner,
  Message, TypingIndicator,
  Composer, MembersList,
});
