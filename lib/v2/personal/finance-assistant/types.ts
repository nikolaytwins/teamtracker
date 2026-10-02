import type { DayPlanContext, DayWeekPlan } from "@/lib/v2/personal/finance-assistant/day-plan-types";

export type { DayPlanContext, DayWeekPlan };
export type { AssistantDomain } from "@/lib/v2/personal/finance-assistant/day-plan-types";

export type FinanceAssistantMode = "weak" | "economy" | "normal";

export type FinanceAllocationLine = {
  key: "payments" | "free" | "clothing" | "gifts" | "lera" | "cushion" | "leftover";
  label: string;
  amount_rub: number;
  fund_key?: string | null;
  note?: string;
};

export type FinanceAllocationPlan = {
  available_rub: number;
  mode: FinanceAssistantMode;
  mode_label: string;
  lines: FinanceAllocationLine[];
  total_allocated_rub: number;
  summary: string;
};

export type FinanceAssistantFundSnapshot = {
  id: string;
  fund_key: string | null;
  name: string;
  amount_rub: number;
};

export type FinanceAssistantContext = {
  funds: FinanceAssistantFundSnapshot[];
  cushion_rub: number;
  capital_rub: number;
  free_hint: string;
  rules_short: string[];
};

export type FinanceAssistantAction =
  | { type: "apply_allocation"; plan: FinanceAllocationPlan; label?: string }
  | { type: "apply_day_plan"; plan: DayWeekPlan; label?: string }
  | { type: "prefill"; text: string; label?: string }
  | { type: "link"; href: string; label: string };

export type FinanceAssistantUserMessage = { id: string; role: "user"; text: string };

export type FinanceAssistantBubble = {
  id: string;
  role: "assistant";
  kind: "bubble";
  text: string;
  chips?: string[];
  actions?: FinanceAssistantAction[];
};

export type FinanceAssistantClarify = {
  id: string;
  role: "assistant";
  kind: "clarify";
  text: string;
  chips: string[];
};

export type FinanceAssistantDecision = {
  id: string;
  role: "assistant";
  kind: "decision";
  headline?: string;
  decision: string;
  alternative?: string;
  why: { text: string; warn?: boolean }[];
  plan?: FinanceAllocationPlan;
  day_plan?: DayWeekPlan;
  actions?: FinanceAssistantAction[];
};

export type FinanceAssistantMessage =
  | FinanceAssistantUserMessage
  | FinanceAssistantBubble
  | FinanceAssistantClarify
  | FinanceAssistantDecision;

export type FinanceAssistantChatTurn = { role: "user" | "assistant"; text: string };

export type FinanceAssistantChatResponse = {
  messages: FinanceAssistantMessage[];
  plan?: FinanceAllocationPlan | null;
  day_plan?: DayWeekPlan | null;
};

export type FinanceAssistantApplyResult = {
  ok: true;
  applied: { fund_key: string; name: string; before: number; after: number; delta: number }[];
  skipped: string[];
};
