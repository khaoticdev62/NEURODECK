// Fake data for the chat kit. Reframed for Khaotic Labs:
// a multi-workspace client-comms hub the founder runs solo.
// Each active client engagement has its own channel; DMs go
// to individual stakeholders. All references by id.

window.CHAT_DATA = (function () {
  const USERS = {
    me:    { id: "me",    name: "you",          handle: "founder", avatar: "K", color: "#A3E635", status: "online" },
    maya:  { id: "maya",  name: "Maya Lin",     handle: "maya.l",  avatar: "M", color: "#A65BFF", status: "online", role: "client · COO, Vector Health" },
    alex:  { id: "alex",  name: "Alex Johansson",handle: "alex.j",  avatar: "A", color: "#7AC4FF", status: "online", role: "client · CTO, Riftworks" },
    kira:  { id: "kira",  name: "Kira Reyes",   handle: "kira.r",  avatar: "K", color: "#FFB347", status: "idle",   role: "client · founder, Maple Loop" },
    dany:  { id: "dany",  name: "Daniyar M.",   handle: "d.morales",avatar: "D", color: "#FF4D4D", status: "dnd",    role: "client · VP eng, Northbeam" },
    rumi:  { id: "rumi",  name: "Rumi Nakata",  handle: "ru.n",    avatar: "R", color: "#C8FF6B", status: "offline",role: "fractional CTO client" },
    bot:   { id: "bot",   name: "khaotic-bot",  handle: "bot",     avatar: "▸", color: "#A3E635", status: "online", role: "system", bot: true },
  };

  const WORKSPACES = [
    { id: "kh",     name: "Khaotic Labs",  mark: "K", color: "#A3E635", active: true,  unread: 0 },
    { id: "cohort", name: "AI Cohort",     mark: "C", color: "#A65BFF", unread: 12 },
    { id: "indie",  name: "Indie Makers",  mark: "I", color: "#7AC4FF", unread: 0, mention: true },
    { id: "void",   name: "void",          mark: "∅", color: "#5A5A6E", unread: 0 },
  ];

  const CHANNELS = [
    { kind: "header", id: "h1", label: "studio" },
    { kind: "channel", id: "c-studio",        prefix: "#", name: "studio",         unread: 0 },
    { kind: "channel", id: "c-sprint-board",  prefix: "#", name: "sprint-board",   unread: 0, active: true },
    { kind: "channel", id: "c-agents-live",   prefix: "#", name: "agents-live",    unread: 3 },
    { kind: "channel", id: "c-corrections",   prefix: "#", name: "corrections-log",unread: 1, mention: true, locked: true },
    { kind: "channel", id: "c-announcements", prefix: "#", name: "announcements",  unread: 0 },
    { kind: "channel", id: "c-voice",         prefix: "🔊", name: "deep-work",     unread: 0, voice: true },

    { kind: "header", id: "h2", label: "active clients" },
    { kind: "dm", id: "dm-maya", user: "maya", unread: 0 },
    { kind: "dm", id: "dm-alex", user: "alex", unread: 2, mention: true },
    { kind: "dm", id: "dm-kira", user: "kira", unread: 0 },
    { kind: "dm", id: "dm-dany", user: "dany", unread: 0 },
    { kind: "dm", id: "dm-rumi", user: "rumi", unread: 0 },
  ];

  const MEMBERS_BY_STATUS = {
    online:  ["me", "maya", "alex", "bot"],
    idle:    ["kira"],
    dnd:     ["dany"],
    offline: ["rumi"],
  };

  // Message kinds:
  //  text | reply | code | voice | image | file | join | pin-evt | call-evt
  const MESSAGES = {
    "c-sprint-board": [
      { id: "m1", user: "me", ts: "09:14", kind: "text",
        text: "morning. Sprint 04 of <code class='inl'>vector-health-rag</code> kicks off today. one task: get the embedding pipeline ingesting their internal docs at < 200ms p50." },

      { id: "m2", user: "maya", ts: "09:22", kind: "text",
        text: "appreciate the early start. our compliance team needs the embed-to-Turso flow audited before we point it at prod data. can we get that on this sprint?" },

      { id: "m3", user: "me", ts: "09:24", kind: "reply", replyTo: "m2",
        text: "yeah we good. adding it as a JPE checkpoint before the deploy gate. zero data flows til you sign off.", receipt: "read" },

      { id: "m4", user: "me", ts: "09:26", kind: "code", lang: "go",
        codeHtml: `<span class="c">// pkg/rag/ingest.go</span>\n<span class="k">func</span> <span class="f">Ingest</span>(ctx <span class="k">context</span>.Context, src []<span class="k">byte</span>) <span class="k">error</span> {\n  e, err := embed.<span class="f">From</span>(ctx, claude.<span class="f">Pro</span>())\n  <span class="k">if</span> err != <span class="k">nil</span> { <span class="k">return</span> err }\n  <span class="k">return</span> turso.<span class="f">Upsert</span>(ctx, <span class="s">"vh.docs"</span>, e)\n}` },

      { id: "m5", user: "alex", ts: "09:31", kind: "text",
        text: "yo @founder — Riftworks needs a status update on the agentic dispatch. board's asking.", mentions: ["me"] },

      { id: "m6", user: "alex", ts: "09:32", kind: "reactions", target: "m5",
        reactions: [{ glyph: "👀", count: 1 }] },

      { kind: "day-sep", label: "today · 11:02" },

      { id: "m7", user: "bot", ts: "11:02", kind: "pin-evt",
        text: "Khaotic pinned a message — 'Sprint 04 backlog · vector-health-rag'" },

      { id: "m8", user: "me", ts: "11:08", kind: "text",
        text: "@maya can we also drop the legacy <code class='inl'>--no-stream</code> path in this sprint? Groq stream is rock-solid now, no fallback needed.", mentions: ["maya"] },

      { id: "m9", user: "maya", ts: "11:10", kind: "text",
        text: "yes please. one less thing for ops to babysit.", reactions: [{ glyph: "🔥", count: 2 }, { glyph: "✓", count: 3, mine: true }] },

      { id: "m10", user: "kira", ts: "11:14", kind: "voice", duration: "0:22",
        text: "voice memo · 0:22" },

      { id: "m11", user: "me", ts: "11:15", kind: "reply", replyTo: "m10",
        text: "got it kira — bumping Maple Loop's n8n worker after this sprint closes. that work for you?", receipt: "delivered" },

      { id: "m12", user: "bot", ts: "11:22", kind: "call-evt",
        text: "Khaotic started a focus session in 🔊 deep-work" },

      { id: "m13", user: "kira", ts: "11:31", kind: "file",
        file: { name: "maple-loop-pricing-experiments.parquet", size: "4.2 MB", kind: "parquet" } },

      { id: "m14", user: "me", ts: "11:48", kind: "text",
        text: "Sprint 04 deployed to staging worker. hit <code class='inl'>vh-staging.khaoticlabs.com</code> and tell me if the embed latency feels right — i tightened the chunk size to 32 tokens." },

      { id: "m15", user: "maya", ts: "11:52", kind: "text",
        text: "trying now." },

      { id: "m16", user: "maya", ts: "11:53", kind: "text",
        text: "noticeably snappier. first chunk ~140ms cold, ~80ms warm. ship it." },

      { id: "m17", user: "me", ts: "11:54", kind: "reactions", target: "m16",
        reactions: [{ glyph: "⚡", count: 2, mine: true }] },

      { id: "m18", user: "me", ts: "11:55", kind: "text",
        text: "[OK] tagging sprint-04-final and pushing to Cloudflare. you'll see it on khaoticlabs.com/vh inside the hour.", receipt: "sent" },
    ],

    "c-studio": [
      { id: "g1", user: "me", ts: "08:14", kind: "text",
        text: "// monday plan: ship sprint-04 of vh-rag, draft pricing memo for kira, audit corrections.log for pkg/ candidates. one item at a time." },
    ],

    "dm-alex": [
      { id: "d1", user: "alex", ts: "10:02", kind: "text",
        text: "hey — quick one before standup. Riftworks board wants a 1-pager on the agentic dispatch architecture by friday." },
      { id: "d2", user: "me", ts: "10:03", kind: "text", text: "20m on this?", receipt: "read" },
      { id: "d3", user: "alex", ts: "10:03", kind: "text", text: "perfect, sending the cal link" },
      { id: "d4", user: "alex", ts: "10:04", kind: "text",
        text: "also: we're thinking embedded-CTO retainer starting Q3. wanna talk scope?" },
    ],

    "dm-maya": [
      { id: "k1", user: "maya", ts: "08:44", kind: "text",
        text: "legal cleared the data-isolation clause. greenlit on starting Sprint 04." },
    ],
  };

  // Currently typing — keyed by channel id → array of user ids
  const TYPING = {
    "c-sprint-board": ["kira"],
  };

  const PINNED = {
    "c-sprint-board": {
      by: "me",
      ts: "11:02",
      preview: "Sprint 04 backlog · vector-health-rag — embed pipeline + Turso upsert + compliance audit gate",
    },
  };

  return { USERS, WORKSPACES, CHANNELS, MEMBERS_BY_STATUS, MESSAGES, TYPING, PINNED };
})();
