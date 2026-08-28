"use client";

import { PersonalTodoDetailDrawer } from "@/components/v2/personal/todos/personal-todo-detail-drawer";
import { usePersonalTodo } from "@/components/v2/personal/todos/personal-todo-context";
import type { useWeekFocus } from "@/components/v2/personal/week-focus/use-week-focus";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  formatPersonalTodoDateLabel,
  isPersonalTodoOverdue,
  personalTodoTodayYmd,
} from "@/lib/v2/personal/todo-date";
import type { PersonalTodoListPayload, PersonalTodoRow } from "@/lib/v2/personal/todo-types";
import type { V2TaskPriority } from "@/lib/v2/types";
import { useCallback, useEffect, useMemo, useState } from "react";

type TaskFilter = "all" | "p1" | "p2" | "p3" | `proj:${string}`;
type TaskSort = "prio" | "deadline" | "created";

const PRIO_LABEL: Record<string, string> = {
  urgent: "важно",
  high: "важно",
  medium: "средняя важность",
  low: "не важно",
};

const PRIO_CLASS: Record<string, string> = {
  urgent: "bg-[#FEE4E2] text-[#B42318]",
  high: "bg-[#FEE4E2] text-[#B42318]",
  medium: "bg-[#FEF0C7] text-[#B54708]",
  low: "bg-[#EAECF0] text-[#475467]",
};

const PRIO_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function deadlineTag(todo: PersonalTodoRow): { text: string; cls: string } | null {
  const ymd = todo.due_date ?? todo.scheduled_date;
  if (!ymd) return null;
  const today = personalTodoTodayYmd();
  if (ymd === today) return { text: "сегодня", cls: "bg-[#E7EDFD] text-[#2A56EB]" };
  if (isPersonalTodoOverdue(todo, today)) {
    return { text: formatPersonalTodoDateLabel(ymd) ?? ymd, cls: "bg-[#FEE4E2] text-[#B42318]" };
  }
  return { text: formatPersonalTodoDateLabel(ymd) ?? ymd, cls: "bg-[var(--v2-ink-100)] text-[var(--v2-ink-600)]" };
}

function formatDoneDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function isTodayDone(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function priorityForQuickAdd(value: string): V2TaskPriority | null {
  if (value === "1") return "urgent";
  if (value === "2") return "medium";
  if (value === "3") return "low";
  return null;
}

export function TasksInboxPanel({ weekFocus }: { weekFocus: ReturnType<typeof useWeekFocus> }) {
  const { projects, inboxProjectId, listNonce, refreshBootstrap, bumpList } = usePersonalTodo();
  const [active, setActive] = useState<PersonalTodoRow[]>([]);
  const [completed, setCompleted] = useState<PersonalTodoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<TaskSort>("prio");
  const [showHistory, setShowHistory] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [prio, setPrio] = useState("0");
  const [projectId, setProjectId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const nonInboxProjects = useMemo(
    () => projects.filter((p) => !p.is_inbox && !p.archived_at),
    [projects]
  );

  const load = useCallback(async () => {
    try {
      const [inboxRes, doneRes] = await Promise.all([
        fetchJson<PersonalTodoListPayload>("/api/v2/personal/todos?view=inbox"),
        fetchJson<PersonalTodoListPayload>("/api/v2/personal/todos?view=completed"),
      ]);
      setActive(inboxRes.todos);
      setCompleted(doneRes.todos);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить задачи");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load, listNonce]);

  const focusTitleSet = weekFocus.focusTitles;

  const filtered = useMemo(() => {
    let list = [...active];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((t) => t.title.toLowerCase().includes(q));

    if (filter === "p1") list = list.filter((t) => t.priority === "urgent" || t.priority === "high");
    else if (filter === "p2") list = list.filter((t) => t.priority === "medium");
    else if (filter === "p3") list = list.filter((t) => t.priority === "low");
    else if (filter.startsWith("proj:")) {
      const pid = filter.slice(5);
      list = list.filter((t) => (pid ? t.project_id === pid : !t.project_id || t.project_id === inboxProjectId));
    }

    list.sort((a, b) => {
      if (sort === "deadline") {
        const da = a.due_date ?? a.scheduled_date ?? "9999";
        const db = b.due_date ?? b.scheduled_date ?? "9999";
        if (da !== db) return da.localeCompare(db);
      } else if (sort === "created") {
        return b.sort_order - a.sort_order;
      } else {
        const ra = a.priority ? PRIO_RANK[a.priority] ?? 9 : 9;
        const rb = b.priority ? PRIO_RANK[b.priority] ?? 9 : 9;
        if (ra !== rb) return ra - rb;
      }
      return a.title.localeCompare(b.title, "ru");
    });
    return list;
  }, [active, search, filter, sort, inboxProjectId]);

  const projectFilters = useMemo(() => {
    const ids = new Set<string>();
    for (const t of active) {
      if (t.project_id && t.project_id !== inboxProjectId) ids.add(t.project_id);
    }
    return nonInboxProjects.filter((p) => ids.has(p.id));
  }, [active, nonInboxProjects, inboxProjectId]);

  const todayDone = completed.filter((t) => t.completed_at && isTodayDone(t.completed_at));
  const shownDone = showHistory ? completed : todayDone;

  async function reload() {
    await load();
    await refreshBootstrap();
    bumpList();
  }

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const text = title.trim();
    if (!text) return;
    try {
      await fetchJson("/api/v2/personal/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: text,
          project_id: projectId || inboxProjectId,
          priority: priorityForQuickAdd(prio),
          due_date: deadline || null,
        }),
      });
      setTitle("");
      setDeadline("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось добавить задачу");
    }
  }

  async function finishTask(todo: PersonalTodoRow) {
    try {
      await fetchJson(`/api/v2/personal/todos/${todo.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      await reload();
      flash(`«${todo.title}» выполнена`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось выполнить");
    }
  }

  async function restoreTask(todo: PersonalTodoRow) {
    try {
      await fetchJson(`/api/v2/personal/todos/${todo.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: false }),
      });
      await reload();
      flash("Задача вернулась в список");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось вернуть");
    }
  }

  async function assignFocus(todo: PersonalTodoRow) {
    const note = todo.project_name || todo.description || "";
    const ok = await weekFocus.assignFromTask(todo.title, note || undefined);
    if (ok) flash(weekFocus.focus?.goals.length === 0 ? "Основной фокус недели назначен" : "Добавлен дополнительный фокус");
  }

  async function toIdea(todo: PersonalTodoRow) {
    try {
      await fetchJson("/api/v2/personal/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: todo.title,
          body: todo.description ?? "",
          tagNames: todo.project_name ? [todo.project_name] : [],
        }),
      });
      await fetchJson(`/api/v2/personal/todos/${todo.id}`, { method: "DELETE" });
      await reload();
      flash("Задача превращена в идею");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать идею");
    }
  }

  return (
    <div className="px-6 py-6">
      {toast ? (
        <div className="v2-tight fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[var(--v2-ink-900)] px-4 py-2.5 text-[14px] text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <form onSubmit={(e) => void addTask(e)} className="mb-5 flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Новая задача — выгрузи из головы"
            className="v2-tight h-12 w-full rounded-[14px] border-[1.5px] border-[var(--v2-ink-200)] bg-white px-4 text-[15px] outline-none focus:border-[var(--v2-brand-500)]"
          />
        </div>
        <select
          value={prio}
          onChange={(e) => setPrio(e.target.value)}
          className="v2-tight h-12 cursor-pointer rounded-[14px] border-[1.5px] border-[var(--v2-ink-200)] bg-white px-3 text-[14px] text-[var(--v2-ink-600)]"
          aria-label="Важность"
        >
          <option value="0">важность не указана</option>
          <option value="1">важно</option>
          <option value="2">средняя важность</option>
          <option value="3">не важно</option>
        </select>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="v2-tight h-12 max-w-[180px] cursor-pointer rounded-[14px] border-[1.5px] border-[var(--v2-ink-200)] bg-white px-3 text-[14px] text-[var(--v2-ink-600)]"
          aria-label="Проект"
        >
          <option value="">без проекта</option>
          {nonInboxProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="v2-tight h-12 rounded-[14px] border-[1.5px] border-[var(--v2-ink-200)] bg-white px-3 text-[14px] text-[var(--v2-ink-600)]"
          aria-label="Дедлайн"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="v2-tight h-12 shrink-0 rounded-[14px] bg-[var(--v2-brand-600)] px-5 text-[15px] font-semibold text-white hover:bg-[var(--v2-brand-700)] disabled:opacity-45"
        >
          Добавить
        </button>
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["all", "Все"],
              ["p1", "важно"],
              ["p2", "средняя"],
              ["p3", "не важно"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`v2-tight rounded-full px-3 py-1.5 text-[12.5px] font-medium transition ${
                filter === key
                  ? "bg-[var(--v2-ink-900)] text-white"
                  : "bg-[var(--v2-ink-100)] text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-200)]"
              }`}
            >
              {label}
            </button>
          ))}
          {projectFilters.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setFilter(`proj:${p.id}`)}
              className={`v2-tight rounded-full px-3 py-1.5 text-[12.5px] font-medium transition ${
                filter === `proj:${p.id}`
                  ? "bg-[var(--v2-ink-900)] text-white"
                  : "bg-[var(--v2-ink-100)] text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-200)]"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск"
          className="v2-tight ml-auto h-10 min-w-[140px] rounded-xl border-[1.5px] border-[var(--v2-ink-200)] bg-white px-3 text-[14px] outline-none focus:border-[var(--v2-brand-500)]"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as TaskSort)}
          className="v2-tight h-10 cursor-pointer rounded-xl border-[1.5px] border-[var(--v2-ink-200)] bg-white px-3 text-[14px] text-[var(--v2-ink-600)]"
        >
          <option value="prio">По важности</option>
          <option value="deadline">По дедлайну</option>
          <option value="created">Сначала новые</option>
        </select>
      </div>

      {error ? <p className="v2-tight mb-3 text-[13px] text-red-600">{error}</p> : null}

      {loading ? (
        <p className="text-[14px] text-[var(--v2-ink-400)]">Загрузка…</p>
      ) : filtered.length ? (
        <div className="space-y-2">
          {filtered.map((todo) => {
            const dl = deadlineTag(todo);
            const isFocus = focusTitleSet.has(todo.title.trim());
            const projectLabel =
              todo.project_name && todo.project_id !== inboxProjectId ? todo.project_name : "без проекта";
            return (
              <div
                key={todo.id}
                className="group flex items-start gap-3 rounded-2xl border-[1.5px] border-[var(--v2-ink-100)] bg-white px-4 py-3.5 transition hover:border-[var(--v2-ink-200)] hover:shadow-[var(--v2-shadow-card)]"
              >
                <button
                  type="button"
                  title="Выполнено"
                  onClick={() => void finishTask(todo)}
                  className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-[var(--v2-ink-200)] text-[15px] text-[var(--v2-ink-400)] transition hover:border-[var(--v2-brand-500)] hover:bg-[var(--v2-brand-50)] hover:text-[var(--v2-brand-600)]"
                >
                  ✓
                </button>
                <div className="min-w-0 flex-1">
                  <div className="v2-tight text-[16px] font-medium tracking-[-0.015em] text-[var(--v2-ink-900)]">
                    {todo.title}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {todo.priority ? (
                      <span className={`rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${PRIO_CLASS[todo.priority] ?? ""}`}>
                        {PRIO_LABEL[todo.priority]}
                      </span>
                    ) : null}
                    {isFocus ? (
                      <span className="rounded-md bg-[#E7EDFD] px-2 py-0.5 text-[11.5px] font-semibold text-[#2A56EB]">
                        фокус недели
                      </span>
                    ) : null}
                    <span className="rounded-md bg-[var(--v2-ink-100)] px-2 py-0.5 text-[11.5px] font-medium text-[var(--v2-ink-600)]">
                      {projectLabel}
                    </span>
                    {dl ? (
                      <span className={`rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${dl.cls}`}>{dl.text}</span>
                    ) : null}
                    {todo.description ? (
                      <span className="rounded-md bg-[var(--v2-ink-50)] px-2 py-0.5 text-[11.5px] font-medium text-[var(--v2-ink-500)]">
                        есть уточнение
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:transition group-hover:sm:opacity-100">
                  <button
                    type="button"
                    title="Сделать фокусом недели"
                    onClick={() => void assignFocus(todo)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[16px] text-[var(--v2-ink-400)] hover:bg-[var(--v2-brand-50)] hover:text-[var(--v2-brand-600)]"
                  >
                    ★
                  </button>
                  <button
                    type="button"
                    title="Превратить в идею"
                    onClick={() => void toIdea(todo)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[16px] text-[var(--v2-ink-400)] hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-700)]"
                  >
                    ◇
                  </button>
                  <button
                    type="button"
                    title="Открыть и уточнить"
                    onClick={() => setSelectedId(todo.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[18px] text-[var(--v2-ink-400)] hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-700)]"
                  >
                    ⋯
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border-[1.5px] border-dashed border-[var(--v2-ink-200)] px-6 py-10 text-center text-[15px] text-[var(--v2-ink-400)]">
          Здесь пусто. Выгрузи из головы то, что накопилось.
        </div>
      )}

      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="v2-tight text-[15px] font-semibold text-[var(--v2-ink-900)]">Выполнено</span>
          <span className="text-[13px] text-[var(--v2-ink-500)]">
            сегодня {todayDone.length} · всего {completed.length}
          </span>
          {completed.length ? (
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="v2-tight ml-auto text-[13px] font-medium text-[var(--v2-brand-600)] hover:underline"
            >
              {showHistory ? "Скрыть историю" : "Показать историю"}
            </button>
          ) : null}
        </div>
        {shownDone.length ? (
          <div className="space-y-2">
            {shownDone.map((todo) => (
              <div
                key={todo.id}
                className="flex flex-wrap items-center gap-2 rounded-xl bg-[var(--v2-ink-50)] px-4 py-2.5 text-[14px]"
              >
                <s className="v2-tight text-[var(--v2-ink-600)]">{todo.title}</s>
                <span className="ml-auto text-[13px] text-[var(--v2-ink-400)]">
                  {todo.completed_at ? formatDoneDate(todo.completed_at) : ""}
                </span>
                <button
                  type="button"
                  onClick={() => void restoreTask(todo)}
                  className="v2-tight text-[13px] font-medium text-[var(--v2-brand-600)] hover:underline"
                >
                  Вернуть
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <PersonalTodoDetailDrawer
        todoId={selectedId}
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        onUpdated={() => void reload()}
      />
    </div>
  );
}
