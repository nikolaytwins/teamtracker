"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import { useCallback, useEffect, useState } from "react";

type CalEvent = {
  id: string;
  title: string;
  scope: "work" | "personal";
  start_at: string;
  end_at: string;
  description: string | null;
};

function fmtRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };
  return `${s.toLocaleString("ru-RU", opts)} — ${e.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
}

export function V2CalendarClient() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState<"work" | "personal">("work");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const load = useCallback(async () => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 14);
    const data = await fetchJson<{ events: CalEvent[] }>(
      `/api/v2/calendar?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`
    );
    setEvents(data.events);
  }, []);

  useEffect(() => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const end = new Date(now);
    end.setHours(end.getHours() + 1);
    const toLocal = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setStartAt(toLocal(now));
    setEndAt(toLocal(end));
    load()
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [load]);

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>;
  }

  return (
    <div className="px-7 py-6">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Календарь</h1>
        <p className="mt-1 text-sm text-[var(--v2-ink-500)]">Рабочие и личные события (без Google пока)</p>
      </header>
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <form
        className="v2-card mb-6 grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim() || !startAt || !endAt) return;
          await fetchJson("/api/v2/calendar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, scope, startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString() }),
          });
          setTitle("");
          await load();
        }}
      >
        <input className="v2-input lg:col-span-2" placeholder="Событие" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select className="v2-input" value={scope} onChange={(e) => setScope(e.target.value as "work" | "personal")}>
          <option value="work">Работа</option>
          <option value="personal">Личное</option>
        </select>
        <input type="datetime-local" className="v2-input" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
        <input type="datetime-local" className="v2-input" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
        <button type="submit" className="v2-btn-primary sm:col-span-2 lg:col-span-1">Добавить</button>
      </form>

      <div className="v2-card divide-y">
        {events.length === 0 && <p className="p-4 text-sm text-[var(--v2-ink-500)]">Нет событий на 2 недели</p>}
        {events.map((ev) => (
          <div key={ev.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <div className="font-medium">{ev.title}</div>
              <div className="text-xs text-[var(--v2-ink-500)]">{fmtRange(ev.start_at, ev.end_at)}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ev.scope === "personal" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
                {ev.scope === "personal" ? "Личное" : "Работа"}
              </span>
              <button
                type="button"
                className="text-xs text-red-600 hover:underline"
                onClick={async () => {
                  await fetchJson(`/api/v2/calendar?id=${ev.id}`, { method: "DELETE" });
                  await load();
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
