"use client";

import { V2Icons } from "@/components/v2/ui/icons";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { PersonalCalendarItem } from "@/lib/v2/personal/personal-calendar-repo";
import { weekMondayYmd } from "@/lib/v2/personal/week-focus-plan";
import type { WeekFocusGoalRow, WeekFocusPayload } from "@/lib/v2/personal/week-focus-repo";
import { useCallback, useEffect, useMemo, useState } from "react";

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const DRAG_DEADLINE_TYPE = "application/x-v2-deadline-id";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toYmd(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function localTodayYmd() {
  const now = new Date();
  return toYmd(now.getFullYear(), now.getMonth(), now.getDate());
}

function currentWeekBounds() {
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return {
    from: toYmd(monday.getFullYear(), monday.getMonth(), monday.getDate()),
    to: toYmd(sunday.getFullYear(), sunday.getMonth(), sunday.getDate()),
  };
}

function addMonths(year: number, month: number, amount: number) {
  const date = new Date(year, month + amount, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

function formatDate(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "short",
  }).format(new Date(year!, month! - 1, day));
}

function formatDeadlineShort(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(new Date(year!, month! - 1, day));
}

function monthGrid(year: number, month: number) {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();
  return Array.from({ length: 42 }, (_, index) => {
    const currentDay = index - firstWeekday + 1;
    if (currentDay < 1) {
      const previous = addMonths(year, month, -1);
      const day = previousMonthDays + currentDay;
      return { ...previous, day, ymd: toYmd(previous.year, previous.month, day), outside: true };
    }
    if (currentDay > daysInMonth) {
      const next = addMonths(year, month, 1);
      const day = currentDay - daysInMonth;
      return { ...next, day, ymd: toYmd(next.year, next.month, day), outside: true };
    }
    return { year, month, day: currentDay, ymd: toYmd(year, month, currentDay), outside: false };
  });
}

function CalendarEventCard({
  item,
  onComplete,
  onDragStart,
  onDragEnd,
  dragging,
  hideDate = false,
}: {
  item: PersonalCalendarItem;
  onComplete: (item: PersonalCalendarItem) => void;
  onDragStart?: (item: PersonalCalendarItem) => void;
  onDragEnd?: () => void;
  dragging?: boolean;
  hideDate?: boolean;
}) {
  return (
    <article
      draggable={Boolean(onDragStart)}
      onDragStart={(e) => {
        if (!onDragStart) return;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData(DRAG_DEADLINE_TYPE, item.id);
        e.dataTransfer.setData("text/plain", item.id);
        onDragStart(item);
      }}
      onDragEnd={onDragEnd}
      className={`group flex gap-3 rounded-2xl border border-[var(--v2-ink-100)] bg-white p-3.5 transition hover:-translate-y-0.5 hover:shadow-[var(--v2-shadow-cardHv)] ${
        item.completed_at ? "opacity-55" : ""
      } ${dragging ? "opacity-40" : ""} ${onDragStart ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div
        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ color: item.color, background: `${item.color}16`, boxShadow: `inset 0 0 0 1px ${item.color}28` }}
      >
        <V2Icons.cal className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h3
          className={`v2-tight text-[14px] font-semibold leading-[1.2] text-[var(--v2-ink-900)] ${
            item.completed_at ? "line-through" : ""
          }`}
        >
          {item.title}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: item.color, background: `${item.color}14` }}
          >
            {item.category}
          </span>
          {!hideDate ? (
            <span className="v2-tnum text-[11px] text-[var(--v2-ink-500)]">
              {formatDate(item.date)}
              {item.time ? ` · ${item.time}` : ""}
            </span>
          ) : item.time ? (
            <span className="v2-tnum text-[11px] text-[var(--v2-ink-500)]">до {item.time}</span>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onComplete(item)}
        aria-label={item.completed_at ? "Вернуть задачу" : "Выполнить задачу"}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
          item.completed_at
            ? "border-[var(--v2-brand-200)] bg-[var(--v2-brand-50)] text-[var(--v2-brand-600)]"
            : "border-[var(--v2-ink-200)] text-[var(--v2-ink-400)] hover:border-[var(--v2-brand-300)] hover:text-[var(--v2-brand-600)]"
        }`}
      >
        <V2Icons.check className="h-4 w-4" />
      </button>
    </article>
  );
}

export function PersonalCalendarClient() {
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedDate, setSelectedDate] = useState(localTodayYmd);
  const [items, setItems] = useState<PersonalCalendarItem[]>([]);
  const [weekFocus, setWeekFocus] = useState<WeekFocusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropDate, setDropDate] = useState<string | null>(null);
  const [newGoal, setNewGoal] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newDeadlineDate, setNewDeadlineDate] = useState(localTodayYmd);
  const [savingFocus, setSavingFocus] = useState(false);
  const today = localTodayYmd();

  const range = useMemo(() => {
    const fromMonth = addMonths(view.year, view.month, -1);
    const toMonth = addMonths(view.year, view.month, 3);
    const lastDay = new Date(toMonth.year, toMonth.month + 1, 0).getDate();
    const monthFrom = toYmd(fromMonth.year, fromMonth.month, 1);
    const monthTo = toYmd(toMonth.year, toMonth.month, lastDay);
    const currentWeek = currentWeekBounds();
    return {
      from: monthFrom < currentWeek.from ? monthFrom : currentWeek.from,
      to: monthTo > currentWeek.to ? monthTo : currentWeek.to,
    };
  }, [view]);

  const loadItems = useCallback(async () => {
    const data = await fetchJson<{ items: PersonalCalendarItem[] }>(
      `/api/v2/personal/calendar?from=${range.from}&to=${range.to}`
    );
    setItems(data.items);
  }, [range]);

  const loadWeekFocus = useCallback(async (date: string) => {
    const data = await fetchJson<{ weekFocus: WeekFocusPayload }>(
      `/api/v2/personal/calendar/week-focus?date=${date}`
    );
    setWeekFocus(data.weekFocus);
    setNewDeadlineDate((prev) => {
      const focus = data.weekFocus;
      if (prev >= focus.week_start && prev <= focus.week_end) return prev;
      return date >= focus.week_start && date <= focus.week_end ? date : focus.week_start;
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    loadItems()
      .then(() => setError(null))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Не удалось загрузить календарь"))
      .finally(() => setLoading(false));
  }, [loadItems]);

  useEffect(() => {
    loadWeekFocus(selectedDate).catch((reason) =>
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить фокус недели")
    );
  }, [loadWeekFocus, selectedDate]);

  const days = useMemo(() => monthGrid(view.year, view.month), [view]);
  const itemsByDate = useMemo(() => {
    const grouped = new Map<string, PersonalCalendarItem[]>();
    for (const item of items) {
      const list = grouped.get(item.date) ?? [];
      list.push(item);
      grouped.set(item.date, list);
    }
    for (const [date, list] of grouped) {
      grouped.set(
        date,
        [...list].sort((a, b) => {
          const done = Number(Boolean(a.completed_at)) - Number(Boolean(b.completed_at));
          if (done !== 0) return done;
          return (a.time ?? "").localeCompare(b.time ?? "") || a.title.localeCompare(b.title, "ru");
        })
      );
    }
    return grouped;
  }, [items]);

  const selectedItems = itemsByDate.get(selectedDate) ?? [];
  const weekDeadlines = useMemo(() => {
    if (!weekFocus) return [];
    return items
      .filter((item) => item.date >= weekFocus.week_start && item.date <= weekFocus.week_end)
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          Number(Boolean(a.completed_at)) - Number(Boolean(b.completed_at)) ||
          a.title.localeCompare(b.title, "ru")
      );
  }, [items, weekFocus]);

  const categories = useMemo(() => {
    const values = new Map<string, string>();
    for (const item of items) values.set(item.category, item.color);
    return [...values.entries()];
  }, [items]);

  function moveMonth(amount: number) {
    setView((current) => addMonths(current.year, current.month, amount));
  }

  function goToday() {
    const date = new Date();
    setView({ year: date.getFullYear(), month: date.getMonth() });
    setSelectedDate(localTodayYmd());
  }

  async function toggleComplete(item: PersonalCalendarItem) {
    const nextCompleted = item.completed_at ? null : new Date().toISOString();
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, completed_at: nextCompleted } : row))
    );
    try {
      await fetchJson(`/api/v2/personal/todos/${item.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !item.completed_at }),
      });
    } catch (reason) {
      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, completed_at: item.completed_at } : row))
      );
      setError(reason instanceof Error ? reason.message : "Не удалось обновить дедлайн");
    }
  }

  async function moveDeadline(id: string, date: string) {
    const current = items.find((item) => item.id === id);
    if (!current || current.date === date) return;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, date } : item)));
    try {
      await fetchJson("/api/v2/personal/todos/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, scheduled_date: date }),
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось перенести дедлайн");
      await loadItems().catch(() => null);
    }
  }

  async function toggleGoal(goal: WeekFocusGoalRow) {
    if (!weekFocus) return;
    const nextCompleted = goal.completed_at ? null : new Date().toISOString();
    setWeekFocus({
      ...weekFocus,
      goals: weekFocus.goals.map((row) =>
        row.id === goal.id ? { ...row, completed_at: nextCompleted } : row
      ),
    });
    try {
      await fetchJson(`/api/v2/personal/calendar/week-focus/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !goal.completed_at }),
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось обновить пункт");
      await loadWeekFocus(selectedDate).catch(() => null);
    }
  }

  async function addGoal() {
    const title = newGoal.trim();
    if (!title || !weekFocus || savingFocus) return;
    setSavingFocus(true);
    try {
      const data = await fetchJson<{ goal: WeekFocusGoalRow }>("/api/v2/personal/calendar/week-focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_start: weekFocus.week_start, title }),
      });
      setWeekFocus({
        ...weekFocus,
        id: weekFocus.id ?? "local",
        goals: [...weekFocus.goals, data.goal],
      });
      setNewGoal("");
      await loadWeekFocus(selectedDate);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось добавить пункт");
    } finally {
      setSavingFocus(false);
    }
  }

  async function deleteGoal(goalId: string) {
    if (!weekFocus) return;
    setWeekFocus({ ...weekFocus, goals: weekFocus.goals.filter((g) => g.id !== goalId) });
    try {
      await fetchJson(`/api/v2/personal/calendar/week-focus/goals/${goalId}`, { method: "DELETE" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось удалить");
      await loadWeekFocus(selectedDate).catch(() => null);
    }
  }

  async function addDeadline() {
    const title = newDeadline.trim();
    if (!title || savingFocus) return;
    const date = newDeadlineDate || selectedDate;
    setSavingFocus(true);
    try {
      await fetchJson("/api/v2/personal/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          due_date: date,
          scheduled_date: date,
          priority: "high",
        }),
      });
      setNewDeadline("");
      await loadItems();
      if (weekMondayYmd(date) !== weekMondayYmd(selectedDate)) {
        setSelectedDate(date);
        const [y, m] = date.split("-").map(Number);
        setView({ year: y!, month: m! - 1 });
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось добавить дедлайн");
    } finally {
      setSavingFocus(false);
    }
  }

  async function deleteDeadline(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    try {
      await fetchJson(`/api/v2/personal/todos/${id}`, { method: "DELETE" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось удалить дедлайн");
      await loadItems().catch(() => null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto px-4 py-5 sm:px-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--v2-brand-600)]">
            Личный план
          </p>
          <h1 className="v2-tighter text-[26px] font-bold text-[var(--v2-ink-900)]">Календарь</h1>
          <p className="mt-1 text-[13px] text-[var(--v2-ink-500)]">
            Добавляй цели и дедлайны, перетаскивай их по дням
          </p>
        </div>
        <div className="flex items-center gap-2">
          {categories.map(([name, color]) => (
            <span
              key={name}
              className="hidden items-center gap-1.5 rounded-full border border-[var(--v2-ink-100)] bg-white px-2.5 py-1 text-[11px] text-[var(--v2-ink-600)] sm:flex"
            >
              <i className="h-2 w-2 rounded-full" style={{ background: color }} />
              {name}
            </span>
          ))}
          <button
            type="button"
            onClick={goToday}
            className="rounded-xl border border-[var(--v2-ink-200)] bg-white px-3 py-2 text-[12px] font-semibold text-[var(--v2-ink-700)] shadow-sm transition hover:border-[var(--v2-brand-200)] hover:text-[var(--v2-brand-700)]"
          >
            Сегодня
          </button>
        </div>
      </header>

      {error ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid min-h-[650px] flex-none gap-4 lg:h-[calc(100vh-190px)] lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="v2-card flex min-h-[650px] min-w-0 flex-col overflow-hidden lg:min-h-0">
          <div className="flex items-center justify-between border-b border-[var(--v2-ink-100)] px-4 py-3 sm:px-5">
            <div>
              <h2 className="v2-tight text-[18px] font-bold text-[var(--v2-ink-900)]">
                {MONTHS[view.month]} {view.year}
              </h2>
              <p className="mt-0.5 text-[11px] text-[var(--v2-ink-400)]">
                Перетащи дедлайн на день · клик — детали
                {loading ? " · обновление…" : ""}
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                aria-label="Предыдущий месяц"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--v2-ink-200)] text-[var(--v2-ink-600)] transition hover:bg-[var(--v2-ink-50)]"
              >
                <V2Icons.chevL className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                aria-label="Следующий месяц"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--v2-ink-200)] text-[var(--v2-ink-600)] transition hover:bg-[var(--v2-ink-50)]"
              >
                <V2Icons.chevR className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-[var(--v2-ink-100)] bg-[var(--v2-ink-50)]/70">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]"
              >
                {weekday}
              </div>
            ))}
          </div>

          <div className="grid flex-1 grid-cols-7 grid-rows-6">
            {days.map((day) => {
              const dayItems = itemsByDate.get(day.ymd) ?? [];
              const selected = selectedDate === day.ymd;
              const isToday = today === day.ymd;
              const isDropTarget = dropDate === day.ymd;
              return (
                <button
                  key={day.ymd}
                  type="button"
                  onClick={() => {
                    setSelectedDate(day.ymd);
                    if (day.outside) setView({ year: day.year, month: day.month });
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDropDate(day.ymd);
                  }}
                  onDragLeave={() => setDropDate((current) => (current === day.ymd ? null : current))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id =
                      dragId ||
                      e.dataTransfer.getData(DRAG_DEADLINE_TYPE) ||
                      e.dataTransfer.getData("text/plain");
                    if (id) void moveDeadline(id, day.ymd);
                    setDragId(null);
                    setDropDate(null);
                    setSelectedDate(day.ymd);
                    if (day.outside) setView({ year: day.year, month: day.month });
                  }}
                  className={`relative min-h-[82px] overflow-hidden border-b border-r border-[var(--v2-ink-100)] p-2 text-left align-top transition sm:min-h-[94px] ${
                    selected
                      ? "z-[1] bg-[var(--v2-brand-50)] shadow-[inset_0_0_0_1px_var(--v2-brand-300)]"
                      : "bg-white hover:bg-[var(--v2-ink-50)]"
                  } ${isDropTarget ? "bg-[var(--v2-brand-50)] ring-2 ring-inset ring-[var(--v2-brand-400)]" : ""} ${
                    day.outside ? "opacity-40" : ""
                  }`}
                >
                  <span
                    className={`v2-tnum inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-1 text-[12px] font-semibold ${
                      isToday
                        ? "bg-[var(--v2-brand-600)] text-white shadow-[var(--v2-shadow-glow)]"
                        : selected
                          ? "text-[var(--v2-brand-700)]"
                          : "text-[var(--v2-ink-700)]"
                    }`}
                  >
                    {day.day}
                  </span>
                  <div className="mt-1.5 space-y-1">
                    {dayItems.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData(DRAG_DEADLINE_TYPE, item.id);
                          e.dataTransfer.setData("text/plain", item.id);
                          setDragId(item.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setDropDate(null);
                        }}
                        className={`truncate rounded-md px-1.5 py-1 text-[9px] font-semibold leading-none sm:text-[10px] ${
                          item.completed_at ? "line-through decoration-[1.5px] opacity-45" : ""
                        } ${dragId === item.id ? "opacity-40" : ""}`}
                        style={{
                          color: item.completed_at ? "#71717A" : item.color,
                          background: item.completed_at ? "#F4F4F5" : `${item.color}14`,
                        }}
                      >
                        <span
                          className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
                          style={{ background: item.completed_at ? "#A1A1AA" : item.color }}
                        />
                        {item.title}
                      </div>
                    ))}
                    {dayItems.length > 2 ? (
                      <p className="px-1 text-[9px] font-medium text-[var(--v2-ink-400)]">
                        ещё {dayItems.length - 2}
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto lg:pr-1">
          <section className="v2-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-ink-400)]">
                  Выбранный день
                </p>
                <h2 className="v2-tight mt-1 text-[16px] font-bold capitalize text-[var(--v2-ink-900)]">
                  {formatDate(selectedDate)}
                </h2>
              </div>
              <span className="v2-tnum rounded-lg bg-[var(--v2-ink-100)] px-2 py-1 text-[11px] font-semibold text-[var(--v2-ink-600)]">
                {selectedItems.length}
              </span>
            </div>
            {selectedItems.length ? (
              <div className="space-y-2">
                {selectedItems.map((item) => (
                  <CalendarEventCard
                    key={item.id}
                    item={item}
                    onComplete={toggleComplete}
                    dragging={dragId === item.id}
                    onDragStart={(row) => setDragId(row.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setDropDate(null);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)]/60 px-4 py-7 text-center">
                <V2Icons.cal className="mx-auto h-6 w-6 text-[var(--v2-ink-300)]" />
                <p className="mt-2 text-[12px] text-[var(--v2-ink-500)]">На этот день ничего не запланировано</p>
              </div>
            )}
          </section>

          <section className="v2-card overflow-hidden">
            <div className="border-b border-[var(--v2-ink-100)] bg-[var(--v2-brand-50)]/60 px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-brand-600)]">
                Фокус недели
              </p>
              <h2 className="v2-tight mt-1 text-[16px] font-bold text-[var(--v2-ink-900)]">
                Неделя {weekFocus?.label ?? "…"}
              </h2>
            </div>

            <div className="px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
                {weekFocus?.result_title ?? "Главный результат недели"}
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {(weekFocus?.goals ?? []).map((goal) => {
                  const done = Boolean(goal.completed_at);
                  return (
                    <li key={goal.id} className="group flex items-start gap-1">
                      <button
                        type="button"
                        onClick={() => void toggleGoal(goal)}
                        className={`flex min-w-0 flex-1 items-start gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-[var(--v2-ink-50)] ${
                          done ? "opacity-60" : ""
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                            done
                              ? "border-[var(--v2-brand-300)] bg-[var(--v2-brand-50)] text-[var(--v2-brand-600)]"
                              : "border-[var(--v2-ink-200)] text-transparent"
                          }`}
                        >
                          <V2Icons.check className="h-3.5 w-3.5" />
                        </span>
                        <span
                          className={`v2-tight text-[13px] font-medium leading-snug text-[var(--v2-ink-800)] ${
                            done ? "line-through decoration-[1.5px]" : ""
                          }`}
                        >
                          {goal.title}
                        </span>
                      </button>
                      <button
                        type="button"
                        title="Удалить"
                        onClick={() => void deleteGoal(goal.id)}
                        className="mt-1.5 hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--v2-ink-300)] transition hover:bg-red-50 hover:text-red-500 group-hover:flex"
                      >
                        <V2Icons.trash className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void addGoal();
                }}
              >
                <input
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  placeholder="Добавить результат…"
                  className="v2-input h-9 min-w-0 flex-1 text-[13px]"
                />
                <button
                  type="submit"
                  disabled={savingFocus || !newGoal.trim()}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--v2-ink-900)] text-white disabled:opacity-40"
                >
                  <V2Icons.plus className="h-4 w-4" />
                </button>
              </form>
            </div>

            <div className="border-t border-[var(--v2-ink-100)] px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
                Дедлайны
              </p>
              <p className="mt-1 text-[11px] text-[var(--v2-ink-400)]">
                Перетащи на день в сетке слева
              </p>
              {weekDeadlines.length ? (
                <ul className="mt-2.5 space-y-2">
                  {weekDeadlines.map((item) => {
                    const done = Boolean(item.completed_at);
                    return (
                      <li key={item.id} className="group relative">
                        <button
                          type="button"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData(DRAG_DEADLINE_TYPE, item.id);
                            e.dataTransfer.setData("text/plain", item.id);
                            setDragId(item.id);
                          }}
                          onDragEnd={() => {
                            setDragId(null);
                            setDropDate(null);
                          }}
                          onClick={() => void toggleComplete(item)}
                          className={`flex w-full cursor-grab items-start gap-2.5 rounded-xl border border-[var(--v2-ink-100)] bg-white px-2.5 py-2.5 text-left transition hover:border-[var(--v2-ink-200)] hover:bg-[var(--v2-ink-50)]/80 active:cursor-grabbing ${
                            done ? "opacity-55" : ""
                          } ${dragId === item.id ? "opacity-40" : ""}`}
                        >
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                              done
                                ? "border-[var(--v2-brand-300)] bg-[var(--v2-brand-50)] text-[var(--v2-brand-600)]"
                                : "border-[var(--v2-ink-200)] text-transparent"
                            }`}
                          >
                            <V2Icons.check className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className={`v2-tight block text-[13px] font-semibold leading-snug text-[var(--v2-ink-900)] ${
                                done ? "line-through decoration-[1.5px]" : ""
                              }`}
                            >
                              {item.title}
                            </span>
                            <span className="v2-tnum mt-1 block text-[11px] text-[var(--v2-ink-500)]">
                              до {formatDeadlineShort(item.date)}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          title="Удалить"
                          onClick={() => void deleteDeadline(item.id)}
                          className="absolute right-1.5 top-1.5 hidden h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-[var(--v2-ink-300)] shadow-sm transition hover:bg-red-50 hover:text-red-500 group-hover:flex"
                        >
                          <V2Icons.trash className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-[12px] text-[var(--v2-ink-500)]">На эту неделю дедлайнов нет</p>
              )}

              <form
                className="mt-3 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void addDeadline();
                }}
              >
                <input
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  placeholder="Новый дедлайн…"
                  className="v2-input h-9 w-full text-[13px]"
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newDeadlineDate}
                    onChange={(e) => setNewDeadlineDate(e.target.value)}
                    className="v2-input h-9 min-w-0 flex-1 text-[13px]"
                  />
                  <button
                    type="submit"
                    disabled={savingFocus || !newDeadline.trim()}
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-3 text-[12px] font-semibold text-white disabled:opacity-40"
                  >
                    <V2Icons.plus className="h-3.5 w-3.5" />
                    Добавить
                  </button>
                </div>
              </form>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
