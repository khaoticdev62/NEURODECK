/* global React, ReactDOM */
// Khaotic Labs · Chat UI Kit · App entry

const { useState, useEffect, useRef, useMemo } = React;
const D = window.CHAT_DATA;

function App() {
  const [activeId, setActiveId] = useState("c-sprint-board");
  const [membersOpen, setMembersOpen] = useState(true);
  const [pinDismissed, setPinDismissed] = useState({});
  // Per-channel message state — seeded from data, mutable for sends.
  const [messages, setMessages] = useState(() => ({ ...D.MESSAGES }));
  const scrollRef = useRef(null);

  // Auto-scroll to bottom on channel change or new message.
  // Use multiple ticks so layout is settled before reading
  // scrollHeight — some renderers report 0 on the first frame.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const jump = () => { el.scrollTop = el.scrollHeight; };
    jump();
    requestAnimationFrame(() => { jump(); requestAnimationFrame(jump); });
    const t = setTimeout(jump, 120);
    return () => clearTimeout(t);
  }, [activeId, messages]);

  // Active conversation metadata
  const isDm = activeId.startsWith("dm-");
  const activeMeta = D.CHANNELS.find(c => c.id === activeId) || { id: activeId, name: activeId, prefix: "#" };
  const channelLabel = isDm
    ? "@" + (D.USERS[activeMeta.user]?.handle || activeId)
    : (activeMeta.prefix || "#") + (activeMeta.name || activeId);

  const currentMessages = messages[activeId] || [];

  const handleSend = (text) => {
    const nextId = "msg-" + Date.now();
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const msg = {
      id: nextId,
      user: "me",
      ts,
      kind: "text",
      text: escapeHtml(text),
      receipt: "sent",
    };
    setMessages(prev => ({
      ...prev,
      [activeId]: [...(prev[activeId] || []), msg],
    }));

    // Simulate delivered → read receipts
    setTimeout(() => updateReceipt(nextId, "delivered"), 600);
    setTimeout(() => updateReceipt(nextId, "read"), 1800);
    // Simulate a reply from a client on certain channels
    if (activeId === "c-sprint-board" && Math.random() < 0.4) {
      setTimeout(() => {
        const replies = [
          "+1",
          "ack",
          "i'll route that to the team.",
          "give me 10 min on this",
          "looks right to me",
          "[OK] makes sense",
        ];
        const r = replies[Math.floor(Math.random() * replies.length)];
        setMessages(prev => ({
          ...prev,
          [activeId]: [...(prev[activeId] || []), {
            id: "msg-" + Date.now() + Math.random(),
            user: "maya",
            ts,
            kind: "text",
            text: r,
          }],
        }));
      }, 1600);
    }
  };

  const updateReceipt = (id, status) => {
    setMessages(prev => {
      const list = prev[activeId] || [];
      return {
        ...prev,
        [activeId]: list.map(m => m.id === id ? { ...m, receipt: status } : m),
      };
    });
  };

  return (
    <div className="h-full w-full flex" style={{ background: "var(--bg-0)" }}>
      <WorkspaceRail />
      <ChannelList activeId={activeId} onSelect={setActiveId} />

      {/* Main chat area — wrapped in a window frame */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader
          channelId={activeId}
          membersOpen={membersOpen}
          onToggleMembers={() => setMembersOpen(v => !v)}
        />
        {!pinDismissed[activeId] && (
          <PinnedBanner channelId={activeId} onDismiss={() => setPinDismissed(p => ({ ...p, [activeId]: true }))} />
        )}
        <div ref={scrollRef} className="flex-1 scroll-y py-3" style={{ background: "var(--bg-0)" }}>
          {currentMessages.length === 0 && (
            <div className="px-6 py-12 text-center" style={{ color: "var(--fg-3)" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>// no messages yet</div>
              <div style={{ fontSize: 13, marginTop: 8 }}>start the conversation in <code className="inl">{channelLabel}</code></div>
            </div>
          )}
          {currentMessages.map((m, i) => (
            <Message key={m.id || i} msg={m} prev={currentMessages[i - 1]} allMsgs={currentMessages} />
          ))}
          <TypingIndicator channelId={activeId} />
        </div>
        <Composer onSend={handleSend} channelLabel={channelLabel} />
      </div>

      <MembersList open={membersOpen && !isDm} />
    </div>
  );
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/`([^`]+)`/g, '<code class="inl">$1</code>')
    .replace(/@(maya|alex|kira|dany|rumi|bot)\b/g, '<span class="mention">@$1</span>');
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
