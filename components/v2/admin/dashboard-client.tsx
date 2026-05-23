"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import { useEffect, useState } from "react";

export function V2AdminDashboardClient() {
  const [stats, setStats] = useState<{ activeProjects: number; openTasks: number; overdueTasks: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<{ activeProjects: number; openTasks: number; overdueTasks: number }>("/api/v2/admin/dashboard")
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"));
  }, []);

  return (
    <div className="px-7 py-6">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Дашборд</h1>
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="v2-card p-5">
          <div className="text-3xl font-semibold v2-tnum">{stats?.activeProjects ?? "—"}</div>
          <div className="mt-1 text-sm text-[var(--v2-ink-500)]">Активных проектов</div>
        </div>
        <div className="v2-card p-5">
          <div className="text-3xl font-semibold v2-tnum">{stats?.openTasks ?? "—"}</div>
          <div className="mt-1 text-sm text-[var(--v2-ink-500)]">Открытых задач</div>
        </div>
        <div className="v2-card p-5">
          <div className="text-3xl font-semibold v2-tnum text-red-600">{stats?.overdueTasks ?? "—"}</div>
          <div className="mt-1 text-sm text-[var(--v2-ink-500)]">Просрочено</div>
        </div>
      </div>
    </div>
  );
}
