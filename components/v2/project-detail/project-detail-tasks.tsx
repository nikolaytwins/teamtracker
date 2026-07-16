"use client";

import { fmtHoursMinutes } from "@/lib/v2/format";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { PortfolioMember } from "@/lib/v2/projects/portfolio-types";
import type { ProjectDetailSubtask, ProjectDetailTask } from "@/lib/v2/projects/project-detail-types";
import { MemberAvatar } from "@/components/v2/projects/project-atoms";
import {
  InlineAssigneeEditor,
  InlineDeadlineEditor,
  InlinePlannedEditor,
  InlinePopover,
  InlinePriorityEditor,
  InlineTitleEditor,
  memberFromTeam,
} from "@/components/v2/tasks/task-inline-editors";
import { PRIORITY_META, V2Icons } from "@/components/v2/ui/icons";
import { IconBtn, PriorityDot, TaskCheckbox, TimerButton } from "@/components/v2/ui/primitives";
import { useState } from "react";

type InlineField = "priority" | "assignee" | "planned" | "deadline" | null;

const fmtHours = fmtHoursMinutes;

function stopRowClick(e: React.MouseEvent) {
  e.stopPropagation();
}

function TaskEditButton({ onOpen }: { onOpen: () => void }) {
  return (
    <IconBtn title="Редактировать" onClick={onOpen} className="shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
      <V2Icons.edit className="h-4 w-4" />
    </IconBtn>
  );
}

function PlannedChip({
  label,
  completed,
  onClick,
}: {
  label: string;
  completed: boolean;
  onClick: () => void;
}) {
  const hasDate = label !== "—";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="rounded-md px-1 py-0.5 transition hover:bg-[var(--v2-ink-100)]/80"
      title="Дата выполнения"
    >
      <span
        className={`v2-tight v2-tnum inline-flex items-center gap-1 text-[11.5px] ${
          hasDate
            ? completed
              ? "text-[var(--v2-ink-400)]"
              : "font-medium text-[var(--v2-brand-700)]"
            : "text-[var(--v2-ink-400)]"
        }`}
      >
        <V2Icons.cal className="h-3 w-3 opacity-70" />
        {hasDate ? label : "без даты"}
      </span>
    </button>
  );
}

function DeadlineChip({
  label,
  completed,
  onClick,
}: {
  label: string;
  completed: boolean;
  onClick: () => void;
}) {
  const hasDate = label !== "—";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="rounded-md px-1 py-0.5 transition hover:bg-[var(--v2-ink-100)]/80"
      title="Дедлайн"
    >
      <span
        className={`v2-tight v2-tnum inline-flex items-center gap-1 text-[11.5px] ${
          hasDate
            ? completed
              ? "text-[var(--v2-ink-400)]"
              : "text-[var(--v2-ink-600)]"
            : "text-[var(--v2-ink-400)]"
        }`}
      >
        <V2Icons.clock className="h-3 w-3 opacity-70" />
        <span className="text-[10.5px] font-medium uppercase tracking-[0.04em] text-[var(--v2-ink-500)]">дедлайн</span>
        {hasDate ? label : "—"}
      </span>
    </button>
  );
}

function TaskMicroProgress({ logged, est, completed }: { logged: number; est: number; completed: boolean }) {
  const pct = est > 0 ? Math.min(logged / est, 1.2) : 0;
  const over = est > 0 && logged > est * 1.05;
  return (
    <div className="hidden min-w-[108px] items-center gap-2 sm:flex">
      <div className="h-1 w-[52px] overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(pct, 1) * 100}%`,
            background: completed ? "#10B981" : over ? "#EF4444" : pct > 0.85 ? "#F59E0B" : "#3B6FF7",
          }}
        />
      </div>
      <div className="v2-tight v2-tnum whitespace-nowrap text-[11px] text-[var(--v2-ink-500)]">
        <span className={completed ? "text-emerald-600" : over ? "text-red-600" : "font-medium text-[var(--v2-ink-700)]"}>
          {fmtHours(logged)}
        </span>
        {est > 0 ? <span className="text-[var(--v2-ink-400)]"> / {fmtHours(est)}</span> : null}
      </div>
    </div>
  );
}

function TaskInlineMeta({
  taskId,
  priority,
  assigneeUserId,
  assigneeName,
  plannedAt,
  deadlineAt,
  plannedLabel,
  deadlineLabel,
  completed,
  team,
  onReload,
  compact = false,
}: {
  taskId: string;
  priority: ProjectDetailTask["priority"];
  assigneeUserId: string | null;
  assigneeName: string | null;
  plannedAt: string | null;
  deadlineAt: string | null;
  plannedLabel: string;
  deadlineLabel: string;
  completed: boolean;
  team: PortfolioMember[];
  onReload?: () => Promise<void>;
  compact?: boolean;
}) {
  const [openField, setOpenField] = useState<InlineField>(null);
  const member = memberFromTeam(assigneeUserId, assigneeName, team);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "mt-1"}`}>
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpenField((f) => (f === "priority" ? null : "priority"));
          }}
          className="rounded-md px-1 py-0.5 transition hover:bg-[var(--v2-ink-100)]/80"
          title="Изменить приоритет"
        >
          <PriorityDot priority={priority} />
        </button>
        <InlinePopover open={openField === "priority"} onClose={() => setOpenField(null)}>
          <InlinePriorityEditor
            taskId={taskId}
            value={priority}
            onReload={onReload}
            onClose={() => setOpenField(null)}
          />
        </InlinePopover>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpenField((f) => (f === "assignee" ? null : "assignee"));
          }}
          className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 transition hover:bg-[var(--v2-ink-100)]/80"
          title="Назначить ответственного"
        >
          {member ? (
            <>
              <MemberAvatar member={member} size={compact ? 20 : 20} />
              <span className={`v2-tight text-[var(--v2-ink-600)] ${compact ? "hidden max-w-[72px] truncate text-[11px] lg:inline" : "text-[12px]"}`}>
                {member.name.split(" ")[0]}
              </span>
            </>
          ) : (
            <span className={`v2-tight text-[var(--v2-ink-400)] ${compact ? "text-[11px]" : "text-[12px]"}`}>Без ответственного</span>
          )}
        </button>
        <InlinePopover open={openField === "assignee"} onClose={() => setOpenField(null)} className="min-w-[200px]">
          <InlineAssigneeEditor
            taskId={taskId}
            value={assigneeUserId}
            team={team}
            onReload={onReload}
            onClose={() => setOpenField(null)}
          />
        </InlinePopover>
      </div>

      <div className="relative">
        <PlannedChip
          label={plannedLabel}
          completed={completed}
          onClick={() => setOpenField((f) => (f === "planned" ? null : "planned"))}
        />
        <InlinePopover open={openField === "planned"} onClose={() => setOpenField(null)}>
          <InlinePlannedEditor taskId={taskId} plannedAt={plannedAt} onReload={onReload} onClose={() => setOpenField(null)} />
        </InlinePopover>
      </div>

      <div className="relative">
        <DeadlineChip
          label={deadlineLabel}
          completed={completed}
          onClick={() => setOpenField((f) => (f === "deadline" ? null : "deadline"))}
        />
        <InlinePopover open={openField === "deadline"} onClose={() => setOpenField(null)}>
          <InlineDeadlineEditor taskId={taskId} deadlineAt={deadlineAt} onReload={onReload} onClose={() => setOpenField(null)} />
        </InlinePopover>
      </div>
    </div>
  );
}

function SubtaskRow({
  st,
  team,
  last,
  onOpenTask,
  onReload,
  onToggleDone,
}: {
  st: ProjectDetailSubtask;
  team: PortfolioMember[];
  last: boolean;
  onOpenTask: (id: string) => void;
  onReload?: () => Promise<void>;
  onToggleDone: (id: string, completed: boolean) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const completed = st.status === "done" || !!st.completedAt;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenTask(st.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenTask(st.id);
        }
      }}
      className="group relative w-full cursor-pointer py-2 pl-[52px] pr-2 transition hover:bg-[var(--v2-ink-50)]/60 sm:pl-[60px] sm:pr-3"
    >
      <span aria-hidden className="absolute bottom-0 left-[36px] top-0 w-px bg-[var(--v2-ink-200)]" />
      <span aria-hidden className="absolute left-[36px] top-[19px] h-px w-4 bg-[var(--v2-ink-200)]" />
      {last ? <span aria-hidden className="absolute bottom-0 left-[36px] top-5 w-px bg-white" /> : null}
      <div className="relative flex items-center gap-2 sm:gap-3">
        <span onClick={stopRowClick} onMouseDown={stopRowClick}>
          <TaskCheckbox checked={completed} onChange={() => onToggleDone(st.id, !completed)} />
        </span>
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <span onClick={stopRowClick} onMouseDown={stopRowClick}>
              <InlineTitleEditor
                taskId={st.id}
                title={st.title}
                completed={completed}
                onReload={onReload}
                onDone={() => setEditingTitle(false)}
              />
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditingTitle(true);
              }}
              className={`v2-tight block w-full truncate text-left text-[13px] transition hover:text-[var(--v2-brand-700)] ${completed ? "text-[var(--v2-ink-400)] line-through decoration-[var(--v2-ink-300)]" : "font-medium text-[var(--v2-ink-800)]"}`}
            >
              {st.title}
            </button>
          )}
          <TaskInlineMeta
            taskId={st.id}
            priority={st.priority}
            assigneeUserId={st.assigneeUserId}
            assigneeName={st.assigneeName}
            plannedAt={st.plannedAt}
            deadlineAt={st.deadlineAt}
            plannedLabel={st.plannedLabel}
            deadlineLabel={st.deadlineLabel}
            completed={completed}
            team={team}
            onReload={onReload}
            compact
          />
        </div>
        <TaskMicroProgress logged={st.loggedHours} est={st.estimateHours} completed={completed} />
        <span onClick={stopRowClick} onMouseDown={stopRowClick}>
          <TaskEditButton onOpen={() => onOpenTask(st.id)} />
        </span>
      </div>
    </div>
  );
}

export function TaskRow({
  task,
  team,
  expanded,
  onToggleExpand,
  runningTaskId,
  onOpenTask,
  onToggleTimer,
  onToggleDone,
  onReload,
}: {
  task: ProjectDetailTask;
  team: PortfolioMember[];
  expanded: boolean;
  onToggleExpand: () => void;
  runningTaskId: string | null;
  onOpenTask: (id: string) => void;
  onToggleTimer: (id: string) => void;
  onToggleDone: (id: string, completed: boolean) => void;
  onReload?: () => Promise<void>;
}) {
  const hasSubs = task.subtasks.length > 0;
  const subsDone = task.subtasks.filter((s) => s.status === "done").length;
  const running = runningTaskId === task.id;
  const completed = !!task.completedAt || task.status === "done";
  const pm = PRIORITY_META[task.priority ?? "medium"];
  const [editingTitle, setEditingTitle] = useState(false);

  return (
    <div className={`transition-colors ${running ? "bg-[var(--v2-brand-50)]/40" : "hover:bg-[var(--v2-ink-50)]/60"}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenTask(task.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenTask(task.id);
          }
        }}
        className="group relative flex cursor-pointer items-center gap-2 py-2.5 pl-3 pr-2 sm:gap-3 sm:pl-4 sm:pr-3"
      >
        <span
          aria-hidden
          className="absolute bottom-2 left-0 top-2 w-0.5 rounded-r-full"
          style={{ background: pm.dot, opacity: completed ? 0.18 : 0.65 }}
        />

        <span onClick={stopRowClick} onMouseDown={stopRowClick}>
          <TaskCheckbox checked={completed} onChange={() => onToggleDone(task.id, !completed)} />
        </span>

        <button
          type="button"
          onClick={(e) => {
            stopRowClick(e);
            onToggleExpand();
          }}
          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--v2-ink-400)] transition hover:text-[var(--v2-ink-900)] ${hasSubs ? "" : "pointer-events-none opacity-0"}`}
        >
          <V2Icons.chev className={`h-4 w-4 transition-transform ${expanded ? "" : "-rotate-90"}`} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {editingTitle ? (
              <span onClick={stopRowClick} onMouseDown={stopRowClick}>
                <InlineTitleEditor
                  taskId={task.id}
                  title={task.title}
                  completed={completed}
                  onReload={onReload}
                  onDone={() => setEditingTitle(false)}
                />
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTitle(true);
                }}
                className={`v2-tight truncate text-left text-[13.5px] transition hover:text-[var(--v2-brand-700)] ${completed ? "font-medium text-[var(--v2-ink-400)] line-through decoration-[var(--v2-ink-300)]" : "font-medium text-[var(--v2-ink-900)]"}`}
              >
                {task.title}
              </button>
            )}
            {hasSubs ? (
              <span className="v2-tight v2-tnum inline-flex items-center gap-1 rounded-md bg-[var(--v2-ink-100)]/80 px-1.5 py-px text-[10.5px] text-[var(--v2-ink-500)]">
                {subsDone}/{task.subtasks.length}
              </span>
            ) : null}
            {running ? (
              <span className="v2-tight inline-flex items-center gap-1 rounded-md bg-[var(--v2-brand-100)] px-1.5 py-px text-[10.5px] font-semibold text-[var(--v2-brand-700)]">
                <span className="v2-livedot relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--v2-brand-600)] text-[var(--v2-brand-600)]" />
                идёт
              </span>
            ) : null}
          </div>
          <TaskInlineMeta
            taskId={task.id}
            priority={task.priority}
            assigneeUserId={task.assigneeUserId}
            assigneeName={task.assigneeName}
            plannedAt={task.plannedAt}
            deadlineAt={task.deadlineAt}
            plannedLabel={task.plannedLabel}
            deadlineLabel={task.deadlineLabel}
            completed={completed}
            team={team}
            onReload={onReload}
          />
        </div>

        <TaskMicroProgress logged={task.loggedHours} est={task.estimateHours} completed={completed} />

        <div className="flex shrink-0 items-center gap-0.5">
          <span onClick={stopRowClick} onMouseDown={stopRowClick}>
            <TimerButton running={running} onClick={() => onToggleTimer(task.id)} />
          </span>
          <span onClick={stopRowClick} onMouseDown={stopRowClick}>
            <TaskEditButton onOpen={() => onOpenTask(task.id)} />
          </span>
        </div>
      </div>
      {hasSubs && expanded ? (
        <div className="pb-1.5">
          {task.subtasks.map((st, i) => (
            <SubtaskRow
              key={st.id}
              st={st}
              team={team}
              last={i === task.subtasks.length - 1}
              onOpenTask={onOpenTask}
              onReload={onReload}
              onToggleDone={onToggleDone}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ProjectDetailTasks({
  projectId,
  tasks,
  team,
  runningTaskId,
  onOpenTask,
  onReload,
  onToggleTimer,
  canCreateTasks = true,
  workMonth,
}: {
  projectId: string;
  tasks: ProjectDetailTask[];
  team: PortfolioMember[];
  runningTaskId: string | null;
  onOpenTask: (id: string) => void;
  onReload: () => Promise<void>;
  onToggleTimer: (id: string) => void;
  canCreateTasks?: boolean;
  workMonth?: string | null;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setSaving(true);
    try {
      await fetchJson("/api/v2/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          projectId,
          workMonth: workMonth ? workMonth.slice(0, 7) : undefined,
        }),
      });
      setNewTitle("");
      await onReload();
    } finally {
      setSaving(false);
    }
  }

  async function toggleDone(taskId: string, completed: boolean) {
    await fetchJson(`/api/v2/tasks/${taskId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", completed }),
    });
    await onReload();
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-[var(--v2-shadow-card)]">
      <div className="divide-y divide-[var(--v2-ink-100)]/70">
        {tasks.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-[var(--v2-ink-400)]">Нет задач — добавьте первую ниже</p>
        ) : (
          tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              team={team}
              expanded={expanded[task.id] ?? hasDefaultExpanded(task)}
              onToggleExpand={() => setExpanded((prev) => ({ ...prev, [task.id]: !(prev[task.id] ?? hasDefaultExpanded(task)) }))}
              runningTaskId={runningTaskId}
              onOpenTask={onOpenTask}
              onToggleTimer={onToggleTimer}
              onToggleDone={toggleDone}
              onReload={onReload}
            />
          ))
        )}
      </div>
      <form onSubmit={addTask} className="border-t border-[var(--v2-ink-100)] px-4 py-3">
        {canCreateTasks ? (
          <div className="flex items-center gap-2">
            <V2Icons.plus className="h-4 w-4 text-[var(--v2-ink-400)]" />
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Добавить задачу…"
              className="v2-tight flex-1 border-0 bg-transparent text-[13px] text-[var(--v2-ink-900)] outline-none placeholder:text-[var(--v2-ink-400)]"
            />
            <button
              type="submit"
              disabled={saving || !newTitle.trim()}
              className="v2-tight rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[var(--v2-brand-700)] hover:bg-[var(--v2-brand-50)] disabled:opacity-40"
            >
              Добавить
            </button>
          </div>
        ) : (
          <p className="v2-tight text-center text-[12px] text-[var(--v2-ink-400)]">Нет прав на добавление задач</p>
        )}
      </form>
    </section>
  );
}

function hasDefaultExpanded(task: ProjectDetailTask): boolean {
  return task.subtasks.some((s) => s.status !== "done");
}

export { hasDefaultExpanded };
