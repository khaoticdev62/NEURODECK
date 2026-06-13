import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Plus, Trash2, Play, Pause, RefreshCw } from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';
import type { ScheduledTask } from '../../services/bridgeAdapter';
import { EmptyState } from '../../components/primitives/EmptyState';
import { LoadingState } from '../../components/primitives/LoadingState';
import { ErrorState } from '../../components/primitives/ErrorState';

export function SchedulerView() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mutateError, setMutateError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [cron, setCron] = useState('0 9 * * MON');
  const [goal, setGoal] = useState('');

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
      setName('');
      setGoal('');
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
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <CalendarClock className="h-5 w-5 text-nd-accent" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-nd-text">Scheduler</h2>
          <p className="text-xs text-nd-text-muted">Task scheduling with cron expressions</p>
        </div>
        <button type="button" onClick={load} disabled={loading} aria-label="Refresh tasks" className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>

      <div className="mb-4 space-y-2 rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Task name..."
            aria-label="Task name"
            className="flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
          />
          <input
            type="text"
            value={cron}
            onChange={(e) => setCron(e.target.value)}
            placeholder="Cron: 0 9 * * MON"
            aria-label="Cron expression"
            className="flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
          />
        </div>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Task description or Lua script..."
          aria-label="Task description or Lua script"
          rows={2}
          className="w-full resize-none rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
        />
        <button
          type="button"
          onClick={addTask}
          className="flex items-center gap-2 rounded-xl border border-nd-success/30 bg-nd-success/10 px-4 py-2 text-sm font-medium text-nd-success hover:bg-nd-success/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Add Task
        </button>
      </div>

      {mutateError && (
        <div
          role="alert"
          className="mb-3 flex items-center gap-2 rounded-xl border border-nd-danger/25 bg-nd-danger/10 px-3 py-2 text-xs text-nd-danger"
        >
          {mutateError}
          <button
            type="button"
            onClick={() => setMutateError(null)}
            aria-label="Dismiss error"
            className="ml-auto text-nd-danger/70 hover:text-nd-danger"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto space-y-2">
        {loading && <LoadingState label="Loading tasks…" />}
        {!loading && loadError && (
          <ErrorState
            title="Failed to load tasks"
            message={loadError}
            onRetry={() => void load()}
          />
        )}
        {!loading && !loadError && tasks.length === 0 && (
          <EmptyState icon={CalendarClock} title="No scheduled tasks" description="Add a task using the form above." />
        )}
        {!loading && !loadError && tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-3 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
            <div className={`h-2 w-2 rounded-full ${task.enabled ? 'bg-nd-success' : 'bg-nd-text-muted/40'}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-nd-text/90">{task.name}</p>
              <p className="text-xs text-nd-text-muted font-mono">{task.cron}</p>
              {task.goal && <p className="text-xs text-nd-text-muted/70 truncate">{task.goal}</p>}
            </div>
            <button type="button" onClick={() => runNow(task.id)} aria-label="Run task now" className="rounded-lg p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40">
              <Play className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => toggleTask(task.id)} aria-label={task.enabled ? 'Pause task' : 'Resume task'} aria-pressed={!task.enabled} className="rounded-lg p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40">
              {task.enabled ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
            </button>
            <button type="button" onClick={() => deleteTask(task.id)} aria-label="Delete task" className="rounded-lg p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-danger/40">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
