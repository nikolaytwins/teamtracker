"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import { useV2Bootstrap } from "@/components/v2/shell/v2-app-shell";
import { ProjectChip } from "@/components/v2/ui/primitives";
import type { V2TaskStatus, V2TaskWithMeta } from "@/lib/v2/types";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const COLUMNS: { key: V2TaskStatus; label: string }[] = [
  { key: "todo", label: "К выполнению" },
  { key: "in_progress", label: "В работе" },
  { key: "review", label: "На проверке" },
  { key: "done", label: "Готово" },
];

export function V2KanbanClient() {
  const { members } = useV2Bootstrap();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") ?? "";
  const [columns, setColumns] = useState<Record<V2TaskStatus, V2TaskWithMeta[]>>({
    todo: [],
    in_progress: [],
    review: [],
    done: [],
  });
  const [assignee, setAssignee] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (assignee) params.set("assignee", assignee);
    if (projectId) params.set("projectId", projectId);
    const q = params.toString() ? `?${params}` : "";
    const data = await fetchJson<{ columns: Record<V2TaskStatus, V2TaskWithMeta[]> }>(`/api/v2/kanban${q}`);
    setColumns(data.columns);
  }, [assignee, projectId]);

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [load]);

  async function setStatus(taskId: string, status: V2TaskStatus) {
    await fetchJson(`/api/v2/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>;
  }

  return (
    <div className="px-7 py-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Канбан</h1>
          <p className="mt-1 text-sm text-[var(--v2-ink-500)]">По статусу задачи</p>
        </div>
        <select className="v2-input w-auto" value={assignee} onChange={(e) => { setAssignee(e.target.value); setLoading(true); }}>
          <option value="">Все исполнители</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
          ))}
        </select>
      </header>
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(({ key, label }) => (
          <section
            key={key}
            className="v2-card flex w-[260px] shrink-0 flex-col p-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) void setStatus(dragId, key);
              setDragId(null);
            }}
          >
            <h2 className="mb-2 px-1 text-xs font-semibold">{label} ({columns[key]?.length ?? 0})</h2>
            <div className="flex flex-1 flex-col gap-2">
              {(columns[key] ?? []).map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => setDragId(task.id)}
                  onDragEnd={() => setDragId(null)}
                  className="cursor-grab rounded-lg border border-[var(--v2-ink-100)] bg-white px-3 py-2 active:cursor-grabbing"
                >
                  <div className="text-[13px] font-medium">{task.title}</div>
                  {task.project_name && (
                    <div className="mt-1">
                      <ProjectChip name={task.project_name} short={task.project_short_name} bg={task.project_color_bg} tint={task.project_color_tint} />
                    </div>
                  )}
                  {task.assignee_name && <div className="mt-1 text-[11px] text-[var(--v2-ink-500)]">{task.assignee_name}</div>}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
