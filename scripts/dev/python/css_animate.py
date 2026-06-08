"""
Elite Animation Overhaul — Phase 1
Upgrades existing keyframes and animation call sites in-place.
Phase 2 (new patterns) is appended from animation_v2.css.
"""

path = "C:/Users/thecr/Desktop/S-Term/frontend/src/app.css"
with open(path, "r", encoding="utf-8") as f:
    css = f.read()

# ── 1. TIMING + EASING TOKENS in :root ──────────────────────────────────────
css = css.replace(
    "    --sidebar-width: 280px;\n}",
    """    --sidebar-width: 280px;

    /* Motion duration scale */
    --dur-micro:  80ms;
    --dur-fast:   150ms;
    --dur-base:   220ms;
    --dur-enter:  300ms;
    --dur-spring: 380ms;
    --dur-ambient: 2400ms;

    /* Easing library */
    --ease-snap:           cubic-bezier(0.22, 1, 0.36, 1);
    --ease-out-expo:       cubic-bezier(0.16, 1, 0.3, 1);
    --ease-out-spring:     cubic-bezier(0.34, 1.56, 0.64, 1);
    --ease-standard:       cubic-bezier(0.25, 0, 0, 1);
    --ease-in-out-smooth:  cubic-bezier(0.45, 0, 0.15, 1);
}""",
)

# ── 2. UPGRADE KEYFRAMES ─────────────────────────────────────────────────────

# game-badge-pulse — add scale for physical weight
css = css.replace(
    "@keyframes game-badge-pulse {\n    0%, 100% { opacity: 1; }\n    50%       { opacity: 0.4; }\n}",
    "@keyframes game-badge-pulse {\n    0%, 100% { opacity: 1; transform: scale(1); }\n    50%       { opacity: 0.5; transform: scale(0.78); }\n}",
)

# pulse-recording — ripple expand instead of simple scale
css = css.replace(
    "@keyframes pulse-recording {\n    0% { transform: scale(1); }\n    50% { transform: scale(1.15); }\n    100% { transform: scale(1); }\n}",
    "@keyframes pulse-recording {\n    0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0   rgba(239, 71, 111, 0.35); }\n    50%       { transform: scale(1.1); box-shadow: 0 0 0 8px rgba(239, 71, 111, 0);    }\n}",
)

# terminal-expand — deeper origin
css = css.replace(
    "@keyframes terminal-expand {\n    from {\n        opacity: 0;\n        transform: translateY(-5px);\n    }\n    to {\n        opacity: 1;\n        transform: translateY(0);\n    }\n}",
    "@keyframes terminal-expand {\n    from { opacity: 0; transform: translateY(-10px) scale(0.97); }\n    to   { opacity: 1; transform: translateY(0)   scale(1);    }\n}",
)

# agent-entry-in — more expressive entry
css = css.replace(
    "@keyframes agent-entry-in {\n    from { opacity: 0; transform: translateY(4px); }\n    to   { opacity: 1; transform: translateY(0); }\n}",
    "@keyframes agent-entry-in {\n    from { opacity: 0; transform: translateY(12px) scale(0.96); }\n    to   { opacity: 1; transform: translateY(0)   scale(1);    }\n}",
)

# mem-card-in
css = css.replace(
    "@keyframes mem-card-in {\n    from { opacity: 0; transform: translateY(3px); }\n    to   { opacity: 1; transform: translateY(0); }\n}",
    "@keyframes mem-card-in {\n    from { opacity: 0; transform: translateY(10px) scale(0.97); }\n    to   { opacity: 1; transform: translateY(0)   scale(1);    }\n}",
)

# radial-pop — add rotation snap for tactile feel
css = css.replace(
    "@keyframes radial-pop {\n    from { transform: scale(0.7); opacity: 0; }\n    to   { transform: scale(1);   opacity: 1; }\n}",
    "@keyframes radial-pop {\n    0%   { transform: scale(0.6) rotate(-4deg); opacity: 0; }\n    65%  { transform: scale(1.05) rotate(1deg);  opacity: 1; }\n    100% { transform: scale(1)   rotate(0);     opacity: 1; }\n}",
)

# radial-bg-in — slight scale to reinforce depth
css = css.replace(
    "@keyframes radial-bg-in {\n    from { opacity: 0; }\n    to   { opacity: 1; }\n}",
    "@keyframes radial-bg-in {\n    from { opacity: 0; transform: scale(1.04); }\n    to   { opacity: 1; transform: scale(1);    }\n}",
)

# toast-slide-in — spring physics from off-screen right
css = css.replace(
    "@keyframes toast-slide-in {\n    from {\n        transform: translateX(120%) translateY(0);\n        opacity: 0;\n    }\n    to {\n        transform: translateX(0) translateY(0);\n        opacity: 1;\n    }\n}",
    "@keyframes toast-slide-in {\n    0%   { transform: translateX(calc(100% + 32px)) scale(0.92); opacity: 0; }\n    62%  { transform: translateX(-10px)              scale(1.02); opacity: 1; }\n    100% { transform: translateX(0)                   scale(1);    opacity: 1; }\n}",
)

# history-overlay-in — sharper
css = css.replace(
    "@keyframes history-overlay-in {\n    from { opacity: 0; transform: scale(0.97); }\n    to   { opacity: 1; transform: scale(1); }\n}",
    "@keyframes history-overlay-in {\n    from { opacity: 0; transform: scale(0.95) translateY(-8px); }\n    to   { opacity: 1; transform: scale(1)   translateY(0);   }\n}",
)

# attachment-pop — add slight Y for depth
css = css.replace(
    "@keyframes attachment-pop {\n    from { transform: scale(0.6); opacity: 0; }\n    to   { transform: scale(1);   opacity: 1; }\n}",
    "@keyframes attachment-pop {\n    0%   { transform: scale(0.55) translateY(8px); opacity: 0; }\n    65%  { transform: scale(1.06) translateY(-2px); opacity: 1; }\n    100% { transform: scale(1)    translateY(0);    opacity: 1; }\n}",
)

# ob-card-in — stronger origin
css = css.replace(
    "@keyframes ob-card-in {\n    to { opacity: 1; transform: translateY(0); }\n}",
    "@keyframes ob-card-in {\n    from { opacity: 0; transform: translateY(20px) scale(0.94); }\n    to   { opacity: 1; transform: translateY(0)   scale(1);    }\n}",
)

# token-pulse — scale for physical feedback
css = css.replace(
    "@keyframes token-pulse {\n    0%, 100% { opacity: 1; }\n    50% { opacity: 0.6; }\n}",
    "@keyframes token-pulse {\n    0%, 100% { opacity: 1;    transform: scale(1);    }\n    50%       { opacity: 0.75; transform: scale(1.05); }\n}",
)

# remote-pulse — consistent with game-badge-pulse
css = css.replace(
    "@keyframes remote-pulse {\n    0%, 100% { opacity: 1; }\n    50% { opacity: 0.5; }\n}",
    "@keyframes remote-pulse {\n    0%, 100% { opacity: 1;   transform: scale(1);    }\n    50%       { opacity: 0.55; transform: scale(0.78); }\n}",
)

# bootLineIn — snappier from left
css = css.replace(
    "@keyframes bootLineIn {\n    to { opacity: 1; transform: translateX(0); }\n}",
    "@keyframes bootLineIn {\n    from { opacity: 0; transform: translateX(-12px); }\n    to   { opacity: 1; transform: translateX(0);    }\n}",
)

# spin — add slight scale pulse for more dynamic feel
# Leave as-is (simple spin is correct for a spinner)

# ── 3. UPGRADE ANIMATION CALL SITES ─────────────────────────────────────────

call_upgrades = [
    (
        "animation: game-badge-pulse 2s ease-in-out infinite;",
        "animation: game-badge-pulse var(--dur-ambient) var(--ease-in-out-smooth) infinite;",
    ),
    (
        "animation: pulse-recording 1.2s infinite;",
        "animation: pulse-recording 1.6s ease-in-out infinite;",
    ),
    (
        "animation: terminal-expand 0.25s cubic-bezier(0.4, 0, 0.2, 1);",
        "animation: terminal-expand 280ms var(--ease-out-expo) both;",
    ),
    (
        "animation: agent-entry-in 0.2s ease;",
        "animation: agent-entry-in 300ms var(--ease-out-expo) both;",
    ),
    (
        "animation: mem-card-in 0.18s ease;",
        "animation: mem-card-in 280ms var(--ease-out-expo) both;",
    ),
    (
        "animation: radial-pop 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;",
        "animation: radial-pop 320ms var(--ease-out-spring) forwards;",
    ),
    (
        "animation: radial-bg-in 0.15s ease forwards;",
        "animation: radial-bg-in 240ms var(--ease-standard) forwards;",
    ),
    (
        "animation: toast-slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;",
        "animation: toast-slide-in 420ms var(--ease-out-spring) forwards;",
    ),
    (
        "animation: history-overlay-in 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;",
        "animation: history-overlay-in 280ms var(--ease-out-expo) both;",
    ),
    (
        "animation: attachment-pop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;",
        "animation: attachment-pop 300ms var(--ease-out-spring) both;",
    ),
    (
        "animation: ob-card-in 0.35s ease forwards;",
        "animation: ob-card-in 400ms var(--ease-out-expo) both;",
    ),
    (
        "animation: token-pulse 0.8s ease infinite;",
        "animation: token-pulse 1.4s var(--ease-in-out-smooth) infinite;",
    ),
    (
        "animation: remote-pulse 2s infinite;",
        "animation: remote-pulse var(--dur-ambient) ease-in-out infinite;",
    ),
    (
        "animation: bootLineIn 0.22s ease forwards;",
        "animation: bootLineIn 300ms var(--ease-out-expo) both;",
    ),
    ("animation: spin 1s linear infinite;", "animation: spin 900ms linear infinite;"),
]

for old, new in call_upgrades:
    css = css.replace(old, new)

# ── 4. TRANSITION UPGRADES — replace transition:all with specifics ───────────
transition_upgrades = [
    # send button
    (
        "    transition: all 0.15s ease;\n}\n\n.send-prompt-btn:hover {",
        "    transition: background var(--dur-micro) var(--ease-snap),\n                transform  var(--dur-micro) var(--ease-snap),\n                box-shadow var(--dur-fast) var(--ease-standard);\n}\n\n.send-prompt-btn:hover {",
    ),
    # new-chat-btn
    (
        "    transition: all 0.2s ease;\n}\n\n/* Sidebar History List */",
        "    transition: background var(--dur-fast) var(--ease-standard),\n                border-color var(--dur-fast) var(--ease-standard),\n                box-shadow   var(--dur-fast) var(--ease-standard);\n}\n\n/* Sidebar History List */",
    ),
    # history-item
    (
        "    transition: all 0.15s ease;\n    border: 1px solid transparent;\n}",
        "    transition: background   var(--dur-fast) var(--ease-standard),\n                border-color var(--dur-fast) var(--ease-standard),\n                color        var(--dur-fast) var(--ease-standard);\n    border: 1px solid transparent;\n}",
    ),
    # sidebar transition (was all 0.25s)
    (
        "    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);\n    z-index: 40;",
        "    transition: width     var(--dur-enter) var(--ease-out-expo),\n                min-width var(--dur-enter) var(--ease-out-expo),\n                transform var(--dur-enter) var(--ease-out-expo),\n                border    var(--dur-fast)  var(--ease-standard);\n    z-index: 40;",
    ),
    # settings modal card
    (
        "    transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease;",
        "    transition: transform var(--dur-spring) var(--ease-out-spring),\n                opacity   var(--dur-base)   var(--ease-standard);",
    ),
    # speed-dial card
    (
        "    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);\n    display: flex;\n    flex-direction: column;\n    align-items: center;",
        "    transition: background   var(--dur-fast)  var(--ease-standard),\n                border-color var(--dur-fast)  var(--ease-standard),\n                transform    var(--dur-base) var(--ease-out-expo),\n                box-shadow   var(--dur-fast)  var(--ease-standard);\n    display: flex;\n    flex-direction: column;\n    align-items: center;",
    ),
    # bg gallery card
    (
        "    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);\n}\n\n.bg-gallery-card:hover {",
        "    transition: background   var(--dur-fast) var(--ease-standard),\n                border-color var(--dur-fast) var(--ease-standard),\n                box-shadow   var(--dur-fast) var(--ease-standard);\n}\n\n.bg-gallery-card:hover {",
    ),
    # browser btn
    (
        "    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);\n}\n\n.browser-btn:hover:not(:disabled) {",
        "    transition: background   var(--dur-fast) var(--ease-standard),\n                border-color var(--dur-fast) var(--ease-standard),\n                color        var(--dur-fast) var(--ease-standard),\n                box-shadow   var(--dur-fast) var(--ease-standard);\n}\n\n.browser-btn:hover:not(:disabled) {",
    ),
    # input-btn
    (
        "    transition: all 0.2s ease;\n}\n\n.input-btn:hover {",
        "    transition: background var(--dur-fast) var(--ease-standard),\n                color      var(--dur-fast) var(--ease-standard),\n                transform  var(--dur-micro) var(--ease-snap);\n}\n\n.input-btn:hover {",
    ),
]

for old, new in transition_upgrades:
    if old in css:
        css = css.replace(old, new)
    else:
        print(f"WARNING: transition pattern not found:\n  {repr(old[:80])}")

# verify
remaining_all_trans = [i + 1 for i, ln in enumerate(css.split("\n")) if "transition: all" in ln]
print(f"Remaining 'transition: all' lines: {len(remaining_all_trans)}")

with open(path, "w", encoding="utf-8") as f:
    f.write(css)

print("Phase 1 complete.")
