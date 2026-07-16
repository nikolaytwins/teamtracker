"use client";

import { InboxSectionQuickAdd } from "@/components/v2/personal/todos/inbox-section-quick-add";
import { PersonalTodoDetailDrawer } from "@/components/v2/personal/todos/personal-todo-detail-drawer";
import { PersonalTodoRowItem } from "@/components/v2/personal/todos/personal-todo-row";
import {
  PersonalTodoQuickAdd,
  type PersonalTodoQuickAddHandle,
} from "@/components/v2/personal/todos/personal-todo-quick-add";
import { usePersonalTodo } from "@/components/v2/personal/todos/personal-todo-context";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { formatPersonalTodoDateLabel, isPersonalTodoOverdue } from "@/lib/v2/personal/todo-date";
import { groupInboxTodosByPriority, INBOX_IMPORTANT_SECTION_IDS, type InboxTodoSectionId } from "@/lib/v2/personal/todo-inbox-groups";
import type { PersonalTodoListPayload, PersonalTodoRow, PersonalTodoView } from "@/lib/v2/personal/todo-types";
import { V2Icons } from "@/components/v2/ui/icons";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const EMPTY_MESSAGES: Partial<Record<PersonalTodoView, string>> = {
  inbox: "Во входящих пусто — добавьте задачу в поле ниже.",
  today: "На сегодня задач нет. Запланируйте что-нибудь или отдохните.",
  upcoming: "На ближайшие 7 дней задач нет — назначьте дату из входящих.",
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
}: {
  view: PersonalTodoView;
  projectId?: string;
  title: string;
  subtitle?: string;
  focusQuickAddOnMount?: boolean;
}) {
  const { refreshBootstrap, listNonce, projects, focusQuickAdd, setParentCandidates, setSubtaskParentId } =
    usePersonalTodo();
  const quickAddRef = useRef<PersonalTodoQuickAddHandle>(null);
  const [payload, setPayload] = useState<PersonalTodoListPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [quickAddSection, setQuickAddSection] = useState<InboxTodoSectionId | null>(null);

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

  useEffect(() => {
    if (focusQuickAddOnMount) focusQuickAdd();
  }, [focusQuickAddOnMount, focusQuickAdd]);

  async function reload() {
    await load();
    await refreshBootstrap();
  }

  function handleAddSubtask(id: string) {
    setSubtaskParentId(id);
    focusQuickAdd();
  }

  useEffect(() => {
    if (!payload) return;
    const candidates = payload.todos.map((t) => ({ id: t.id, title: t.title }));
    setParentCandidates(candidates);
  }, [payload, setParentCandidates]);

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

  function renderList(
    todos: PersonalTodoRow[],
    opts?: {
      showProject?: boolean;
      compact?: boolean;
      priorityAccent?: string;
      showSchedule?: boolean;
      draggable?: boolean;
    }
  ) {
    if (!todos.length) return null;
    const scheduleHandler = opts?.showSchedule
      ? (id: string, date: string) => void scheduleOn(id, date)
      : undefined;
    return (
      <div className="overflow-hidden rounded-2xl bg-white shadow-[var(--v2-shadow-soft)]">
        {opts?.priorityAccent ? (
          <div className="h-1 w-full" style={{ background: opts.priorityAccent }} aria-hidden />
        ) : null}
        <div className="divide-y divide-[var(--v2-ink-100)]/70">
          {todos.map((todo, i) => (
            <div key={todo.id} className="v2-row-in" style={{ animationDelay: `${i * 30}ms` }}>
              <PersonalTodoRowItem
                todo={todo}
                onToggle={(id) => void toggleComplete(id)}
                onOpen={setSelectedId}
                onAddSubtask={handleAddSubtask}
                onSchedule={scheduleHandler}
                showProject={opts?.showProject ?? view !== "project"}
                compact={opts?.compact}
                draggable={opts?.draggable}
                isDragging={opts?.draggable && dragId === todo.id}
                onDragStart={() => setDragId(todo.id)}
                onDragEnd={() => setDragId(null)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderDropZone(children: React.ReactNode) {
    return (
      <div className="overflow-hidden rounded-2xl border border-dashed border-[var(--v2-ink-200)] bg-white/60 shadow-[var(--v2-shadow-soft)]">
        {children}
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
                      onAddSubtask={handleAddSubtask}
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

  function renderUpcomingDays() {
    const week = payload?.week;
    if (!week?.dates.length) return renderEmpty();

    return (
      <div className="space-y-8 px-6 pb-6">
        {week.dates.map((date) => {
          const todos = week.columns[date] ?? [];
          return (
            <section
              key={date}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) void scheduleOn(dragId, date);
                setDragId(null);
              }}
            >
              {renderInboxSectionHeader(formatWeekColumnLabel(date), todos.length)}
              {todos.length > 0 ? (
                renderList(todos, { showProject: true, draggable: true })
              ) : (
                renderDropZone(
                  <p className="v2-tight px-4 py-8 text-center text-[13px] text-[var(--v2-ink-400)]">
                    Перетащите задачу сюда
                  </p>
                )
              )}
            </section>
          );
        })}
      </div>
    );
  }

  function renderInboxSectionHeader(
    title: string,
    count: number,
    opts?: {
      subtitle?: string;
      accent?: string;
      prominent?: boolean;
      sectionId?: InboxTodoSectionId;
    }
  ) {
    const sectionId = opts?.sectionId;
    const quickOpen = sectionId && quickAddSection === sectionId;

    return (
      <div className="mb-3">
        <div className="flex items-start gap-2">
          {opts?.accent ? (
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: opts.accent }} aria-hidden />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2
                className={`v2-tight font-semibold ${
                  opts?.prominent ? "text-[17px] text-[var(--v2-ink-900)]" : "text-[15px] text-[var(--v2-ink-800)]"
                }`}
              >
                {title}
                <span className="v2-tnum ml-2 text-[13px] font-medium text-[var(--v2-ink-400)]">{count}</span>
              </h2>
              {sectionId ? (
                <button
                  type="button"
                  onClick={() => setQuickAddSection(quickOpen ? null : sectionId)}
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
                    quickOpen
                      ? "bg-[var(--v2-brand-100)] text-[var(--v2-brand-700)]"
                      : "text-[var(--v2-ink-400)] hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-700)]"
                  }`}
                  title={`Добавить в «${title}»`}
                >
                  <V2Icons.plus className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            {opts?.subtitle ? (
              <p className="v2-tight mt-0.5 text-[12px] text-[var(--v2-ink-500)]">{opts.subtitle}</p>
            ) : null}
          </div>
        </div>
        {sectionId ? (
          <InboxSectionQuickAdd
            sectionId={sectionId}
            open={!!quickOpen}
            onClose={() => setQuickAddSection(null)}
            onCreated={() => void reload()}
          />
        ) : null}
      </div>
    );
  }

  function renderInboxByPriority() {
    const todos = payload?.todos ?? [];
    const sections = groupInboxTodosByPriority(todos);
    const important = sections.filter((s) => INBOX_IMPORTANT_SECTION_IDS.includes(s.id));
    const rest = sections.filter((s) => !INBOX_IMPORTANT_SECTION_IDS.includes(s.id));
    const importantCount = important.reduce((n, s) => n + s.todos.length, 0);

    return (
      <div className="space-y-8 px-6 pb-6">
        <section>
          {renderInboxSectionHeader("Важное сейчас", importantCount, {
            subtitle: "Срочные и высокоприоритетные задачи",
            prominent: true,
          })}
          <div className="space-y-4">
            {important.map((section) => (
              <div key={section.id}>
                {renderInboxSectionHeader(section.title, section.todos.length, {
                  accent: section.accent,
                  sectionId: section.id,
                })}
                {section.todos.length > 0
                  ? renderList(section.todos, { showProject: true, priorityAccent: section.accent, showSchedule: true })
                  : null}
              </div>
            ))}
          </div>
        </section>
        {rest.map((section) => (
          <section key={section.id}>
            {renderInboxSectionHeader(section.title, section.todos.length, {
              subtitle: section.subtitle,
              accent: section.accent,
              sectionId: section.id,
            })}
            {section.todos.length > 0
              ? renderList(section.todos, { showProject: true, priorityAccent: section.accent, showSchedule: true })
              : null}
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
      <header className="px-6 pb-2 pt-6">
        <h1 className="v2-tight text-2xl font-semibold text-[var(--v2-ink-900)]">{displayTitle}</h1>
        {subtitle ? <p className="v2-tight mt-1 text-[14px] text-[var(--v2-ink-500)]">{subtitle}</p> : null}
      </header>

      <PersonalTodoQuickAdd
        ref={quickAddRef}
        view={view}
        defaultProjectId={projectId}
        onCreated={() => void reload()}
      />

      {error ? (
        <div className="mx-6 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>
      ) : view === "week" ? (
        renderWeekBoard()
      ) : view === "upcoming" ? (
        renderUpcomingDays()
      ) : view === "today" ? (
        renderTodayList()
      ) : view === "inbox" ? (
        renderInboxByPriority()
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
  for (const t of payload.todos) {
    if (t.id === id) return t;
    const sub = t.subtasks?.find((s) => s.id === id);
    if (sub) return sub;
  }
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
