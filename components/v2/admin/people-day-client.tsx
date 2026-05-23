"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import { fmtDuration } from "@/lib/v2/format";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type SessionRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  task_title: string;
  project_name: string | null;
};

export function V2AdminPeopleDayClient({ userId }: { userId: string }) {
  const searchParams = useSearchParams();
  const [date, setDate] = useState(searchParams.get("date") ?? new Date().toISOString().slice(0, 10));
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<{ sessions: SessionRow[] }>(`/api/v2/admin/people/${userId}/day?date=${encodeURIComponent(date)}`)
      .then((d) => setSessions(d.sessions))
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"));
  }, [userId, date]);

  const total = sessions.reduce((a, s) => a + (s.duration_seconds ?? 0), 0);

  return (
    <div className="px-7 py-6">
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">День сотрудника</h1>
        <input type="date" className="v2-input w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
      </header>
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      <p className="mb-4 text-sm text-[var(--v2-ink-500)]">Итого: <span className="v2-tnum font-medium">{fmtDuration(total)}</span></p>
      <div className="v2-card divide-y">
        {sessions.length === 0 && <p className="p-4 text-sm text-[var(--v2-ink-500)]">Нет сессий</p>}
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between px-4 py-3 text-[13px]">
            <div>
              <div className="font-medium">{s.task_title}</div>
              <div className="text-[11px] text-[var(--v2-ink-500)]">{s.project_name ?? "—"} · {new Date(s.started_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
            <span className="v2-tnum">{fmtDuration(s.duration_seconds ?? 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
