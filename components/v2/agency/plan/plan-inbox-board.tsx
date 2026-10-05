"use client";

import "./plan-inbox-design.css";
import { IdeasTasksProjectSelect } from "@/components/v2/personal/ideas-tasks/ideas-tasks-project-select";
import { dlInfoForTodo, taskPrioNum } from "@/components/v2/personal/ideas-tasks/ideas-tasks-utils";
import { PersonalTodoProvider, usePersonalTodo } from "@/components/v2/personal/todos/personal-todo-context";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  INBOX_CATEGORIES,
  parseInboxCapture,
  type InboxCategory,
  type InboxCategoryId,
} from "@/lib/v2/personal/inbox-categories";
import type { PersonalTodoListPayload, PersonalTodoRow } from "@/lib/v2/personal/todo-types";
import type { V2TaskPriority } from "@/lib/v2/types";
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";

const PRIO_OPTS: Array<{ v: 0 | 1 | 2 | 3; n: string; c: string }> = [
  { v: 0, n: "Без оценки", c: "" },
  { v: 1, n: "Важно", c: "#d92d20" },
  { v: 2, n: "Средне", c: "#d97706" },
  { v: 3, n: "Не важно", c: "#71717a" },
];

function priorityFromPick(value: number): V2TaskPriority | null {
  if (value === 1) return "urgent";
  if (value === 2) return "medium";
  if (value === 3) return "low";
  return null;
}

function PlanInboxBoardInner() {
  const { projects, inboxProjectId, refreshBootstrap } = usePersonalTodo();
  const [categories, setCategories] = useState<InboxCategory[]>(INBOX_CATEGORIES);
  const [todos, setTodos] = useState<PersonalTodoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [dest, setDest] = useState<InboxCategoryId>("work");
  const [projectId, setProjectId] = useState("");
  const [prio, setPrio] = useState<0 | 1 | 2 | 3>(0);
  const [openDd, setOpenDd] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "imp" | string>("all");
  const [search, setSearch] = useState("");
  const [dropCol, setDropCol] = useState<InboxCategoryId | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [colAdd, setColAdd] = useState<InboxCategoryId | null>(null);
  const [colDraft, setColDraft] = useState("");
  const [selected, setSelected] = useState<PersonalTodoRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editPrio, setEditPrio] = useState<0 | 1 | 2 | 3>(0);
  const [editProjectId, setEditProjectId] = useState("");
  const [editDest, setEditDest] = useState<InboxCategoryId>("work");
  const [editDeadline, setEditDeadline] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [cardMenu, setCardMenu] = useState<{ id: string; kind: "project" | "prio" } | null>(null);
  const [titleEditId, setTitleEditId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");

  const nonInboxProjects = useMemo(
    () => projects.filter((p) => !p.is_inbox && p.id !== inboxProjectId),
    [projects, inboxProjectId]
  );

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  };

  const load = useCallback(async () => {
    const [board, cats] = await Promise.all([
      fetchJson<PersonalTodoListPayload>("/api/v2/personal/todos?view=board"),
      fetchJson<{ categories: InboxCategory[] }>("/api/v2/personal/todo-categories").catch(() => ({
        categories: INBOX_CATEGORIES,
      })),
    ]);
    setTodos(board.todos);
    if (cats.categories?.length) setCategories(cats.categories);
  }, []);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((e) => setError(e instanceof Error ? e.message : "Не удалось загрузить задачи"))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!(e.target instanceof Element)) return;
      if (!e.target.closest(".dd")) setOpenDd(null);
      if (!e.target.closest(".cd-pop") && !e.target.closest(".tg--menu")) setCardMenu(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return todos.filter((t) => {
      if (filter === "imp" && taskPrioNum(t.priority) !== 1) return false;
      if (filter !== "all" && filter !== "imp") {
        if ((t.project_name || "") !== filter) return false;
      }
      if (q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [todos, filter, search]);

  const byCat = useMemo(() => {
    const map = Object.fromEntries(categories.map((c) => [c.id, [] as PersonalTodoRow[]])) as Record<
      InboxCategoryId,
      PersonalTodoRow[]
    >;
    for (const t of visible) {
      const key = t.inbox_category ?? "work";
      (map[key] ?? map.work).push(t);
    }
    return map;
  }, [visible, categories]);

  async function createTask(rawTitle: string, category: InboxCategoryId, nextPrio = prio, nextProject = projectId) {
    const parsed = parseInboxCapture(rawTitle);
    const cat = parsed.dest || category;
    let pid = nextProject;
    if (parsed.projectHint) {
      const hit = nonInboxProjects.find((p) => p.name.toLowerCase().startsWith(parsed.projectHint.toLowerCase()));
      if (hit) pid = hit.id;
    }
    const text = parsed.title.trim();
    if (!text) return;
    await fetchJson("/api/v2/personal/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: text,
        project_id: pid || inboxProjectId,
        priority: priorityFromPick(parsed.prio === 1 ? 1 : nextPrio),
        inbox_category: cat,
      }),
    });
    await load();
    await refreshBootstrap();
    flash("Задача добавлена");
  }

  async function addFromForm(e: FormEvent) {
    e.preventDefault();
    try {
      await createTask(title, dest);
      setTitle("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось добавить");
    }
  }

  async function addFromColumn(category: InboxCategoryId) {
    try {
      await createTask(colDraft, category);
      setColDraft("");
      setColAdd(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось добавить");
    }
  }

  async function moveTo(todo: PersonalTodoRow, category: InboxCategoryId) {
    if (todo.inbox_category === category) return;
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, inbox_category: category } : t)));
    try {
      await fetchJson(`/api/v2/personal/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inbox_category: category }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось переместить");
      await load();
    }
  }

  async function finish(todo: PersonalTodoRow) {
    try {
      await fetchJson(`/api/v2/personal/todos/${todo.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      await load();
      flash(`«${todo.title}» выполнена`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось выполнить");
    }
  }

  function openTask(todo: PersonalTodoRow) {
    setSelected(todo);
    setEditTitle(todo.title);
    setEditNote(todo.description ?? "");
    setEditPrio(taskPrioNum(todo.priority));
    setEditProjectId(todo.project_id && todo.project_id !== inboxProjectId ? todo.project_id : "");
    setEditDest(todo.inbox_category ?? "work");
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
          priority: priorityFromPick(editPrio),
          project_id: editProjectId || inboxProjectId,
          inbox_category: editDest,
          due_date: editDeadline || null,
        }),
      });
      setSelected(null);
      await load();
      flash("Задача сохранена");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    }
  }

  async function deleteTask() {
    if (!selected) return;
    await deleteTodo(selected);
    setSelected(null);
  }

  async function patchTodo(todo: PersonalTodoRow, body: Record<string, unknown>, next?: Partial<PersonalTodoRow>, ok?: string) {
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, ...next } : t)));
    try {
      await fetchJson(`/api/v2/personal/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
      if (ok) flash(ok);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
      await load();
    }
  }

  async function deleteTodo(todo: PersonalTodoRow) {
    setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    try {
      await fetchJson(`/api/v2/personal/todos/${todo.id}`, { method: "DELETE" });
      flash("Задача удалена");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить");
      await load();
    }
  }

  async function saveTitle(todo: PersonalTodoRow, raw: string) {
    const next = raw.trim();
    setTitleEditId(null);
    if (!next || next === todo.title) return;
    await patchTodo(todo, { title: next }, { title: next });
  }

  async function setTodoProject(todo: PersonalTodoRow, nextId: string) {
    const proj = nonInboxProjects.find((p) => p.id === nextId);
    setCardMenu(null);
    await patchTodo(
      todo,
      { project_id: nextId || inboxProjectId },
      { project_id: nextId || inboxProjectId, project_name: proj?.name ?? null }
    );
  }

  async function setTodoPrio(todo: PersonalTodoRow, value: 0 | 1 | 2 | 3) {
    setCardMenu(null);
    await patchTodo(todo, { priority: priorityFromPick(value) }, { priority: priorityFromPick(value) });
  }

  async function setTodoDeadline(todo: PersonalTodoRow, ymd: string) {
    await patchTodo(todo, { due_date: ymd || null }, { due_date: ymd || null });
  }

  const destMeta = categories.find((c) => c.id === dest) ?? categories[0]!;
  const prioMeta = PRIO_OPTS.find((p) => p.v === prio)!;
  const filterChips: Array<[string, string, number]> = [
    ["all", "Все", todos.length],
    ["imp", "Важные", todos.filter((t) => taskPrioNum(t.priority) === 1).length],
    ...nonInboxProjects.map((p) => [p.name, p.name, todos.filter((t) => t.project_name === p.name).length] as [string, string, number]),
  ];

  return (
    <div className="plan-inbox">
      <form className="qa" onSubmit={(e) => void addFromForm(e)}>
        <span className="qa-ic" aria-hidden>
          +
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Новая задача — Enter"
          aria-label="Новая задача"
          onKeyDown={(e) => {
            if (e.altKey && e.key >= "1" && e.key <= "5") {
              const next = categories[Number(e.key) - 1];
              if (next) setDest(next.id);
            }
          }}
        />
        <div className="qa-dds">
          <div className={`dd${openDd === "dest" ? " open" : ""}`}>
            <button type="button" className="dd-b" onClick={() => setOpenDd(openDd === "dest" ? null : "dest")}>
              <span className="dot" style={{ background: destMeta.color }} />
              {destMeta.label}
            </button>
            <div className="dd-m">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`dd-o${c.id === dest ? " on" : ""}`}
                  onClick={() => {
                    setDest(c.id);
                    setOpenDd(null);
                  }}
                >
                  <span className="dot" style={{ background: c.color }} />
                  {c.label}
                  <kbd>⌥{c.shortcut}</kbd>
                </button>
              ))}
            </div>
          </div>
          <div className={`dd${openDd === "project" ? " open" : ""}`}>
            <button
              type="button"
              className={`dd-b${!projectId ? " muted" : ""}`}
              onClick={() => setOpenDd(openDd === "project" ? null : "project")}
            >
              {nonInboxProjects.find((p) => p.id === projectId)?.name || "Без проекта"}
            </button>
            <div className="dd-m">
              <button
                type="button"
                className={`dd-o${!projectId ? " on" : ""}`}
                onClick={() => {
                  setProjectId("");
                  setOpenDd(null);
                }}
              >
                Без проекта
              </button>
              {nonInboxProjects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`dd-o${p.id === projectId ? " on" : ""}`}
                  onClick={() => {
                    setProjectId(p.id);
                    setOpenDd(null);
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <div className={`dd${openDd === "prio" ? " open" : ""}`}>
            <button
              type="button"
              className={`dd-b${!prio ? " muted" : ""}`}
              onClick={() => setOpenDd(openDd === "prio" ? null : "prio")}
            >
              {prio ? <span className="dot" style={{ background: prioMeta.c }} /> : null}
              {prio ? prioMeta.n : "Важность"}
            </button>
            <div className="dd-m">
              {PRIO_OPTS.map((p) => (
                <button
                  key={p.v}
                  type="button"
                  className={`dd-o${p.v === prio ? " on" : ""}`}
                  onClick={() => {
                    setPrio(p.v);
                    setOpenDd(null);
                  }}
                >
                  {p.c ? <span className="dot" style={{ background: p.c }} /> : null}
                  {p.n}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button className="qa-go" type="submit">
          Добавить
        </button>
      </form>

      <div className="bar">
        {filterChips.map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            className={`chip${filter === key ? " on" : ""}`}
            onClick={() => setFilter(key)}
          >
            {label} <i className="tnum">{count}</i>
          </button>
        ))}
        <input
          className="search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск"
        />
      </div>
      {error ? <p className="err">{error}</p> : null}

      <section className="board">
        {categories.map((col) => {
          const list = byCat[col.id] ?? [];
          return (
            <div
              key={col.id}
              className={`col ${col.id}${dropCol === col.id ? " drop" : ""}`}
              style={{ "--c": col.color, "--bg": col.bg || undefined } as CSSProperties}
              onDragOver={(e) => {
                if (!draggingId) return;
                e.preventDefault();
                setDropCol(col.id);
              }}
              onDragLeave={(e) => {
                const next = e.relatedTarget as Node | null;
                if (next && e.currentTarget.contains(next)) return;
                setDropCol((cur) => (cur === col.id ? null : cur));
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain") || draggingId;
                const todo = todos.find((t) => t.id === id);
                setDropCol(null);
                setDraggingId(null);
                if (todo) void moveTo(todo, col.id);
              }}
            >
              <div className="col-h">
                <span className="col-ic">{col.shortcut}</span>
                <div>
                  <div className="col-n">{col.label}</div>
                  <div className="col-d">{col.description}</div>
                </div>
                <span className="col-key">{list.length}</span>
              </div>
              <div className={`col-list${cardMenu && list.some((t) => t.id === cardMenu.id) ? " is-menu" : ""}`}>
              {loading ? (
                <div className="zero">Загрузка…</div>
              ) : list.length === 0 ? (
                <div className="zero">
                  <b>Пусто</b>
                  Перетащите сюда или добавьте задачу
                </div>
              ) : (
                list.map((todo) => {
                  const pn = taskPrioNum(todo.priority);
                  const dl = dlInfoForTodo(todo);
                  const projectOpen = cardMenu?.id === todo.id && cardMenu.kind === "project";
                  const prioOpen = cardMenu?.id === todo.id && cardMenu.kind === "prio";
                  const hasProject = Boolean(todo.project_name && todo.project_id !== inboxProjectId);
                  return (
                    <div
                      key={todo.id}
                      className={`cd${draggingId === todo.id ? " dragging" : ""}`}
                      draggable={titleEditId !== todo.id}
                      onDragStart={(e) => {
                        if (titleEditId === todo.id) {
                          e.preventDefault();
                          return;
                        }
                        setDraggingId(todo.id);
                        e.dataTransfer.setData("text/plain", todo.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDropCol(null);
                      }}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("button, input, label, a, .cd-pop, .cd-t")) return;
                        setCardMenu({ id: todo.id, kind: "project" });
                      }}
                    >
                      <button
                        type="button"
                        className="ck"
                        aria-label="Выполнить"
                        onClick={(e) => {
                          e.stopPropagation();
                          void finish(todo);
                        }}
                      >
                        ✓
                      </button>
                      <div className="cd-b">
                        {titleEditId === todo.id ? (
                          <input
                            className="cd-t-in"
                            value={titleDraft}
                            autoFocus
                            aria-label="Название задачи"
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setTitleDraft(e.target.value)}
                            onBlur={() => void saveTitle(todo, titleDraft)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void saveTitle(todo, titleDraft);
                              }
                              if (e.key === "Escape") setTitleEditId(null);
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            className="cd-t"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTitleEditId(todo.id);
                              setTitleDraft(todo.title);
                            }}
                          >
                            {todo.title}
                          </button>
                        )}
                        <span className="cd-m">
                          <button
                            type="button"
                            className={`tg tg--menu${pn === 1 ? " tg--imp" : pn === 2 ? " tg--p2" : pn === 3 ? " tg--p3" : " tg--ghost"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCardMenu(prioOpen ? null : { id: todo.id, kind: "prio" });
                            }}
                          >
                            {pn === 1 ? "важно" : pn === 2 ? "средне" : pn === 3 ? "не важно" : "важность"}
                          </button>
                          <button
                            type="button"
                            className={`tg tg--menu${hasProject ? "" : " tg--ghost"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCardMenu(projectOpen ? null : { id: todo.id, kind: "project" });
                            }}
                          >
                            {hasProject ? todo.project_name : "проект"}
                          </button>
                          <label
                            className={`tg tg--date${dl ? (dl.cls === "soon" || dl.cls === "late" ? " tg--soon" : "") : " tg--ghost"}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {dl?.text ?? "срок"}
                            <input
                              type="date"
                              value={todo.due_date ?? todo.scheduled_date ?? ""}
                              onChange={(e) => void setTodoDeadline(todo, e.target.value)}
                            />
                          </label>
                        </span>
                        {projectOpen ? (
                          <div className="cd-pop" onClick={(e) => e.stopPropagation()}>
                            <button type="button" className={!hasProject ? "on" : ""} onClick={() => void setTodoProject(todo, "")}>
                              Без проекта
                            </button>
                            {nonInboxProjects.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className={todo.project_id === p.id ? "on" : ""}
                                onClick={() => void setTodoProject(todo, p.id)}
                              >
                                {p.name}
                              </button>
                            ))}
                          </div>
                        ) : null}
                        {prioOpen ? (
                          <div className="cd-pop" onClick={(e) => e.stopPropagation()}>
                            {PRIO_OPTS.map((p) => (
                              <button
                                key={p.v}
                                type="button"
                                className={pn === p.v ? "on" : ""}
                                onClick={() => void setTodoPrio(todo, p.v)}
                              >
                                {p.c ? <span className="dot" style={{ background: p.c }} /> : null}
                                {p.n}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="cd-act">
                        <button
                          type="button"
                          className="cd-more"
                          title="Подробнее"
                          aria-label="Открыть карточку"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTask(todo);
                          }}
                        >
                          ⋯
                        </button>
                        <button
                          type="button"
                          className="cd-del"
                          title="Удалить"
                          aria-label="Удалить задачу"
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteTodo(todo);
                          }}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden>
                            <path d="M5 7h14M10 7V5h4v2m-1 14H8a1 1 0 0 1-1-1V7h10v13a1 1 0 0 1-1 1h-5z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              </div>
              {colAdd === col.id ? (
                <input
                  className="col-add-in"
                  autoFocus
                  value={colDraft}
                  placeholder="Название задачи"
                  onChange={(e) => setColDraft(e.target.value)}
                  onBlur={() => {
                    if (!colDraft.trim()) setColAdd(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void addFromColumn(col.id);
                    }
                    if (e.key === "Escape") setColAdd(null);
                  }}
                />
              ) : (
                <button type="button" className="col-add" onClick={() => { setColAdd(col.id); setColDraft(""); }}>
                  + Добавить задачу
                </button>
              )}
            </div>
          );
        })}
      </section>

      <div className={`scrim${selected ? " on" : ""}`} onClick={() => setSelected(null)} />
      <aside className={`drawer${selected ? " on" : ""}`} aria-hidden={!selected}>
        <div className="dr-h">
          Задача
          <button type="button" className="dr-x" onClick={() => setSelected(null)}>
            ✕
          </button>
        </div>
        <div className="dr-b">
          <div className="fld">
            <label>Название</label>
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>
          <div className="fld">
            <label>Категория</label>
            <div className="dest">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={editDest === c.id ? "on" : ""}
                  style={{ "--c": c.color } as CSSProperties}
                  onClick={() => setEditDest(c.id)}
                >
                  <span className="dot" style={{ background: c.color }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="fld2">
            <div className="fld">
              <label>Важность</label>
              <select value={editPrio} onChange={(e) => setEditPrio(Number(e.target.value) as 0 | 1 | 2 | 3)}>
                {PRIO_OPTS.map((p) => (
                  <option key={p.v} value={p.v}>
                    {p.n}
                  </option>
                ))}
              </select>
            </div>
            <div className="fld">
              <label>Дедлайн</label>
              <input type="date" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} />
            </div>
          </div>
          <div className="fld">
            <label>Проект</label>
            <IdeasTasksProjectSelect value={editProjectId} projects={nonInboxProjects} onChange={setEditProjectId} />
          </div>
          <div className="fld">
            <label>Заметка</label>
            <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} />
          </div>
        </div>
        <div className="dr-f">
          <button type="button" className="btn btn--pri" onClick={() => void saveTask()}>
            Сохранить
          </button>
          <button type="button" className="btn btn--gh" onClick={() => setSelected(null)}>
            Закрыть
          </button>
          <button type="button" className="btn btn--dan" onClick={() => void deleteTask()}>
            Удалить
          </button>
        </div>
      </aside>
      <div className={`toast${toast ? " on" : ""}`}>{toast}</div>
    </div>
  );
}

export function PlanInboxBoard() {
  return (
    <PersonalTodoProvider>
      <PlanInboxBoardInner />
    </PersonalTodoProvider>
  );
}
