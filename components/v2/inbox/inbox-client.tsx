"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { V2InboxBucket, V2TaskRow } from "@/lib/v2/types";
import { useCallback, useEffect, useState } from "react";

const BUCKETS: { key: V2InboxBucket; label: string }[] = [
  { key: "this_week", label: "На этой неделе" },
  { key: "this_month", label: "В этом месяце" },
  { key: "someday", label: "Когда-нибудь" },
];

export function V2InboxClient() {
  const [buckets, setBuckets] = useState<Record<V2InboxBucket, V2TaskRow[]>>({
    this_week: [],
    this_month: [],
    someday: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newBucket, setNewBucket] = useState<V2InboxBucket>("this_week");
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await fetchJson<{ buckets: Record<V2InboxBucket, V2TaskRow[]> }>("/api/v2/inbox");
    setBuckets(data.buckets);
  }, []);

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [load]);

  async function moveTask(taskId: string, bucket: V2InboxBucket) {
    await fetchJson("/api/v2/inbox", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, bucket }),
    });
    await load();
  }

  async function promoteToHome(taskId: string) {
    await fetchJson("/api/v2/inbox", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, bucket: null }),
    });
    await load();
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>;
  }

  return (
    <div className="px-7 py-6">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Входящие</h1>
        <p className="mt-1 text-sm text-[var(--v2-ink-500)]">Разложите задачи по колонкам или перетащите между ними</p>
      </header>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <form
        className="v2-card mb-6 flex flex-wrap gap-2 p-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!newTitle.trim()) return;
          await fetchJson("/api/v2/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: newTitle.trim(), scope: "team", inboxBucket: newBucket }),
          });
          setNewTitle("");
          await load();
        }}
      >
        <input className="v2-input min-w-[200px] flex-1" placeholder="Новая задача во входящие…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
        <select className="v2-input w-auto" value={newBucket} onChange={(e) => setNewBucket(e.target.value as V2InboxBucket)}>
          {BUCKETS.map((b) => (
            <option key={b.key} value={b.key}>{b.label}</option>
          ))}
        </select>
        <button type="submit" className="v2-btn-primary">Добавить</button>
      </form>

      <div className="grid gap-4 lg:grid-cols-3">
        {BUCKETS.map(({ key, label }) => (
          <section
            key={key}
            className="v2-card flex min-h-[320px] flex-col p-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) void moveTask(dragId, key);
              setDragId(null);
            }}
          >
            <h2 className="mb-3 text-sm font-semibold">{label} ({buckets[key]?.length ?? 0})</h2>
            <div className="flex flex-1 flex-col gap-2">
              {(buckets[key] ?? []).map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => setDragId(task.id)}
                  onDragEnd={() => setDragId(null)}
                  className="cursor-grab rounded-lg border border-[var(--v2-ink-100)] bg-white px-3 py-2 active:cursor-grabbing"
                >
                  <div className="font-medium text-[13px]">{task.title}</div>
                  <button
                    type="button"
                    className="mt-2 text-[11px] font-medium text-[var(--v2-brand-600)] hover:underline"
                    onClick={() => void promoteToHome(task.id)}
                  >
                    → В список задач
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
