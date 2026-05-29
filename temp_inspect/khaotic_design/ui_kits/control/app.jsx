/* global React, ReactDOM */
// Mission Control — app entry. View routing + nav state.

const { useState } = React;
const MCD = window.MC_DATA;

function View({ id }) {
  // Each view re-mounts with an enter animation via key.
  if (id === "overview") {
    return (
      <div className="enter" key="overview">
        <div className="view-head">
          <div>
            <div className="eyebrow">// studio operations</div>
            <div className="view-title" style={{ marginTop: 10 }}>Overview</div>
          </div>
          <div className="view-sub">build #4019 · signed m.k.</div>
        </div>
        <StatStrip />
        <div className="grid g-2" style={{ marginBottom: 16 }}>
          <SprintPanel />
          <FeedPanel />
        </div>
        <div className="grid g-4" style={{ marginBottom: 16 }}>
          {MCD.AGENTS.map(a => <AgentCell key={a.id} a={a} />)}
        </div>
        <div className="grid g-2">
          <AutomationsPanel />
          <ClientsPanel />
        </div>
      </div>
    );
  }
  if (id === "agents") {
    return (
      <div className="enter" key="agents">
        <div className="view-head">
          <div><div className="eyebrow">// ai layer</div><div className="view-title" style={{ marginTop: 10 }}>Agent Fleet</div></div>
          <div className="view-sub">claude · gemini · groq · openrouter</div>
        </div>
        <div className="grid g-2">
          {MCD.AGENTS.map(a => <AgentCell key={a.id} a={a} big />)}
        </div>
      </div>
    );
  }
  if (id === "automations") {
    return (
      <div className="enter" key="automations">
        <div className="view-head">
          <div><div className="eyebrow">// n8n</div><div className="view-title" style={{ marginTop: 10 }}>Automations</div></div>
          <div className="view-sub">self-hosted · cloudflare tunnel</div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
          <AutomationsPanel />
        </div>
      </div>
    );
  }
  if (id === "clients") {
    return (
      <div className="enter" key="clients">
        <div className="view-head">
          <div><div className="eyebrow">// engagements</div><div className="view-title" style={{ marginTop: 10 }}>Clients</div></div>
          <div className="view-sub">2 build · 2 retainer</div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
          <ClientsPanel full />
        </div>
      </div>
    );
  }
  if (id === "log") {
    return (
      <div className="enter" key="log">
        <div className="view-head">
          <div><div className="eyebrow">// surgical diagnostics</div><div className="view-title" style={{ marginTop: 10 }}>Corrections</div></div>
          <div className="view-sub">recurring patterns → pkg/</div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
          <LogPanel full />
        </div>
      </div>
    );
  }
  return null;
}

function App() {
  const [active, setActive] = useState("overview");
  const label = MCD.NAV.find(n => n.id === active)?.label || "";
  return (
    <div className="app">
      <Sidebar active={active} onNav={setActive} />
      <div className="main">
        <Topbar label={label} />
        <div className="view">
          <View id={active} />
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
