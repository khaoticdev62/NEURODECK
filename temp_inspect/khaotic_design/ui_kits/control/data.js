// Mission Control — fake studio operations data.
// All surfaces read from this. Numbers are illustrative.

window.MC_DATA = (function () {

  const NAV = [
    { id: "overview",    label: "Overview",      glyph: "◧" },
    { id: "agents",      label: "Agent Fleet",   glyph: "◆" },
    { id: "automations", label: "Automations",   glyph: "↻" },
    { id: "clients",     label: "Clients",       glyph: "▤" },
    { id: "log",         label: "Corrections",   glyph: "‹∕›" },
  ];

  // Top-line studio stats
  const STATS = [
    { label: "Active Sprints",   value: "1",     unit: "",     accent: "lime", note: "one item · in flight" },
    { label: "Monthly Overhead", value: "$0",    unit: "K",    accent: "lime", note: "claude + gemini only" },
    { label: "Open Clients",     value: "4",     unit: "",     accent: "uv",   note: "2 build · 2 retainer" },
    { label: "Uptime / 90d",     value: "99.97", unit: "%",    accent: "lime", note: "all systems nominal" },
  ];

  // The single active sprint item (One Sprint Item principle)
  const SPRINT = {
    id: "SPR-04",
    project: "vector-health-rag",
    title: "Embed pipeline → Turso upsert < 200ms p50",
    phase: "Execution",
    phaseIndex: 2,            // 1..4 Discovery / Execution / Diagnostics / Deploy
    started: "2026-05-26",
    progress: 68,
    checklist: [
      { t: "JPE problem definition signed off",      done: true },
      { t: "pkg/rag/ingest.go — embed.From(claude)", done: true },
      { t: "Turso upsert + edge replication",        done: true },
      { t: "Compliance data-isolation audit gate",   done: false, active: true },
      { t: "Micro-demo: 32-token chunk latency",     done: false },
      { t: "Tag sprint-04-final → Cloudflare",       done: false },
    ],
  };

  // The AI agent fleet
  const AGENTS = [
    { id: "claude",  name: "Claude Pro",     role: "Primary Engine",     emoji: "🤖", status: "online", load: 72, latency: "0.14s", calls: "1,204", accent: "lime" },
    { id: "gemini",  name: "Gemini AI Pro",  role: "Research + Context",  emoji: "🧠", status: "online", load: 41, latency: "0.31s", calls: "486",   accent: "uv" },
    { id: "groq",    name: "Groq",           role: "Fast Inference",      emoji: "⚡", status: "online", load: 88, latency: "0.04s", calls: "9,330", accent: "lime" },
    { id: "router",  name: "OpenRouter",     role: "Failover",            emoji: "🔀", status: "idle",   load: 6,  latency: "0.22s", calls: "37",    accent: "uv" },
  ];

  // n8n automation workflows
  const AUTOMATIONS = [
    { id: "wf-01", name: "lead-intake → notion", trigger: "webhook",  last: "4m ago",  status: "ok",      runs: 312 },
    { id: "wf-02", name: "invoice-dispatch",     trigger: "cron 0 9", last: "today 09:00", status: "ok",  runs: 48 },
    { id: "wf-03", name: "eval-nightly",         trigger: "cron 0 2", last: "today 02:00", status: "ok",  runs: 140 },
    { id: "wf-04", name: "discord-digest",       trigger: "cron 0 18",last: "queued",  status: "queued",  runs: 90 },
    { id: "wf-05", name: "backup → r2",          trigger: "cron */6", last: "1h ago",  status: "warn",    runs: 720 },
  ];

  // Client engagements
  const CLIENTS = [
    { id: "vh",  name: "Vector Health",  tier: "SVC-02", type: "Full Build",   stage: "Sprint 04 / 6",  health: "ok",   value: "$42K",   next: "compliance audit" },
    { id: "rw",  name: "Riftworks",      tier: "SVC-03", type: "Embedded CTO", stage: "Retainer · M3",  health: "ok",   value: "$12K/mo",next: "board 1-pager fri" },
    { id: "ml",  name: "Maple Loop",     tier: "SVC-01", type: "Rapid Strike", stage: "Delivered",      health: "done", value: "$2.4K",  next: "n8n worker bump" },
    { id: "nb",  name: "Northbeam",      tier: "SVC-02", type: "Full Build",   stage: "Discovery",      health: "warn", value: "$28K",   next: "stack sign-off" },
  ];

  // .corrections.log — recurring bug patterns (Antigravity principle)
  const CORRECTIONS = [
    { ts: "2026-05-27 14:02", tag: "PATTERN", sev: "lime", text: "embed batch > 256 → Turso 413. cap chunker at 200, document in pkg/rag." },
    { ts: "2026-05-26 11:18", tag: "FIX",     sev: "uv",   text: "Groq stream EOF on cold start. add 1 retry w/ 80ms backoff. moved to pkg/llm/stream.go." },
    { ts: "2026-05-24 09:41", tag: "PATTERN", sev: "lime", text: "Cloudflare Pages cache busts on _redirects edit. always bump build id." },
    { ts: "2026-05-22 16:55", tag: "WARN",    sev: "warn", text: "n8n self-host tunnel drops after 6h idle. healthcheck ping every 5m." },
    { ts: "2026-05-20 10:07", tag: "FIX",     sev: "uv",   text: "Exo 2 300-weight FOUT on Safari. preload woff2 + font-display swap." },
  ];

  // Live activity ticker
  const FEED = [
    { ts: "11:55", who: "forge",  text: "tagged sprint-04-final · pushing to Cloudflare", accent: "lime" },
    { ts: "11:54", who: "maya.l", text: "approved staging embed latency · ship it" },
    { ts: "11:48", who: "you",    text: "deployed vh-rag to staging worker" },
    { ts: "11:31", who: "groq",   text: "9,330 inferences · p50 0.04s" },
    { ts: "11:22", who: "system", text: "focus session started · deep-work" },
  ];

  return { NAV, STATS, SPRINT, AGENTS, AUTOMATIONS, CLIENTS, CORRECTIONS, FEED };
})();
