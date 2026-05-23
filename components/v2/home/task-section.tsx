"use client";

import { fmtDuration } from "@/lib/v2/format";
import type { V2TaskWithMeta } from "@/lib/v2/types";
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
}: {
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
}) {
  const [open, setOpen] = useState(true);
  const totalEst = tasks.reduce((a, t) => a + (t.estimate_seconds ?? 0), 0);

  if (hideWhenEmpty && !tasks.length) return null;

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
        <div className="overflow-hidden rounded-2xl bg-white shadow-[var(--v2-shadow-soft)]">
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
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="v2-tight px-4 py-6 text-center text-[13px] text-[var(--v2-ink-400)]">{emptyLabel}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
