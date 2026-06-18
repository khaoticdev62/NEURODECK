import type { Dispatch } from "react";
import { ArrowRight, Bot, MessageSquare, Terminal, Zap } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { Panel } from "../../components/primitives/Panel";
import type { NeuroDeckAction, NeuroDeckState, ViewId } from "../../types/neurodeck";

interface Step {
  id: string;
  icon: React.ElementType;
  title: string;
  body: string;
  cta: string;
  view: ViewId;
}

const STEPS: Step[] = [
  {
    id: "terminal",
    icon: Terminal,
    title: "Open a Terminal",
    body: "Spawn a PTY shell session. Multi-tab, SSH-capable, and gamepad-navigable.",
    cta: "Launch Terminal",
    view: "terminal",
  },
  {
    id: "chat",
    icon: MessageSquare,
    title: "Start an AI Chat",
    body: "Ask anything — code help, explanations, summaries. RAG context pulls in your memory.",
    cta: "Open Chat",
    view: "chat",
  },
  {
    id: "agent",
    icon: Bot,
    title: "Run an Agent",
    body: "Kick off an autonomous task. Agents browse the web, edit files, and call tools.",
    cta: "Go to Agents",
    view: "agents",
  },
  {
    id: "plugins",
    icon: Zap,
    title: "Load a Plugin",
    body: "Extend NEURODECK with Lua plugins. BMAD and Prompt Lab are pre-installed.",
    cta: "Manage Plugins",
    view: "plugins",
  },
];

export function QuickStartView({
  state: _state,
  dispatch,
}: {
  state: NeuroDeckState;
  dispatch?: Dispatch<NeuroDeckAction>;
}) {
  return (
    <Panel
      eyebrow="Welcome"
      title="Quick Start"
      data-testid="quickstart-view"
      className="h-full overflow-hidden"
      scrollable
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
        {/* Hero */}
        <section className="flex flex-col items-center gap-3 text-center" aria-label="Welcome">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-nd-accent-primary/30 bg-nd-accent-primary/10 text-2xl font-black text-nd-accent-primary">
            N
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-nd-text-primary">
              Welcome to NEURODECK
            </h1>
            <p className="mt-1 max-w-md text-nd-text-muted">
              AI-powered terminal OS for Steam Deck and desktop. Start here to get running in under
              a minute.
            </p>
          </div>
        </section>

        {/* Steps */}
        <section aria-label="Getting started steps">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-nd-text-muted">
            Your first moves
          </h2>
          <ol className="flex flex-col gap-3" role="list">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <li key={step.id} role="listitem">
                  <div className="flex items-center gap-4 rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/30 p-4 transition hover:bg-nd-surface-secondary/50">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-nd-accent-primary/20 bg-nd-accent-primary/10 text-nd-accent-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-nd-text-primary">
                        <span className="mr-2 font-mono text-nd-text-muted">{idx + 1}.</span>
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-sm text-nd-text-muted">{step.body}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={ArrowRight}
                      iconPosition="right"
                      onClick={() => dispatch?.({ type: "set-view", view: step.view })}
                      aria-label={step.cta}
                    >
                      {step.cta}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Docs link */}
        <section aria-label="Learn more" className="text-center">
          <p className="text-sm text-nd-text-muted">
            Need help?{" "}
            <button
              onClick={() => dispatch?.({ type: "set-view", view: "docs" })}
              className="text-nd-accent-primary underline hover:text-nd-accent-primary/80"
            >
              Open the Docs Hub
            </button>{" "}
            or press{" "}
            <kbd className="rounded border border-nd-border-subtle bg-nd-surface-secondary/50 px-1.5 py-0.5 font-mono text-xs text-nd-text-primary">
              F1
            </kbd>{" "}
            anywhere.
          </p>
        </section>
      </div>
    </Panel>
  );
}
