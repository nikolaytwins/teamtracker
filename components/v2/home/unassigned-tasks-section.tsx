"use client";

import type { V2TaskWithMeta } from "@/lib/v2/types";
import { PRIORITY_META, V2Icons } from "@/components/v2/ui/icons";
import { ProjectChip } from "@/components/v2/ui/primitives";
import { useState } from "react";

function GapBadge({ kind }: { kind: "assignee" | "deadline" | "both" }) {
  const label =
    kind === "both" ? "Нет исполнителя и даты" : kind === "assignee" ? "Нет исполнителя" : "Нет даты";
  const cls =
    kind === "both"
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : kind === "assignee"
        ? "bg-violet-50 text-violet-800 ring-violet-200"
        : "bg-sky-50 text-sky-800 ring-sky-200";
  return (
    <span className={`v2-tight inline-flex items-center rounded-md px-1.5 py-[2px] text-[11px] font-medium ring-1 ring-inset ${cls}`}>
      {label}
    </span>
  );
}

function unassignedKind(task: V2TaskWithMeta): "assignee" | "deadline" | "both" {
  const noAssignee = !task.assignee_user_id;
  const noDeadline = !task.deadline_at;
  if (noAssignee && noDeadline) return "both";
  if (noAssignee) return "assignee";
  return "deadline";
}

export function UnassignedTasksSection({
  tasks,
  onOpenTask,
}: {
  tasks: V2TaskWithMeta[];
  onOpenTask: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);

  if (!tasks.length) return null;

  return (
    <section className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group mb-2 flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left transition hover:bg-white/60"
      >
        <V2Icons.chev className={`h-4 w-4 text-[var(--v2-ink-400)] transition-transform ${open ? "" : "-rotate-90"}`} />
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <h3 className="v2-tight text-[14px] font-semibold text-[var(--v2-ink-900)]">Нераспределённые задачи</h3>
        </span>
        <span className="text-[12.5px] text-[var(--v2-ink-500)]">без исполнителя или без даты</span>
        <span className="ml-auto v2-tnum rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
          {tasks.length}
        </span>
      </button>

      {open ? (
        <div className="overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/40 to-white shadow-[var(--v2-shadow-soft)]">
          <div className="border-b border-amber-100/80 px-4 py-2.5 text-[12px] text-[var(--v2-ink-500)]">
            Нажмите на задачу, чтобы назначить исполнителя и дату в карточке
          </div>
          <div className="divide-y divide-[var(--v2-ink-100)]/70">
            {tasks.map((task) => {
              const pm = PRIORITY_META[task.priority];
              const kind = unassignedKind(task);
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onOpenTask(task.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[var(--v2-ink-50)]/70"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: pm.dot }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="v2-tight text-[14px] font-medium text-[var(--v2-ink-900)]">{task.title}</span>
                      <GapBadge kind={kind} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-[var(--v2-ink-500)]">
                      {task.project_name ? (
                        <ProjectChip
                          name={task.project_name}
                          short={task.project_short_name}
                          bg={task.project_color_bg}
                          tint={task.project_color_tint}
                          ink={task.project_color_ink}
                        />
                      ) : (
                        <span className="text-[var(--v2-ink-400)]">Без проекта</span>
                      )}
                      <span className="text-[var(--v2-ink-300)]">·</span>
                      <span>{task.assignee_name ?? "Исполнитель не назначен"}</span>
                      <span className="text-[var(--v2-ink-300)]">·</span>
                      <span className="inline-flex items-center gap-1">
                        <V2Icons.clock className="h-3 w-3 opacity-70" />
                        {task.deadline_at
                          ? new Date(task.deadline_at).toLocaleDateString("ru-RU", {
                              day: "numeric",
                              month: "short",
                            })
                          : "Дата не задана"}
                      </span>
                    </div>
                  </div>
                  <V2Icons.arrowR className="mt-1 h-4 w-4 shrink-0 text-[var(--v2-ink-300)]" />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
