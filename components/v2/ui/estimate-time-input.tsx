"use client";

import { hoursMinutesToSeconds, secondsToHoursMinutes } from "@/lib/v2/format";
import { useEffect, useState } from "react";

export function EstimateTimeInput({
  estimateSeconds,
  onChange,
}: {
  estimateSeconds: number | null;
  onChange: (seconds: number | null) => void;
}) {
  const initial = secondsToHoursMinutes(estimateSeconds);
  const [hours, setHours] = useState(String(initial.hours));
  const [minutes, setMinutes] = useState(String(initial.minutes));

  useEffect(() => {
    const { hours: h, minutes: m } = secondsToHoursMinutes(estimateSeconds);
    setHours(String(h));
    setMinutes(String(m));
  }, [estimateSeconds]);

  function commit() {
    const h = Math.max(0, parseInt(hours, 10) || 0);
    const m = Math.max(0, Math.min(59, parseInt(minutes, 10) || 0));
    onChange(hoursMinutesToSeconds(h, m));
  }

  return (
    <div className="mt-1 flex items-center gap-2">
      <input
        type="number"
        min={0}
        max={999}
        className="v2-input v2-tnum w-16 text-[13px]"
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        onBlur={commit}
        aria-label="Часы"
      />
      <span className="text-[12px] text-[var(--v2-ink-500)]">ч</span>
      <input
        type="number"
        min={0}
        max={59}
        className="v2-input v2-tnum w-16 text-[13px]"
        value={minutes}
        onChange={(e) => setMinutes(e.target.value)}
        onBlur={commit}
        aria-label="Минуты"
      />
      <span className="text-[12px] text-[var(--v2-ink-500)]">мин</span>
    </div>
  );
}
