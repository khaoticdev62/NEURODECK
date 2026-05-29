/**
 * radial.js — Sprint 9.7 module extraction
 * Segment registry for the L2/backtick radial view-switching menu.
 * Each entry maps to a nav tab via its `view` field.
 */

export const RADIAL_SEGMENTS = [
  { icon: "messageSquare", label: "Chat",       view: "chat"        },
  { icon: "code2",         label: "Canvas",     view: "canvas"      },
  { icon: "squareTerminal",label: "Terminal",   view: "terminal"    },
  { icon: "server",        label: "SSH",        view: "ssh"         },
  { icon: "route",         label: "Tunnel",     view: "tunnel"      },
  { icon: "globe",         label: "Browser",    view: "browser"     },
  { icon: "bot",           label: "Agent",      view: "agent"       },
  { icon: "brain",         label: "Memory",     view: "memory"      },
  { icon: "share2",        label: "Share",      view: "share"       },
  { icon: "panelRightOpen",label: "Remote",     view: "remote"      },
  { icon: "sparkles",      label: "PromptLab",  view: "prompt-lab"  },
  { icon: "fileText",      label: "Docs",       view: "docs"        },
  { icon: "gitBranch",     label: "Git",        view: "git"         },
  { icon: "send",          label: "API Lab",    view: "api-lab"     },
  { icon: "zap",           label: "CLI",        view: "cli-maker"   },
  { icon: "share2",        label: "Graph",      view: "graph"       },
  { icon: "clock",         label: "Scheduler",  view: "scheduler"   },
  { icon: "workflow",      label: "Flow",       view: "workflow"    },
  { icon: "code2",         label: "IDE",        view: "ide"         },
  { icon: "network",       label: "Orchestrate",view: "orchestrator"},
];
