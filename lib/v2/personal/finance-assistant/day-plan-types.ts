import type { PlanDayMode, PlanItemKind, PlanPriority } from "@/lib/v2/agency/plan/plan-types";

export type AssistantDomain = "finance" | "day";

export type DayPlanChecklistId =
  | "strategy"
  | "creative"
  | "social"
  | "lera"
  | "rest"
  | "work";

export type DayPlanEntry =
  | {
      type: "mode";
      plan_date: string;
      mode: PlanDayMode;
      /** Блок на день (стратегия / творчество), минуты */
      block_title?: string;
      planned_minutes?: number;
    }
  | {
      type: "event";
      plan_date: string;
      kind: Extract<PlanItemKind, "personal" | "call">;
      title: string;
      event_time?: string | null;
      duration_label?: string | null;
      planned_minutes?: number | null;
    }
  | {
      type: "work";
      plan_date: string;
      title: string;
      planned_minutes: number;
      priority?: PlanPriority;
      project_id?: string | null;
    };

export type DayPlanChecklistRow = {
  id: DayPlanChecklistId;
  label: string;
  ok: boolean;
  plan_date: string | null;
  note?: string;
};

export type DayWeekPlan = {
  week_start: string;
  week_end: string;
  summary: string;
  entries: DayPlanEntry[];
  checklist: DayPlanChecklistRow[];
  notes?: string[];
};

export type DayPlanExistingItem = {
  id: string;
  kind: string;
  title: string;
  plan_date: string | null;
  planned_minutes: number | null;
  event_time: string | null;
  priority: number;
};

export type DayPlanDaySnapshot = {
  date: string;
  weekday: string;
  mode: PlanDayMode | null;
  items: DayPlanExistingItem[];
  hours: number;
};

export type DayPlanContext = {
  week_start: string;
  week_end: string;
  work_hours_per_day: number;
  days: DayPlanDaySnapshot[];
  checklist: DayPlanChecklistRow[];
  rules_short: string[];
  free_hint: string;
};
