"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import { shiftMonthYm, currentMonthYm } from "@/lib/month-ym";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type SessionRow = {
  id: string;
  workDate: string;
  cardId: string;
  cardName: string;
  taskType: string | null;
  taskLabel: string;
  taskNote: string | null;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
};

function formatClock(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatSessionDurationPrimary(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}\u00a0ч ${m}\u00a0м`;
  if (m > 0) return `${m}\u00a0м ${r}\u00a0с`;
  return `${r}\u00a0с`;
}

function formatDayTitle(ymd: string): string {
  try {
    const d = new Date(ymd + "T12:00:00");
    return d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch {
    return ymd;
  }
}

export default function HomeSessionsHistoryPage() {
  const [monthYm, setMonthYm] = useState(currentMonthYm);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(apiUrl(`/api/me/timer/sessions/month?month=${encodeURIComponent(monthYm)}`));
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ошибка");
      setSessions(Array.isArray(d.sessions) ? d.sessions : []);
    } catch (e) {
      setSessions([]);
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, [monthYm]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, SessionRow[]>();
    for (const s of sessions) {
      const key = (s.workDate || s.startedAt.slice(0, 10)).trim() || "—";
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    const keys = [...map.keys()].filter((k) => k !== "—").sort((a, b) => b.localeCompare(a));
    if (map.has("—")) keys.push("—");
    return keys.map((date) => ({ date, items: map.get(date)! }));
  }, [sessions]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">История сессий</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Все завершённые сессии по календарным месяцам (дата — по началу сессии).{" "}
            <Link href={appPath("/home")} className="font-semibold text-[var(--primary)] hover:underline">
              ← На главную
            </Link>
          </p>
        </div>
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <CardTitle>Месяц</CardTitle>
            <CardDescription className="mt-1">Переключение стрелками или выбор в календаре.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setMonthYm((m) => shiftMonthYm(m, -1))}>
              ←
            </Button>
            <input
              type="month"
              value={monthYm}
              onChange={(e) => setMonthYm(e.target.value)}
              className="tt-input text-sm tabular-nums"
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => setMonthYm((m) => shiftMonthYm(m, 1))}>
              →
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setMonthYm(currentMonthYm())}>
              Сегодня
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {err ? <p className="text-sm font-medium text-[var(--danger)]">{err}</p> : null}
          {loading ? (
            <p className="py-8 text-sm text-[var(--muted-foreground)]">Загрузка…</p>
          ) : sessions.length === 0 ? (
            <p className="py-8 text-sm text-[var(--muted-foreground)]">За этот месяц нет завершённых сессий</p>
          ) : (
            <div className="space-y-10">
              {byDay.map(({ date, items }) => (
                <div key={date}>
                  <h2 className="mb-3 border-b border-[var(--border)] pb-2 text-sm font-semibold text-[var(--text)]">
                    {date === "—" ? "Без даты" : formatDayTitle(date)}
                    <span className="ml-2 font-normal tabular-nums text-[var(--muted-foreground)]">({date})</span>
                  </h2>
                  <ul className="space-y-2">
                    {items.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-col gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between dark:bg-[var(--surface-2)]/15"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-[var(--text)]">{s.cardName}</div>
                          <div className="text-[var(--muted-foreground)]">{s.taskLabel}</div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs tabular-nums text-[var(--muted-foreground)] sm:text-sm">
                          <span>
                            {formatClock(s.startedAt)} — {formatClock(s.endedAt)}
                          </span>
                          <span className="font-semibold text-[var(--text)]">{formatSessionDurationPrimary(s.durationSeconds)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-[var(--muted-foreground)]">
        Редактирование и удаление последних записей — в блоке «Последние 10 сессий» на главной.
      </p>
    </div>
  );
}
