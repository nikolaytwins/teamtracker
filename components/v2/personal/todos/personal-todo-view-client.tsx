"use client";

import { PersonalTodoDetailDrawer } from "@/components/v2/personal/todos/personal-todo-detail-drawer";
import { PersonalTodoRowItem } from "@/components/v2/personal/todos/personal-todo-row";
import {
  PersonalTodoQuickAdd,
  type PersonalTodoQuickAddHandle,
} from "@/components/v2/personal/todos/personal-todo-quick-add";
import { usePersonalTodo } from "@/components/v2/personal/todos/personal-todo-context";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { formatPersonalTodoDateLabel, isPersonalTodoOverdue } from "@/lib/v2/personal/todo-date";
import type { PersonalTodoListPayload, PersonalTodoRow, PersonalTodoView } from "@/lib/v2/personal/todo-types";
import { useCallback, useEffect, useRef, useState } from "react";

const EMPTY_MESSAGES: Partial<Record<PersonalTodoView, string>> = {
  inbox: "Во входящих пусто — добавьте задачу через строку сверху или перенесите сюда задачи без даты.",
  today: "На сегодня задач нет. Запланируйте что-нибудь или отдохните.",
  upcoming: "Предстоящих задач нет на ближайшие две недели.",
  week: "На этой неделе пока ничего не запланировано. Перетащите задачи из блока «Без даты».",
  project: "В этом проекте пока нет открытых задач.",
  completed: "Выполненных задач пока нет.",
};

function formatWeekColumnLabel(ymd: string) {
  return formatPersonalTodoDateLabel(ymd) ?? ymd;
}

export function PersonalTodoViewClient({
  view,
  projectId,
  title,
  subtitle,
  focusQuickAddOnMount = false,
  embedQuickAdd = false,
}: {
  view: PersonalTodoView;
  projectId?: string;
  title: string;
  subtitle?: string;
  focusQuickAddOnMount?: boolean;
  /** When true, renders its own quick-add (for pages outside planner shell). */
  embedQuickAdd?: boolean;
}) {
  const { refreshBootstrap, listNonce, projects, focusQuickAdd } = usePersonalTodo();
  const quickAddRef = useRef<PersonalTodoQuickAddHandle>(null);
  const [payload, setPayload] = useState<PersonalTodoListPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ view });
    if (view === "project" && projectId) qs.set("projectId", projectId);
    const data = await fetchJson<PersonalTodoListPayload>(`/api/v2/personal/todos?${qs}`);
    setPayload(data);
    setError(null);
  }, [view, projectId]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [load, listNonce]);

  async function reload() {
    await load();
    await refreshBootstrap();
  }

  useEffect(() => {
    if (focusQuickAddOnMount) focusQuickAdd();
  }, [focusQuickAddOnMount, focusQuickAdd]);

  async function toggleComplete(id: string) {
    const todo = findTodo(payload, id);
    const completed = !todo?.completed_at;
    try {
      await fetchJson(`/api/v2/personal/todos/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (selectedId === id && completed) setSelectedId(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обновить задачу");
    }
  }

  async function scheduleOn(todoId: string, date: string) {
    try {
      await fetchJson("/api/v2/personal/todos/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: todoId, scheduled_date: date }),
      });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось запланировать");
    }
  }

  function renderList(todos: PersonalTodoRow[], opts?: { showProject?: boolean; compact?: boolean }) {
    if (!todos.length) return null;
    return (
      <div className="overflow-hidden rounded-2xl bg-white shadow-[var(--v2-shadow-soft)]">
        <div className="divide-y divide-[var(--v2-ink-100)]/70">
          {todos.map((todo, i) => (
            <div key={todo.id} className="v2-row-in" style={{ animationDelay: `${i * 30}ms` }}>
              <PersonalTodoRowItem
                todo={todo}
                onToggle={(id) => void toggleComplete(id)}
                onOpen={setSelectedId}
                showProject={opts?.showProject ?? view !== "project"}
                compact={opts?.compact}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderEmpty() {
    const message = EMPTY_MESSAGES[view] ?? "Задач нет";
    return (
      <div className="v2-card mx-6 mt-4 px-6 py-12 text-center">
        <p className="v2-tight text-[14px] text-[var(--v2-ink-500)]">{message}</p>
      </div>
    );
  }

  function renderWeekBoard() {
    const week = payload?.week;
    if (!week) return null;
    const hasAny =
      week.unscheduled.length > 0 || week.dates.some((d) => (week.columns[d] ?? []).length > 0);

    return (
      <div className="px-6 pb-6">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {week.dates.map((date) => (
            <section
              key={date}
              className="v2-card flex w-[180px] shrink-0 flex-col p-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) void scheduleOn(dragId, date);
                setDragId(null);
              }}
            >
              <h2 className="v2-tight mb-2 px-1 text-[12px] font-semibold text-[var(--v2-ink-800)]">
                {formatWeekColumnLabel(date)}
              </h2>
              <div className="flex flex-1 flex-col gap-1">
                {(week.columns[date] ?? []).map((todo) => (
                  <div
                    key={todo.id}
                    className="overflow-hidden rounded-lg border border-[var(--v2-ink-100)] bg-[var(--v2-ink-50)]/40"
                  >
                    <PersonalTodoRowItem
                      todo={todo}
                      onToggle={(id) => void toggleComplete(id)}
                      onOpen={setSelectedId}
                      showProject
                      compact
                      draggable
                      isDragging={dragId === todo.id}
                      onDragStart={() => setDragId(todo.id)}
                      onDragEnd={() => setDragId(null)}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {week.unscheduled.length > 0 ? (
          <section className="v2-card mt-4 p-4">
            <h2 className="v2-tight mb-3 text-[13px] font-semibold text-[var(--v2-ink-900)]">
              Без даты ({week.unscheduled.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {week.unscheduled.map((todo) => (
                <div
                  key={todo.id}
                  draggable
                  onDragStart={() => setDragId(todo.id)}
                  onDragEnd={() => setDragId(null)}
                  onClick={() => setSelectedId(todo.id)}
                  className={`v2-tight cursor-grab rounded-xl border border-dashed border-[var(--v2-ink-200)] bg-white px-3 py-2 text-[13px] font-medium text-[var(--v2-ink-800)] active:cursor-grabbing ${
                    dragId === todo.id ? "opacity-50" : ""
                  }`}
                >
                  {todo.title}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {!hasAny ? renderEmpty() : null}
      </div>
    );
  }

  function renderUpcomingGroups() {
    const groups = payload?.groups ?? [];
    if (!groups.length) return renderEmpty();
    return (
      <div className="space-y-6 px-6 pb-6">
        {groups.map((group) => (
          <section key={group.date}>
            <h2 className="v2-tight mb-2 text-[13px] font-semibold text-[var(--v2-ink-800)]">
              {formatPersonalTodoDateLabel(group.date) ?? group.label}
            </h2>
            {renderList(group.todos)}
          </section>
        ))}
      </div>
    );
  }

  function renderTodayList() {
    const todos = payload?.todos ?? [];
    if (!todos.length) return renderEmpty();
    const overdue = todos.filter((t) => isPersonalTodoOverdue(t));
    const todayRest = todos.filter((t) => !isPersonalTodoOverdue(t));
    return (
      <div className="space-y-6 px-6 pb-6">
        {overdue.length > 0 ? (
          <section>
            <h2 className="v2-tight mb-2 text-[13px] font-semibold text-red-600">Просрочено</h2>
            {renderList(overdue)}
          </section>
        ) : null}
        {todayRest.length > 0 ? (
          <section>
            {overdue.length > 0 ? (
              <h2 className="v2-tight mb-2 text-[13px] font-semibold text-[var(--v2-ink-800)]">Сегодня</h2>
            ) : null}
            {renderList(todayRest)}
          </section>
        ) : null}
      </div>
    );
  }

  function renderDefaultList() {
    const todos = payload?.todos ?? [];
    if (!todos.length) return renderEmpty();
    return <div className="px-6 pb-6">{renderList(todos)}</div>;
  }

  const displayTitle =
    view === "project" && projectId
      ? projects.find((p) => p.id === projectId)?.name ?? title
      : title;

  return (
    <>
      {embedQuickAdd ? <PersonalTodoQuickAdd ref={quickAddRef} defaultProjectId={projectId} onCreated={() => void reload()} /> : null}

      <header className="px-6 pb-4 pt-6">
        <h1 className="v2-tight text-2xl font-semibold text-[var(--v2-ink-900)]">{displayTitle}</h1>
        {subtitle ? <p className="v2-tight mt-1 text-[14px] text-[var(--v2-ink-500)]">{subtitle}</p> : null}
      </header>

      {error ? (
        <div className="mx-6 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>
      ) : view === "week" ? (
        renderWeekBoard()
      ) : view === "upcoming" ? (
        renderUpcomingGroups()
      ) : view === "today" ? (
        renderTodayList()
      ) : (
        renderDefaultList()
      )}

      <PersonalTodoDetailDrawer
        todoId={selectedId}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={() => void reload()}
      />
    </>
  );
}

function findTodo(payload: PersonalTodoListPayload | null, id: string): PersonalTodoRow | undefined {
  if (!payload) return undefined;
  const direct = payload.todos.find((t) => t.id === id);
  if (direct) return direct;
  for (const g of payload.groups ?? []) {
    const found = g.todos.find((t) => t.id === id);
    if (found) return found;
  }
  if (payload.week) {
    for (const list of Object.values(payload.week.columns)) {
      const found = list.find((t) => t.id === id);
      if (found) return found;
    }
    const found = payload.week.unscheduled.find((t) => t.id === id);
    if (found) return found;
  }
  return undefined;
}
