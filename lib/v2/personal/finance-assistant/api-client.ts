import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { DayPlanApplyResult } from "@/lib/v2/personal/finance-assistant/day-plan-apply";
import type { AssistantDomain, DayPlanContext, DayWeekPlan } from "@/lib/v2/personal/finance-assistant/day-plan-types";
import type {
  FinanceAllocationPlan,
  FinanceAssistantApplyResult,
  FinanceAssistantChatResponse,
  FinanceAssistantChatTurn,
  FinanceAssistantContext,
} from "@/lib/v2/personal/finance-assistant/types";

export async function fetchFinanceAssistantContext(domain: AssistantDomain = "finance") {
  if (domain === "day") {
    return fetchJson<{ domain: "day"; context: DayPlanContext }>(
      `/api/v2/personal/finance/assistant/chat?domain=day`
    );
  }
  return fetchJson<{ domain: "finance"; context: FinanceAssistantContext }>(
    `/api/v2/personal/finance/assistant/chat?domain=finance`
  );
}

export async function sendFinanceAssistantMessage(input: {
  message: string;
  history: FinanceAssistantChatTurn[];
  domain?: AssistantDomain;
}) {
  return fetchJson<FinanceAssistantChatResponse & { domain?: AssistantDomain }>(
    "/api/v2/personal/finance/assistant/chat",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
}

export async function applyFinanceAssistantPlan(plan: FinanceAllocationPlan) {
  return fetchJson<FinanceAssistantApplyResult>("/api/v2/personal/finance/assistant/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, domain: "finance" }),
  });
}

export async function applyDayAssistantPlan(plan: DayWeekPlan) {
  return fetchJson<DayPlanApplyResult>("/api/v2/personal/finance/assistant/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ day_plan: plan, domain: "day" }),
  });
}
