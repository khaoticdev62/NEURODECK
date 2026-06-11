import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Plus, Trash2, Play, Pause, RefreshCw } from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';
import type { ScheduledTask } from '../../services/bridgeAdapter';

export function SchedulerView() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [cron, setCron] = useState('0 9 * * MON');
  const [goal, setGoal] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await neurodeckApi.scheduler.listTasks();
      setTasks(list);
    } catch (_) { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addTask = async () => {
    if (!name.trim() || !cron.trim()) return;
    try {
      await neurodeckApi.scheduler.addTask({
        name: name.trim(),
        cron: cron.trim(),
        goal: goal.trim(),
        enabled: true,
      } as any);
      setName('');
      setGoal('');
      await load();
    } catch (_) { /* ignore */ }
  };

  const deleteTask = async (id: string) => {
    try {
      await neurodeckApi.scheduler.deleteTask(id);
      await load();
    } catch (_) { /* ignore */ }
  };

  const toggleTask = async (id: string) => {
    try {
      await neurodeckApi.scheduler.toggleTask(id);
      await load();
    } catch (_) { /* ignore */ }
  };

  const runNow = async (id: string) => {
    try {
      await neurodeckApi.scheduler.runTaskNow(id);
      await load();
    } catch (_) { /* ignore */ }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <CalendarClock className="h-5 w-5 text-nd-accent" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-nd-text">Scheduler</h2>
          <p className="text-xs text-nd-text-muted">Task scheduling with cron expressions</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="mb-4 space-y-2 rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Task name..."
            className="flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40"
          />
          <input
            type="text"
            value={cron}
            onChange={(e) => setCron(e.target.value)}
            placeholder="Cron: 0 9 * * MON"
            className="flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40"
          />
        </div>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Task description or Lua script..."
          rows={2}
          className="w-full resize-none rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40"
        />
        <button
          type="button"
          onClick={addTask}
          className="flex items-center gap-2 rounded-xl border border-nd-success/30 bg-nd-success/10 px-4 py-2 text-sm font-medium text-nd-success hover:bg-nd-success/20"
        >
          <Plus className="h-4 w-4" /> Add Task
        </button>
      </div>

      <div className="flex-1 overflow-auto space-y-2">
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-nd-text-muted/70">
            <CalendarClock className="h-8 w-8 mb-2" />
            <p className="text-sm">No scheduled tasks yet</p>
          </div>
        )}
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-3 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
            <div className={`h-2 w-2 rounded-full ${task.enabled ? 'bg-nd-success' : 'text-nd-text-muted/40'}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-nd-text/90">{task.name}</p>
              <p className="text-xs text-nd-text-muted font-mono">{task.cron}</p>
              {task.goal && <p className="text-xs text-nd-text-muted/70 truncate">{task.goal}</p>}
            </div>
            <button type="button" onClick={() => runNow(task.id)} className="rounded-lg p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-success">
              <Play className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => toggleTask(task.id)} className="rounded-lg p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-accent">
              {task.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button type="button" onClick={() => deleteTask(task.id)} className="rounded-lg p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-danger">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
