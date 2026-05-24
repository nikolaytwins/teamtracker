"use client";

import { appPath } from "@/lib/api-url";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { PortfolioPayload, PortfolioKanbanStatus, PortfolioProject } from "@/lib/v2/projects/portfolio-types";
import { kanbanToV2Status } from "@/lib/v2/projects/portfolio-types";
import { STARRED_STORAGE_KEY, kanbanStatusToV2CreateStatus } from "@/components/v2/projects/portfolio-meta";
import { NewProjectModal, type NewProjectModalInput } from "@/components/v2/projects/new-project-modal";
import { DeleteProjectConfirmModal } from "@/components/v2/projects/delete-project-dialog";
import { PortfolioHero } from "@/components/v2/projects/portfolio-hero";
import { ProjectsPageHead } from "@/components/v2/projects/projects-page-head";
import { ProjectsTopbar } from "@/components/v2/projects/projects-topbar";
import {
  buildListSections,
  DoneSection,
  KanbanBoard,
  ListSection,
  StatusChips,
  ViewSwitcher,
} from "@/components/v2/projects/projects-views";
import { useV2Bootstrap } from "@/components/v2/shell/v2-app-shell";
import { canAccessPmBoard, normalizeTtUserRole } from "@/lib/roles";
import { V2Icons } from "@/components/v2/ui/icons";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function useStarredProjects() {
  const [starred, setStarred] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STARRED_STORAGE_KEY);
      if (raw) setStarred(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback((id: string) => {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(STARRED_STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  return { starred, toggle };
}

export function V2ProjectsClient() {
  const router = useRouter();
  const { me, refresh: refreshBoot, members: workspaceMembers } = useV2Bootstrap();
  const { starred, toggle: toggleStar } = useStarredProjects();
  const canDeleteProjects = canAccessPmBoard(normalizeTtUserRole(me?.role));

  const [payload, setPayload] = useState<PortfolioPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PortfolioProject | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchJson<PortfolioPayload>("/api/v2/projects/portfolio");
    setPayload(data);
  }, []);

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "p" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        setNewProjectOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const projects = payload?.projects ?? [];

  const active = useMemo(() => projects.filter((p) => p.status !== "done"), [projects]);
  const doneAll = useMemo(() => projects.filter((p) => p.status === "done"), [projects]);
  const doneThisMonth = useMemo(() => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return doneAll.filter((p) => p.completedAt && new Date(p.completedAt) >= monthStart);
  }, [doneAll]);

  const categories = useMemo(() => [...new Set(projects.map((p) => p.category))].sort(), [projects]);

  const filteredActive = useMemo(() => {
    let r = active;
    if (statusFilter !== "all") r = r.filter((p) => p.status === statusFilter);
    if (categoryFilter !== "all") r = r.filter((p) => p.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.team.some((m) => m.name.toLowerCase().includes(q))
      );
    }
    return r;
  }, [active, statusFilter, categoryFilter, search]);

  const statusCounts = useMemo(() => {
    const base = active.filter((p) => {
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !(
            p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.team.some((m) => m.name.toLowerCase().includes(q))
          )
        )
          return false;
      }
      return true;
    });
    const c: Record<string, number> = {};
    for (const s of ["not_started", "in_progress", "review", "paused", "done"] as const) c[s] = 0;
    base.forEach((p) => {
      c[p.status] = (c[p.status] ?? 0) + 1;
    });
    return c;
  }, [active, categoryFilter, search]);

  const totalActiveCount = useMemo(
    () =>
      active.filter((p) => {
        if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
        return true;
      }).length,
    [active, categoryFilter]
  );

  const sectionsForList = useMemo(
    () => buildListSections(filteredActive, statusFilter),
    [filteredActive, statusFilter]
  );

  const filteredForKanban = useMemo(() => {
    let r = projects;
    if (categoryFilter !== "all") r = r.filter((p) => p.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.team.some((m) => m.name.toLowerCase().includes(q))
      );
    }
    return r;
  }, [projects, categoryFilter, search]);

  const criticalProject = projects.find((p) => p.health === "critical" && p.status !== "done");

  async function reload() {
    await Promise.all([load(), refreshBoot()]);
  }

  async function createProjectFromModal(input: NewProjectModalInput) {
    await fetchJson("/api/v2/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        scope: "team",
        status: "not_started",
        engagementType: input.engagementType,
        clientName: input.clientName,
        clientId: input.clientId,
        releaseAt: input.releaseAt,
        projectSumRub: input.projectSumRub,
        teamMemberUserIds: input.teamMemberIds,
      }),
    });
    await reload();
  }

  async function createProject(name: string, status: PortfolioKanbanStatus) {
    await fetchJson("/api/v2/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        scope: "team",
        status: kanbanStatusToV2CreateStatus(status),
        engagementType: "one_off",
      }),
    });
    await reload();
  }

  async function moveProject(id: string, status: PortfolioKanbanStatus) {
    await fetchJson(`/api/v2/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: kanbanToV2Status(status) }),
    });
    await reload();
  }

  function openProject(id: string) {
    router.push(appPath(`/v2/projects/${id}`));
  }

  async function confirmDeleteProject() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await fetchJson(`/api/v2/projects/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить проект");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>;
  }

  return (
    <>
      <ProjectsTopbar onNewProject={() => setNewProjectOpen(true)} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1320px] px-10 pb-24 pt-8">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          ) : null}

          {payload ? (
            <>
              <ProjectsPageHead
                activeCount={payload.kpis.active}
                doneThisMonth={payload.kpis.doneThisMonth}
                projects={projects}
              />
              <PortfolioHero {...payload} />

              <div className="mt-8 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <ViewSwitcher view={view} setView={setView} />
                  <div className="mx-1 h-7 w-px bg-[var(--v2-ink-200)]" />
                  <div className="inline-flex h-9 min-w-[260px] items-center gap-2 rounded-xl bg-white px-3 shadow-[var(--v2-shadow-card)]">
                    <V2Icons.search className="h-[15px] w-[15px] text-[var(--v2-ink-400)]" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Поиск проекта, категории, участника…"
                      className="v2-tight flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--v2-ink-400)]"
                    />
                    {search ? (
                      <button type="button" onClick={() => setSearch("")} className="text-[12px] text-[var(--v2-ink-400)] hover:text-[var(--v2-ink-700)]">
                        ×
                      </button>
                    ) : null}
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="v2-tight h-9 cursor-pointer rounded-xl bg-white px-3 text-[12.5px] text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] outline-none hover:shadow-[var(--v2-shadow-cardHv)]"
                    >
                      <option value="all">Все категории</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[12.5px] text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]"
                    >
                      <V2Icons.sort className="h-4 w-4 text-[var(--v2-ink-500)]" /> Срок
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[12.5px] text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]"
                    >
                      <V2Icons.filter className="h-4 w-4 text-[var(--v2-ink-500)]" /> Ещё фильтры
                    </button>
                  </div>
                </div>
                <StatusChips
                  filter={statusFilter}
                  setFilter={setStatusFilter}
                  counts={statusCounts}
                  totalActive={totalActiveCount}
                />
              </div>

              {view === "list" ? (
                <>
                  <div className="mt-2">
                    {sectionsForList.map((s) => (
                      <ListSection
                        key={s.id}
                        title={s.title}
                        subtitle={s.subtitle}
                        accent={s.accent}
                        projects={s.list}
                        starredIds={starred}
                        onOpen={openProject}
                        onToggleStar={toggleStar}
                        onAdd={(name, st) => void createProject(name, st)}
                        defaultStatus={s.defaultStatus}
                        allowAdd={s.allowAdd}
                        canDelete={canDeleteProjects}
                        onDeleteRequest={setDeleteTarget}
                      />
                    ))}
                  </div>
                  <DoneSection projects={doneThisMonth} onOpen={openProject} />
                </>
              ) : (
                <div className="mt-6">
                  <KanbanBoard
                    projects={filteredForKanban}
                    starredIds={starred}
                    onOpen={openProject}
                    onToggleStar={toggleStar}
                    onMove={(id, st) => void moveProject(id, st)}
                    onAdd={(name, st) => void createProject(name, st)}
                  />
                </div>
              )}

              {criticalProject ? (
                <div className="mt-12 flex items-center justify-between rounded-2xl bg-white/60 p-5 shadow-[var(--v2-shadow-card)] backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--v2-brand-500)] to-[var(--v2-brand-600)] text-white shadow-[var(--v2-shadow-glow)]">
                      <V2Icons.spark className="h-[18px] w-[18px]" />
                    </div>
                    <div>
                      <div className="v2-tight text-[14px] font-semibold text-[var(--v2-ink-900)]">
                        Обратить внимание на «{criticalProject.name}»?
                      </div>
                      <div className="text-[12.5px] text-[var(--v2-ink-500)]">
                        {criticalProject.tasksDone} из {criticalProject.tasksTotal} задач закрыты
                        {criticalProject.deadlineDays !== null && criticalProject.deadlineDays >= 0
                          ? ` · дедлайн ${criticalProject.deadline}`
                          : ""}
                        .
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="v2-tight h-9 rounded-xl bg-white px-3.5 text-[12.5px] font-medium text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]">
                      Не сейчас
                    </button>
                    <button
                      type="button"
                      onClick={() => openProject(criticalProject.id)}
                      className="v2-tight h-9 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[12.5px] font-medium text-white transition hover:bg-[var(--v2-ink-700)]"
                    >
                      Открыть
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <NewProjectModal
        open={newProjectOpen}
        members={workspaceMembers}
        onClose={() => setNewProjectOpen(false)}
        onCreate={createProjectFromModal}
      />
      <DeleteProjectConfirmModal
        open={!!deleteTarget}
        projectName={deleteTarget?.name ?? ""}
        saving={deleting}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={confirmDeleteProject}
      />
    </>
  );
}
