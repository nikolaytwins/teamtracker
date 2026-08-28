"use client";

import { WeekFocusSection } from "@/components/v2/personal/week-focus/week-focus-section";
import { useState } from "react";

export function HomeWeekFocus() {
  const [weekOffset, setWeekOffset] = useState(0);

  return (
    <WeekFocusSection variant="card" weekOffset={weekOffset} onWeekOffsetChange={setWeekOffset} />
  );
}
