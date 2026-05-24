"use client";

const DAY_LABELS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;

export function WorkScheduleEditor({
  hoursPerDay,
  workDays,
  disabled,
  onChangeHours,
  onChangeDays,
}: {
  hoursPerDay: number;
  workDays: number[];
  disabled?: boolean;
  onChangeHours: (hours: number) => void;
  onChangeDays: (days: number[]) => void;
}) {
  function toggleDay(day: number) {
    const set = new Set(workDays);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    onChangeDays([...set].sort((a, b) => a - b));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="v2-tight text-[11px] text-[var(--v2-ink-500)]">ч/день</span>
        <input
          type="number"
          min={0.25}
          max={24}
          step={0.5}
          disabled={disabled}
          value={hoursPerDay}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onChangeHours(v);
          }}
          className="v2-tnum w-16 rounded-lg border border-[var(--v2-ink-200)] bg-white px-2 py-1 text-[13px] disabled:opacity-50"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {DAY_LABELS.map((label, day) => {
          const active = workDays.includes(day);
          return (
            <button
              key={label}
              type="button"
              disabled={disabled}
              onClick={() => toggleDay(day)}
              className={`v2-tight h-7 min-w-[2rem] rounded-lg px-1.5 text-[11px] font-medium transition disabled:opacity-50 ${
                active
                  ? "bg-[var(--v2-brand-600)] text-white"
                  : "bg-[var(--v2-ink-100)] text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-200)]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
