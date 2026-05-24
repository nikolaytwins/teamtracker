"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import { groupTasksForKanbanBoard, groupTasksForWeekBoard } from "@/lib/v2/home/home-schedule";
import { BUCKET_ORDER, canDropTaskOnHomeBucket, hasHomeSchedule, rollingWeekDatesFromToday } from "@/lib/v2/tasks/task-buckets";
import type { V2TaskBucket, V2TaskWithMeta } from "@/lib/v2/types";
import { readHomeView, writeHomeView } from "@/lib/v2/home/home-storage";
import type { PortfolioPayload } from "@/lib/v2/projects/portfolio-types";
import type { TaskViewMode } from "@/lib/v2/task-view-mode";
import { ActiveTrackerHero } from "@/components/v2/hero/active-tracker-hero";
import { ChipBar } from "@/components/v2/home/chip-bar";
import { HomeDayView, HomeKanbanView, HomeWeekView } from "@/components/v2/home/home-views";
import { moveHomeTaskToBucket, moveHomeTaskToDate } from "@/components/v2/home/home-task-dnd";
import { PageHead } from "@/components/v2/home/page-head";
import { UnassignedTasksSection } from "@/components/v2/home/unassigned-tasks-section";
import { useV2Bootstrap } from "@/components/v2/shell/v2-app-shell";
import { V2Topbar } from "@/components/v2/shell/v2-topbar";
import { TaskDrawer } from "@/components/v2/tasks/task-drawer";
import { V2Icons } from "@/components/v2/ui/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ActiveTimer = {
  session: { id: string; task_id: string; started_at: string };
  task: V2TaskWithMeta;
  elapsedSeconds: number;
};

export function V2HomeClient() {
  const { me, workspace, members, projects, loading: bootLoading, refresh: refreshBoot, openNewTask, openCommandPalette } =
    useV2Bootstrap();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<V2TaskWithMeta[]>([]);
  const [groups, setGroups] = useState<Record<string, V2TaskWithMeta[]>>({});
  const [active, setActive] = useState<ActiveTimer | null>(null);
  const [focusSecondsToday, setFocusSecondsToday] = useState(0);
  const [activeElapsedBase, setActiveElapsedBase] = useState(0);
  const [tick, setTick] = useState(0);
  const [projectFilter, setProjectFilter] = useState("all");
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [unassignedTasks, setUnassignedTasks] = useState<V2TaskWithMeta[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverBucket, setDragOverBucket] = useState<V2TaskBucket | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [movingTask, setMovingTask] = useState(false);
  const [view, setViewState] = useState<TaskViewMode>("day");
  const [viewHydrated, setViewHydrated] = useState(false);
  const [projectsById, setProjectsById] = useState<Map<string, PortfolioPayload["projects"][number]>>(new Map());

  const canViewUnassigned = me?.role === "admin" || me?.role === "pm";

  const elapsed = active ? active.elapsedSeconds + tick : 0;
  const runningTaskId = active?.session.task_id ?? null;
  const teamProjects = useMemo(() => projects.filter((p) => p.scope === "team"), [projects]);

  useEffect(() => {
    setViewState(readHomeView());
    setViewHydrated(true);
  }, []);

  const setView = useCallback((next: TaskViewMode) => {
    setViewState(next);
    writeHomeView(next);
  }, []);

  const loadPage = useCallback(async () => {
    const requests: Promise<unknown>[] = [
      fetchJson<{ tasks: V2TaskWithMeta[]; groups: Record<string, V2TaskWithMeta[]> }>("/api/v2/tasks?grouped=1"),
      fetchJson<{ active: ActiveTimer | null }>("/api/v2/timer/active"),
      fetchJson<{ focusSecondsToday: number; activeElapsedSeconds: number; hasActiveTimer: boolean }>(
        "/api/v2/timer/stats"
      ),
      fetchJson<PortfolioPayload>("/api/v2/projects/portfolio"),
    ];
    if (canViewUnassigned) {
      requests.push(fetchJson<{ tasks: V2TaskWithMeta[] }>("/api/v2/tasks/unassigned"));
    }
    const results = await Promise.all(requests);
    const taskRes = results[0] as { tasks: V2TaskWithMeta[]; groups: Record<string, V2TaskWithMeta[]> };
    const timerRes = results[1] as { active: ActiveTimer | null };
    const statsRes = results[2] as {
      focusSecondsToday: number;
      activeElapsedSeconds: number;
      hasActiveTimer: boolean;
    };
    const portfolioRes = results[3] as PortfolioPayload;
    setTasks(taskRes.tasks);
    setGroups(taskRes.groups);
    setActive(timerRes.active);
    setFocusSecondsToday(statsRes.focusSecondsToday);
    setActiveElapsedBase(timerRes.active?.elapsedSeconds ?? 0);
    setProjectsById(new Map(portfolioRes.projects.map((p) => [p.id, p])));
    if (canViewUnassigned && results[4]) {
      setUnassignedTasks((results[4] as { tasks: V2TaskWithMeta[] }).tasks);
    } else {
      setUnassignedTasks([]);
    }
  }, [canViewUnassigned]);

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

  const reloadRef = useRef<() => Promise<void>>(async () => {});
  async function reload() {
    setTick(0);
    await Promise.all([loadPage(), refreshBoot()]);
  }
  reloadRef.current = reload;

  const drawerReloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDrawerUpdated = useCallback(() => {
    if (drawerReloadTimer.current) clearTimeout(drawerReloadTimer.current);
    drawerReloadTimer.current = setTimeout(() => {
      void reloadRef.current();
    }, 700);
  }, []);

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

  const findTaskById = useCallback(
    (id: string) => tasks.find((t) => t.id === id) ?? unassignedTasks.find((t) => t.id === id),
    [tasks, unassignedTasks]
  );

  const handleDropOnDate = useCallback(
    async (ymd: string) => {
      if (!dragId || movingTask) return;
      const taskId = dragId;
      setDragId(null);
      setDragOverDate(null);
      setMovingTask(true);
      setError(null);
      try {
        await moveHomeTaskToDate(taskId, ymd, findTaskById);
        await reloadRef.current();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось перенести задачу");
      } finally {
        setMovingTask(false);
      }
    },
    [dragId, movingTask, findTaskById]
  );

  const clearDrag = useCallback(() => {
    setDragId(null);
    setDragOverBucket(null);
    setDragOverDate(null);
  }, []);

  const handleDropOnBucket = useCallback(
    async (bucket: V2TaskBucket) => {
      if (!dragId || movingTask || !canDropTaskOnHomeBucket(bucket)) return;
      const taskId = dragId;
      clearDrag();
      setMovingTask(true);
      setError(null);
      try {
        await moveHomeTaskToBucket(taskId, bucket, findTaskById);
        await reloadRef.current();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось перенести задачу");
      } finally {
        setMovingTask(false);
      }
    },
    [dragId, movingTask, findTaskById, clearDrag]
  );

  const filteredGroups = useMemo(() => {
    const unassignedIds = canViewUnassigned ? new Set(unassignedTasks.map((t) => t.id)) : new Set<string>();
    const next: Record<string, V2TaskWithMeta[]> = {};
    for (const bucket of BUCKET_ORDER) {
      next[bucket] = (groups[bucket] ?? []).filter((t) => {
        if (unassignedIds.has(t.id) && !hasHomeSchedule(t)) return false;
        return projectFilter === "all" ? true : t.project_id === projectFilter;
      });
    }
    return next;
  }, [groups, projectFilter, canViewUnassigned, unassignedTasks]);

  const filteredUnassigned = useMemo(() => {
    if (!canViewUnassigned) return [];
    return unassignedTasks.filter((t) => (projectFilter === "all" ? true : t.project_id === projectFilter));
  }, [unassignedTasks, projectFilter, canViewUnassigned]);

  const weekDates = useMemo(() => rollingWeekDatesFromToday(), []);

  const boardTasks = useMemo(() => {
    const fromTasks = tasks.filter((t) => {
      if (t.completed_at || t.inbox_bucket) return false;
      return projectFilter === "all" ? true : t.project_id === projectFilter;
    });
    if (!canViewUnassigned) return fromTasks;
    const ids = new Set(fromTasks.map((t) => t.id));
    return [...fromTasks, ...filteredUnassigned.filter((t) => !ids.has(t.id))];
  }, [tasks, projectFilter, canViewUnassigned, filteredUnassigned]);

  const weekBoard = useMemo(() => groupTasksForWeekBoard(boardTasks, weekDates), [boardTasks, weekDates]);

  const kanbanColumns = useMemo(
    () =>
      groupTasksForKanbanBoard(
        tasks.filter((t) => {
          if (t.completed_at || t.inbox_bucket) return false;
          return projectFilter === "all" ? true : t.project_id === projectFilter;
        }),
        filteredUnassigned,
        weekDates
      ),
    [tasks, filteredUnassigned, projectFilter, weekDates]
  );

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

  const focusSecToday = focusSecondsToday + (active ? Math.max(0, elapsed - activeElapsedBase) : 0);

  const urgentOpen = useMemo(() => tasks.filter((t) => !t.completed_at && t.priority === "urgent"), [tasks]);
  const urgentOverdue = urgentOpen.filter((t) => t.bucket === "overdue").length;
  const urgentTodayCount = urgentOpen.filter((t) => t.bucket === "today").length;

  const candidateTasks = useMemo(
    () => tasks.filter((t) => !t.completed_at && !t.inbox_bucket),
    [tasks]
  );

  const homeDnd = {
    dragId,
    dragOverBucket,
    onDragStart: setDragId,
    onDragEnd: clearDrag,
    onDragOverBucket: setDragOverBucket,
    onDropOnBucket: (bucket: V2TaskBucket) => void handleDropOnBucket(bucket),
  };

  const homeActions = {
    runningId: runningTaskId,
    elapsed,
    onToggleRun: toggleTimer,
    onToggleDone: toggleComplete,
    onOpenTask: setDrawerTaskId,
  };

  if (loading || bootLoading || !viewHydrated) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>
    );
  }

  return (
    <>
      <V2Topbar
        onNewTask={() => openNewTask(projectFilter === "all" ? null : projectFilter)}
        onOpenCommands={openCommandPalette}
        onOpenTask={setDrawerTaskId}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1180px] px-10 pb-24 pt-8">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          ) : null}

          {me ? <PageHead userName={me.name} tasks={tasks} view={view} setView={setView} /> : null}

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

            {canViewUnassigned && view !== "kanban" && view !== "week" ? (
              <UnassignedTasksSection
                tasks={filteredUnassigned}
                onOpenTask={setDrawerTaskId}
                dragId={dragId}
                onDragStart={setDragId}
                onDragEnd={clearDrag}
              />
            ) : null}

            {view === "day" ? (
              <HomeDayView filteredGroups={filteredGroups} dnd={homeDnd} actions={homeActions} />
            ) : view === "week" ? (
              <HomeWeekView
                weekDates={weekDates}
                weekColumns={weekBoard.columns}
                unscheduled={weekBoard.unscheduled}
                projectsById={projectsById}
                dragId={dragId}
                dragOverDate={dragOverDate}
                onDragStart={setDragId}
                onDragEnd={clearDrag}
                onDropDate={(ymd) => void handleDropOnDate(ymd)}
                onDragOverDate={setDragOverDate}
                onOpenTask={setDrawerTaskId}
              />
            ) : (
              <HomeKanbanView
                kanbanColumns={kanbanColumns}
                showUnassigned={canViewUnassigned}
                projectsById={projectsById}
                dragId={dragId}
                dragOverBucket={dragOverBucket}
                onDragStart={setDragId}
                onDragEnd={clearDrag}
                onDropBucket={(bucket) => void handleDropOnBucket(bucket)}
                onDragOverBucket={setDragOverBucket}
                onOpenTask={setDrawerTaskId}
              />
            )}
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
        onClose={() => {
          setDrawerTaskId(null);
          void reload();
        }}
        onUpdated={onDrawerUpdated}
        currentUserId={me?.id ?? null}
        currentUserName={me?.name ?? null}
        members={members}
        projects={teamProjects.map((p) => ({ id: p.id, name: p.name }))}
        runningTaskId={runningTaskId}
        onToggleTimer={toggleTimer}
      />
    </>
  );
}
