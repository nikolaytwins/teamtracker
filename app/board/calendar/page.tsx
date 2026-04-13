"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import { formatISOWeekParam, shiftISOWeek } from "@/lib/iso-week";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type TeamUser = { id: string; displayName: string };

type CalendarEvent = {
  id: string;
  kind: "actual" | "planned";
  cardId: string;
  cardName: string;
  userId: string | null;
  workerName: string | null;
  title: string;
  startAt: string;
  endAt: string | null;
  durationSeconds: number | null;
};

type CalendarPayload = {
  week: string;
  mondayIso: string;
  nextMondayIso: string;
  cards: Array<{ id: string; name: string; status: string }>;
  events: CalendarEvent[];
};

function durationLabel(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

function dayCellKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isToday(d: Date): boolean {
  const t = new Date();
  return (
    d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
  );
}

/** Месяц по ISO-неделе: месяц, в который попадает четверг недели. */
function monthMatrixForWeek(mondayIso: string): {
  year: number;
  monthIndex: number;
  label: string;
  cells: Array<{ d: number | null; inWeek: boolean }>;
} {
  const mon = new Date(mondayIso.includes("T") ? mondayIso : `${mondayIso}T12:00:00`);
  const thu = new Date(mon);
  thu.setDate(thu.getDate() + 3);
  const y = thu.getFullYear();
  const monthIndex = thu.getMonth();
  const label = thu.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const first = new Date(y, monthIndex, 1);
  const pad = (first.getDay() + 6) % 7;
  const lastDay = new Date(y, monthIndex + 1, 0).getDate();
  const weekKeys = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const x = new Date(mon);
    x.setDate(mon.getDate() + i);
    weekKeys.add(dayCellKey(x));
  }
  const cells: Array<{ d: number | null; inWeek: boolean }> = [];
  for (let i = 0; i < pad; i++) cells.push({ d: null, inWeek: false });
  for (let day = 1; day <= lastDay; day++) {
    const dt = new Date(y, monthIndex, day);
    cells.push({ d: day, inWeek: weekKeys.has(dayCellKey(dt)) });
  }
  while (cells.length % 7 !== 0) cells.push({ d: null, inWeek: false });
  return { year: y, monthIndex, label, cells };
}

export default function BoardCalendarPage() {
  const [week, setWeek] = useState(() => formatISOWeekParam());
  const [userId, setUserId] = useState("");
  const [cardId, setCardId] = useState("");
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<CalendarPayload | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      const r = await fetch(apiUrl("/api/team/users"));
      const data = (await r.json()) as { users?: Array<{ id: string; displayName: string }> };
      if (r.ok && Array.isArray(data.users)) setUsers(data.users);
    } catch {
      /* ignore */
    }
  }, []);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ week });
      if (userId) q.set("userId", userId);
      if (cardId) q.set("cardId", cardId);
      const r = await fetch(apiUrl(`/api/board/calendar?${q.toString()}`));
      const data = (await r.json()) as CalendarPayload & { error?: string };
      if (!r.ok) throw new Error(data.error || "Ошибка загрузки");
      setPayload(data);
    } catch (e) {
      setPayload(null);
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, [week, userId, cardId]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  const days = useMemo(() => {
    if (!payload) return [];
    const start = new Date(payload.mondayIso);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [payload]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of payload?.events ?? []) {
      const k = dateKey(e.startAt);
      const arr = map.get(k) ?? [];
      arr.push(e);
      map.set(k, arr);
    }
    return map;
  }, [payload]);

  const monthMini = useMemo(() => (payload ? monthMatrixForWeek(payload.mondayIso) : null), [payload]);

  const weekRangeLabel =
    days.length === 7
      ? `${days[0].toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} — ${days[6].toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}`
      : "";

  return (
    <div className="pb-8 pt-2">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link
          href={appPath("/board")}
          className="text-sm font-medium text-[var(--primary)] hover:underline"
        >
          ← Канбан
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">Календарь</h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--muted-foreground)]">
            Недельная сетка: факт из таймера и план из подзадач. Ниже — мини-календарь месяца с выделенной неделей.
          </p>
        </div>
        {weekRangeLabel ? (
          <p className="text-sm font-medium text-[var(--muted-foreground)] tabular-nums">{weekRangeLabel}</p>
        ) : null}
      </div>

      <section className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] md:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setWeek((w) => shiftISOWeek(w, -1))}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
            >
              ←
            </button>
            <input
              type="week"
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setWeek((w) => shiftISOWeek(w, 1))}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
            >
              →
            </button>
            <button
              type="button"
              onClick={() => setWeek(formatISOWeekParam())}
              className="rounded-lg bg-[var(--primary-soft)] px-3 py-2 text-sm font-medium text-[var(--primary)] hover:brightness-95 dark:hover:brightness-110"
            >
              Эта неделя
            </button>
          </div>

          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="">Все сотрудники</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.displayName}
              </option>
            ))}
          </select>

          <select
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="">Все проекты</option>
            {(payload?.cards ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {loading ? <p className="text-sm text-[var(--muted-foreground)]">Загрузка…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {payload && !loading ? (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
            <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--surface-2)]/90">
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((wd) => (
                <div
                  key={wd}
                  className="border-r border-[var(--border)] py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)] last:border-r-0"
                >
                  {wd}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 divide-x divide-[var(--border)] bg-[var(--surface-2)]/40">
              {days.map((d) => {
                const key = dayCellKey(d);
                const events = eventsByDay.get(key) ?? [];
                const today = isToday(d);
                return (
                  <div
                    key={key}
                    className={`flex min-h-[280px] flex-col bg-[var(--surface)] ${today ? "ring-1 ring-inset ring-[var(--primary)]/40" : ""}`}
                  >
                    <div
                      className={`border-b border-[var(--border)] px-2 py-2 text-center ${today ? "bg-[var(--primary-soft)]" : "bg-[var(--surface)]"}`}
                    >
                      <span className="text-lg font-semibold tabular-nums text-[var(--text)]">{d.getDate()}</span>
                      <span className="ml-1 text-xs text-[var(--muted-foreground)]">
                        {d.toLocaleDateString("ru-RU", { month: "short" })}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5 p-2">
                      {events.length === 0 ? (
                        <p className="py-4 text-center text-[11px] text-[var(--muted-foreground)]">—</p>
                      ) : (
                        events.map((e) => (
                          <div
                            key={e.id}
                            className={`rounded-lg border px-2 py-1.5 text-left ${
                              e.kind === "actual"
                                ? "border-[var(--primary)]/15 bg-[var(--primary-soft)]"
                                : "border-amber-100 bg-amber-50/60"
                            }`}
                          >
                            <div className="text-[10px] font-medium text-[var(--muted-foreground)]">
                              {e.kind === "actual" ? "Факт" : "План"} · {e.cardName}
                            </div>
                            <div className="line-clamp-2 text-xs font-medium text-[var(--text)]">{e.title}</div>
                            <div className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                              {new Date(e.startAt).toLocaleTimeString("ru-RU", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {e.endAt
                                ? `–${new Date(e.endAt).toLocaleTimeString("ru-RU", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}`
                                : ""}
                              {" · "}
                              {durationLabel(e.durationSeconds)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {monthMini ? (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
              <h2 className="mb-3 text-sm font-semibold text-[var(--text)]">{monthMini.label}</h2>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-[var(--muted-foreground)]">
                {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((x) => (
                  <div key={x} className="py-1">
                    {x}
                  </div>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {monthMini.cells.map((cell, i) => (
                  <div
                    key={i}
                    className={`flex aspect-square items-center justify-center rounded-lg text-sm tabular-nums ${
                      cell.d == null
                        ? "text-transparent"
                        : cell.inWeek
                          ? "bg-[var(--primary)] font-semibold text-[var(--primary-foreground)] shadow-[var(--shadow-card)]"
                          : "bg-[var(--surface-2)] text-[var(--text)]"
                    }`}
                  >
                    {cell.d ?? "·"}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-[var(--muted-foreground)]">Акцентным цветом выделены дни выбранной ISO-недели в этом месяце.</p>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
