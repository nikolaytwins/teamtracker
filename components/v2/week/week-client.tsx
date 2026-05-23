"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import { ProjectChip } from "@/components/v2/ui/primitives";
import type { V2TaskRow } from "@/lib/v2/types";
import { useCallback, useEffect, useState } from "react";

type WeekTask = V2TaskRow & {
  project_name: string | null;
  project_color_tint: string | null;
  project_color_bg: string | null;
  assignee_name: string | null;
  scheduled_dates: string[];
};

const WEEKDAY = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function formatDayLabel(ymd: string) {
  const d = new Date(ymd + "T12:00:00");
  const wd = WEEKDAY[(d.getDay() + 6) % 7] ?? "";
  return `${wd} ${d.getDate()}.${d.getMonth() + 1}`;
}

export function V2WeekClient() {
  const [dates, setDates] = useState<string[]>([]);
  const [columns, setColumns] = useState<Record<string, WeekTask[]>>({});
  const [unscheduled, setUnscheduled] = useState<WeekTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await fetchJson<{ dates: string[]; columns: Record<string, WeekTask[]>; unscheduled: WeekTask[] }>("/api/v2/week");
    setDates(data.dates);
    setColumns(data.columns);
    setUnscheduled(data.unscheduled);
  }, []);

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [load]);

  async function scheduleOn(taskId: string, date: string) {
    await fetchJson("/api/v2/week", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, date, action: "add" }),
    });
    await load();
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>;
  }

  return (
    <div className="px-7 py-6">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Неделя</h1>
        <p className="mt-1 text-sm text-[var(--v2-ink-500)]">Перетащите задачу на день</p>
      </header>
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {dates.map((date) => (
          <section
            key={date}
            className="v2-card flex w-[200px] shrink-0 flex-col p-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) void scheduleOn(dragId, date);
              setDragId(null);
            }}
          >
            <h2 className="mb-2 px-1 text-xs font-semibold">{formatDayLabel(date)}</h2>
            <div className="flex flex-1 flex-col gap-1.5">
              {(columns[date] ?? []).map((task) => (
                <div key={task.id} className="rounded-lg border border-[var(--v2-ink-100)] bg-white px-2 py-1.5 text-[12px]">
                  <div className="font-medium">{task.title}</div>
                  {task.project_name && (
                    <div className="mt-1">
                      <ProjectChip name={task.project_name} bg={task.project_color_bg} tint={task.project_color_tint} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {unscheduled.length > 0 && (
        <section className="v2-card mt-4 p-4">
          <h2 className="mb-3 text-sm font-semibold">Без даты ({unscheduled.length})</h2>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={() => setDragId(task.id)}
                onDragEnd={() => setDragId(null)}
                className="cursor-grab rounded-lg border border-dashed border-[var(--v2-ink-200)] px-3 py-2 text-[13px] active:cursor-grabbing"
              >
                {task.title}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
