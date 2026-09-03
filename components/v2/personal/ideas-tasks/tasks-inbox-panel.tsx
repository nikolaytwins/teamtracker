"use client";

import { IdeasTasksDrawer, IdeasTasksToast } from "@/components/v2/personal/ideas-tasks/ideas-tasks-overlay";
import {
  dlInfoForTodo,
  formatDoneYmd,
  isTodayDone,
  taskPrioNum,
  TASK_PRIO_LABEL,
} from "@/components/v2/personal/ideas-tasks/ideas-tasks-utils";
import { usePersonalTodo } from "@/components/v2/personal/todos/personal-todo-context";
import type { useWeekFocus } from "@/components/v2/personal/week-focus/use-week-focus";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { PersonalTodoInboxSection, PersonalTodoListPayload, PersonalTodoRow } from "@/lib/v2/personal/todo-types";
import type { V2TaskPriority } from "@/lib/v2/types";
import { useCallback, useEffect, useMemo, useState } from "react";

type TaskFilter = "all" | "p1" | "p2" | "p3" | "" | string;
type TaskSort = "prio" | "dl" | "new";

const PRIO_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function priorityForQuickAdd(value: string): V2TaskPriority | null {
  if (value === "1") return "urgent";
  if (value === "2") return "medium";
  if (value === "3") return "low";
  return null;
}

function prioToSelect(priority: PersonalTodoRow["priority"]) {
  const n = taskPrioNum(priority);
  return String(n);
}

function filterAndSortTasks(
  list: PersonalTodoRow[],
  opts: {
    filter: TaskFilter;
    search: string;
    sort: TaskSort;
    inboxProjectId: string | null;
  }
) {
  let filtered = list.filter((todo) => {
    if (opts.filter === "all") return true;
    if (opts.filter === "p1") return todo.priority === "urgent" || todo.priority === "high";
    if (opts.filter === "p2") return todo.priority === "medium";
    if (opts.filter === "p3") return todo.priority === "low";
    if (opts.filter === "") return !todo.project_name || todo.project_id === opts.inboxProjectId;
    return todo.project_name === opts.filter;
  });
  const q = opts.search.trim().toLowerCase();
  if (q) filtered = filtered.filter((t) => t.title.toLowerCase().includes(q));

  filtered.sort((a, b) => {
    if (opts.sort === "dl") {
      const da = a.due_date ?? a.scheduled_date ?? "9999";
      const db = b.due_date ?? b.scheduled_date ?? "9999";
      if (da !== db) return da.localeCompare(db);
    } else if (opts.sort === "new") {
      return b.sort_order - a.sort_order;
    } else {
      const ra = a.priority ? PRIO_RANK[a.priority] ?? 9 : 9;
      const rb = b.priority ? PRIO_RANK[b.priority] ?? 9 : 9;
      if (ra !== rb) return ra - rb;
    }
    return a.title.localeCompare(b.title, "ru");
  });
  return filtered;
}

type TaskListProps = {
  todos: PersonalTodoRow[];
  loading: boolean;
  emptyText: string;
  focusTitleSet: Set<string>;
  inboxProjectId: string | null;
  section: PersonalTodoInboxSection;
  onOpen: (todo: PersonalTodoRow) => void;
  onFinish: (todo: PersonalTodoRow) => void;
  onAssignFocus: (todo: PersonalTodoRow) => void;
  onToIdea: (todo: PersonalTodoRow) => void;
  onMoveSection: (todo: PersonalTodoRow, section: PersonalTodoInboxSection) => void;
};

function TaskList({
  todos,
  loading,
  emptyText,
  focusTitleSet,
  inboxProjectId,
  section,
  onOpen,
  onFinish,
  onAssignFocus,
  onToIdea,
  onMoveSection,
}: TaskListProps) {
  function projectLabel(todo: PersonalTodoRow) {
    return todo.project_name && todo.project_id !== inboxProjectId ? todo.project_name : "без проекта";
  }

  return (
    <div className="tlist">
      {loading ? (
        <div className="empty">Загрузка…</div>
      ) : todos.length ? (
        todos.map((todo) => {
          const pn = taskPrioNum(todo.priority);
          const dl = dlInfoForTodo(todo);
          const isFocus = focusTitleSet.has(todo.title.trim());
          const proj = projectLabel(todo);
          return (
            <div key={todo.id} className="t" onClick={() => onOpen(todo)}>
              <button
                type="button"
                className="t-ok tip"
                data-tip="Выполнено"
                onClick={(e) => {
                  e.stopPropagation();
                  void onFinish(todo);
                }}
              >
                ✓
              </button>
              <div className="t-mid">
                <div className="t-t">{todo.title}</div>
                <div className="t-meta">
                  {pn ? <span className={`tag tag--p${pn}`}>{TASK_PRIO_LABEL[pn]}</span> : null}
                  {isFocus ? <span className="tag tag--fx">фокус недели</span> : null}
                  <span className={`tag ${proj !== "без проекта" ? "tag--proj" : "tag--none"}`}>{proj}</span>
                  {dl ? <span className={`tag tag--${dl.cls}`}>{dl.text}</span> : null}
                  {todo.description ? <span className="tag tag--note">есть уточнение</span> : null}
                </div>
              </div>
              <div className="t-act">
                {section === "inbox" ? (
                  <button
                    type="button"
                    className="iconbtn tip"
                    data-tip="На потом"
                    onClick={(e) => {
                      e.stopPropagation();
                      void onMoveSection(todo, "later");
                    }}
                  >
                    ↓
                  </button>
                ) : (
                  <button
                    type="button"
                    className="iconbtn tip"
                    data-tip="Во входящие"
                    onClick={(e) => {
                      e.stopPropagation();
                      void onMoveSection(todo, "inbox");
                    }}
                  >
                    ↑
                  </button>
                )}
                <button
                  type="button"
                  className="iconbtn tip"
                  data-tip="Сделать фокусом недели"
                  onClick={(e) => {
                    e.stopPropagation();
                    void onAssignFocus(todo);
                  }}
                >
                  ★
                </button>
                <button
                  type="button"
                  className="iconbtn tip"
                  data-tip="Превратить в идею"
                  onClick={(e) => {
                    e.stopPropagation();
                    void onToIdea(todo);
                  }}
                >
                  ◇
                </button>
                <button
                  type="button"
                  className="iconbtn tip"
                  data-tip="Открыть и уточнить"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(todo);
                  }}
                >
                  ⋯
                </button>
              </div>
            </div>
          );
        })
      ) : (
        <div className="empty">{emptyText}</div>
      )}
    </div>
  );
}

export function TasksInboxPanel({
  weekFocus,
  onCountChange,
}: {
  weekFocus: ReturnType<typeof useWeekFocus>;
  onCountChange?: (n: number) => void;
}) {
  const { projects, inboxProjectId, listNonce, refreshBootstrap, bumpList } = usePersonalTodo();
  const [active, setActive] = useState<PersonalTodoRow[]>([]);
  const [completed, setCompleted] = useState<PersonalTodoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<TaskSort>("prio");
  const [showHistory, setShowHistory] = useState(false);
  const [selected, setSelected] = useState<PersonalTodoRow | null>(null);
  const [title, setTitle] = useState("");
  const [prio, setPrio] = useState("0");
  const [projectId, setProjectId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editPrio, setEditPrio] = useState("0");
  const [editProjectId, setEditProjectId] = useState("");
  const [editDeadline, setEditDeadline] = useState("");

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
      onCountChange?.(inboxRes.todos.length);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить задачи");
    }
  }, [onCountChange]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load, listNonce]);

  const focusTitleSet = weekFocus.focusTitles;

  const inboxTasks = useMemo(() => active.filter((t) => t.inbox_section !== "later"), [active]);
  const laterTasks = useMemo(() => active.filter((t) => t.inbox_section === "later"), [active]);

  const filterOpts = useMemo(
    () => ({ filter, search, sort, inboxProjectId }),
    [filter, search, sort, inboxProjectId]
  );

  const filteredInbox = useMemo(() => filterAndSortTasks(inboxTasks, filterOpts), [inboxTasks, filterOpts]);
  const filteredLater = useMemo(() => filterAndSortTasks(laterTasks, filterOpts), [laterTasks, filterOpts]);

  const filterChips = useMemo(() => {
    const chips: [TaskFilter, string, number][] = [
      ["all", "Все задачи", active.length],
      ["p1", "Важно", active.filter((t) => t.priority === "urgent" || t.priority === "high").length],
      ["p2", "Средние", active.filter((t) => t.priority === "medium").length],
      ["p3", "Не важно", active.filter((t) => t.priority === "low").length],
    ];
    for (const p of nonInboxProjects) {
      chips.push([p.name, p.name, active.filter((t) => t.project_name === p.name).length]);
    }
    chips.push(["", "Без проекта", active.filter((t) => !t.project_name || t.project_id === inboxProjectId).length]);
    return chips;
  }, [active, nonInboxProjects, inboxProjectId]);

  const todayDone = completed.filter((t) => t.completed_at && isTodayDone(t.completed_at));
  const shownDone = showHistory ? completed : todayDone;

  async function reload() {
    await load();
    await refreshBootstrap();
    bumpList();
  }

  function flash(text: string, undo?: () => void) {
    setToast({ text, undo });
    window.setTimeout(() => setToast(null), 3200);
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
          inbox_section: "inbox",
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
    if (ok) {
      flash(
        weekFocus.focus?.goals.length === 0 ? "Основной фокус недели назначен" : "Добавлен дополнительный фокус"
      );
    }
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

  async function moveSection(todo: PersonalTodoRow, section: PersonalTodoInboxSection) {
    if (todo.inbox_section === section) return;
    try {
      await fetchJson(`/api/v2/personal/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inbox_section: section }),
      });
      await reload();
      flash(section === "later" ? "Задача отложена на потом" : "Задача вернулась во входящие");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось переместить");
    }
  }

  function openTask(todo: PersonalTodoRow) {
    setSelected(todo);
    setEditTitle(todo.title);
    setEditNote(todo.description ?? "");
    setEditPrio(prioToSelect(todo.priority));
    setEditProjectId(todo.project_id && todo.project_id !== inboxProjectId ? todo.project_id : "");
    setEditDeadline(todo.due_date ?? todo.scheduled_date ?? "");
  }

  async function saveTask() {
    if (!selected) return;
    try {
      await fetchJson(`/api/v2/personal/todos/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editNote.trim() || null,
          priority: priorityForQuickAdd(editPrio),
          project_id: editProjectId || inboxProjectId,
          due_date: editDeadline || null,
        }),
      });
      setSelected(null);
      await reload();
      flash("Задача сохранена");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    }
  }

  async function deleteTask() {
    if (!selected) return;
    const titleSaved = selected.title;
    try {
      await fetchJson(`/api/v2/personal/todos/${selected.id}`, { method: "DELETE" });
      setSelected(null);
      await reload();
      flash(`«${titleSaved}» удалена`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить");
    }
  }

  const taskListProps = {
    loading,
    focusTitleSet,
    inboxProjectId,
    onOpen: openTask,
    onFinish: finishTask,
    onAssignFocus: assignFocus,
    onToIdea: toIdea,
    onMoveSection: moveSection,
  };

  return (
    <div className="tasks-panels">
      <section className="card pad" data-section="task-list-inbox">
        <div className="sec-head">
          <h2 className="sec-title">Входящие (ближайшие)</h2>
          <span className="sec-sub">
            {inboxTasks.length} {inboxTasks.length === 1 ? "задача" : inboxTasks.length < 5 ? "задачи" : "задач"}
          </span>
        </div>

        <div className="bar">
          {filterChips.map(([key, label, count]) => (
            <button
              key={key || "__none"}
              type="button"
              className={`chip${filter === key ? " on" : ""}`}
              onClick={() => setFilter(key)}
            >
              {label} <i className="tnum">{count}</i>
            </button>
          ))}
        </div>

        <div className="addbox">
          <form className="qa" onSubmit={(e) => void addTask(e)}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Выгрузить из головы: «решить вопрос с сайтом»…"
              aria-label="Новая задача"
            />
            <select value={prio} onChange={(e) => setPrio(e.target.value)} aria-label="Важность">
              <option value="0">важность не указана</option>
              <option value="1">важно</option>
              <option value="2">средняя важность</option>
              <option value="3">не важно</option>
            </select>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label="Проект">
              <option value="">без проекта</option>
              {nonInboxProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} aria-label="Дедлайн" />
            <button type="submit">Добавить</button>
          </form>
        </div>

        <div className="bar" style={{ marginBottom: 18 }}>
          <input
            type="text"
            className="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по задачам"
          />
          <select
            className="sortsel"
            value={sort}
            onChange={(e) => setSort(e.target.value as TaskSort)}
            style={{ marginLeft: "auto" }}
          >
            <option value="prio">По важности</option>
            <option value="dl">По дедлайну</option>
            <option value="new">Сначала новые</option>
          </select>
        </div>

        {error ? <p style={{ fontSize: 13, color: "#b42318", marginBottom: 12 }}>{error}</p> : null}

        <TaskList
          {...taskListProps}
          section="inbox"
          todos={filteredInbox}
          emptyText="Здесь пусто. Выгрузи из головы то, что накопилось."
        />
      </section>

      <section className="card pad" data-section="task-list-later">
        <div className="sec-head">
          <h2 className="sec-title">Потом</h2>
          <span className="sec-sub">
            {laterTasks.length} {laterTasks.length === 1 ? "задача" : laterTasks.length < 5 ? "задачи" : "задач"}
          </span>
        </div>

        <div className="bar" style={{ marginBottom: 18 }}>
          <input
            type="text"
            className="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по задачам"
          />
          <select
            className="sortsel"
            value={sort}
            onChange={(e) => setSort(e.target.value as TaskSort)}
            style={{ marginLeft: "auto" }}
          >
            <option value="prio">По важности</option>
            <option value="dl">По дедлайну</option>
            <option value="new">Сначала новые</option>
          </select>
        </div>

        <TaskList
          {...taskListProps}
          section="later"
          todos={filteredLater}
          emptyText="Сюда можно отложить то, что не горит — стрелкой ↓ из входящих."
        />
      </section>

      <section className="card pad" data-section="task-done">
        <div className="taken">
          <div className="bar" style={{ margin: 0 }}>
            <span className="kick">Выполнено</span>
            <span className="sec-sub">
              сегодня {todayDone.length} · всего {completed.length}
            </span>
            {completed.length ? (
              <button type="button" className="linkbtn" style={{ marginLeft: "auto" }} onClick={() => setShowHistory((v) => !v)}>
                {showHistory ? "Скрыть историю" : "Показать историю"}
              </button>
            ) : null}
          </div>
          {shownDone.map((todo) => (
            <div key={todo.id} className="taken-row">
              <s>{todo.title}</s>
              <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--ink-400)" }}>
                {todo.completed_at ? formatDoneYmd(todo.completed_at) : ""}
              </span>
              <button type="button" className="linkbtn" onClick={() => void restoreTask(todo)}>
                Вернуть
              </button>
            </div>
          ))}
        </div>
      </section>

      <IdeasTasksDrawer
        open={Boolean(selected)}
        title="Задача"
        onClose={() => setSelected(null)}
        footer={
          <>
            <button type="button" className="btn btn--pri" onClick={() => void saveTask()}>
              Сохранить
            </button>
            <button type="button" className="btn btn--gh" onClick={() => setSelected(null)}>
              Закрыть
            </button>
          </>
        }
      >
        <div className="fld">
          <label>Формулировка</label>
          <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
        </div>
        <div className="fld">
          <label>Уточнение — что именно является следующим действием</label>
          <textarea
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder="Например: написать разработчику и получить смету до пятницы"
          />
        </div>
        <div className="fld2">
          <div className="fld">
            <label>Важность</label>
            <select value={editPrio} onChange={(e) => setEditPrio(e.target.value)}>
              <option value="0">не установлена</option>
              <option value="1">важно</option>
              <option value="2">средняя важность</option>
              <option value="3">не важно</option>
            </select>
          </div>
          <div className="fld">
            <label>Проект</label>
            <select value={editProjectId} onChange={(e) => setEditProjectId(e.target.value)}>
              <option value="">без проекта</option>
              {nonInboxProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="fld">
          <label>Дедлайн</label>
          <input type="date" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} />
        </div>
        <div className="fld">
          <label>Действия</label>
          <div className="dr-acts">
            {selected?.inbox_section === "later" ? (
              <button
                type="button"
                className="dr-act"
                onClick={() => selected && void moveSection(selected, "inbox").then(() => setSelected(null))}
              >
                ↑ Вернуть во входящие
              </button>
            ) : (
              <button
                type="button"
                className="dr-act"
                onClick={() => selected && void moveSection(selected, "later").then(() => setSelected(null))}
              >
                ↓ Отложить на потом
              </button>
            )}
            <button
              type="button"
              className="dr-act"
              onClick={() => selected && void assignFocus(selected).then(() => setSelected(null))}
            >
              ★ Сделать фокусом недели
            </button>
            <button
              type="button"
              className="dr-act"
              onClick={() => selected && void finishTask(selected).then(() => setSelected(null))}
            >
              ✓ Выполнено
            </button>
            <button
              type="button"
              className="dr-act"
              onClick={() => selected && void toIdea(selected).then(() => setSelected(null))}
            >
              ◇ Превратить в идею
            </button>
            <button type="button" className="dr-act dr-act--dan" onClick={() => void deleteTask()}>
              ✕ Удалить
            </button>
          </div>
        </div>
      </IdeasTasksDrawer>

      <IdeasTasksToast message={toast?.text ?? null} actionLabel={toast?.undo ? "Вернуть" : undefined} onAction={toast?.undo} />
    </div>
  );
}
