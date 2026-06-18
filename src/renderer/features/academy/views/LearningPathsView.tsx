import { Award } from "lucide-react";
import { EmptyState } from "../../../components/primitives/EmptyState";
import { Panel } from "../../../components/primitives/Panel";
import { SkillBar } from "../components/SkillBar";
import { PathCard } from "../components/PathCard";
import { LabCard } from "../components/LabCard";
import { LEARNING_PATHS, getLabsForPath, pathCompletionPercent } from "../data/curricula";
import type { LearnerProgress } from "../types";

interface LearningPathsViewProps {
  progress: LearnerProgress;
  onStartLab: (labId: string) => void;
}

export function LearningPathsView({ progress, onStartLab }: LearningPathsViewProps) {
  return (
    <div className="space-y-5">
      <Panel eyebrow="Tracks" title="All Learning Paths">
        <div className="space-y-3 p-4">
          {LEARNING_PATHS.length === 0 ? (
            <EmptyState
              icon={Award}
              title="No tracks available"
              description="Learning tracks will appear here as the curriculum is expanded."
              compact
            />
          ) : (
            LEARNING_PATHS.map((path) => (
              <div key={path.id} className="space-y-3">
                <PathCard
                  path={path}
                  completionPct={pathCompletionPercent(path.id, progress.completedLabs)}
                  onSelect={() => {}}
                />

                {/* Expanded module list */}
                {!path.locked && (
                  <div className="ml-4 space-y-2 border-l border-nd-border-subtle pl-4">
                    {path.modules.map((mod) => {
                      const modComplete =
                        mod.labIds.length > 0
                          ? mod.labIds.every((id) => progress.completedLabs.includes(id))
                          : false;
                      return (
                        <div
                          key={mod.id}
                          className="rounded-xl border border-nd-border-subtle/50 bg-nd-surface-base/40 px-3 py-2.5"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2 w-2 shrink-0 rounded-full ${
                                modComplete ? "bg-nd-accent-success" : "bg-nd-text-muted/20"
                              }`}
                              aria-hidden="true"
                            />
                            <p className="text-xs font-medium text-nd-text-secondary">
                              {mod.title}
                            </p>
                          </div>
                          {mod.objectives.length > 0 && (
                            <ul className="ml-4 mt-1 space-y-0.5">
                              {mod.objectives.map((obj, i) => (
                                <li key={i} className="text-[11px] leading-5 text-nd-text-muted">
                                  • {obj}
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Labs within this module */}
                          {mod.labIds.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {getLabsForPath(path.id)
                                .filter((lab) => mod.labIds.includes(lab.id))
                                .map((lab) => (
                                  <LabCard
                                    key={lab.id}
                                    lab={lab}
                                    completed={progress.completedLabs.includes(lab.id)}
                                    onStart={onStartLab}
                                  />
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Panel>

      {/* Progress summary */}
      <Panel eyebrow="Overview" title="Path Progress">
        <div className="space-y-3 p-4">
          {LEARNING_PATHS.filter((p) => !p.locked).map((path) => (
            <SkillBar
              key={path.id}
              label={path.title}
              score={pathCompletionPercent(path.id, progress.completedLabs)}
            />
          ))}
        </div>
      </Panel>
    </div>
  );
}
