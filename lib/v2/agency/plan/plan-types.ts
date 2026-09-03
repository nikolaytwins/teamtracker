import type { DispatchWorkStatus } from "@/lib/v2/agency/dispatch/dispatch-work-status";
import type { V2FinanceBusinessLine } from "@/lib/v2/finance/types";

export type PlanDayMode = "strategy" | "creative" | "rest";

export type PlanItemKind = "task" | "call" | "personal";

export type LoadStatus = "active" | "passive" | "pause";

export type PlanItemRow = {
  id: string;
  kind: PlanItemKind;
  project_id: string | null;
  title: string;
  plan_date: string | null;
  planned_minutes: number | null;
  event_time: string | null;
  duration_label: string | null;
  sort_order: number;
};

export type PlanDayModeRow = {
  plan_date: string;
  mode: PlanDayMode;
};

export type PlanProjectView = {
  id: string;
  name: string;
  clientLabel: string;
  businessLine: V2FinanceBusinessLine;
  businessLineLabel: string;
  color: string;
  dispatchWorkStatus: DispatchWorkStatus;
  workDeadline: string | null;
  plannedHoursRemaining: number | null;
  paymentCertainThisMonth: boolean;
  effectiveTotalAmount: number;
  paidAmount: number;
  onApprovalSince: string | null;
};

export type PlanPayload = {
  year: number;
  month: number;
  loadStatus: LoadStatus;
  loadStatusLabels: { title: string; headline: string; detail: string };
  reliableProfitRub: number;
  loadStatusFinance: {
    actualRevenueRub: number;
    certainUnpaidRevenueRub: number;
    totalExpensesRub: number;
    reliableProfitRub: number;
    passiveMinRub: number;
    pauseMinRub: number;
  };
  plannedHoursPerDay: number;
  items: PlanItemRow[];
  dayModes: PlanDayModeRow[];
  projects: PlanProjectView[];
  backlog: PlanItemRow[];
};
