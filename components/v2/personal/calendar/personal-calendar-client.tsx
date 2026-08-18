"use client";

import { V2Icons } from "@/components/v2/ui/icons";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { PersonalCalendarItem } from "@/lib/v2/personal/personal-calendar-repo";
import { formatWeekRangeShort, weekMondayYmd } from "@/lib/v2/personal/week-focus-plan";
import type {
  WeekFocusGoalRow,
  WeekFocusPayload,
  WeekFocusPriority,
} from "@/lib/v2/personal/week-focus-repo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

const PRIORITY_META: Record<
  WeekFocusPriority,
  { label: string; short: string; color: string; soft: string; ink: string }
> = {
  high: { label: "Обязательно", short: "Важно", color: "#DC2626", soft: "#FEF2F2", ink: "#B42318" },
  medium: { label: "Желательно", short: "Средне", color: "#EA580C", soft: "#FFF7ED", ink: "#C2410C" },
  low: { label: "Можно не делать", short: "Низкий", color: "#A1A1AA", soft: "#F4F4F5", ink: "#52525B" },
};

const PRIORITY_ORDER: WeekFocusPriority[] = ["high", "medium", "low"];

/** Три уровня фокуса недели в шкалу приоритетов задач. */
const DEADLINE_PRIORITY: Record<WeekFocusPriority, string> = {
  high: "urgent",
  medium: "high",
  low: "low",
};

function PriorityPicker({
  value,
  onSelect,
  variant,
}: {
  value: WeekFocusPriority;
  onSelect: (priority: WeekFocusPriority) => void;
  variant: "chip" | "field";
}) {
  const [menu, setMenu] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const meta = PRIORITY_META[value];
  const open = menu !== null;

  const toggle = () => {
    if (open) {
      setMenu(null);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = variant === "field" ? rect.width : 200;
    const height = 132;
    const openUpwards = rect.bottom + height + 8 > window.innerHeight;
    const rawLeft = variant === "field" ? rect.left : rect.right - width;
    setMenu({
      top: openUpwards ? rect.top - height - 6 : rect.bottom + 6,
      left: Math.min(Math.max(8, rawLeft), Math.max(8, window.innerWidth - width - 8)),
      width,
    });
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setMenu(null);
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", close);
    // Меню позиционируется от viewport — при скролле любого контейнера закрываем.
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  return (
    <>
      {variant === "chip" ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={toggle}
          title={`Приоритет: ${meta.label}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition hover:brightness-95"
          style={{ background: meta.soft, color: meta.ink }}
        >
          <i className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
          {meta.short}
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={toggle}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="v2-input flex h-10 w-full items-center gap-2 text-left text-[14px]"
        >
          <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: meta.color }} />
          <span className="min-w-0 flex-1 truncate font-medium text-[var(--v2-ink-800)]">
            {meta.label}
          </span>
          <V2Icons.chev className="h-4 w-4 shrink-0 text-[var(--v2-ink-400)]" />
        </button>
      )}

      {menu ? (
        <div
          ref={menuRef}
          role="listbox"
          style={{ top: menu.top, left: menu.left, width: menu.width }}
          className="fixed z-[60] overflow-hidden rounded-xl border border-[var(--v2-ink-100)] bg-white p-1 shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
        >
          {PRIORITY_ORDER.map((key) => {
            const option = PRIORITY_META[key];
            const active = key === value;
            return (
              <button
                key={key}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setMenu(null);
                  if (key !== value) onSelect(key);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] transition ${
                  active ? "bg-[var(--v2-ink-100)]" : "hover:bg-[var(--v2-ink-50)]"
                }`}
              >
                <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: option.color }} />
                <span className="min-w-0 flex-1 truncate font-medium text-[var(--v2-ink-800)]">
                  {option.label}
                </span>
                {active ? (
                  <V2Icons.check className="h-3.5 w-3.5 shrink-0 text-[var(--v2-brand-600)]" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

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

function addDays(ymd: string, amount: number) {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(year!, month! - 1, day! + amount);
  return toYmd(date.getFullYear(), date.getMonth(), date.getDate());
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

function formatDeadlineDay(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(year!, month! - 1, day);
  return {
    day: String(day),
    weekday: new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(date),
    month: new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(date),
  };
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
  onDelete,
  onDragStart,
  onDragEnd,
  dragging,
  hideDate = false,
}: {
  item: PersonalCalendarItem;
  onComplete: (item: PersonalCalendarItem) => void;
  onDelete?: (item: PersonalCalendarItem) => void;
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
      <div className="flex shrink-0 flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={() => onComplete(item)}
          aria-label={item.completed_at ? "Вернуть задачу" : "Выполнить задачу"}
          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
            item.completed_at
              ? "border-[var(--v2-brand-200)] bg-[var(--v2-brand-50)] text-[var(--v2-brand-600)]"
              : "border-[var(--v2-ink-200)] text-[var(--v2-ink-400)] hover:border-[var(--v2-brand-300)] hover:text-[var(--v2-brand-600)]"
          }`}
        >
          <V2Icons.check className="h-4 w-4" />
        </button>
        {onDelete ? (
          <button
            type="button"
            title="Удалить дедлайн"
            onClick={() => onDelete(item)}
            className="hidden h-7 w-7 items-center justify-center rounded-lg text-[var(--v2-ink-300)] transition hover:bg-red-50 hover:text-red-500 group-hover:flex"
          >
            <V2Icons.trash className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function PersonalCalendarClient() {
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedDate, setSelectedDate] = useState(localTodayYmd);
  const [weekAnchor, setWeekAnchor] = useState(localTodayYmd);
  const [items, setItems] = useState<PersonalCalendarItem[]>([]);
  const [weekFocus, setWeekFocus] = useState<WeekFocusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropDate, setDropDate] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addKind, setAddKind] = useState<"goal" | "deadline">("goal");
  const [addTitle, setAddTitle] = useState("");
  const [addPriority, setAddPriority] = useState<WeekFocusPriority>("high");
  const [addDate, setAddDate] = useState(localTodayYmd);
  const [savingFocus, setSavingFocus] = useState(false);
  const today = localTodayYmd();

  const weekStart = useMemo(() => weekMondayYmd(weekAnchor), [weekAnchor]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const isCurrentWeek = weekStart === weekMondayYmd(today);

  const range = useMemo(() => {
    const fromMonth = addMonths(view.year, view.month, -1);
    const toMonth = addMonths(view.year, view.month, 3);
    const lastDay = new Date(toMonth.year, toMonth.month + 1, 0).getDate();
    const monthFrom = toYmd(fromMonth.year, fromMonth.month, 1);
    const monthTo = toYmd(toMonth.year, toMonth.month, lastDay);
    return {
      from: [monthFrom, weekStart].sort()[0]!,
      to: [monthTo, weekEnd].sort().at(-1)!,
    };
  }, [view, weekStart, weekEnd]);

  const loadItems = useCallback(async () => {
    const data = await fetchJson<{ items: PersonalCalendarItem[] }>(
      `/api/v2/personal/calendar?from=${range.from}&to=${range.to}`
    );
    setItems(data.items);
  }, [range]);

  const loadWeekFocus = useCallback(async (monday: string) => {
    const data = await fetchJson<{ weekFocus: WeekFocusPayload }>(
      `/api/v2/personal/calendar/week-focus?date=${monday}`
    );
    setWeekFocus(data.weekFocus);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadItems()
      .then(() => setError(null))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Не удалось загрузить календарь"))
      .finally(() => setLoading(false));
  }, [loadItems]);

  useEffect(() => {
    loadWeekFocus(weekStart).catch((reason) =>
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить фокус недели")
    );
  }, [loadWeekFocus, weekStart]);

  useEffect(() => {
    setAddDate((prev) => {
      if (prev >= weekStart && prev <= weekEnd) return prev;
      if (selectedDate >= weekStart && selectedDate <= weekEnd) return selectedDate;
      return weekStart;
    });
  }, [weekStart, weekEnd, selectedDate]);

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

  const weekDeadlinesByDate = useMemo(() => {
    const inWeek = items
      .filter((item) => item.date >= weekStart && item.date <= weekEnd)
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          Number(Boolean(a.completed_at)) - Number(Boolean(b.completed_at)) ||
          a.title.localeCompare(b.title, "ru")
      );
    const groups: { date: string; items: PersonalCalendarItem[] }[] = [];
    for (const item of inWeek) {
      const last = groups[groups.length - 1];
      if (last?.date === item.date) last.items.push(item);
      else groups.push({ date: item.date, items: [item] });
    }
    return groups;
  }, [items, weekStart, weekEnd]);

  const weekDeadlineCount = weekDeadlinesByDate.reduce((sum, group) => sum + group.items.length, 0);
  const goals = weekFocus?.goals ?? [];
  const goalsDone = goals.filter((goal) => goal.completed_at).length;
  const goalsProgress = goals.length ? Math.round((goalsDone / goals.length) * 100) : 0;

  const categories = useMemo(() => {
    const values = new Map<string, string>();
    for (const item of items) values.set(item.category, item.color);
    return [...values.entries()];
  }, [items]);

  function moveMonth(amount: number) {
    setView((current) => addMonths(current.year, current.month, amount));
  }

  function shiftWeek(amount: number) {
    const nextAnchor = addDays(weekStart, amount * 7);
    setWeekAnchor(nextAnchor);
    const [year, month] = nextAnchor.split("-").map(Number);
    setView({ year: year!, month: month! - 1 });
  }

  function goToday() {
    const date = localTodayYmd();
    const [year, month] = date.split("-").map(Number);
    setView({ year: year!, month: month! - 1 });
    setSelectedDate(date);
    setWeekAnchor(date);
  }

  function selectDay(ymd: string, outside: boolean, monthView: { year: number; month: number }) {
    setSelectedDate(ymd);
    setWeekAnchor(ymd);
    if (outside) setView(monthView);
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
      await loadWeekFocus(weekStart).catch(() => null);
    }
  }

  async function setGoalPriority(goal: WeekFocusGoalRow, next: WeekFocusPriority) {
    if (!weekFocus || next === goal.priority) return;
    setWeekFocus({
      ...weekFocus,
      goals: weekFocus.goals.map((row) => (row.id === goal.id ? { ...row, priority: next } : row)),
    });
    try {
      await fetchJson(`/api/v2/personal/calendar/week-focus/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: next }),
      });
      await loadWeekFocus(weekStart);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сменить приоритет");
      await loadWeekFocus(weekStart).catch(() => null);
    }
  }

  function openAdd(kind: "goal" | "deadline") {
    setAddKind(kind);
    setAddTitle("");
    setAddPriority("high");
    setAddDate(
      selectedDate >= weekStart && selectedDate <= weekEnd ? selectedDate : weekStart
    );
    setAddOpen(true);
  }

  async function submitAdd() {
    const title = addTitle.trim();
    if (!title || savingFocus) return;
    setSavingFocus(true);
    try {
      if (addKind === "goal") {
        await fetchJson<{ goal: WeekFocusGoalRow }>("/api/v2/personal/calendar/week-focus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ week_start: weekStart, title, priority: addPriority }),
        });
        await loadWeekFocus(weekStart);
      } else {
        const date = addDate || selectedDate;
        await fetchJson("/api/v2/personal/todos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            due_date: date,
            scheduled_date: date,
            priority: DEADLINE_PRIORITY[addPriority],
          }),
        });
        await loadItems();
      }
      setAddTitle("");
      setAddOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось добавить");
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
      await loadWeekFocus(weekStart).catch(() => null);
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

      <div className="flex min-h-[650px] flex-none flex-col gap-4 lg:min-h-0 lg:flex-row lg:items-start">
        <section className="v2-card flex min-h-[650px] min-w-0 flex-col overflow-hidden lg:h-[calc(100vh-190px)] lg:min-h-[560px] lg:shrink lg:grow-0 lg:basis-[820px]">
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
              const inFocusWeek = day.ymd >= weekStart && day.ymd <= weekEnd;
              return (
                <button
                  key={day.ymd}
                  type="button"
                  onClick={() => selectDay(day.ymd, day.outside, { year: day.year, month: day.month })}
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
                    selectDay(day.ymd, day.outside, { year: day.year, month: day.month });
                  }}
                  className={`relative min-h-[82px] overflow-hidden border-b border-r border-[var(--v2-ink-100)] p-2 text-left align-top transition sm:min-h-[94px] ${
                    selected
                      ? "z-[1] bg-[var(--v2-brand-50)] shadow-[inset_0_0_0_1px_var(--v2-brand-300)]"
                      : inFocusWeek
                        ? "bg-[var(--v2-brand-50)]/35 hover:bg-[var(--v2-brand-50)]/60"
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

        <aside className="flex flex-col gap-4 overscroll-contain lg:sticky lg:top-0 lg:max-h-[calc(100vh-190px)] lg:min-w-[372px] lg:max-w-[600px] lg:grow lg:basis-[372px] lg:overflow-y-auto lg:pr-1">
          <section className="v2-card shrink-0 p-4">
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

          <section className="v2-card shrink-0 overflow-hidden">
            <div className="bg-gradient-to-br from-[var(--v2-brand-600)] to-[var(--v2-brand-500)] px-4 pb-4 pt-3.5 text-white">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Фокус недели
                </p>
                <div className="flex items-center gap-1.5">
                  {!isCurrentWeek ? (
                    <button
                      type="button"
                      onClick={() => setWeekAnchor(today)}
                      className="rounded-lg bg-white/15 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-white/25"
                    >
                      Текущая
                    </button>
                  ) : (
                    <span className="rounded-lg bg-white/15 px-2 py-1 text-[10px] font-semibold text-white/90">
                      Сейчас
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => openAdd("goal")}
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--v2-brand-700)] shadow-sm transition hover:bg-white/90"
                  >
                    <V2Icons.plus className="h-3.5 w-3.5" />
                    Добавить
                  </button>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => shiftWeek(-1)}
                  aria-label="Предыдущая неделя"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white transition hover:bg-white/25"
                >
                  <V2Icons.chevL className="h-4 w-4" />
                </button>
                <div className="min-w-0 text-center">
                  <p className="v2-tight truncate text-[17px] font-bold leading-tight">
                    {formatWeekRangeShort(weekStart, weekEnd)}
                  </p>
                  <p className="v2-tnum mt-0.5 text-[11px] text-white/70">
                    {goals.length ? `${goalsDone} из ${goals.length} целей` : "целей пока нет"}
                    {weekDeadlineCount ? ` · ${weekDeadlineCount} дедл.` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => shiftWeek(1)}
                  aria-label="Следующая неделя"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white transition hover:bg-white/25"
                >
                  <V2Icons.chevR className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all duration-300"
                  style={{ width: `${goalsProgress}%` }}
                />
              </div>
            </div>

            <div className="px-4 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
                  {weekFocus?.result_title ?? "Главный результат недели"}
                </p>
                <div className="flex gap-1.5">
                  {PRIORITY_ORDER.map((key) => (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--v2-ink-500)]"
                    >
                      <i
                        className="h-2 w-2 rounded-full"
                        style={{ background: PRIORITY_META[key].color }}
                      />
                      {PRIORITY_META[key].short}
                    </span>
                  ))}
                </div>
              </div>

              {goals.length ? (
                <ul className="mt-2.5 space-y-1.5">
                  {goals.map((goal) => {
                    const done = Boolean(goal.completed_at);
                    const meta = PRIORITY_META[goal.priority];
                    return (
                      <li
                        key={goal.id}
                        className="group flex items-stretch gap-2 overflow-hidden rounded-xl border border-[var(--v2-ink-100)] bg-white transition hover:border-[var(--v2-ink-200)]"
                      >
                        <span
                          className="w-1 shrink-0 rounded-r"
                          style={{ background: done ? "#D4D4D8" : meta.color }}
                          aria-hidden
                        />
                        <button
                          type="button"
                          onClick={() => void toggleGoal(goal)}
                          className="flex min-w-0 flex-1 items-start gap-2.5 py-2.5 pr-1 text-left"
                        >
                          <span
                            className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition"
                            style={{
                              borderColor: done ? meta.color : "var(--v2-ink-300)",
                              background: done ? meta.color : "transparent",
                              color: done ? "#fff" : "transparent",
                            }}
                          >
                            <V2Icons.check className="h-3 w-3" />
                          </span>
                          <span
                            className={`v2-tight text-[13px] font-medium leading-snug ${
                              done
                                ? "text-[var(--v2-ink-400)] line-through decoration-[1.5px]"
                                : "text-[var(--v2-ink-800)]"
                            }`}
                          >
                            {goal.title}
                          </span>
                        </button>
                        <div className="flex shrink-0 items-center gap-1 pr-2">
                          <PriorityPicker
                            value={goal.priority}
                            onSelect={(next) => void setGoalPriority(goal, next)}
                            variant="chip"
                          />
                          <button
                            type="button"
                            title="Удалить"
                            onClick={() => void deleteGoal(goal.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--v2-ink-300)] transition hover:bg-red-50 hover:text-red-500"
                          >
                            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                              <path d="m6.5 6.5 11 11m0-11-11 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2.5 rounded-xl bg-[var(--v2-ink-50)] px-3 py-3 text-[12px] text-[var(--v2-ink-500)]">
                  Опиши главный результат этой недели
                </p>
              )}
            </div>

            <div className="border-t border-[var(--v2-ink-100)] bg-[var(--v2-ink-50)]/40 px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
                    Дедлайны недели
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--v2-ink-400)]">
                    Перетащи карточку на день слева
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openAdd("deadline")}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[var(--v2-ink-200)] bg-white px-2.5 text-[12px] font-semibold text-[var(--v2-ink-700)] transition hover:border-[var(--v2-brand-200)] hover:text-[var(--v2-brand-700)]"
                >
                  <V2Icons.plus className="h-3.5 w-3.5" />
                  Дедлайн
                </button>
              </div>

              {weekDeadlinesByDate.length ? (
                <div className="mt-3 space-y-4">
                  {weekDeadlinesByDate.map((group) => {
                    const stamp = formatDeadlineDay(group.date);
                    const isToday = group.date === today;
                    return (
                      <div key={group.date}>
                        <div className="mb-2 flex items-center gap-2.5">
                          <div
                            className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl ${
                              isToday
                                ? "bg-[var(--v2-brand-600)] text-white shadow-[var(--v2-shadow-glow)]"
                                : "bg-[var(--v2-ink-900)] text-white"
                            }`}
                          >
                            <span className="v2-tnum text-[16px] font-bold leading-none">{stamp.day}</span>
                            <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-wide opacity-80">
                              {stamp.month.replace(".", "")}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="v2-tight text-[14px] font-bold capitalize text-[var(--v2-ink-900)]">
                              {stamp.weekday}
                              {isToday ? " · сегодня" : ""}
                            </p>
                            <p className="v2-tnum text-[11px] text-[var(--v2-ink-500)]">
                              {formatDate(group.date)}
                              {group.items.length > 1 ? ` · ${group.items.length}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {group.items.map((item) => (
                            <CalendarEventCard
                              key={item.id}
                              item={item}
                              onComplete={toggleComplete}
                              onDelete={(row) => void deleteDeadline(row.id)}
                              dragging={dragId === item.id}
                              onDragStart={(row) => setDragId(row.id)}
                              onDragEnd={() => {
                                setDragId(null);
                                setDropDate(null);
                              }}
                              hideDate
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 rounded-xl bg-white px-3 py-5 text-center text-[12px] text-[var(--v2-ink-500)]">
                  На эту неделю дедлайнов нет
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>

      {addOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setAddOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="v2-tight text-[17px] font-bold text-[var(--v2-ink-900)]">
                  Добавить в неделю
                </h3>
                <p className="v2-tnum mt-0.5 text-[12px] text-[var(--v2-ink-500)]">
                  {formatWeekRangeShort(weekStart, weekEnd)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                aria-label="Закрыть"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-[18px] leading-none text-[var(--v2-ink-400)] transition hover:bg-[var(--v2-ink-100)]"
              >
                ×
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-[var(--v2-ink-100)] p-1">
              {(
                [
                  { key: "goal" as const, label: "Цель недели" },
                  { key: "deadline" as const, label: "Дедлайн" },
                ]
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setAddKind(tab.key)}
                  className={`rounded-xl px-3 py-2 text-[13px] font-semibold transition ${
                    addKind === tab.key
                      ? "bg-white text-[var(--v2-ink-900)] shadow-sm"
                      : "text-[var(--v2-ink-500)] hover:text-[var(--v2-ink-700)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submitAdd();
              }}
            >
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]">
                  {addKind === "goal" ? "Результат" : "Что нужно сделать"}
                </label>
                <input
                  autoFocus
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  placeholder={
                    addKind === "goal" ? "Модуль 3 готов и загружен" : "Монтаж и загрузка модуля"
                  }
                  className="v2-input h-10 w-full text-[14px]"
                />
              </div>

              {addKind === "deadline" ? (
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]">
                    Дата
                  </label>
                  <input
                    type="date"
                    value={addDate}
                    onChange={(e) => setAddDate(e.target.value)}
                    className="v2-input h-10 w-full text-[14px]"
                  />
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]">
                  Приоритет
                </label>
                <PriorityPicker value={addPriority} onSelect={setAddPriority} variant="field" />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="h-10 rounded-xl border border-[var(--v2-ink-200)] px-4 text-[13px] font-semibold text-[var(--v2-ink-600)] transition hover:bg-[var(--v2-ink-50)]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={savingFocus || !addTitle.trim()}
                  className="h-10 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-semibold text-white transition hover:bg-[var(--v2-ink-800)] disabled:opacity-40"
                >
                  {savingFocus ? "Сохраняю…" : "Добавить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
