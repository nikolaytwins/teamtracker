"use client";

import { V2Icons } from "@/components/v2/ui/icons";
import type { TaskViewMode } from "@/lib/v2/task-view-mode";

export function TaskViewSwitcher({
  view,
  setView,
}: {
  view: TaskViewMode;
  setView: (v: TaskViewMode) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-xl bg-white p-1 shadow-[var(--v2-shadow-card)] max-sm:flex max-sm:w-full">
      {(
        [
          ["day", "День", V2Icons.list],
          ["week", "Неделя", V2Icons.cal],
          ["kanban", "Канбан", V2Icons.kanban],
        ] as const
      ).map(([id, label, Icon]) => {
        const active = view === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`v2-tight inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium transition max-lg:h-10 max-lg:text-[14px] max-sm:flex-1 max-sm:justify-center ${
              active ? "bg-[var(--v2-ink-900)] text-white" : "text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
