"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  weekFocusAddDays,
  weekFocusMondayOf,
  weekFocusToYmd,
} from "@/lib/v2/personal/week-focus-client-utils";
import { useCallback, useEffect, useMemo, useState } from "react";

export type WeekFocusGoal = {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  completed_at: string | null;
  slot: number | null;
  note: string;
};

export type WeekFocusData = {
  week_start: string;
  week_end: string;
  label: string;
  goals: WeekFocusGoal[];
};

export function useWeekFocus(weekOffset = 0) {
  const todayMonday = useMemo(() => weekFocusMondayOf(new Date()), []);
  const weekMonday = useMemo(() => weekFocusAddDays(todayMonday, weekOffset * 7), [todayMonday, weekOffset]);
  const [focus, setFocus] = useState<WeekFocusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchJson<{ weekFocus: WeekFocusData }>(
        `/api/v2/personal/calendar/week-focus?date=${weekFocusToYmd(weekMonday)}`
      );
      setFocus(res.weekFocus);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить фокус недели");
    }
  }, [weekMonday]);

  useEffect(() => {
    void load();
  }, [load]);

  const goalBySlot = useCallback(
    (slot: 0 | 1) => focus?.goals.find((g) => g.slot === slot) ?? null,
    [focus]
  );

  const upsertSlot = async (slot: 0 | 1, title: string, note?: string) => {
    if (!focus || busy) return;
    setBusy(true);
    try {
      await fetchJson("/api/v2/personal/calendar/week-focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_start: focus.week_start, title, note: note ?? "", slot }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить фокус");
    } finally {
      setBusy(false);
    }
  };

  const toggleDone = async (goal: WeekFocusGoal) => {
    const completed = !goal.completed_at;
    setFocus((prev) =>
      prev
        ? {
            ...prev,
            goals: prev.goals.map((g) =>
              g.id === goal.id ? { ...g, completed_at: completed ? new Date().toISOString() : null } : g
            ),
          }
        : prev
    );
    try {
      await fetchJson(`/api/v2/personal/calendar/week-focus/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
    } catch {
      await load();
    }
  };

  const updateGoal = async (goalId: string, patch: { title?: string; note?: string }) => {
    setBusy(true);
    try {
      await fetchJson(`/api/v2/personal/calendar/week-focus/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обновить фокус");
    } finally {
      setBusy(false);
    }
  };

  const removeGoal = async (goalId: string) => {
    setFocus((prev) => (prev ? { ...prev, goals: prev.goals.filter((g) => g.id !== goalId) } : prev));
    try {
      await fetchJson(`/api/v2/personal/calendar/week-focus/goals/${goalId}`, { method: "DELETE" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить фокус");
      await load();
    }
  };

  const assignFromTask = async (title: string, note?: string) => {
    if (!focus) return false;
    if (focus.goals.length >= 2) {
      setError("На этой неделе уже два фокуса. Сними один.");
      return false;
    }
    const slot: 0 | 1 = focus.goals.some((g) => g.slot === 0) ? 1 : 0;
    await upsertSlot(slot, title, note);
    return true;
  };

  const focusTitles = useMemo(() => new Set(focus?.goals.map((g) => g.title.trim()) ?? []), [focus]);

  return {
    focus,
    error,
    busy,
    load,
    goalBySlot,
    upsertSlot,
    toggleDone,
    updateGoal,
    removeGoal,
    assignFromTask,
    focusTitles,
    isCurrentWeek: weekOffset === 0,
  };
}
