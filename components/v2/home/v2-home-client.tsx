"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import { formatBucketSubtitle } from "@/lib/v2/format";
import { BUCKET_LABELS, BUCKET_ORDER } from "@/lib/v2/tasks/task-buckets";
import type { V2TaskBucket, V2TaskWithMeta } from "@/lib/v2/types";
import { ActiveTrackerHero } from "@/components/v2/hero/active-tracker-hero";
import { ChipBar } from "@/components/v2/home/chip-bar";
import { PageHead } from "@/components/v2/home/page-head";
import { TaskSection } from "@/components/v2/home/task-section";
import { useV2Bootstrap } from "@/components/v2/shell/v2-app-shell";
import { V2Topbar } from "@/components/v2/shell/v2-topbar";
import { TaskDrawer } from "@/components/v2/tasks/task-drawer";
import { V2Icons } from "@/components/v2/ui/icons";
import { useCallback, useEffect, useMemo, useState } from "react";

type ActiveTimer = {
  session: { id: string; task_id: string; started_at: string };
  task: V2TaskWithMeta;
  elapsedSeconds: number;
};

const SECTION_ACCENTS: Partial<Record<V2TaskBucket, string>> = {
  overdue: "#EF4444",
  today: "#3B6FF7",
  tomorrow: "#A1A1AA",
  this_week: "#A1A1AA",
  later: "#D4D4D8",
  done_today: "#10B981",
};

export function V2HomeClient() {
  const { me, workspace, members, projects, loading: bootLoading, refresh: refreshBoot } = useV2Bootstrap();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<V2TaskWithMeta[]>([]);
  const [groups, setGroups] = useState<Record<string, V2TaskWithMeta[]>>({});
  const [active, setActive] = useState<ActiveTimer | null>(null);
  const [tick, setTick] = useState(0);
  const [projectFilter, setProjectFilter] = useState("all");
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [paletteHint, setPaletteHint] = useState(false);

  const elapsed = active ? active.elapsedSeconds + tick : 0;
  const runningTaskId = active?.session.task_id ?? null;
  const teamProjects = useMemo(() => projects.filter((p) => p.scope === "team"), [projects]);

  const loadPage = useCallback(async () => {
    const [taskRes, timerRes] = await Promise.all([
      fetchJson<{ tasks: V2TaskWithMeta[]; groups: Record<string, V2TaskWithMeta[]> }>("/api/v2/tasks?grouped=1"),
      fetchJson<{ active: ActiveTimer | null }>("/api/v2/timer/active"),
    ]);
    setTasks(taskRes.tasks);
    setGroups(taskRes.groups);
    setActive(timerRes.active);
  }, []);

  useEffect(() => {
    if (bootLoading) return;
    loadPage()
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [bootLoading, loadPage]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  async function reload() {
    setTick(0);
    await Promise.all([loadPage(), refreshBoot()]);
  }

  async function toggleComplete(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    await fetchJson(`/api/v2/tasks/${taskId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", completed: !task.completed_at }),
    });
    await reload();
  }

  async function toggleTimer(taskId: string) {
    if (runningTaskId === taskId) {
      await fetchJson("/api/v2/timer/stop", { method: "POST" });
    } else {
      await fetchJson("/api/v2/timer/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
    }
    setTick(0);
    await reload();
  }

  async function stopTimer() {
    await fetchJson("/api/v2/timer/stop", { method: "POST" });
    setTick(0);
    await reload();
  }

  const filteredGroups = useMemo(() => {
    const next: Record<string, V2TaskWithMeta[]> = {};
    for (const bucket of BUCKET_ORDER) {
      next[bucket] = (groups[bucket] ?? []).filter((t) =>
        projectFilter === "all" ? true : t.project_id === projectFilter
      );
    }
    return next;
  }, [groups, projectFilter]);

  const chipCounts = useMemo(() => {
    const c: Record<string, number> = { all: tasks.filter((t) => !t.completed_at).length };
    for (const t of tasks) {
      if (t.completed_at || !t.project_id) continue;
      c[t.project_id] = (c[t.project_id] ?? 0) + 1;
    }
    return c;
  }, [tasks]);

  const doneToday = filteredGroups.done_today ?? [];
  const todayOpen = filteredGroups.today ?? [];
  const completedToday = doneToday.length;
  const totalToday = completedToday + todayOpen.length;

  const focusSecToday = useMemo(() => {
    const base = [...doneToday, ...todayOpen, ...(filteredGroups.overdue ?? [])].reduce(
      (sum, t) => sum + t.logged_seconds,
      0
    );
    return base + (active ? elapsed : 0);
  }, [doneToday, todayOpen, filteredGroups.overdue, active, elapsed]);

  const urgentOpen = useMemo(() => tasks.filter((t) => !t.completed_at && t.priority === "urgent"), [tasks]);
  const urgentOverdue = urgentOpen.filter((t) => t.bucket === "overdue").length;
  const urgentTodayCount = urgentOpen.filter((t) => t.bucket === "today").length;

  const candidateTasks = useMemo(
    () => tasks.filter((t) => !t.completed_at && !t.inbox_bucket),
    [tasks]
  );

  if (loading || bootLoading) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>
    );
  }

  return (
    <>
      <V2Topbar
        workspaceName={workspace?.name}
        onNewTask={() => setPaletteHint(true)}
        onOpenCommands={() => setPaletteHint(true)}
        onOpenTask={setDrawerTaskId}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1180px] px-10 pb-24 pt-8">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          ) : null}
          {paletteHint ? (
            <div className="mb-4 rounded-xl border border-[var(--v2-brand-100)] bg-[var(--v2-brand-50)] px-4 py-3 text-sm text-[var(--v2-brand-800)]">
              Нажмите ⌘K для команд и быстрого поиска.
            </div>
          ) : null}

          {me ? <PageHead userName={me.name} tasks={tasks} /> : null}

          <ActiveTrackerHero
            task={active?.task ?? null}
            elapsed={elapsed}
            running={!!active}
            onToggleTimer={() => {
              if (active) void toggleTimer(active.session.task_id);
            }}
            onStop={() => void stopTimer()}
            onStartSuggested={(taskId) => void toggleTimer(taskId)}
            candidateTasks={candidateTasks}
            completedToday={completedToday}
            totalToday={totalToday}
            focusSecToday={focusSecToday}
            urgentCount={urgentOpen.length}
            urgentOverdue={urgentOverdue}
            urgentToday={urgentTodayCount}
          />

          <div className="mt-9">
            <ChipBar
              projectFilter={projectFilter}
              setProjectFilter={setProjectFilter}
              counts={chipCounts}
              projects={projects}
            />

            {BUCKET_ORDER.map((bucket) => {
              const list = filteredGroups[bucket] ?? [];
              if (!list.length) return null;
              return (
                <TaskSection
                  key={bucket}
                  title={BUCKET_LABELS[bucket]}
                  subtitle={formatBucketSubtitle(bucket)}
                  accent={SECTION_ACCENTS[bucket] ?? "#A1A1AA"}
                  tasks={list}
                  runningId={runningTaskId}
                  elapsed={elapsed}
                  onToggleRun={toggleTimer}
                  onToggleDone={toggleComplete}
                  onOpenTask={setDrawerTaskId}
                />
              );
            })}
          </div>

          <div className="mt-12 flex items-center justify-between rounded-2xl bg-white/60 p-5 shadow-[var(--v2-shadow-card)] backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--v2-brand-500)] to-[var(--v2-brand-600)] text-white shadow-[var(--v2-shadow-glow)]">
                <V2Icons.spark className="h-[18px] w-[18px]" />
              </div>
              <div>
                <div className="v2-tight text-[14px] font-semibold text-[var(--v2-ink-900)]">Спланируем завтра?</div>
                <div className="text-[12.5px] text-[var(--v2-ink-500)]">
                  Тим подберёт фокус-блоки и расставит приоритеты на основе ваших дедлайнов.
                </div>
              </div>
            </div>
            <button
              type="button"
              className="v2-tight h-9 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[12.5px] font-medium text-white transition hover:bg-[var(--v2-ink-700)]"
            >
              Открыть планировщик
            </button>
          </div>
        </div>
      </div>

      <TaskDrawer
        taskId={drawerTaskId}
        open={!!drawerTaskId}
        onClose={() => setDrawerTaskId(null)}
        onUpdated={reload}
        members={members}
        projects={teamProjects.map((p) => ({ id: p.id, name: p.name }))}
        runningTaskId={runningTaskId}
        onToggleTimer={toggleTimer}
      />
    </>
  );
}
