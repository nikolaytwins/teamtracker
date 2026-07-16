"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  groupProjectInboxByPriority,
  PROJECT_INBOX_IMPORTANT_IDS,
} from "@/lib/v2/projects/project-inbox-groups";
import type { ProjectDetailTask } from "@/lib/v2/projects/project-detail-types";
import type { V2TaskPriority, V2TaskStatus } from "@/lib/v2/types";
import { ViewSwitcher } from "@/components/v2/projects/projects-views";
import { PRIORITY_META, PRIORITY_META_OR_UNSET, V2Icons } from "@/components/v2/ui/icons";
import { IconBtn, TaskCheckbox } from "@/components/v2/ui/primitives";
import { useMemo, useState } from "react";

const KANBAN_COLUMNS: { key: V2TaskStatus; label: string; dot: string }[] = [
  { key: "todo", label: "К выполнению", dot: "#A1A1AA" },
  { key: "in_progress", label: "В работе", dot: "#3B6FF7" },
  { key: "review", label: "На проверке", dot: "#F59E0B" },
  { key: "done", label: "Готово", dot: "#10B981" },
];

function priorityMeta(p: V2TaskPriority | null) {
  return p ? PRIORITY_META[p] : PRIORITY_META_OR_UNSET.unset;
}

function SectionHeader({
  title,
  count,
  subtitle,
  accent,
  prominent,
}: {
  title: string;
  count: number;
  subtitle?: string;
  accent?: string;
  prominent?: boolean;
}) {
  return (
    <div className="mb-3 flex items-start gap-2">
      {accent ? (
        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: accent }} aria-hidden />
      ) : null}
      <div>
        <h2
          className={`v2-tight font-semibold ${
            prominent ? "text-[17px] text-[var(--v2-ink-900)]" : "text-[15px] text-[var(--v2-ink-800)]"
          }`}
        >
          {title}
          <span className="v2-tnum ml-2 text-[13px] font-medium text-[var(--v2-ink-400)]">{count}</span>
        </h2>
        {subtitle ? <p className="v2-tight mt-0.5 text-[12px] text-[var(--v2-ink-500)]">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function CloneToPersonalButton({
  task,
  onDone,
}: {
  task: ProjectDetailTask;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const linked = Boolean(task.personalTodoId);

  async function clone() {
    if (busy) return;
    setBusy(true);
    try {
      await fetchJson(`/api/v2/tasks/${task.id}/clone-to-personal`, { method: "POST" });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <IconBtn
      title={linked ? "Уже в личных входящих (связаны)" : "В личные входящие"}
      onClick={(e) => {
        e.stopPropagation();
        void clone();
      }}
      className={`shrink-0 ${linked ? "text-emerald-600" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"}`}
      disabled={busy}
    >
      {linked ? <V2Icons.check className="h-4 w-4" /> : <V2Icons.inbox className="h-4 w-4" />}
    </IconBtn>
  );
}

function InboxTaskRow({
  task,
  onOpen,
  onReload,
  onToggleComplete,
}: {
  task: ProjectDetailTask;
  onOpen: (id: string) => void;
  onReload: () => void;
  onToggleComplete: (task: ProjectDetailTask) => void;
}) {
  const pm = priorityMeta(task.priority);
  const completed = Boolean(task.completedAt) || task.status === "done";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(task.id);
        }
      }}
      className="group flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-[var(--v2-ink-50)]/80"
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(task);
        }}
      >
        <TaskCheckbox checked={completed} onChange={() => onToggleComplete(task)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`v2-tight text-[14px] font-medium ${completed ? "text-[var(--v2-ink-400)] line-through" : "text-[var(--v2-ink-900)]"}`}>
          {task.title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-[var(--v2-ink-500)]">
          <span
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-px font-medium"
            style={{ background: pm.soft, color: pm.ink }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: pm.dot }} />
            {pm.label}
          </span>
          {task.assigneeName ? <span>{task.assigneeName}</span> : <span className="text-[var(--v2-ink-400)]">без исполнителя</span>}
          {task.deadlineLabel !== "—" ? <span className="v2-tnum">{task.deadlineLabel}</span> : null}
          {task.personalTodoId ? (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <V2Icons.check className="h-3 w-3" /> в личных
            </span>
          ) : null}
        </div>
      </div>
      <CloneToPersonalButton task={task} onDone={onReload} />
    </div>
  );
}

function InboxListView({
  openTasks,
  backlog,
  onOpen,
  onReload,
  onToggleComplete,
}: {
  openTasks: ProjectDetailTask[];
  backlog: ProjectDetailTask[];
  onOpen: (id: string) => void;
  onReload: () => void;
  onToggleComplete: (task: ProjectDetailTask) => void;
}) {
  const prioritized = openTasks.filter((t) => t.priority);
  const sections = groupProjectInboxByPriority(prioritized);
  const important = sections.filter((s) => PROJECT_INBOX_IMPORTANT_IDS.includes(s.id));
  const rest = sections.filter((s) => !PROJECT_INBOX_IMPORTANT_IDS.includes(s.id));
  const importantCount = important.reduce((n, s) => n + s.todos.length, 0);

  function renderBlock(list: ProjectDetailTask[], accent?: string) {
    return (
      <div className="overflow-hidden rounded-2xl bg-white shadow-[var(--v2-shadow-soft)]">
        {accent ? <div className="h-1 w-full" style={{ background: accent }} aria-hidden /> : null}
        <div className="divide-y divide-[var(--v2-ink-100)]/70">
          {list.map((task) => (
            <InboxTaskRow
              key={task.id}
              task={task}
              onOpen={onOpen}
              onReload={onReload}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!openTasks.length && !backlog.length) {
    return (
      <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-[var(--v2-shadow-soft)]">
        <p className="v2-tight text-[14px] text-[var(--v2-ink-500)]">Во входящих пусто — добавьте задачу выше.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {important.length > 0 ? (
        <section>
          <SectionHeader
            title="Важное сейчас"
            count={importantCount}
            subtitle="Срочные и высокоприоритетные задачи"
            prominent
          />
          <div className="space-y-4">
            {important.map((section) => (
              <div key={section.id}>
                <SectionHeader title={section.title} count={section.todos.length} accent={section.accent} />
                {renderBlock(section.todos, section.accent)}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {rest.map((section) => (
        <section key={section.id}>
          <SectionHeader title={section.title} count={section.todos.length} subtitle={section.subtitle} accent={section.accent} />
          {renderBlock(section.todos, section.accent)}
        </section>
      ))}

      <section className="border-t border-dashed border-[var(--v2-ink-200)] pt-8">
        <SectionHeader
          title="Бэклог · нераспределённые"
          count={backlog.length}
          subtitle="Задачи без приоритета — разберите позже"
          accent="#A1A1AA"
          prominent
        />
        {backlog.length > 0 ? (
          renderBlock(backlog, "#A1A1AA")
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--v2-ink-200)] bg-white/60 px-4 py-8 text-center shadow-[var(--v2-shadow-soft)]">
            <p className="v2-tight text-[13px] text-[var(--v2-ink-400)]">Бэклог пуст</p>
          </div>
        )}
      </section>
    </div>
  );
}

function InboxKanbanView({
  tasks,
  backlog,
  onOpen,
  onReload,
}: {
  tasks: ProjectDetailTask[];
  backlog: ProjectDetailTask[];
  onOpen: (id: string) => void;
  onReload: () => void;
}) {
  const grouped = useMemo(() => {
    const g: Record<V2TaskStatus, ProjectDetailTask[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };
    for (const t of tasks) {
      if (!t.priority) continue;
      g[t.status].push(t);
    }
    return g;
  }, [tasks]);

  return (
    <div className="space-y-8">
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4">
          {KANBAN_COLUMNS.map(({ key, label, dot }) => (
            <div key={key} className="w-[260px] shrink-0 rounded-2xl bg-white/50 p-2">
              <div className="mb-1 flex items-center gap-2 px-2.5 py-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
                <h4 className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)]">{label}</h4>
                <span className="v2-tnum text-[11.5px] text-[var(--v2-ink-500)]">{grouped[key].length}</span>
              </div>
              <div className="space-y-2">
                {grouped[key].map((t) => {
                  const pm = priorityMeta(t.priority);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onOpen(t.id)}
                      className="group w-full rounded-xl bg-white p-3 text-left shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span
                          className="v2-tight inline-flex items-center gap-1 rounded-md px-1.5 py-[2px] text-[11px] font-medium"
                          style={{ background: pm.soft, color: pm.ink }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: pm.dot }} />
                          {pm.label}
                        </span>
                        <CloneToPersonalButton task={t} onDone={onReload} />
                      </div>
                      <div className="v2-tight text-[13px] font-medium leading-snug text-[var(--v2-ink-900)]">{t.title}</div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--v2-ink-500)]">
                        <span className="truncate">{t.assigneeName ?? "—"}</span>
                        {t.personalTodoId ? <span className="text-emerald-600">в личных</span> : null}
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

      <section className="border-t border-dashed border-[var(--v2-ink-200)] pt-8">
        <SectionHeader
          title="Бэклог · нераспределённые"
          count={backlog.length}
          subtitle="В самом низу — задачи без приоритета"
          accent="#A1A1AA"
          prominent
        />
        {backlog.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {backlog.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onOpen(t.id)}
                className="group rounded-xl bg-white p-3 text-left shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="v2-tight text-[13px] font-medium text-[var(--v2-ink-900)]">{t.title}</div>
                  <CloneToPersonalButton task={t} onDone={onReload} />
                </div>
                <div className="mt-2 text-[11px] text-[var(--v2-ink-500)]">{t.assigneeName ?? "без исполнителя"}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--v2-ink-200)] bg-white/60 px-4 py-8 text-center">
            <p className="v2-tight text-[13px] text-[var(--v2-ink-400)]">Бэклог пуст</p>
          </div>
        )}
      </section>
    </div>
  );
}

export function QmagicProjectInbox({
  projectId,
  tasks,
  canCreateTasks,
  onOpenTask,
  onReload,
}: {
  projectId: string;
  tasks: ProjectDetailTask[];
  canCreateTasks: boolean;
  onOpenTask: (id: string) => void;
  onReload: () => void | Promise<void>;
}) {
  const [view, setView] = useState<"list" | "kanban">("list");
  const [quickTitle, setQuickTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openTasks = useMemo(() => tasks.filter((t) => t.status !== "done" && !t.completedAt), [tasks]);
  const backlog = useMemo(() => openTasks.filter((t) => !t.priority), [openTasks]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title || adding || !canCreateTasks) return;
    setAdding(true);
    setError(null);
    try {
      await fetchJson("/api/v2/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          projectId,
          priority: null,
          scope: "team",
        }),
      });
      setQuickTitle("");
      await onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать задачу");
    } finally {
      setAdding(false);
    }
  }

  async function toggleComplete(task: ProjectDetailTask) {
    const completed = !(task.completedAt || task.status === "done");
    try {
      await fetchJson(`/api/v2/tasks/${task.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", completed }),
      });
      await onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обновить задачу");
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="v2-tight text-[16px] font-semibold text-[var(--v2-ink-900)]">Входящие</h3>
          <p className="v2-tight mt-0.5 text-[13px] text-[var(--v2-ink-500)]">
            Как в личных задачах — список или канбан, бэклог внизу
          </p>
        </div>
        <ViewSwitcher view={view} setView={setView} />
      </div>

      {canCreateTasks ? (
        <form onSubmit={(e) => void addTask(e)} className="mb-5">
          <div className="flex gap-2 rounded-2xl bg-white p-2 shadow-[var(--v2-shadow-soft)]">
            <input
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Добавить задачу в бэклог…"
              className="v2-tight min-w-0 flex-1 rounded-xl border-0 bg-transparent px-3 py-2.5 text-[14px] text-[var(--v2-ink-900)] outline-none placeholder:text-[var(--v2-ink-400)]"
            />
            <button
              type="submit"
              disabled={adding || !quickTitle.trim()}
              className="rounded-xl bg-[var(--v2-ink-900)] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[var(--v2-ink-800)] disabled:opacity-40"
            >
              Добавить
            </button>
          </div>
        </form>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {view === "list" ? (
        <InboxListView
          openTasks={openTasks}
          backlog={backlog}
          onOpen={onOpenTask}
          onReload={() => void onReload()}
          onToggleComplete={(t) => void toggleComplete(t)}
        />
      ) : (
        <InboxKanbanView tasks={tasks} backlog={backlog} onOpen={onOpenTask} onReload={() => void onReload()} />
      )}
    </div>
  );
}
