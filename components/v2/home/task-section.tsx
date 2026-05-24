"use client";

import { fmtDuration } from "@/lib/v2/format";
import { canDropTaskOnHomeBucket } from "@/lib/v2/tasks/task-buckets";
import type { V2TaskBucket, V2TaskWithMeta } from "@/lib/v2/types";
import { homeDropZoneClass, isHomeTaskDraggable } from "@/components/v2/home/home-task-dnd";
import { V2Icons } from "@/components/v2/ui/icons";
import { TaskRow } from "@/components/v2/home/task-row";
import { useState } from "react";

function pluralTasks(n: number): string {
  if (n === 1) return "задача";
  if (n >= 2 && n <= 4) return "задачи";
  return "задач";
}

function SectionHeader({
  title,
  subtitle,
  count,
  hours,
  accent,
  open,
  onToggle,
}: {
  title: string;
  subtitle?: string;
  count: number;
  hours: number;
  accent: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" onClick={onToggle} className="group flex w-full items-center gap-3 py-3">
      <V2Icons.chev className={`h-4 w-4 text-[var(--v2-ink-400)] transition-transform ${open ? "" : "-rotate-90"}`} />
      <span className="inline-flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
        <h3 className="v2-tight text-[14px] font-semibold text-[var(--v2-ink-900)]">{title}</h3>
      </span>
      {subtitle ? <span className="text-[12.5px] text-[var(--v2-ink-500)]">{subtitle}</span> : null}
      <span className="ml-auto flex items-center gap-3 text-[12px] text-[var(--v2-ink-500)]">
        <span>
          <span className="v2-tnum font-medium text-[var(--v2-ink-700)]">{count}</span> {pluralTasks(count)}
        </span>
        <span className="text-[var(--v2-ink-300)]">·</span>
        <span className="inline-flex items-center gap-1">
          <V2Icons.clock className="h-[13px] w-[13px]" />
          <span className="v2-tnum font-medium text-[var(--v2-ink-700)]">{fmtDuration(hours)}</span> план
        </span>
      </span>
    </button>
  );
}

export function TaskSection({
  bucket,
  title,
  subtitle,
  accent,
  tasks,
  runningId,
  elapsed,
  onToggleRun,
  onToggleDone,
  onOpenTask,
  hideWhenEmpty = false,
  emptyLabel = "Задач нет",
  dragId,
  dragOverBucket,
  onDragStart,
  onDragEnd,
  onDragOverBucket,
  onDropOnBucket,
}: {
  bucket: V2TaskBucket;
  title: string;
  subtitle?: string;
  accent: string;
  tasks: V2TaskWithMeta[];
  runningId: string | null;
  elapsed: number;
  onToggleRun: (id: string) => void;
  onToggleDone: (id: string) => void;
  onOpenTask: (id: string) => void;
  hideWhenEmpty?: boolean;
  emptyLabel?: string;
  dragId: string | null;
  dragOverBucket: V2TaskBucket | null;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
  onDragOverBucket: (bucket: V2TaskBucket | null) => void;
  onDropOnBucket: (bucket: V2TaskBucket) => void;
}) {
  const [open, setOpen] = useState(true);
  const totalEst = tasks.reduce((a, t) => a + (t.estimate_seconds ?? 0), 0);
  const droppable = canDropTaskOnHomeBucket(bucket);
  const isDragOver = dragOverBucket === bucket && droppable;

  if (hideWhenEmpty && !tasks.length && !dragId) return null;

  return (
    <section className="mt-2">
      <SectionHeader
        title={title}
        subtitle={subtitle}
        accent={accent}
        count={tasks.length}
        hours={totalEst}
        open={open}
        onToggle={() => setOpen((v) => !v)}
      />
      {open ? (
        <div
          className={`overflow-hidden rounded-2xl bg-white shadow-[var(--v2-shadow-soft)] transition ${homeDropZoneClass(isDragOver)}`}
          onDragOver={(e) => {
            if (!droppable || !dragId) return;
            e.preventDefault();
            onDragOverBucket(bucket);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) onDragOverBucket(null);
          }}
          onDrop={(e) => {
            if (!droppable || !dragId) return;
            e.preventDefault();
            onDropOnBucket(bucket);
          }}
        >
          {tasks.length ? (
            <div className="divide-y divide-[var(--v2-ink-100)]/70">
              {tasks.map((t, i) => (
                <div key={t.id} className="v2-row-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <TaskRow
                    task={t}
                    isRunning={runningId === t.id}
                    elapsed={elapsed}
                    onToggleRun={onToggleRun}
                    onToggleDone={onToggleDone}
                    onOpen={onOpenTask}
                    draggable={isHomeTaskDraggable(t)}
                    isDragging={dragId === t.id}
                    onDragStart={() => onDragStart(t.id)}
                    onDragEnd={onDragEnd}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="v2-tight px-4 py-6 text-center text-[13px] text-[var(--v2-ink-400)]">
              {dragId && droppable ? "Отпустите, чтобы перенести сюда" : emptyLabel}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
