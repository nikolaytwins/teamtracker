"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import { kanbanToV2Status, type PortfolioKanbanStatus } from "@/lib/v2/projects/portfolio-types";
import { pickSuggestedProjectDetailTask } from "@/lib/v2/tasks/suggest-task";
import type { ProjectDetailPayload } from "@/lib/v2/projects/project-detail-types";
import type { V2TaskStatus } from "@/lib/v2/types";
import { EditProjectMembersModal } from "@/components/v2/projects/edit-project-members-modal";
import { EditProjectModal } from "@/components/v2/projects/edit-project-modal";
import { DeleteProjectConfirmModal } from "@/components/v2/projects/delete-project-dialog";
import { RetainerMonthPicker } from "@/components/v2/project-detail/retainer-month-picker";
import { ProjectDetailActivity } from "@/components/v2/project-detail/project-detail-activity";
import { ProjectDetailFilesTab } from "@/components/v2/project-detail/project-detail-files-tab";
import { ProjectDetailHeader } from "@/components/v2/project-detail/project-detail-header";
import { ProjectDetailSidebar } from "@/components/v2/project-detail/project-detail-sidebar";
import { ProjectDetailStages } from "@/components/v2/project-detail/project-detail-stages";
import { ProjectDetailTasks } from "@/components/v2/project-detail/project-detail-tasks";
import { useV2Bootstrap } from "@/components/v2/shell/v2-app-shell";
import { V2NotificationsBell } from "@/components/v2/shell/notifications-bell";
import { TaskDrawer } from "@/components/v2/tasks/task-drawer";
import { PRIORITY_META, V2Icons } from "@/components/v2/ui/icons";
import { appPath } from "@/lib/api-url";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TabId = "tasks" | "kanban" | "activity" | "files";

type ActiveTimer = {
  session: { id: string; task_id: string; started_at: string };
  task: { id: string; title: string; assignee_user_id: string | null };
  elapsedSeconds: number;
};

const TABS: { id: TabId; label: string; icon: keyof typeof V2Icons; count?: (d: ProjectDetailPayload) => number }[] = [
  { id: "tasks", label: "Задачи", icon: "tasks", count: (d) => d.tasks.length },
  { id: "kanban", label: "Канбан", icon: "kanban" },
  { id: "activity", label: "Активность", icon: "history", count: (d) => d.activity.length },
  { id: "files", label: "Файлы и ссылки", icon: "folder", count: (d) => d.links.length + d.files.length },
];

const KANBAN_COLUMNS: { key: V2TaskStatus; label: string; dot: string }[] = [
  { key: "todo", label: "К выполнению", dot: "#A1A1AA" },
  { key: "in_progress", label: "В работе", dot: "#3B6FF7" },
  { key: "review", label: "На проверке", dot: "#F59E0B" },
  { key: "done", label: "Готово", dot: "#10B981" },
];

function fmtHours(h: number): string {
  if (!h) return "0ч";
  const hi = Math.floor(h);
  const mm = Math.round((h - hi) * 60);
  if (hi && mm) return `${hi}ч ${mm}м`;
  if (hi) return `${hi}ч`;
  return `${mm}м`;
}

function ProjectDetailKanban({
  detail,
  runningTaskId,
  onOpenTask,
}: {
  detail: ProjectDetailPayload;
  runningTaskId: string | null;
  onOpenTask: (id: string) => void;
}) {
  const grouped = useMemo(() => {
    const g: Record<V2TaskStatus, typeof detail.tasks> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };
    for (const t of detail.tasks) g[t.status].push(t);
    return g;
  }, [detail.tasks]);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max gap-4">
        {KANBAN_COLUMNS.map(({ key, label, dot }) => (
          <div key={key} className="w-[280px] shrink-0 rounded-2xl bg-white/50 p-2">
            <div className="mb-1 flex items-center gap-2 px-2.5 py-2">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
              <h4 className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)]">{label}</h4>
              <span className="v2-tnum text-[11.5px] text-[var(--v2-ink-500)]">{grouped[key].length}</span>
            </div>
            <div className="space-y-2">
              {grouped[key].map((t) => {
                const pm = PRIORITY_META[t.priority];
                const running = runningTaskId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onOpenTask(t.id)}
                    className={`w-full rounded-xl bg-white p-3 text-left shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)] ${running ? "ring-2 ring-[var(--v2-brand-300)]" : ""}`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span
                        className="v2-tight inline-flex items-center gap-1 rounded-md px-1.5 py-[2px] text-[11px] font-medium"
                        style={{ background: pm.soft, color: pm.ink }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: pm.dot }} />
                        {pm.label}
                      </span>
                      <span className="v2-tnum text-[11px] text-[var(--v2-ink-500)]">{t.deadlineLabel}</span>
                    </div>
                    <div className="v2-tight text-[13px] font-medium leading-snug text-[var(--v2-ink-900)]">{t.title}</div>
                    {t.subtasks.length > 0 ? (
                      <div className="v2-tnum mt-2 text-[11px] text-[var(--v2-ink-500)]">
                        {t.subtasks.filter((s) => s.status === "done").length}/{t.subtasks.length} подзадач
                      </div>
                    ) : null}
                    <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--v2-ink-500)]">
                      <span className="truncate">{t.assigneeName ?? "—"}</span>
                      <span className="v2-tnum">
                        {fmtHours(t.loggedHours)}/{fmtHours(t.estimateHours)}
                      </span>
                    </div>
                  </button>
                );
              })}
              {grouped[key].length === 0 ? (
                <div className="v2-tight py-6 text-center text-[12px] italic text-[var(--v2-ink-400)]">Пусто</div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProjectDetailClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { me, members, projects, openNewTask, openCommandPalette, refresh: refreshBoot, setTaskCreationContext } =
    useV2Bootstrap();

  const [detail, setDetail] = useState<ProjectDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("tasks");
  const [workMonth, setWorkMonth] = useState<string | null>(null);
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveTimer | null>(null);
  const [tick, setTick] = useState(0);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const runningTaskId = active?.session.task_id ?? null;
  const elapsed = active ? active.elapsedSeconds + tick : 0;

  const suggestedTask = useMemo(
    () => (detail ? pickSuggestedProjectDetailTask(detail.tasks, me?.id) : null),
    [detail, me?.id]
  );

  const load = useCallback(async (month?: string | null) => {
    const qs = month ? `?month=${encodeURIComponent(month.slice(0, 7))}` : "";
    const data = await fetchJson<{ detail: ProjectDetailPayload }>(`/api/v2/projects/${projectId}/detail${qs}`);
    setDetail(data.detail);
    if (data.detail.workMonth) setWorkMonth(data.detail.workMonth);
  }, [projectId]);

  const loadTimer = useCallback(async () => {
    const data = await fetchJson<{ active: ActiveTimer | null }>("/api/v2/timer/active");
    setActive(data.active);
  }, []);

  useEffect(() => {
    Promise.all([load(), loadTimer()])
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [load, loadTimer]);

  useEffect(() => {
    if (!detail) return;
    setTaskCreationContext({
      projectId,
      lockedProject: {
        name: detail.name,
        shortName: detail.shortName,
        colorBg: detail.colorBg,
        colorTint: detail.colorTint,
        colorInk: detail.colorInk,
      },
      workMonth: detail.workMonth,
    });
    return () => setTaskCreationContext(null);
  }, [projectId, detail, setTaskCreationContext]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  const reloadRef = useRef<(month?: string | null) => Promise<void>>(async () => {});
  async function reload(month?: string | null) {
    setTick(0);
    await Promise.all([load(month ?? workMonth), loadTimer(), refreshBoot()]);
  }
  reloadRef.current = reload;

  const drawerReloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDrawerUpdated = useCallback(() => {
    if (drawerReloadTimer.current) clearTimeout(drawerReloadTimer.current);
    drawerReloadTimer.current = setTimeout(() => {
      void reloadRef.current();
    }, 700);
  }, []);

  async function changeWorkMonth(month: string) {
    setWorkMonth(month);
    setLoading(true);
    try {
      await load(month);
    } finally {
      setLoading(false);
    }
  }

  async function toggleTimer(taskId?: string) {
    setError(null);
    try {
      if (runningTaskId && taskId && runningTaskId !== taskId) {
        await fetchJson("/api/v2/timer/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId }),
        });
      } else if (runningTaskId && (!taskId || runningTaskId === taskId)) {
        await fetchJson("/api/v2/timer/stop", { method: "POST" });
      } else {
        const targetId = taskId ?? suggestedTask?.id;
        if (!targetId) {
          setError("Нет открытых задач — создайте задачу или выберите из списка");
          return;
        }
        await fetchJson("/api/v2/timer/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: targetId }),
        });
      }
      setTick(0);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось переключить таймер");
    }
  }

  async function saveProject(input: {
    name: string;
    status: PortfolioKanbanStatus;
    engagementType: "one_off" | "retainer";
    clientAccessEnabled: boolean;
    contractRef: string | null;
    releaseAt: string | null;
    budgetRub: number | null;
    paidRub: number | null;
    teamMemberUserIds: string[];
    clientUserIds: string[];
  }) {
    await fetchJson(`/api/v2/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        status: kanbanToV2Status(input.status),
        engagementType: input.engagementType,
        clientAccessEnabled: input.clientAccessEnabled,
        contractRef: input.contractRef,
        releaseAt: input.releaseAt,
        budgetRub: input.budgetRub,
        paidRub: input.paidRub,
        teamMemberUserIds: input.teamMemberUserIds,
        clientUserIds: input.clientUserIds,
      }),
    });
    await reload();
    await refreshBoot();
  }

  async function saveMembers(input: {
    teamMemberUserIds: string[];
    clientUserIds: string[];
    clientAccessEnabled: boolean;
  }) {
    await fetchJson(`/api/v2/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    await reload();
  }

  async function confirmDeleteProject() {
    setDeleting(true);
    setError(null);
    try {
      await fetchJson(`/api/v2/projects/${projectId}`, { method: "DELETE" });
      await refreshBoot();
      router.push(appPath("/v2/projects"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить проект");
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>;
  }

  if (!detail) {
    return <div className="flex min-h-[50vh] items-center justify-center text-[var(--v2-ink-500)]">Проект не найден</div>;
  }

  const badgeProject = {
    shortName: detail.shortName,
    name: detail.name,
    colorBg: detail.colorBg,
    colorInk: detail.colorInk,
    colorTint: detail.colorTint,
  };

  return (
    <>
      <div className="flex h-14 items-center gap-3 px-7">
        <div className="flex items-center gap-2 text-[13px] text-[var(--v2-ink-500)]">
          <Link href={appPath("/v2/projects")} className="v2-tight text-[var(--v2-ink-500)] transition hover:text-[var(--v2-ink-900)]">
            Проекты
          </Link>
          <span className="text-[var(--v2-ink-300)]">/</span>
          <span className="v2-tight inline-flex items-center gap-1.5 font-medium text-[var(--v2-ink-900)]">
            <span
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold"
              style={{
                background: detail.colorBg ?? "#EEEEF1",
                color: detail.colorInk ?? detail.colorTint ?? "#0A0A0B",
              }}
            >
              {detail.shortName ?? detail.name.slice(0, 1)}
            </span>
            {detail.name}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={openCommandPalette}
            className="hidden h-9 items-center gap-2 rounded-xl bg-white/70 px-3 text-[12.5px] text-[var(--v2-ink-600)] shadow-[var(--v2-shadow-card)] transition hover:text-[var(--v2-ink-900)] hover:shadow-[var(--v2-shadow-cardHv)] md:flex"
          >
            <V2Icons.command className="h-[15px] w-[15px]" /> Команды
          </button>
          <V2NotificationsBell />
          <button
            type="button"
            onClick={() => detail.canCreateTasks && openNewTask(projectId)}
            disabled={!detail.canCreateTasks}
            className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-3.5 text-[12.5px] font-medium text-white shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <V2Icons.plus className="h-4 w-4" />
            Новая задача
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1480px] px-8 pb-24 pt-3">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          ) : null}

          <ProjectDetailHeader
            detail={detail}
            badgeProject={badgeProject}
            runningTaskId={runningTaskId}
            runningTaskTitle={active?.task.title ?? null}
            suggestedTask={suggestedTask ? { id: suggestedTask.id, title: suggestedTask.title } : null}
            elapsed={elapsed}
            onToggleTimer={() => void toggleTimer()}
            onEditProject={detail.canManageMembers ? () => setEditProjectOpen(true) : undefined}
            onEditMembers={detail.canManageMembers ? () => setMembersModalOpen(true) : undefined}
            canDelete={detail.canManageMembers}
            onDeleteRequest={() => setDeleteOpen(true)}
          />

          <div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--v2-ink-200)] px-1 pb-0">
            <div className="flex items-end gap-1">
            {TABS.map((t) => {
              const Icon = V2Icons[t.icon];
              const activeTab = tab === t.id;
              const count = t.count?.(detail);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`v2-tight relative inline-flex h-10 items-center gap-1.5 px-3 text-[13px] transition ${activeTab ? "font-medium text-[var(--v2-ink-900)]" : "font-medium text-[var(--v2-ink-500)] hover:text-[var(--v2-ink-900)]"}`}
                >
                  <Icon className="h-[15px] w-[15px]" />
                  {t.label}
                  {count != null ? (
                    <span
                      className={`v2-tnum rounded-md px-1.5 py-px text-[10.5px] ${activeTab ? "bg-[var(--v2-ink-900)] text-white" : "bg-[var(--v2-ink-100)] text-[var(--v2-ink-600)]"}`}
                    >
                      {count}
                    </span>
                  ) : null}
                  {activeTab ? <span className="absolute -bottom-px left-0 right-0 h-[2px] rounded-full bg-[var(--v2-ink-900)]" /> : null}
                </button>
              );
            })}
            </div>
            {detail.engagementType === "retainer" && detail.workMonth && detail.availableMonths.length ? (
              <RetainerMonthPicker
                workMonth={detail.workMonth}
                availableMonths={detail.availableMonths}
                onChange={(m) => void changeWorkMonth(m)}
              />
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-12 gap-6">
            <div className="col-span-12 min-w-0 xl:col-span-9">
              {tab === "tasks" ? (
                detail.engagementType === "retainer" ? (
                  <ProjectDetailTasks
                    projectId={projectId}
                    tasks={detail.tasks}
                    team={detail.team}
                    runningTaskId={runningTaskId}
                    onOpenTask={setDrawerTaskId}
                    onReload={reload}
                    onToggleTimer={toggleTimer}
                    canCreateTasks={detail.canCreateTasks}
                    workMonth={detail.workMonth}
                  />
                ) : (
                  <ProjectDetailStages
                    projectId={projectId}
                    phases={detail.phases}
                    unphasedTasks={detail.unphasedTasks}
                    team={detail.team}
                    runningTaskId={runningTaskId}
                    onOpenTask={setDrawerTaskId}
                    onReload={reload}
                    onToggleTimer={toggleTimer}
                    canCreateTasks={detail.canCreateTasks}
                    workMonth={detail.workMonth}
                  />
                )
              ) : null}
              {tab === "kanban" ? (
                <ProjectDetailKanban detail={detail} runningTaskId={runningTaskId} onOpenTask={setDrawerTaskId} />
              ) : null}
              {tab === "activity" ? <ProjectDetailActivity activity={detail.activity} /> : null}
              {tab === "files" ? (
                <ProjectDetailFilesTab projectId={projectId} links={detail.links} files={detail.files} onReload={reload} />
              ) : null}
            </div>
            <div className="col-span-12 min-w-0 xl:col-span-3">
              <ProjectDetailSidebar
                detail={detail}
                badgeProject={badgeProject}
                projectId={projectId}
                onReload={reload}
                onEditMembers={detail.canManageMembers ? () => setMembersModalOpen(true) : undefined}
              />
            </div>
          </div>
        </div>
      </div>

      <DeleteProjectConfirmModal
        open={deleteOpen}
        projectName={detail.name}
        saving={deleting}
        onClose={() => {
          if (!deleting) setDeleteOpen(false);
        }}
        onConfirm={confirmDeleteProject}
      />

      <EditProjectModal
        open={editProjectOpen}
        detail={detail}
        members={members}
        meId={me?.id ?? null}
        onClose={() => setEditProjectOpen(false)}
        onSave={saveProject}
      />

      <EditProjectMembersModal
        open={membersModalOpen}
        projectName={detail.name}
        members={members}
        meId={me?.id ?? null}
        initialTeamMemberIds={detail.team.map((m) => m.userId)}
        initialClientUserIds={detail.clients.map((m) => m.userId)}
        initialClientAccessEnabled={detail.clientAccessEnabled}
        onClose={() => setMembersModalOpen(false)}
        onSave={saveMembers}
      />

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
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          short_name: p.short_name,
          color_bg: p.color_bg,
          color_tint: p.color_tint,
          color_ink: p.color_ink,
        }))}
        lockedProjectId={projectId}
        lockedProject={{
          name: detail.name,
          shortName: detail.shortName,
          colorBg: detail.colorBg,
          colorTint: detail.colorTint,
          colorInk: detail.colorInk,
        }}
        runningTaskId={runningTaskId}
        onToggleTimer={toggleTimer}
      />
    </>
  );
}
