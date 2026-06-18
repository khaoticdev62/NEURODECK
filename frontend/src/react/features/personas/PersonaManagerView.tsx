import { useCallback, useEffect, useState } from "react";
import { Bot, Check, Plus, RefreshCcw } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { Panel } from "../../components/primitives/Panel";
import { Skeleton } from "../../components/primitives/Skeleton";
import { neurodeckApi } from "../../services/bridgeAdapter";
import type { NeuroDeckState } from "../../types/neurodeck";

interface Persona {
  id: string;
  name: string;
  description: string;
  emoji: string;
  systemPrompt?: string;
}

export function PersonaManagerView({ state }: { state: NeuroDeckState }) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);

  const loadPersonas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await (
        neurodeckApi.ai as { getPersonas?: () => Promise<unknown> }
      ).getPersonas?.();
      if (Array.isArray(result)) {
        setPersonas(result as Persona[]);
      } else {
        setPersonas(FALLBACK_PERSONAS);
      }
    } catch {
      setError("Unable to load personas. Is the sidecar running?");
      setPersonas(FALLBACK_PERSONAS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPersonas();
  }, [loadPersonas]);

  const handleActivate = useCallback(async (personaId: string) => {
    setActivating(personaId);
    try {
      await (
        neurodeckApi.ai as { setPersona?: (id: string) => Promise<unknown> }
      ).setPersona?.(personaId);
    } catch {
      // applied optimistically; backend is best-effort
    } finally {
      setActivating(null);
    }
  }, []);

  const currentPersona = (state as { activePersona?: string }).activePersona ?? "default";

  return (
    <Panel
      eyebrow="AI"
      title="Persona Manager"
      data-testid="persona-manager-view"
      className="h-full overflow-hidden"
      scrollable
      action={
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCcw}
            onClick={() => void loadPersonas()}
            aria-label="Refresh personas"
          />
          <Button variant="secondary" size="sm" icon={Plus}>
            New Persona
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 p-4">
        {error && (
          <ErrorState
            title="Failed to load personas"
            message={error}
            onRetry={() => void loadPersonas()}
            retryLabel="Retry"
          />
        )}

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : personas.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="No personas"
            description="No personas are configured. Create one to customize the AI's personality."
            action={
              <Button variant="secondary" size="sm" onClick={() => {}}>
                Create Persona
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2" role="list" aria-label="Available personas">
            {personas.map((persona) => {
              const isActive = persona.id === currentPersona;
              const isPending = activating === persona.id;
              return (
                <div
                  key={persona.id}
                  role="listitem"
                  className={`relative flex flex-col gap-2 rounded-2xl border p-4 transition ${
                    isActive
                      ? "border-nd-accent-primary/50 bg-nd-accent-primary/5"
                      : "border-nd-border-subtle bg-nd-surface-secondary/20 hover:bg-nd-surface-secondary/40"
                  }`}
                  aria-current={isActive ? "true" : undefined}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl" role="img" aria-label={persona.name}>
                        {persona.emoji}
                      </span>
                      <div>
                        <p className="font-bold text-nd-text-primary">{persona.name}</p>
                        {isActive && (
                          <span className="flex items-center gap-1 text-xs text-nd-accent-primary">
                            <Check className="h-3 w-3" aria-hidden />
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                    {!isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={isPending}
                        onClick={() => void handleActivate(persona.id)}
                        aria-label={`Activate ${persona.name} persona`}
                      >
                        Activate
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-nd-text-muted">{persona.description}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );
}

const FALLBACK_PERSONAS: Persona[] = [
  {
    id: "default",
    name: "NEURODECK",
    emoji: "🤖",
    description: "The default assistant. Balanced, technical, and concise.",
  },
  {
    id: "john",
    name: "John (BMAD)",
    emoji: "👔",
    description: "PM-focused. Converts ideas into agile sprint plans.",
  },
  {
    id: "sally",
    name: "Sally (BMAD)",
    emoji: "🎨",
    description: "UX-first. Thinks in user flows and wireframes.",
  },
  {
    id: "architect",
    name: "Architect",
    emoji: "🏗",
    description: "Systems-level thinking. Zero-bloat architecture decisions.",
  },
  {
    id: "ciso",
    name: "CISO",
    emoji: "🔐",
    description: "Security-first. Threat models every decision.",
  },
  {
    id: "devops",
    name: "DevOps",
    emoji: "⚙️",
    description: "CI/CD, infrastructure, and deployment automation.",
  },
];
