"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { ProjectDetailPhase, ProjectDetailTask } from "@/lib/v2/projects/project-detail-types";
import type { PortfolioMember } from "@/lib/v2/projects/portfolio-types";
import { TaskRow, hasDefaultExpanded } from "@/components/v2/project-detail/project-detail-tasks";
import { V2Icons } from "@/components/v2/ui/icons";
import { useMemo, useState } from "react";

function fmtHours(h: number): string {
  if (!h) return "0ч";
  const hi = Math.floor(h);
  const mm = Math.round((h - hi) * 60);
  if (hi && mm) return `${hi}ч ${mm}м`;
  if (hi) return `${hi}ч`;
  return `${mm}м`;
}

const STATUS_LABEL: Record<ProjectDetailPhase["status"], { label: string; bg: string; ink: string }> = {
  done: { label: "Готово", bg: "#D1FAE5", ink: "#065F46" },
  in_progress: { label: "В работе", bg: "#E6EDFF", ink: "#1F3AAF" },
  todo: { label: "Не начат", bg: "#F1F1F4", ink: "#52525B" },
};

const STATUS_DOT_COLORS = {
  done: "#10B981",
  in_progress: "#3B6FF7",
  review: "#F59E0B",
  todo: "#A1A1AA",
} as const;

function PhaseStatusDots({ counts }: { counts: ProjectDetailPhase["statusCounts"] }) {
  const items = (
    [
      ["done", counts.done],
      ["in_progress", counts.in_progress],
      ["review", counts.review],
      ["todo", counts.todo],
    ] as const
  ).filter(([, n]) => n > 0);

  if (!items.length) return null;

  return (
    <div className="hidden items-center gap-1.5 sm:flex">
      {items.map(([key, n]) => (
        <span key={key} className="v2-tnum inline-flex items-center gap-1 text-[11px] text-[var(--v2-ink-500)]">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_DOT_COLORS[key] }} />
          {n}
        </span>
      ))}
    </div>
  );
}

function PhaseRow({
  phase,
  index,
  team,
  expanded,
  onToggle,
  runningTaskId,
  onOpenTask,
  onToggleTimer,
  onToggleDone,
  canCreateTasks,
  onAddTask,
  adding,
  draft,
  onDraftChange,
}: {
  phase: ProjectDetailPhase;
  index: number;
  team: PortfolioMember[];
  expanded: boolean;
  onToggle: () => void;
  runningTaskId: string | null;
  onOpenTask: (id: string) => void;
  onToggleTimer: (id: string) => void;
  onToggleDone: (id: string, completed: boolean) => void;
  canCreateTasks: boolean;
  onAddTask: (e: React.FormEvent) => void;
  adding: boolean;
  draft: string;
  onDraftChange: (v: string) => void;
}) {
  const badge = STATUS_LABEL[phase.status];
  const pct = phase.tasksTotal > 0 ? phase.tasksDone / phase.tasksTotal : 0;
  const barColor = phase.status === "done" ? "#10B981" : phase.status === "in_progress" ? "#3B6FF7" : "#A1A1AA";
  const numColor = phase.status === "done" ? "#10B981" : phase.status === "in_progress" ? "#3B6FF7" : "#A1A1AA";
  const [taskExpanded, setTaskExpanded] = useState<Record<string, boolean>>({});

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-[var(--v2-shadow-card)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[var(--v2-ink-50)]/60 sm:gap-4 sm:px-5"
      >
        <V2Icons.chev className={`h-4 w-4 shrink-0 text-[var(--v2-ink-400)] transition-transform ${expanded ? "" : "-rotate-90"}`} />
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
          style={{ background: numColor }}
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="v2-tight text-[15px] font-semibold text-[var(--v2-ink-900)]">{phase.title}</span>
            <span
              className="v2-tight inline-flex rounded-md px-1.5 py-px text-[11px] font-medium"
              style={{ background: badge.bg, color: badge.ink }}
            >
              {badge.label}
            </span>
          </div>
          {phase.description ? (
            <p className="v2-tight mt-0.5 truncate text-[12.5px] text-[var(--v2-ink-500)]">{phase.description}</p>
          ) : null}
        </div>
        <PhaseStatusDots counts={phase.statusCounts} />
        <div className="hidden min-w-[72px] items-center gap-2 md:flex">
          <div className="h-1 w-14 overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
            <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 1) * 100}%`, background: barColor }} />
          </div>
          <span className="v2-tnum text-[11px] text-[var(--v2-ink-500)]">
            {phase.tasksDone}/{phase.tasksTotal}
          </span>
        </div>
        <span className="v2-tnum hidden shrink-0 text-[12px] text-[var(--v2-ink-600)] lg:inline">
          {fmtHours(phase.loggedHours)}
          {phase.estimateHours ? ` / ${fmtHours(phase.estimateHours)}` : ""}
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-[var(--v2-ink-100)]/70">
          <div className="divide-y divide-[var(--v2-ink-100)]/70">
            {phase.tasks.length === 0 ? (
              <p className="px-5 py-6 text-center text-[13px] text-[var(--v2-ink-400)]">Нет задач в этом этапе</p>
            ) : (
              phase.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  team={team}
                  expanded={taskExpanded[task.id] ?? hasDefaultExpanded(task)}
                  onToggleExpand={() =>
                    setTaskExpanded((prev) => ({
                      ...prev,
                      [task.id]: !(prev[task.id] ?? hasDefaultExpanded(task)),
                    }))
                  }
                  runningTaskId={runningTaskId}
                  onOpenTask={onOpenTask}
                  onToggleTimer={onToggleTimer}
                  onToggleDone={onToggleDone}
                />
              ))
            )}
          </div>
          {canCreateTasks ? (
            <form onSubmit={onAddTask} className="border-t border-[var(--v2-ink-100)] px-4 py-3">
              <div className="flex items-center gap-2">
                <V2Icons.plus className="h-4 w-4 text-[var(--v2-ink-400)]" />
                <input
                  value={draft}
                  onChange={(e) => onDraftChange(e.target.value)}
                  placeholder="Добавить задачу в этап…"
                  className="v2-tight flex-1 border-0 bg-transparent text-[13px] outline-none placeholder:text-[var(--v2-ink-400)]"
                />
                <button
                  type="submit"
                  disabled={adding || !draft.trim()}
                  className="v2-tight rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[var(--v2-brand-700)] hover:bg-[var(--v2-brand-50)] disabled:opacity-40"
                >
                  Добавить
                </button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function ProjectDetailStages({
  projectId,
  phases,
  unphasedTasks,
  team,
  runningTaskId,
  onOpenTask,
  onReload,
  onToggleTimer,
  canCreateTasks = true,
  workMonth,
}: {
  projectId: string;
  phases: ProjectDetailPhase[];
  unphasedTasks: ProjectDetailTask[];
  team: PortfolioMember[];
  runningTaskId: string | null;
  onOpenTask: (id: string) => void;
  onReload: () => Promise<void>;
  onToggleTimer: (id: string) => void;
  canCreateTasks?: boolean;
  workMonth?: string | null;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newPhaseTitle, setNewPhaseTitle] = useState("");
  const [newPhaseDesc, setNewPhaseDesc] = useState("");
  const [phaseDrafts, setPhaseDrafts] = useState<Record<string, string>>({});
  const [unphasedDraft, setUnphasedDraft] = useState("");
  const [unphasedExpanded, setUnphasedExpanded] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const defaultExpanded = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const p of phases) {
      map[p.id] = p.status === "in_progress" || p.tasks.some((t) => t.subtasks.some((s) => s.status !== "done"));
    }
    return map;
  }, [phases]);

  async function toggleDone(taskId: string, completed: boolean) {
    await fetchJson(`/api/v2/tasks/${taskId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", completed }),
    });
    await onReload();
  }

  async function addPhase(e: React.FormEvent) {
    e.preventDefault();
    const title = newPhaseTitle.trim();
    if (!title) return;
    setSaving(true);
    try {
      await fetchJson(`/api/v2/projects/${projectId}/phases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: newPhaseDesc.trim() || undefined }),
      });
      setNewPhaseTitle("");
      setNewPhaseDesc("");
      await onReload();
    } finally {
      setSaving(false);
    }
  }

  async function addTask(phaseId: string | null, title: string, clear: () => void) {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await fetchJson("/api/v2/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          projectId,
          phaseId,
          workMonth: workMonth ? workMonth.slice(0, 7) : undefined,
        }),
      });
      clear();
      await onReload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {phases.map((phase, index) => (
        <PhaseRow
          key={phase.id}
          phase={phase}
          index={index}
          team={team}
          expanded={expanded[phase.id] ?? defaultExpanded[phase.id] ?? false}
          onToggle={() => setExpanded((prev) => ({ ...prev, [phase.id]: !(prev[phase.id] ?? defaultExpanded[phase.id] ?? false) }))}
          runningTaskId={runningTaskId}
          onOpenTask={onOpenTask}
          onToggleTimer={onToggleTimer}
          onToggleDone={toggleDone}
          canCreateTasks={canCreateTasks}
          draft={phaseDrafts[phase.id] ?? ""}
          onDraftChange={(v) => setPhaseDrafts((prev) => ({ ...prev, [phase.id]: v }))}
          adding={saving}
          onAddTask={(e) => {
            e.preventDefault();
            void addTask(phase.id, phaseDrafts[phase.id] ?? "", () =>
              setPhaseDrafts((prev) => ({ ...prev, [phase.id]: "" }))
            );
          }}
        />
      ))}

      {unphasedTasks.length > 0 || phases.length > 0 ? (
        <section className="overflow-hidden rounded-2xl bg-white shadow-[var(--v2-shadow-card)]">
          <div className="border-b border-[var(--v2-ink-100)] px-5 py-3">
            <h3 className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-700)]">Без этапа</h3>
          </div>
          <div className="divide-y divide-[var(--v2-ink-100)]/70">
            {unphasedTasks.length === 0 ? (
              <p className="px-5 py-5 text-center text-[13px] text-[var(--v2-ink-400)]">Все задачи распределены по этапам</p>
            ) : (
              unphasedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  team={team}
                  expanded={unphasedExpanded[task.id] ?? hasDefaultExpanded(task)}
                  onToggleExpand={() =>
                    setUnphasedExpanded((prev) => ({
                      ...prev,
                      [task.id]: !(prev[task.id] ?? hasDefaultExpanded(task)),
                    }))
                  }
                  runningTaskId={runningTaskId}
                  onOpenTask={onOpenTask}
                  onToggleTimer={onToggleTimer}
                  onToggleDone={toggleDone}
                />
              ))
            )}
          </div>
          {canCreateTasks ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void addTask(null, unphasedDraft, () => setUnphasedDraft(""));
              }}
              className="border-t border-[var(--v2-ink-100)] px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <V2Icons.plus className="h-4 w-4 text-[var(--v2-ink-400)]" />
                <input
                  value={unphasedDraft}
                  onChange={(e) => setUnphasedDraft(e.target.value)}
                  placeholder="Добавить задачу без этапа…"
                  className="v2-tight flex-1 border-0 bg-transparent text-[13px] outline-none placeholder:text-[var(--v2-ink-400)]"
                />
                <button type="submit" disabled={saving || !unphasedDraft.trim()} className="v2-tight rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[var(--v2-brand-700)] hover:bg-[var(--v2-brand-50)] disabled:opacity-40">
                  Добавить
                </button>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}

      {canCreateTasks ? (
        <form onSubmit={addPhase} className="rounded-2xl border border-dashed border-[var(--v2-ink-200)] bg-white/60 p-4">
          <p className="v2-tight mb-3 text-[13px] font-medium text-[var(--v2-ink-700)]">Новый этап</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="v2-input flex-1 text-[13px]"
              placeholder="Название этапа"
              value={newPhaseTitle}
              onChange={(e) => setNewPhaseTitle(e.target.value)}
            />
            <input
              className="v2-input flex-1 text-[13px]"
              placeholder="Описание (необязательно)"
              value={newPhaseDesc}
              onChange={(e) => setNewPhaseDesc(e.target.value)}
            />
            <button type="submit" disabled={saving || !newPhaseTitle.trim()} className="v2-btn-primary shrink-0 px-4 disabled:opacity-40">
              Добавить этап
            </button>
          </div>
        </form>
      ) : null}

      {phases.length === 0 && unphasedTasks.length === 0 ? (
        <p className="rounded-2xl bg-white px-5 py-10 text-center text-[13px] text-[var(--v2-ink-400)] shadow-[var(--v2-shadow-card)]">
          Создайте первый этап, затем добавляйте задачи — как в макете проекта
        </p>
      ) : null}
    </div>
  );
}
