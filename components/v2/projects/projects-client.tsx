"use client";

import { appPath } from "@/lib/api-url";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { useV2Bootstrap } from "@/components/v2/shell/v2-app-shell";
import type { V2TaskWithMeta } from "@/lib/v2/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const STATUS_LABELS: Record<string, string> = {
  not_started: "Не начат",
  in_progress: "В работе",
  approval: "На согласовании",
  completed: "Завершён",
  paused: "Пауза",
};

export function V2ProjectsClient() {
  const { projects, loading: bootLoading } = useV2Bootstrap();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("project") ?? "";
  const [tasks, setTasks] = useState<V2TaskWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const teamProjects = useMemo(() => projects.filter((p) => p.scope === "team"), [projects]);
  const selected = teamProjects.find((p) => p.id === selectedId) ?? teamProjects[0];

  const loadTasks = useCallback(async () => {
    if (!selected) {
      setTasks([]);
      return;
    }
    const data = await fetchJson<{ tasks: V2TaskWithMeta[] }>(`/api/v2/tasks?projectId=${encodeURIComponent(selected.id)}`);
    setTasks(data.tasks.filter((t) => !t.completed_at && !t.inbox_bucket));
  }, [selected]);

  useEffect(() => {
    if (bootLoading) return;
    loadTasks()
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [bootLoading, loadTasks]);

  if (bootLoading || loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>;
  }

  return (
    <div className="px-7 py-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Проекты</h1>
          <p className="mt-1 text-sm text-[var(--v2-ink-500)]">{teamProjects.length} командных проектов</p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            await fetchJson("/api/v2/projects", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: newName.trim(), scope: "team" }),
            });
            setNewName("");
            window.location.reload();
          }}
        >
          <input className="v2-input" placeholder="Новый проект" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button type="submit" className="v2-btn-primary">Создать</button>
        </form>
      </header>
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="v2-card divide-y">
          {teamProjects.map((p) => (
            <Link
              key={p.id}
              href={appPath(`/v2/projects?project=${p.id}`)}
              className={`flex items-center gap-2 px-4 py-3 text-[13px] ${selected?.id === p.id ? "bg-[var(--v2-brand-50)] font-medium" : "hover:bg-[var(--v2-ink-50)]"}`}
            >
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold"
                style={{ background: p.color_bg ?? "#eee", color: p.color_tint ?? "#333" }}
              >
                {p.short_name}
              </span>
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className="text-[11px] text-[var(--v2-ink-400)]">{STATUS_LABELS[p.status] ?? p.status}</span>
            </Link>
          ))}
        </aside>

        <section className="v2-card p-4">
          {selected ? (
            <>
              <h2 className="mb-4 text-lg font-semibold">{selected.name}</h2>
              <div className="space-y-2">
                {tasks.length === 0 && <p className="text-sm text-[var(--v2-ink-500)]">Нет открытых задач</p>}
                {tasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-[var(--v2-ink-100)] px-3 py-2 text-[13px]">
                    <span>{t.title}</span>
                    <span className="text-[11px] text-[var(--v2-ink-500)]">{t.assignee_name ?? "—"}</span>
                  </div>
                ))}
              </div>
              <Link href={appPath(`/v2/kanban?projectId=${selected.id}`)} className="mt-4 inline-block text-sm text-[var(--v2-brand-600)] hover:underline">
                Канбан по проекту →
              </Link>
            </>
          ) : (
            <p className="text-sm text-[var(--v2-ink-500)]">Создайте первый проект</p>
          )}
        </section>
      </div>
    </div>
  );
}
