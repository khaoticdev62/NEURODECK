/* global React */
// Mission Control — components. Exported to window for app.jsx.

const { useState, useEffect } = React;
const MC = window.MC_DATA;

function cx(...x) { return x.filter(Boolean).join(" "); }

// ── Sidebar ────────────────────────────────────────────────
function Sidebar({ active, onNav }) {
  return (
    <aside className="side">
      <div className="side-brand"><span className="k">K</span>haotic Labs<span className="us">_</span></div>
      <nav className="nav">
        <div className="nav-sec">// mission control</div>
        {MC.NAV.map(n => (
          <button key={n.id} className={cx("nav-item", active === n.id && "on")} onClick={() => onNav(n.id)}>
            <span className="g">{n.glyph}</span>
            <span>{n.label}</span>
            {n.id === "log" && <span className="nav-badge">5</span>}
          </button>
        ))}
      </nav>
      <div className="side-foot">
        <div className="status-pill">
          <span className="dot"></span>
          <span className="txt">status: accepting_clients</span>
        </div>
      </div>
    </aside>
  );
}

// ── Topbar ─────────────────────────────────────────────────
function Topbar({ label }) {
  const [now, setNow] = useState(clock());
  function clock() {
    const d = new Date();
    const p = n => String(n).padStart(2, "0");
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
  useEffect(() => {
    const t = setInterval(() => setNow(clock()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="topbar">
      <div className="crumb">
        khaotic <span className="sep">/</span> control <span className="sep">/</span> <span className="cur">{label}</span>
      </div>
      <div className="topbar-right">
        <span className="clock">{now}</span>
        <span className="kbd">⌘K</span>
      </div>
    </div>
  );
}

// ── Stat strip ─────────────────────────────────────────────
function StatStrip() {
  return (
    <div className="grid g-4" style={{ marginBottom: 16 }}>
      {MC.STATS.map((s, i) => (
        <div key={i} className={cx("stat glass-tile", s.accent === "uv" && "uv")}>
          <div className="l">{s.label}</div>
          <div className="v">{s.value}{s.unit && <span className="u">{s.unit}</span>}</div>
          <div className="n">{s.note}</div>
        </div>
      ))}
    </div>
  );
}

// ── Active sprint panel ────────────────────────────────────
function SprintPanel() {
  const s = MC.SPRINT;
  const phases = ["Discovery", "Execution", "Diagnostics", "Deploy"];
  return (
    <div className="glass panel span-2">
      <div className="panel-head">
        <div>
          <div className="panel-title">{s.id} · {s.project}</div>
          <div className="panel-tag" style={{ marginTop: 4 }}>one sprint item · {s.phase} phase</div>
        </div>
        <span className="chip chip-ok"><span className="st-dot st-online"></span>in flight</span>
      </div>
      <div className="panel-body">
        <div style={{ fontFamily: "var(--fn-body)", fontSize: 15, color: "var(--text-hi)", marginBottom: 16 }}>{s.title}</div>

        <div className="phases" style={{ marginBottom: 8 }}>
          {phases.map((p, i) => (
            <span key={p} className={cx("pip", (i + 1) < s.phaseIndex && "on", (i + 1) === s.phaseIndex && "cur")}></span>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--fn-mono)", fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>
          {phases.map(p => <span key={p}>{p}</span>)}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontFamily: "var(--fn-mono)", fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.1em" }}>PROGRESS</span>
          <span style={{ fontFamily: "var(--fn-disp)", fontWeight: 700, fontSize: 14, color: "var(--lime)" }}>{s.progress}%</span>
        </div>
        <div className="bar" style={{ marginBottom: 22 }}><span style={{ width: s.progress + "%" }}></span></div>

        <div>
          {s.checklist.map((c, i) => (
            <div key={i} className={cx("check", c.done && "done", c.active && "active")}>
              <span className="box">{c.done ? "✓" : c.active ? "›" : ""}</span>
              <span className="t">{c.t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Activity feed ──────────────────────────────────────────
function FeedPanel() {
  return (
    <div className="glass panel">
      <div className="panel-head">
        <div className="panel-title">Activity</div>
        <span className="panel-tag">live</span>
      </div>
      <div className="panel-body">
        {MC.FEED.map((f, i) => (
          <div key={i} className="feed-row">
            <span className="feed-ts">{f.ts}</span>
            <span className={cx("feed-who", f.accent !== "lime" && "uv")}>{f.who}</span>
            <span className="feed-text">{f.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Agent cell ─────────────────────────────────────────────
function AgentCell({ a, big }) {
  return (
    <div className={cx("agent glass-tile", a.accent === "uv" && "uv")}>
      <div className="agent-top">
        <span className="agent-emoji">{a.emoji}</span>
        <div style={{ flex: 1 }}>
          <div className="agent-name">{a.name}</div>
          <div className="agent-role">{a.role}</div>
        </div>
        <span className={cx("st-dot", a.status === "online" ? "st-online" : "st-idle")} title={a.status}></span>
      </div>
      <div className="bar" style={{ margin: "16px 0 14px" }}>
        <span style={{ width: a.load + "%", background: a.accent === "uv" ? "linear-gradient(90deg, var(--uv-700), var(--uv-400))" : undefined, boxShadow: a.accent === "uv" ? "0 0 12px var(--uv-glow)" : undefined }}></span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div className="agent-stat"><div className="v">{a.load}%</div><div className="l">load</div></div>
        <div className="agent-stat" style={{ textAlign: "center" }}><div className="v">{a.latency}</div><div className="l">p50</div></div>
        <div className="agent-stat" style={{ textAlign: "right" }}><div className="v">{a.calls}</div><div className="l">calls/24h</div></div>
      </div>
    </div>
  );
}

// ── Automations panel ──────────────────────────────────────
function AutomationsPanel() {
  const chip = s => s === "ok" ? "chip-ok" : s === "warn" ? "chip-warn" : "chip-queued";
  return (
    <div className="glass panel span-2">
      <div className="panel-head">
        <div className="panel-title">Automations · n8n</div>
        <span className="panel-tag">self-hosted · cf tunnel</span>
      </div>
      <div>
        <div className="trow thead" style={{ gridTemplateColumns: "1.6fr 1fr 1fr 0.7fr 0.8fr" }}>
          <span>workflow</span><span>trigger</span><span>last run</span><span>runs</span><span style={{ textAlign: "right" }}>status</span>
        </div>
        {MC.AUTOMATIONS.map(w => (
          <div key={w.id} className="trow" style={{ gridTemplateColumns: "1.6fr 1fr 1fr 0.7fr 0.8fr" }}>
            <span style={{ color: "var(--text-hi)" }}>{w.name}</span>
            <span style={{ color: "var(--text-dim)" }}>{w.trigger}</span>
            <span style={{ color: "var(--text-dim)" }}>{w.last}</span>
            <span style={{ color: "var(--text-dim)" }}>{w.runs}</span>
            <span style={{ textAlign: "right" }}><span className={cx("chip", chip(w.status))}>{w.status}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Clients panel ──────────────────────────────────────────
function ClientsPanel({ full }) {
  const chip = h => h === "ok" ? "chip-ok" : h === "warn" ? "chip-warn" : "chip-done";
  return (
    <div className={cx("glass panel", !full && "span-2")}>
      <div className="panel-head">
        <div className="panel-title">Client Engagements</div>
        <span className="panel-tag">{MC.CLIENTS.length} active</span>
      </div>
      <div>
        <div className="trow thead" style={{ gridTemplateColumns: full ? "1.4fr 0.8fr 1fr 1fr 0.9fr 1.4fr" : "1.4fr 0.8fr 1.1fr 0.9fr" }}>
          <span>client</span><span>tier</span><span>stage</span>{full && <span>type</span>}<span>value</span>{full && <span>next</span>}
        </div>
        {MC.CLIENTS.map(c => (
          <div key={c.id} className="trow" style={{ gridTemplateColumns: full ? "1.4fr 0.8fr 1fr 1fr 0.9fr 1.4fr" : "1.4fr 0.8fr 1.1fr 0.9fr" }}>
            <span style={{ color: "var(--text-hi)", display: "flex", alignItems: "center", gap: 8 }}>
              <span className={cx("st-dot", c.health === "warn" ? "st-idle" : "st-online")}></span>{c.name}
            </span>
            <span style={{ color: "var(--uv-300)" }}>{c.tier}</span>
            <span style={{ color: "var(--text-dim)" }}>{c.stage}</span>
            {full && <span style={{ color: "var(--text-dim)" }}>{c.type}</span>}
            <span style={{ color: "var(--lime)" }}>{c.value}</span>
            {full && <span style={{ color: "var(--text-dim)" }}>{c.next}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Corrections log ────────────────────────────────────────
function LogPanel({ full }) {
  const tag = s => s === "lime" ? "tag-lime" : s === "warn" ? "tag-warn" : "tag-uv";
  return (
    <div className="glass panel">
      <div className="panel-head">
        <div className="panel-title">.corrections.log</div>
        <span className="panel-tag">antigravity · pkg/ candidates</span>
      </div>
      <div className="panel-body log">
        {MC.CORRECTIONS.map((c, i) => (
          <div key={i} className="log-row">
            <span className="log-ts">{c.ts}</span>
            <span className={cx("log-tag", tag(c.sev))}>{c.tag}</span>
            <span className="log-text">{c.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  cx, Sidebar, Topbar, StatStrip, SprintPanel, FeedPanel,
  AgentCell, AutomationsPanel, ClientsPanel, LogPanel,
});
