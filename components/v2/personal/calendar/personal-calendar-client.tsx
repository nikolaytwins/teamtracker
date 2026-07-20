"use client";

import { V2Icons } from "@/components/v2/ui/icons";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { PersonalCalendarItem } from "@/lib/v2/personal/personal-calendar-repo";
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
}: {
  item: PersonalCalendarItem;
  onComplete: (item: PersonalCalendarItem) => void;
}) {
  return (
    <article
      className={`group flex gap-3 rounded-2xl border border-[var(--v2-ink-100)] bg-white p-3.5 transition hover:-translate-y-0.5 hover:shadow-[var(--v2-shadow-cardHv)] ${
        item.completed_at ? "opacity-55" : ""
      }`}
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
          <span className="v2-tnum text-[11px] text-[var(--v2-ink-500)]">
            {formatDate(item.date)}
            {item.time ? ` · ${item.time}` : ""}
          </span>
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

const IMPORTANCE = {
  urgent: { rank: 0, label: "Обязательно", color: "#DC2626", background: "#FEF2F2" },
  high: { rank: 0, label: "Обязательно", color: "#DC2626", background: "#FEF2F2" },
  medium: { rank: 1, label: "Желательно", color: "#EA580C", background: "#FFF7ED" },
  low: { rank: 2, label: "Можно не делать", color: "#71717A", background: "#F4F4F5" },
  none: { rank: 2, label: "Можно не делать", color: "#71717A", background: "#F4F4F5" },
} as const;

export function PersonalCalendarClient() {
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedDate, setSelectedDate] = useState(localTodayYmd);
  const [items, setItems] = useState<PersonalCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const today = localTodayYmd();
  const week = currentWeekBounds();

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

  const load = useCallback(async () => {
    const data = await fetchJson<{ items: PersonalCalendarItem[] }>(
      `/api/v2/personal/calendar?from=${range.from}&to=${range.to}`
    );
    setItems(data.items);
    setError(null);
  }, [range]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Не удалось загрузить календарь"))
      .finally(() => setLoading(false));
  }, [load]);

  const days = useMemo(() => monthGrid(view.year, view.month), [view]);
  const itemsByDate = useMemo(() => {
    const grouped = new Map<string, PersonalCalendarItem[]>();
    for (const item of items) {
      const list = grouped.get(item.date) ?? [];
      list.push(item);
      grouped.set(item.date, list);
    }
    return grouped;
  }, [items]);

  const selectedItems = itemsByDate.get(selectedDate) ?? [];
  const upcoming = useMemo(
    () =>
      items
        .filter((item) => !item.completed_at && item.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""))
        .slice(0, 8),
    [items, today]
  );
  const weeklyItems = useMemo(
    () =>
      items
        .filter((item) => !item.completed_at && item.date >= week.from && item.date <= week.to)
        .sort((a, b) => {
          const aImportance = IMPORTANCE[a.priority ?? "none"];
          const bImportance = IMPORTANCE[b.priority ?? "none"];
          return aImportance.rank - bImportance.rank || a.date.localeCompare(b.date);
        }),
    [items, week.from, week.to]
  );
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
    try {
      await fetchJson(`/api/v2/personal/todos/${item.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !item.completed_at }),
      });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось обновить дедлайн");
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
            События, съёмки и дедлайны в одном месте
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

      <div className="grid min-h-[650px] flex-none gap-4 lg:h-[calc(100vh-190px)] lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="v2-card flex min-h-[650px] min-w-0 flex-col overflow-hidden lg:min-h-0">
          <div className="flex items-center justify-between border-b border-[var(--v2-ink-100)] px-4 py-3 sm:px-5">
            <div>
              <h2 className="v2-tight text-[18px] font-bold text-[var(--v2-ink-900)]">
                {MONTHS[view.month]} {view.year}
              </h2>
              <p className="mt-0.5 text-[11px] text-[var(--v2-ink-400)]">
                Выберите день, чтобы увидеть его задачи
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
              return (
                <button
                  key={day.ymd}
                  type="button"
                  onClick={() => {
                    setSelectedDate(day.ymd);
                    if (day.outside) setView({ year: day.year, month: day.month });
                  }}
                  className={`relative min-h-[82px] overflow-hidden border-b border-r border-[var(--v2-ink-100)] p-2 text-left align-top transition sm:min-h-[94px] ${
                    selected
                      ? "z-[1] bg-[var(--v2-brand-50)] shadow-[inset_0_0_0_1px_var(--v2-brand-300)]"
                      : "bg-white hover:bg-[var(--v2-ink-50)]"
                  } ${day.outside ? "opacity-40" : ""}`}
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
                        className={`truncate rounded-md px-1.5 py-1 text-[9px] font-semibold leading-none sm:text-[10px] ${
                          item.completed_at ? "line-through opacity-50" : ""
                        }`}
                        style={{ color: item.color, background: `${item.color}14` }}
                      >
                        <span
                          className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
                          style={{ background: item.color }}
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
                  <CalendarEventCard key={item.id} item={item} onComplete={toggleComplete} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)]/60 px-4 py-7 text-center">
                <V2Icons.cal className="mx-auto h-6 w-6 text-[var(--v2-ink-300)]" />
                <p className="mt-2 text-[12px] text-[var(--v2-ink-500)]">На этот день ничего не запланировано</p>
              </div>
            )}
          </section>

          <section className="v2-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-brand-600)]">
                  На горизонте
                </p>
                <h2 className="v2-tight mt-1 text-[16px] font-bold text-[var(--v2-ink-900)]">
                  Ближайшие дедлайны
                </h2>
              </div>
              {loading ? (
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--v2-brand-500)]" />
              ) : null}
            </div>
            {upcoming.length ? (
              <div className="space-y-2">
                {upcoming.map((item) => (
                  <CalendarEventCard key={item.id} item={item} onComplete={toggleComplete} />
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-[var(--v2-ink-50)] px-3 py-5 text-center text-[12px] text-[var(--v2-ink-500)]">
                Ближайших дедлайнов нет
              </p>
            )}
          </section>

          <section className="v2-card overflow-hidden">
            <div className="border-b border-[var(--v2-ink-100)] bg-[var(--v2-brand-50)]/70 px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-brand-600)]">
                Рабочий ритм
              </p>
              <h2 className="v2-tight mt-1 text-[16px] font-bold text-[var(--v2-ink-900)]">
                Курс — спринты не более 3 часов
              </h2>
            </div>
            <div className="p-4">
              <ol className="space-y-2.5">
                {[
                  ["1 спринт", "Подготовка материала и ТЗ"],
                  ["2 спринта", "Съёмки"],
                  ["1 спринт", "Подготовка и выкладка"],
                ].map(([count, description], index) => (
                  <li key={count} className="flex items-start gap-3">
                    <span className="v2-tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--v2-brand-50)] text-[11px] font-bold text-[var(--v2-brand-700)]">
                      {index + 1}
                    </span>
                    <div className="pt-0.5">
                      <p className="text-[12px] font-semibold text-[var(--v2-ink-800)]">{count}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--v2-ink-500)]">
                        {description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-4 grid gap-2">
                <div className="rounded-xl bg-violet-50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-600">Будущее</p>
                  <p className="mt-1 text-[12px] font-medium text-violet-950">
                    Обязательно 2–3 слота в неделю
                  </p>
                </div>
                <div className="rounded-xl bg-orange-50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-600">Каждый день</p>
                  <p className="mt-1 text-[12px] font-medium text-orange-950">
                    Утром и вечером — поиск клиентов
                  </p>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <section className="v2-card mt-4 overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--v2-ink-100)] px-4 py-4 sm:px-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-brand-600)]">
              Фокус недели
            </p>
            <h2 className="v2-tight mt-1 text-[18px] font-bold text-[var(--v2-ink-900)]">
              Задачи на эту неделю
            </h2>
            <p className="mt-1 text-[11px] text-[var(--v2-ink-500)]">
              {formatDate(week.from)} — {formatDate(week.to)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["#DC2626", "Обязательно"],
              ["#EA580C", "Желательно"],
              ["#71717A", "Можно не делать"],
            ].map(([color, label]) => (
              <span
                key={label}
                className="flex items-center gap-1.5 rounded-full bg-[var(--v2-ink-50)] px-2.5 py-1 text-[10px] font-medium text-[var(--v2-ink-600)]"
              >
                <i className="h-2 w-2 rounded-full" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {weeklyItems.length ? (
          <div className="divide-y divide-[var(--v2-ink-100)]">
            {weeklyItems.map((item, index) => {
              const importance = IMPORTANCE[item.priority ?? "none"];
              return (
                <div
                  key={item.id}
                  className="v2-row-in group flex items-center gap-3 px-4 py-3.5 transition hover:bg-[var(--v2-ink-50)]/70 sm:px-5"
                  style={{ animationDelay: `${index * 35}ms` }}
                >
                  <span
                    className="h-9 w-1 shrink-0 rounded-full"
                    style={{ background: importance.color }}
                    aria-hidden
                  />
                  <button
                    type="button"
                    onClick={() => void toggleComplete(item)}
                    aria-label="Выполнить задачу"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--v2-ink-200)] text-transparent transition hover:border-[var(--v2-brand-300)] hover:text-[var(--v2-brand-500)]"
                  >
                    <V2Icons.check className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="v2-tight truncate text-[14px] font-semibold text-[var(--v2-ink-900)]">
                      {item.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--v2-ink-500)]">
                      <span className="v2-tnum capitalize">{formatDate(item.date)}</span>
                      {item.time ? <span className="v2-tnum">до {item.time}</span> : null}
                      <span>{item.category}</span>
                    </div>
                  </div>
                  <span
                    className="hidden rounded-lg px-2 py-1 text-[10px] font-semibold sm:inline-flex"
                    style={{ color: importance.color, background: importance.background }}
                  >
                    {importance.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <V2Icons.tasks className="mx-auto h-7 w-7 text-[var(--v2-ink-300)]" />
            <p className="mt-2 text-[13px] font-medium text-[var(--v2-ink-600)]">
              На эту неделю задач пока нет
            </p>
            <p className="mt-1 text-[11px] text-[var(--v2-ink-400)]">
              Задачи появятся здесь после назначения даты
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
