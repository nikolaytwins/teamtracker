"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { HomeTaskCheckbox } from "@/components/v2/home/personal/home-task-checkbox";
import { V2Icons } from "@/components/v2/ui/icons";

type WeekFocusPriority = "high" | "medium" | "low";

type WeekFocusGoal = {
  id: string;
  title: string;
  priority: WeekFocusPriority;
  completed_at: string | null;
};

type WeekFocusPayload = {
  week_start: string;
  week_end: string;
  label: string;
  result_title: string;
  goals: WeekFocusGoal[];
};

const PRIO: Record<WeekFocusPriority, { label: string; bg: string; tint: string }> = {
  high: { label: "обязательно", bg: "#FEE4E2", tint: "#B42318" },
  medium: { label: "желательно", bg: "#FEF0C7", tint: "#B54708" },
  low: { label: "можно нет", bg: "#EAECF0", tint: "#475467" },
};

function toYmd(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function mondayOf(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function formatWeekShort(monday: Date) {
  const sunday = addDays(monday, 6);
  const fmt = (dt: Date) =>
    new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(dt).replace(".", "");
  return `${fmt(monday)} — ${fmt(sunday)}`;
}

export function HomeWeekFocus() {
  const todayMonday = useMemo(() => mondayOf(new Date()), []);
  const [weekOffset, setWeekOffset] = useState(0);
  const [focus, setFocus] = useState<WeekFocusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<WeekFocusPriority>("medium");
  const [busy, setBusy] = useState(false);

  const weekMonday = useMemo(() => addDays(todayMonday, weekOffset * 7), [todayMonday, weekOffset]);
  const isCurrentWeek = weekOffset === 0;
  const isPastWeek = weekOffset < 0;

  const load = useCallback(async () => {
    try {
      const res = await fetchJson<{ weekFocus: WeekFocusPayload }>(
        `/api/v2/personal/calendar/week-focus?date=${toYmd(weekMonday)}`
      );
      setFocus(res.weekFocus);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить фокус недели");
    }
  }, [weekMonday]);

  useEffect(() => {
    void load();
  }, [load]);

  const addGoal = async () => {
    const text = title.trim();
    if (!text || !focus || busy) return;
    setBusy(true);
    try {
      await fetchJson("/api/v2/personal/calendar/week-focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_start: focus.week_start, title: text, priority }),
      });
      setTitle("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить фокус");
    } finally {
      setBusy(false);
    }
  };

  const toggleGoal = async (goal: WeekFocusGoal) => {
    const completed = !goal.completed_at;
    setFocus((prev) =>
      prev
        ? {
            ...prev,
            goals: prev.goals.map((g) =>
              g.id === goal.id ? { ...g, completed_at: completed ? new Date().toISOString() : null } : g
            ),
          }
        : prev
    );
    try {
      await fetchJson(`/api/v2/personal/calendar/week-focus/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
    } catch {
      await load();
    }
  };

  const deleteGoal = async (goalId: string) => {
    setFocus((prev) => (prev ? { ...prev, goals: prev.goals.filter((g) => g.id !== goalId) } : prev));
    try {
      await fetchJson(`/api/v2/personal/calendar/week-focus/goals/${goalId}`, { method: "DELETE" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить фокус");
      await load();
    }
  };

  const badge = isCurrentWeek ? "эта неделя" : isPastWeek ? "прошлая" : "план";

  return (
    <section className="v2-card px-7 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="v2-tight text-[24px] font-semibold tracking-[-0.028em] text-[var(--v2-ink-900)]">
          Фокус недели
        </h2>
        <span
          className="rounded-[7px] px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em]"
          style={{
            background: isCurrentWeek ? "var(--v2-brand-50)" : "var(--v2-ink-100)",
            color: isCurrentWeek ? "var(--v2-brand-700)" : "var(--v2-ink-500)",
          }}
        >
          {badge}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            disabled={weekOffset <= -12}
            onClick={() => setWeekOffset((o) => o - 1)}
            className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-xl border-[1.5px] border-[var(--v2-ink-200)] bg-white text-[16px] text-[var(--v2-ink-600)] transition hover:border-[var(--v2-brand-500)] hover:text-[var(--v2-brand-600)] disabled:opacity-35"
            title="Прошлая неделя"
          >
            ‹
          </button>
          <span className="v2-tnum min-w-[170px] text-center text-[16px] font-semibold tracking-[-0.02em] text-[var(--v2-ink-900)]">
            {focus?.label ?? formatWeekShort(weekMonday)}
          </span>
          <button
            type="button"
            disabled={weekOffset >= 12}
            onClick={() => setWeekOffset((o) => o + 1)}
            className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-xl border-[1.5px] border-[var(--v2-ink-200)] bg-white text-[16px] text-[var(--v2-ink-600)] transition hover:border-[var(--v2-brand-500)] hover:text-[var(--v2-brand-600)] disabled:opacity-35"
            title="Следующая неделя"
          >
            ›
          </button>
        </div>
      </div>

      {error ? <p className="v2-tight mb-3 text-[13px] text-red-600">{error}</p> : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {(focus?.goals ?? []).map((g) => {
          const p = PRIO[g.priority];
          const done = Boolean(g.completed_at);
          return (
            <div key={g.id} className="group relative">
              <button
                type="button"
                onClick={() => void toggleGoal(g)}
                className={`flex min-h-[82px] w-full items-center gap-3.5 rounded-2xl px-5 py-[18px] pr-12 text-left transition ${
                  done
                    ? "bg-[#2d5eef] text-white shadow-[0_10px_26px_-14px_rgba(45,94,239,0.7)]"
                    : "bg-[var(--v2-ink-50)] hover:bg-[var(--v2-ink-100)]"
                }`}
              >
                <HomeTaskCheckbox done={done} tone={done ? "on-blue" : "default"} />
                <span className="v2-tight min-w-0 flex-1 text-[17px] font-semibold leading-snug tracking-[-0.018em]">
                  {g.title}
                </span>
                <span
                  className="shrink-0 rounded-lg px-2 py-1 text-[11.5px] font-semibold whitespace-nowrap"
                  style={{
                    background: done ? "rgba(255,255,255,0.2)" : p.bg,
                    color: done ? "#fff" : p.tint,
                  }}
                >
                  {p.label}
                </span>
              </button>
              <button
                type="button"
                title="Удалить"
                aria-label="Удалить фокус"
                onClick={() => void deleteGoal(g.id)}
                className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg opacity-0 transition group-hover:opacity-100 focus:opacity-100 ${
                  done
                    ? "text-white/70 hover:bg-white/15 hover:text-white"
                    : "text-[var(--v2-ink-400)] hover:bg-red-50 hover:text-red-500"
                }`}
              >
                <V2Icons.trash className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        {focus && !focus.goals.length ? (
          <p className="col-span-full rounded-2xl border-[1.5px] border-dashed border-[var(--v2-ink-200)] px-7 py-7 text-center text-[15.5px] text-[var(--v2-ink-400)]">
            На эту неделю фокус ещё не поставлен — добавь ниже.
          </p>
        ) : null}
      </div>

      {isCurrentWeek || weekOffset > 0 ? (
        <form
          className="mt-3.5 flex max-w-[760px] flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void addGoal();
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Новый фокус…"
            aria-label="Новый фокус недели"
            className="v2-tight h-12 min-w-[200px] flex-1 rounded-[14px] border-[1.5px] border-[var(--v2-ink-200)] bg-white px-4 text-[15.5px] outline-none focus:border-[var(--v2-brand-500)]"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as WeekFocusPriority)}
            aria-label="Приоритет"
            className="v2-tight h-12 cursor-pointer rounded-[14px] border-[1.5px] border-[var(--v2-ink-200)] bg-white px-3 text-[14.5px] text-[var(--v2-ink-600)]"
          >
            <option value="medium">желательно</option>
            <option value="high">обязательно</option>
            <option value="low">можно нет</option>
          </select>
          <button
            type="submit"
            disabled={!title.trim() || busy || !focus}
            className="v2-tight h-12 shrink-0 rounded-[14px] bg-[var(--v2-brand-600)] px-5 text-[15px] font-semibold text-white transition hover:bg-[var(--v2-brand-700)] disabled:opacity-45"
          >
            Добавить
          </button>
        </form>
      ) : null}
    </section>
  );
}
