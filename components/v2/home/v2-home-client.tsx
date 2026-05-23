"use client";

import { apiUrl } from "@/lib/api-url";
import { fmtDuration, fromDatetimeLocalValue, todayDatetimeLocal } from "@/lib/v2/format";
import type { V2TaskPriority, V2TaskWithMeta } from "@/lib/v2/types";
import { ActiveTrackerHero } from "@/components/v2/hero/active-tracker-hero";
import { useV2Bootstrap } from "@/components/v2/shell/v2-app-shell";
import { TaskDrawer } from "@/components/v2/tasks/task-drawer";
import { ProjectChip, TimerButton } from "@/components/v2/ui/primitives";
import { useCallback, useEffect, useMemo, useState } from "react";

type V2TaskBucket = V2TaskWithMeta["bucket"];

const BUCKET_ORDER: V2TaskBucket[] = ["overdue", "today", "tomorrow", "this_week", "later", "done_today"];
const BUCKET_LABELS: Record<V2TaskBucket, string> = {
  overdue: "Просрочено",
  today: "Сегодня",
  tomorrow: "Завтра",
  this_week: "На этой неделе",
  later: "Позже",
  done_today: "Готово сегодня",
  inbox: "Входящие",
};

type ActivityItem = { id: string; message: string; created_at: string };
type ActiveTimer = {
  session: { id: string; task_id: string; started_at: string };
  task: V2TaskWithMeta;
  elapsedSeconds: number;
};

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), { ...init, credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
}

export function V2HomeClient() {
  const { me, members, projects, loading: bootLoading, refresh: refreshBoot } = useV2Bootstrap();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<V2TaskWithMeta[]>([]);
  const [groups, setGroups] = useState<Record<string, V2TaskWithMeta[]>>({});
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [active, setActive] = useState<ActiveTimer | null>(null);
  const [tick, setTick] = useState(0);
  const [quickText, setQuickText] = useState("");
  const [bulkTitles, setBulkTitles] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskProjectId, setTaskProjectId] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskDeadline, setTaskDeadline] = useState(todayDatetimeLocal(18));
  const [taskEstimateHours, setTaskEstimateHours] = useState("2");
  const [taskPriority, setTaskPriority] = useState<V2TaskPriority>("medium");
  const [saving, setSaving] = useState(false);
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);

  const elapsed = active ? active.elapsedSeconds + tick : 0;
  const teamProjects = useMemo(() => projects.filter((p) => p.scope === "team"), [projects]);

  const loadPage = useCallback(async () => {
    const [taskRes, actRes, timerRes] = await Promise.all([
      fetchJson<{ tasks: V2TaskWithMeta[]; groups: Record<string, V2TaskWithMeta[]> }>("/api/v2/tasks?grouped=1"),
      fetchJson<{ activity: ActivityItem[] }>("/api/v2/activity?limit=30"),
      fetchJson<{ active: ActiveTimer | null }>("/api/v2/timer/active"),
    ]);
    setTasks(taskRes.tasks);
    setGroups(taskRes.groups);
    setActivity(actRes.activity);
    setActive(timerRes.active);
  }, []);

  useEffect(() => {
    if (bootLoading) return;
    if (me && !taskAssigneeId) setTaskAssigneeId(me.id);
    loadPage()
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [bootLoading, loadPage, me, taskAssigneeId]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  async function reload() {
    await Promise.all([loadPage(), refreshBoot()]);
  }

  async function toggleComplete(task: V2TaskWithMeta) {
    await fetchJson(`/api/v2/tasks/${task.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete", completed: !task.completed_at }) });
    await reload();
  }

  async function toggleTimer(taskId: string) {
    if (active?.session.task_id === taskId) await fetchJson("/api/v2/timer/stop", { method: "POST" });
    else await fetchJson("/api/v2/timer/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId }) });
    setTick(0);
    await reload();
  }

  if (loading || bootLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>;
  }

  return (
    <div className="px-7 py-6">
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">{me ? `Привет, ${me.name.split(" ")[0]}` : "Мои задачи"}</h1>
          <p className="mt-1 text-sm text-[var(--v2-ink-500)]">{tasks.filter((t) => !t.completed_at).length} открытых задач</p>
        </div>
        <button type="button" className="v2-btn-primary" onClick={() => fetchJson("/api/v2/tasks/postpone", { method: "POST" }).then(reload)}>
          Перенести на завтра
        </button>
      </header>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!quickText.trim()) return;
          await fetchJson("/api/v2/tasks/quick", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: quickText }) });
          setQuickText("");
          await reload();
        }}
        className="v2-card mb-6 flex gap-2 p-3"
      >
        <input className="v2-input flex-1" placeholder="Быстро: Позвонить Пете в пятницу" value={quickText} onChange={(e) => setQuickText(e.target.value)} />
        <button type="submit" className="v2-btn-primary">NLP</button>
      </form>

      {active && (
        <div className="mb-6">
          <ActiveTrackerHero task={active.task} elapsed={elapsed} onToggleTimer={() => toggleTimer(active.session.task_id)} onStop={async () => { await fetchJson("/api/v2/timer/stop", { method: "POST" }); setTick(0); await reload(); }} />
        </div>
      )}

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!taskTitle.trim()) return;
            await fetchJson("/api/v2/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: taskTitle, scope: "team", projectId: taskProjectId || null, assigneeUserId: taskAssigneeId, deadlineAt: fromDatetimeLocalValue(taskDeadline), estimateHours: Number(taskEstimateHours) || null, priority: taskPriority }) });
            setTaskTitle("");
            await reload();
          }}
          className="v2-card space-y-3 p-4"
        >
          <div className="font-medium">Задача</div>
          <input className="v2-input" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Название" />
          <div className="grid grid-cols-2 gap-2">
            <select className="v2-input" value={taskProjectId} onChange={(e) => setTaskProjectId(e.target.value)}>
              <option value="">Проект</option>
              {teamProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="v2-input" value={taskAssigneeId} onChange={(e) => setTaskAssigneeId(e.target.value)}>
              {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}
            </select>
          </div>
          <button type="submit" className="v2-btn-primary">Добавить</button>
        </form>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const titles = bulkTitles.split("\n").map((l) => l.trim()).filter(Boolean);
            if (!titles.length) return;
            await fetchJson("/api/v2/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ titles, scope: "team", projectId: taskProjectId || null, assigneeUserId: taskAssigneeId, deadlineAt: fromDatetimeLocalValue(taskDeadline), estimateHours: Number(taskEstimateHours) || null, priority: taskPriority }) });
            setBulkTitles("");
            await reload();
          }}
          className="v2-card space-y-3 p-4"
        >
          <div className="font-medium">Список</div>
          <textarea className="v2-input min-h-[120px]" value={bulkTitles} onChange={(e) => setBulkTitles(e.target.value)} />
          <button type="submit" className="v2-btn-primary">Добавить список</button>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          {BUCKET_ORDER.map((bucket) => {
            const list = groups[bucket] ?? [];
            if (!list.length) return null;
            return (
              <section key={bucket}>
                <h2 className="mb-2 text-sm font-semibold">{BUCKET_LABELS[bucket]} ({list.length})</h2>
                <div className="v2-card divide-y">
                  {list.map((task) => {
                    const running = active?.session.task_id === task.id;
                    const total = task.logged_seconds + (running ? elapsed : 0);
                    return (
                      <div key={task.id} className="flex cursor-pointer items-center gap-3 px-4 py-3" onClick={() => setDrawerTaskId(task.id)}>
                        <input type="checkbox" checked={!!task.completed_at} onChange={(e) => { e.stopPropagation(); void toggleComplete(task); }} />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{task.title}</div>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--v2-ink-500)]">
                            {task.project_name && <ProjectChip name={task.project_name} short={task.project_short_name} bg={task.project_color_bg} tint={task.project_color_tint} />}
                            <span className="v2-tnum">{fmtDuration(total)}</span>
                          </div>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}><TimerButton running={running} onClick={() => toggleTimer(task.id)} /></div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
        <aside className="v2-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Активность</h2>
          <ul className="space-y-2 text-xs">{activity.map((a) => <li key={a.id}>{a.message}</li>)}</ul>
        </aside>
      </div>

      <TaskDrawer taskId={drawerTaskId} open={!!drawerTaskId} onClose={() => setDrawerTaskId(null)} onUpdated={reload} members={members} projects={teamProjects.map((p) => ({ id: p.id, name: p.name }))} runningTaskId={active?.session.task_id ?? null} onToggleTimer={toggleTimer} />
    </div>
  );
}
