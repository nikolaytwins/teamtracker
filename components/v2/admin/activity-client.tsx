"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import { useEffect, useState } from "react";

type ActivityItem = { id: string; message: string; created_at: string };

export function V2AdminActivityClient() {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<{ activity: ActivityItem[] }>("/api/v2/activity?limit=100")
      .then((d) => setActivity(d.activity))
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"));
  }, []);

  return (
    <div className="px-7 py-6">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Активность</h1>
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      <ul className="v2-card divide-y">
        {activity.map((a) => (
          <li key={a.id} className="px-4 py-3 text-[13px]">
            <div>{a.message}</div>
            <div className="mt-0.5 text-[11px] text-[var(--v2-ink-500)]">{new Date(a.created_at).toLocaleString("ru-RU")}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
