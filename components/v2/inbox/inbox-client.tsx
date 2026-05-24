"use client";

import { INBOX_BUCKETS } from "@/components/v2/inbox/inbox-meta";
import {
  InboxDayView,
  InboxHighlightLegend,
  InboxKanbanView,
  InboxViewSwitcher,
  InboxWeekView,
} from "@/components/v2/inbox/inbox-views";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { readInboxView, writeInboxView, type InboxViewMode } from "@/lib/v2/inbox/inbox-storage";
import type { PortfolioPayload } from "@/lib/v2/projects/portfolio-types";
import type { V2InboxBucket, V2TaskWithMeta } from "@/lib/v2/types";
import { useCallback, useEffect, useMemo, useState } from "react";

export function V2InboxClient() {
  const [buckets, setBuckets] = useState<Record<V2InboxBucket, V2TaskWithMeta[]>>({
    this_week: [],
    this_month: [],
    someday: [],
  });
  const [projectsById, setProjectsById] = useState<Map<string, PortfolioPayload["projects"][number]>>(new Map());
  const [view, setViewState] = useState<InboxViewMode>("week");
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newBucket, setNewBucket] = useState<V2InboxBucket>("this_week");
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    setViewState(readInboxView());
    setHydrated(true);
  }, []);

  const setView = useCallback((next: InboxViewMode) => {
    setViewState(next);
    writeInboxView(next);
  }, []);

  const load = useCallback(async () => {
    const [inboxRes, portfolioRes] = await Promise.all([
      fetchJson<{ buckets: Record<V2InboxBucket, V2TaskWithMeta[]> }>("/api/v2/inbox"),
      fetchJson<PortfolioPayload>("/api/v2/projects/portfolio"),
    ]);
    setBuckets(inboxRes.buckets);
    setProjectsById(new Map(portfolioRes.projects.map((p) => [p.id, p])));
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

  const totalCount = useMemo(
    () => INBOX_BUCKETS.reduce((n, { key }) => n + (buckets[key]?.length ?? 0), 0),
    [buckets]
  );

  const dndProps = {
    dragId,
    onDragStart: setDragId,
    onDragEnd: () => setDragId(null),
    onDrop: (bucket: V2InboxBucket) => {
      if (dragId) void moveTask(dragId, bucket);
      setDragId(null);
    },
    onPromote: (taskId: string) => void promoteToHome(taskId),
  };

  if (loading || !hydrated) {
    return <div className="flex min-h-[50vh] items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>;
  }

  return (
    <div className="px-7 py-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="v2-tighter text-[32px] font-semibold tracking-tight text-[var(--v2-ink-900)]">Входящие</h1>
          <p className="mt-1 text-[13.5px] text-[var(--v2-ink-500)]">
            {totalCount > 0
              ? `${totalCount} задач для разбора — горящие проекты и приоритеты подсвечены`
              : "Разложите задачи по колонкам или перетащите между ними"}
          </p>
        </div>
        <InboxViewSwitcher view={view} setView={setView} />
      </header>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {totalCount > 0 ? (
        <div className="mb-4">
          <InboxHighlightLegend />
        </div>
      ) : null}

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
        <input
          className="v2-input min-w-[200px] flex-1"
          placeholder="Новая задача во входящие…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <select className="v2-input w-auto" value={newBucket} onChange={(e) => setNewBucket(e.target.value as V2InboxBucket)}>
          {INBOX_BUCKETS.map((b) => (
            <option key={b.key} value={b.key}>
              {b.label}
            </option>
          ))}
        </select>
        <button type="submit" className="v2-btn-primary">
          Добавить
        </button>
      </form>

      {view === "day" ? (
        <InboxDayView buckets={buckets} projectsById={projectsById} onPromote={(id) => void promoteToHome(id)} />
      ) : view === "week" ? (
        <InboxWeekView buckets={buckets} projectsById={projectsById} {...dndProps} />
      ) : (
        <InboxKanbanView buckets={buckets} projectsById={projectsById} {...dndProps} />
      )}
    </div>
  );
}
