import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Plus, Trash2, Play, Pause, X } from "lucide-react";
import { neurodeckApi } from "../../services/bridgeAdapter";
import type { ScheduledTask } from "../../services/bridgeAdapter";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { IconButton } from "../../components/primitives/IconButton";
import { LoadingState } from "../../components/primitives/LoadingState";
import { Panel } from "../../components/primitives/Panel";
import { StatusChip } from "../../components/primitives/StatusChip";
import { TextInput } from "../../components/primitives/TextInput";

export function SchedulerView() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mutateError, setMutateError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [cron, setCron] = useState("0 9 * * MON");
  const [goal, setGoal] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await neurodeckApi.scheduler.listTasks();
      setTasks(list);
    } catch (e) {
      setLoadError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addTask = async () => {
    if (!name.trim() || !cron.trim()) return;
    setMutateError(null);
    try {
      await neurodeckApi.scheduler.addTask({
        name: name.trim(),
        cron: cron.trim(),
        goal: goal.trim(),
        enabled: true,
      });
      setName("");
      setGoal("");
      await load();
    } catch (e) {
      setMutateError(`Failed to add task: ${e}`);
    }
  };

  const deleteTask = async (id: string) => {
    setMutateError(null);
    try {
      await neurodeckApi.scheduler.deleteTask(id);
      await load();
    } catch (e) {
      setMutateError(`Failed to delete task: ${e}`);
    }
  };

  const toggleTask = async (id: string) => {
    setMutateError(null);
    try {
      await neurodeckApi.scheduler.toggleTask(id);
      await load();
    } catch (e) {
      setMutateError(`Failed to toggle task: ${e}`);
    }
  };

  const runNow = async (id: string) => {
    setMutateError(null);
    try {
      await neurodeckApi.scheduler.runTaskNow(id);
      await load();
    } catch (e) {
      setMutateError(`Failed to run task: ${e}`);
    }
  };

  return (
    <Panel
      eyebrow="Task Scheduler"
      title="Scheduler"
      className="flex h-full flex-col overflow-hidden"
    >
      <div data-testid="scheduler-view" className="flex h-full flex-col">
        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              id="task-name"
              label="Task name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Task name..."
            />
            <TextInput
              id="cron-expression"
              label="Cron expression"
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              placeholder="Cron: 0 9 * * MON"
            />
          </div>
          <label htmlFor="task-goal" className="nd-field">
            <span className="nd-field__label">Task description or Lua script</span>
            <textarea
              id="task-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Task description or Lua script..."
              rows={2}
              className="min-h-touch w-full resize-none rounded-xl border border-nd-border-subtle bg-nd-surface-primary px-3 py-2 text-sm text-nd-text-primary outline-none transition duration-fast placeholder:text-nd-text-muted focus:border-nd-accent-primary/40 focus-visible:ring-2 focus-visible:ring-nd-accent-primary/30"
            />
          </label>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={addTask}
            disabled={!name.trim() || !cron.trim()}
          >
            Add Task
          </Button>
        </div>

        {mutateError && (
          <div
            role="alert"
            className="mx-4 mb-3 flex items-center gap-2 rounded-xl border border-nd-accent-error/25 bg-nd-accent-error/10 px-3 py-2 text-xs text-nd-accent-error"
          >
            {mutateError}
            <IconButton
              aria-label="Dismiss error"
              variant="ghost"
              size="sm"
              className="ml-auto text-nd-accent-error/70 hover:text-nd-accent-error"
              onClick={() => setMutateError(null)}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </IconButton>
          </div>
        )}

        <div
          role={!loading && !loadError && tasks.length > 0 ? "list" : undefined}
          aria-label="Scheduled tasks"
          className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4 scrollbar-thin"
        >
          {loading && <LoadingState label="Loading tasks…" />}
          {!loading && loadError && (
            <ErrorState
              title="Failed to load tasks"
              message={loadError}
              onRetry={() => void load()}
            />
          )}
          {!loading && !loadError && tasks.length === 0 && (
            <EmptyState
              icon={CalendarClock}
              title="No scheduled tasks"
              description="Add a task using the form above."
            />
          )}
          {!loading &&
            !loadError &&
            tasks.map((task) => (
              <div
                key={task.id}
                role="listitem"
                className="flex items-center gap-3 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3 transition duration-fast hover:bg-nd-surface-tertiary/30"
              >
                <StatusChip tone={task.enabled ? "success" : "info"} size="sm">
                  {task.enabled ? "Enabled" : "Paused"}
                </StatusChip>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-nd-text-primary">{task.name}</p>
                  <p className="font-mono text-xs text-nd-text-muted">{task.cron}</p>
                  {task.goal && <p className="truncate text-xs text-nd-text-muted/70">{task.goal}</p>}
                </div>
                <IconButton
                  variant="ghost"
                  size="sm"
                  aria-label="Run task now"
                  onClick={() => runNow(task.id)}
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                </IconButton>
                <IconButton
                  variant="ghost"
                  size="sm"
                  aria-pressed={task.enabled}
                  aria-label={
                    task.enabled
                      ? "Pause task (currently enabled)"
                      : "Resume task (currently paused)"
                  }
                  onClick={() => toggleTask(task.id)}
                >
                  {task.enabled ? (
                    <Pause className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Play className="h-4 w-4" aria-hidden="true" />
                  )}
                </IconButton>
                <IconButton
                  variant="danger"
                  size="sm"
                  aria-label="Delete task"
                  onClick={() => deleteTask(task.id)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </IconButton>
              </div>
            ))}
        </div>
      </div>
    </Panel>
  );
}
