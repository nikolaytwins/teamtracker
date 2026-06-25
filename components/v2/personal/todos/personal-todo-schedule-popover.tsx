"use client";

import { InlinePopover } from "@/components/v2/tasks/task-inline-editors";
import { V2Icons } from "@/components/v2/ui/icons";
import { formatPersonalTodoDateLabel, personalTodoTodayYmd, personalTodoWeekDates } from "@/lib/v2/personal/todo-date";

export function PersonalTodoSchedulePopover({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (ymd: string) => void;
}) {
  const today = personalTodoTodayYmd();
  const quickDates = personalTodoWeekDates(today, 7);

  return (
    <InlinePopover open={open} onClose={onClose} className="min-w-[220px] p-3">
      <p className="v2-tight mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--v2-ink-400)]">
        Дата выполнения
      </p>
      <div className="flex flex-col gap-0.5">
        {quickDates.map((ymd) => (
          <button
            key={ymd}
            type="button"
            onClick={() => onPick(ymd)}
            className="v2-tight flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-[var(--v2-ink-800)] transition hover:bg-[var(--v2-ink-50)]"
          >
            <V2Icons.cal className="h-3.5 w-3.5 shrink-0 text-[var(--v2-ink-400)]" />
            {formatPersonalTodoDateLabel(ymd) ?? ymd}
          </button>
        ))}
      </div>
      <label className="v2-tight mt-3 block text-[11px] font-medium text-[var(--v2-ink-500)]">
        Другая дата
        <input
          type="date"
          min={today}
          className="mt-1 w-full rounded-lg border border-[var(--v2-ink-200)] px-2.5 py-1.5 text-[13px] text-[var(--v2-ink-800)] outline-none focus:border-[var(--v2-brand-400)]"
          onChange={(e) => {
            if (e.target.value) onPick(e.target.value);
          }}
        />
      </label>
    </InlinePopover>
  );
}
