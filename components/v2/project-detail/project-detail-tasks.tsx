"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { PortfolioKanbanStatus, PortfolioMember } from "@/lib/v2/projects/portfolio-types";
import type { ProjectDetailSubtask, ProjectDetailTask } from "@/lib/v2/projects/project-detail-types";
import type { V2TaskStatus } from "@/lib/v2/types";
import { MemberAvatar, StatusBadge } from "@/components/v2/projects/project-atoms";
import { PRIORITY_META, V2Icons } from "@/components/v2/ui/icons";
import { useState } from "react";

function taskStatusToBadge(status: V2TaskStatus): PortfolioKanbanStatus {
  if (status === "todo") return "not_started";
  return status;
}

function fmtHours(h: number): string {
  if (!h) return "0ч";
  const hi = Math.floor(h);
  const mm = Math.round((h - hi) * 60);
  if (hi && mm) return `${hi}ч ${mm}м`;
  if (hi) return `${hi}ч`;
  return `${mm}м`;
}

function DueChip({ due, status }: { due: string; status: V2TaskStatus }) {
  const overdue = /назад|вчера/i.test(due);
  const today = /сегодня/i.test(due);
  const tomorrow = /завтра/i.test(due);
  const cls =
    status === "done"
      ? "text-[var(--v2-ink-400)]"
      : overdue
        ? "font-medium text-red-600"
        : today
          ? "font-medium text-amber-700"
          : tomorrow
            ? "font-medium text-[var(--v2-brand-700)]"
            : "text-[var(--v2-ink-600)]";
  return (
    <span className={`v2-tight v2-tnum inline-flex items-center gap-1 text-[11.5px] ${cls}`}>
      <V2Icons.clock className="h-3 w-3 opacity-70" />
      {due}
    </span>
  );
}

function PriorityPill({ priority }: { priority: keyof typeof PRIORITY_META }) {
  const m = PRIORITY_META[priority];
  return (
    <span className="v2-tight inline-flex items-center gap-1 rounded-md px-1.5 py-[2px] text-[11.5px] font-medium" style={{ background: m.soft, color: m.ink }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

function TaskMicroProgress({ logged, est, completed }: { logged: number; est: number; completed: boolean }) {
  const pct = est > 0 ? Math.min(logged / est, 1.2) : 0;
  const over = logged > est * 1.05;
  return (
    <div className="flex min-w-[110px] items-center gap-2">
      <div className="h-1 w-[60px] overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(pct, 1) * 100}%`,
            background: completed ? "#10B981" : over ? "#EF4444" : pct > 0.85 ? "#F59E0B" : "#3B6FF7",
          }}
        />
      </div>
      <div className="v2-tight v2-tnum text-[11px] text-[var(--v2-ink-500)]">
        <span className={completed ? "text-emerald-600" : over ? "text-red-600" : "font-medium text-[var(--v2-ink-700)]"}>{fmtHours(logged)}</span>
      </div>
    </div>
  );
}

function findMember(team: PortfolioMember[], userId: string | null): PortfolioMember | null {
  if (!userId) return null;
  return team.find((m) => m.userId === userId) ?? null;
}

function SubtaskRow({
  st,
  team,
  last,
  onOpenTask,
}: {
  st: ProjectDetailSubtask;
  team: PortfolioMember[];
  last: boolean;
  onOpenTask: (id: string) => void;
}) {
  const member = findMember(team, st.assigneeUserId);
  return (
    <button
      type="button"
      onClick={() => onOpenTask(st.id)}
      className="group relative w-full py-2 pl-[60px] pr-3 text-left transition hover:bg-[var(--v2-ink-50)]/60"
    >
      <span aria-hidden className="absolute bottom-0 left-[36px] top-0 w-px bg-[var(--v2-ink-200)]" />
      <span aria-hidden className="absolute left-[36px] top-[19px] h-px w-4 bg-[var(--v2-ink-200)]" />
      {last ? <span aria-hidden className="absolute bottom-0 left-[36px] top-5 w-px bg-white" /> : null}
      <div className="flex items-center gap-3">
        <span
          className={`v2-tight flex-1 truncate text-[13px] ${st.status === "done" ? "text-[var(--v2-ink-400)] line-through decoration-[var(--v2-ink-300)]" : "text-[var(--v2-ink-800)]"}`}
        >
          {st.title}
        </span>
        <PriorityPill priority={st.priority} />
        {member ? <MemberAvatar member={member} size={20} /> : <span className="w-5" />}
        <DueChip due={st.deadlineLabel} status={st.status} />
        <TaskMicroProgress logged={st.loggedHours} est={st.estimateHours} completed={st.status === "done"} />
      </div>
    </button>
  );
}

function TaskRow({
  task,
  team,
  expanded,
  onToggleExpand,
  runningTaskId,
  onOpenTask,
}: {
  task: ProjectDetailTask;
  team: PortfolioMember[];
  expanded: boolean;
  onToggleExpand: () => void;
  runningTaskId: string | null;
  onOpenTask: (id: string) => void;
}) {
  const hasSubs = task.subtasks.length > 0;
  const subsDone = task.subtasks.filter((s) => s.status === "done").length;
  const running = runningTaskId === task.id;
  const member = findMember(team, task.assigneeUserId);
  const pm = PRIORITY_META[task.priority];

  return (
    <div className={`transition-colors ${running ? "bg-[var(--v2-brand-50)]/40" : "hover:bg-[var(--v2-ink-50)]/60"}`}>
      <div className="relative flex items-center gap-3 py-2.5 pl-4 pr-3">
        <span
          aria-hidden
          className="absolute bottom-2 left-0 top-2 w-0.5 rounded-r-full"
          style={{ background: pm.dot, opacity: task.status === "done" ? 0.18 : 0.65 }}
        />
        <button
          type="button"
          onClick={onToggleExpand}
          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--v2-ink-400)] transition hover:text-[var(--v2-ink-900)] ${hasSubs ? "" : "pointer-events-none opacity-0"}`}
        >
          <V2Icons.chev className={`h-4 w-4 transition-transform ${expanded ? "" : "-rotate-90"}`} />
        </button>
        <button type="button" onClick={() => onOpenTask(task.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
          <span
            className={`v2-tight truncate text-[13.5px] ${task.status === "done" ? "font-medium text-[var(--v2-ink-400)] line-through decoration-[var(--v2-ink-300)]" : "font-medium text-[var(--v2-ink-900)]"}`}
          >
            {task.title}
          </span>
          {hasSubs ? (
            <span className="v2-tight v2-tnum inline-flex items-center gap-1 rounded-md bg-[var(--v2-ink-100)]/80 px-1.5 py-px text-[10.5px] text-[var(--v2-ink-500)]">
              {subsDone}/{task.subtasks.length}
            </span>
          ) : null}
          {task.linkCount > 0 ? (
            <span className="v2-tnum inline-flex items-center gap-0.5 text-[11px] text-[var(--v2-ink-500)]">
              <V2Icons.paperclip className="h-3 w-3" />
              {task.linkCount}
            </span>
          ) : null}
          {task.commentCount > 0 ? (
            <span className="v2-tnum inline-flex items-center gap-0.5 text-[11px] text-[var(--v2-ink-500)]">
              <V2Icons.chat className="h-3 w-3" />
              {task.commentCount}
            </span>
          ) : null}
          {running ? (
            <span className="v2-tight inline-flex items-center gap-1 rounded-md bg-[var(--v2-brand-100)] px-1.5 py-px text-[10.5px] font-semibold text-[var(--v2-brand-700)]">
              <span className="v2-livedot relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--v2-brand-600)] text-[var(--v2-brand-600)]" />
              идёт
            </span>
          ) : null}
        </button>
        <StatusBadge status={taskStatusToBadge(task.status)} size="sm" />
        <PriorityPill priority={task.priority} />
        {member ? <MemberAvatar member={member} size={24} /> : <span className="w-6" />}
        <DueChip due={task.deadlineLabel} status={task.status} />
        <TaskMicroProgress logged={task.loggedHours} est={task.estimateHours} completed={task.status === "done"} />
      </div>
      {hasSubs && expanded ? (
        <div className="pb-1.5">
          {task.subtasks.map((st, i) => (
            <SubtaskRow key={st.id} st={st} team={team} last={i === task.subtasks.length - 1} onOpenTask={onOpenTask} />
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
