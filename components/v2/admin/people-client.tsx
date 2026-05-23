"use client";

import { appPath } from "@/lib/api-url";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { fmtDuration } from "@/lib/v2/format";
import Link from "next/link";
import { useEffect, useState } from "react";

type PeopleRow = {
  userId: string;
  displayName: string;
  jobTitle: string;
  weeklyHoursNorm: number;
  weeks: Array<{ weekStart: string; loggedSeconds: number; normSeconds: number; status: string }>;
  totalLoggedSeconds: number;
};

function statusColor(status: string) {
  if (status === "under") return "bg-amber-200";
  if (status === "over") return "bg-red-200";
  return "bg-emerald-200";
}

export function V2AdminPeopleClient() {
  const [rows, setRows] = useState<PeopleRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<{ people: PeopleRow[] }>("/api/v2/admin/people")
      .then((d) => setRows(d.people))
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"));
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="px-7 py-6">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Команда</h1>
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      <div className="v2-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead>
            <tr className="border-b text-[var(--v2-ink-500)]">
              <th className="px-4 py-3 font-medium">Сотрудник</th>
              <th className="px-4 py-3 font-medium">6 недель</th>
              <th className="px-4 py-3 font-medium">Всего</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.displayName}</div>
                  <div className="text-[11px] text-[var(--v2-ink-500)]">{r.jobTitle || `${r.weeklyHoursNorm}ч/нед`}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {r.weeks.map((w) => (
                      <span
                        key={w.weekStart}
                        title={`${w.weekStart}: ${fmtDuration(w.loggedSeconds)}`}
                        className={`h-6 w-6 rounded ${statusColor(w.status)}`}
                      />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 v2-tnum">{fmtDuration(r.totalLoggedSeconds)}</td>
                <td className="px-4 py-3">
                  <Link href={appPath(`/v2/admin/people/${r.userId}?date=${today}`)} className="text-[var(--v2-brand-600)] hover:underline">
                    День →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
