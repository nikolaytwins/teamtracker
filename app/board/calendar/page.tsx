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

  return (
    <div className="min-h-screen bg-slate-50/80 p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link href={appPath("/board")} className="text-sm text-slate-600 hover:text-slate-900 underline">
          ← Канбан
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-slate-800 mb-1">Календарь команды</h1>
      <p className="text-sm text-slate-500 mb-6">
        Неделя: факт из таймера и план из подзадач. Фильтры по сотруднику и проекту.
      </p>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 mb-6">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWeek((w) => shiftISOWeek(w, -1))}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              ←
            </button>
            <input
              type="week"
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={() => setWeek((w) => shiftISOWeek(w, 1))}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              →
            </button>
          </div>

          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
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
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
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

      {loading ? <p className="text-sm text-slate-500">Загрузка…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {payload && !loading ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {days.map((d) => {
            const key = d.toISOString().slice(0, 10);
            const events = eventsByDay.get(key) ?? [];
            return (
              <div key={key} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="font-semibold text-slate-800 mb-3">
                  {d.toLocaleDateString("ru-RU", { weekday: "short", day: "2-digit", month: "2-digit" })}
                </div>
                {events.length === 0 ? (
                  <p className="text-sm text-slate-500">Нет событий</p>
                ) : (
                  <ul className="space-y-2">
                    {events.map((e) => (
                      <li
                        key={e.id}
                        className={`rounded-lg border p-2 ${
                          e.kind === "actual" ? "border-blue-100 bg-blue-50/40" : "border-amber-100 bg-amber-50/50"
                        }`}
                      >
                        <div className="text-xs text-slate-500 mb-1">
                          {e.kind === "actual" ? "Факт" : "План"} · {e.cardName}
                        </div>
                        <div className="text-sm font-medium text-slate-800">{e.title}</div>
                        <div className="text-xs text-slate-600 mt-1">
                          {new Date(e.startAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                          {e.endAt
                            ? ` - ${new Date(e.endAt).toLocaleTimeString("ru-RU", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}`
                            : ""}
                          {" · "}
                          {durationLabel(e.durationSeconds)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
