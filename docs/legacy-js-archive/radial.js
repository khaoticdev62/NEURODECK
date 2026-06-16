/**
 * radial.js — Sprint 9.7 module extraction
 * Segment registry for the L2/backtick radial view-switching menu.
 * Each entry maps to a nav tab via its `view` field.
 */

export const RADIAL_SEGMENTS = [
  { icon: "messageSquare", label: "Chat", view: "chat" },
  { icon: "code2", label: "Canvas", view: "canvas" },
  { icon: "squareTerminal", label: "Terminal", view: "terminal" },
  { icon: "server", label: "SSH", view: "ssh" },
  { icon: "route", label: "Tunnel", view: "tunnel" },
  { icon: "share2", label: "Share", view: "share" },
  { icon: "globe", label: "Browser", view: "browser" },
  { icon: "bot", label: "Agent", view: "agent" },
  { icon: "brain", label: "Memory", view: "memory" },
  { icon: "layoutDashboard", label: "Dashboard", view: "dashboard" },
  { icon: "sparkles", label: "PromptLab", view: "prompt-lab" },
  { icon: "panelRightOpen", label: "Remote", view: "remote" },
  { icon: "fileText", label: "Docs", view: "docs" },
  { icon: "workflow", label: "Workflow", view: "workflow" },
  { icon: "calendarClock", label: "Scheduler", view: "scheduler" },
  { icon: "gitBranch", label: "Git", view: "git" },
  { icon: "flask2", label: "API Lab", view: "api-lab" },
  { icon: "squareTerminal", label: "CLI Maker", view: "cli-maker" },
  { icon: "network", label: "Graph", view: "graph" },
  { icon: "layers", label: "Orchestrator", view: "orchestrator" },
  { icon: "codeXml", label: "IDE", view: "ide" },
];
