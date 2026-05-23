"use client";

import { appPath } from "@/lib/api-url";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { V2ProjectRow, V2ProjectStatus, V2TaskWithMeta } from "@/lib/v2/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const STATUS_LABELS: Record<V2ProjectStatus, string> = {
  not_started: "Не начат",
  in_progress: "В работе",
  approval: "На согласовании",
  completed: "Завершён",
  paused: "Пауза",
};

type StatusTab = "active" | "paused" | "completed";

const TABS: { key: StatusTab; label: string }[] = [
  { key: "active", label: "Активные" },
  { key: "paused", label: "На паузе" },
  { key: "completed", label: "Завершённые" },
];

export function V2ProjectsClient() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("project") ?? "";
  const tabParam = searchParams.get("tab") as StatusTab | null;
  const [tab, setTab] = useState<StatusTab>(tabParam && TABS.some((t) => t.key === tabParam) ? tabParam : "active");
  const [projects, setProjects] = useState<V2ProjectRow[]>([]);
  const [tasks, setTasks] = useState<V2TaskWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const selected = projects.find((p) => p.id === selectedId) ?? projects[0];

  const loadProjects = useCallback(async () => {
    const data = await fetchJson<{ projects: V2ProjectRow[] }>(
      `/api/v2/projects?statusGroup=${encodeURIComponent(tab)}`
    );
    setProjects(data.projects.filter((p) => p.scope === "team"));
  }, [tab]);

  const loadTasks = useCallback(async () => {
    if (!selected) {
      setTasks([]);
      return;
    }
    const data = await fetchJson<{ tasks: V2TaskWithMeta[] }>(
      `/api/v2/tasks?projectId=${encodeURIComponent(selected.id)}&includeAll=1`
    );
    setTasks(data.tasks.filter((t) => !t.inbox_bucket));
  }, [selected]);

  useEffect(() => {
    setLoading(true);
    loadProjects()
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [loadProjects]);

  useEffect(() => {
    if (!selected) return;
    loadTasks().catch((e) => setError(e instanceof Error ? e.message : "Ошибка"));
  }, [loadTasks, selected]);

  const counts = useMemo(() => {
    const open = tasks.filter((t) => !t.completed_at).length;
    return { open, total: tasks.length };
  }, [tasks]);

  async function setProjectStatus(status: V2ProjectStatus) {
    if (!selected) return;
    await fetchJson(`/api/v2/projects/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadProjects();
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>;
  }

  return (
    <div className="px-7 py-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Проекты</h1>
          <p className="mt-1 text-sm text-[var(--v2-ink-500)]">Проект → задачи → подзадачи (опционально)</p>
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
            await loadProjects();
          }}
        >
          <input className="v2-input" placeholder="Новый проект" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button type="submit" className="v2-btn-primary">Создать</button>
        </form>
      </header>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <div className="mb-4 flex gap-1 rounded-xl bg-white/80 p-1 shadow-[var(--v2-shadow-card)]">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-[13px] font-medium transition ${
              tab === key ? "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]" : "text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="v2-card divide-y max-h-[70vh] overflow-y-auto">
          {projects.length === 0 && (
            <p className="px-4 py-6 text-sm text-[var(--v2-ink-500)]">Нет проектов в этой группе</p>
          )}
          {projects.map((p) => (
            <Link
              key={p.id}
              href={appPath(`/v2/projects?project=${p.id}&tab=${tab}`)}
              className={`flex items-center gap-2 px-4 py-3 text-[13px] ${
                selected?.id === p.id ? "bg-[var(--v2-brand-50)] font-medium" : "hover:bg-[var(--v2-ink-50)]"
              }`}
            >
              <span
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
                style={{
                  background: p.color_bg ?? "#eee",
                  color: p.color_ink ?? p.color_tint ?? "#333",
                }}
              >
                {p.short_name}
              </span>
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className="text-[11px] text-[var(--v2-ink-400)]">{STATUS_LABELS[p.status]}</span>
            </Link>
          ))}
        </aside>

        <section className="v2-card p-4">
          {selected ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{selected.name}</h2>
                  <p className="text-sm text-[var(--v2-ink-500)]">
                    {counts.open} открытых · {counts.total} всего задач
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tab !== "active" && (
                    <button type="button" className="v2-btn-primary text-xs" onClick={() => void setProjectStatus("in_progress")}>
                      В активные
                    </button>
                  )}
                  {tab !== "paused" && (
                    <button type="button" className="v2-input text-xs" onClick={() => void setProjectStatus("paused")}>
                      На паузу
                    </button>
                  )}
                  {tab !== "completed" && (
                    <button type="button" className="v2-input text-xs" onClick={() => void setProjectStatus("completed")}>
                      Завершить
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {tasks.length === 0 && (
                  <p className="text-sm text-[var(--v2-ink-500)]">
                    Задач пока нет. Создайте задачу на главной (⌘K или «Новая задача») и привяжите к этому проекту.
                  </p>
                )}
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--v2-ink-100)] px-3 py-2 text-[13px]"
                  >
                    <span className={t.completed_at ? "text-[var(--v2-ink-400)] line-through" : ""}>{t.title}</span>
                    <span className="text-[11px] text-[var(--v2-ink-500)]">{t.assignee_name ?? "—"}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--v2-ink-500)]">Выберите проект или создайте новый</p>
          )}
        </section>
      </div>
    </div>
  );
}
