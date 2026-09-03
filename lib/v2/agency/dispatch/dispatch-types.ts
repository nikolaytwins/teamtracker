import type { V2FinanceBusinessLine, V2FinancePaymentStatus } from "@/lib/v2/finance/types";
import type { DispatchWorkStatus } from "@/lib/v2/agency/dispatch/dispatch-work-status";

export type DispatchWorkModelType =
  | "site"
  | "presentation"
  | "support"
  | "legacy_tail"
  | "course"
  | "own_project"
  | "other";

export type DispatchRulesPayload = {
  capacity: {
    plannedHoursPerDay: number;
    reserveShare: number;
  };
  protected: {
    strategyHoursPerWeek: number;
    arkaliumDaysPerWeek: number;
  };
  pricing: {
    minEffectiveRateRub: number;
    targetEffectiveRateRub: number;
    urgentEffectiveRateRub: number;
    webinarSlidesPerHour: number;
  };
  finance: {
    reliableProfitMinRub: number;
    plannedProfitTargetRub: number;
    pauseProfitMinRub?: number;
  };
};

import type { WorkRulesDocument } from "@/lib/v2/agency/dispatch/work-rules-document";

export type DispatchRulesRow = {
  id: string;
  rules: DispatchRulesPayload;
  workRules: WorkRulesDocument;
  rulesTextMd: string | null;
  updatedAt: string;
};

export type DispatchProjectView = {
  id: string;
  name: string;
  businessLine: V2FinanceBusinessLine;
  paymentStatus: V2FinancePaymentStatus;
  dispatchWorkStatus: DispatchWorkStatus;
  workModelType: DispatchWorkModelType;
  workDeadline: string | null;
  financeDeadline: string | null;
  plannedHoursRemaining: number | null;
  paymentCertainThisMonth: boolean;
  totalAmount: number;
  paidAmount: number;
  effectiveTotalAmount: number;
  totalExpenses: number;
  ownerNetTotal: number;
  unpaidOwnerNet: number;
  createdAt: string;
};

export type DispatchFinanceSnapshot = {
  year: number;
  month: number;
  actualProfitRub: number;
  reliableProfitRub: number;
  plannedProfitRub: number;
  actualRevenueRub: number;
  /** Неоплаченное, отмеченное «точно в этом месяце» */
  certainUnpaidRevenueRub: number;
  reliableRevenueRub: number;
  expectedRevenueRub: number;
  totalExpensesRub: number;
  reliableProfitMinRub: number;
  plannedProfitTargetRub: number;
  thresholdsMet: {
    reliableMin: boolean;
    plannedTarget: boolean;
  };
};

export type DispatchPlanSnapshot = {
  year: number;
  month: number;
  plannedHoursPerDay: number;
  reserveShare: number;
  activeProjects: DispatchProjectView[];
  approvalRiskProjects: DispatchProjectView[];
  totalPlannedHoursRemaining: number;
  protected: {
    strategyHoursPerWeek: number;
    arkaliumDaysPerWeek: number;
  };
};

export type DispatchContext = {
  generatedAt: string;
  rules: DispatchRulesRow;
  finance: DispatchFinanceSnapshot;
  plan: DispatchPlanSnapshot;
};
