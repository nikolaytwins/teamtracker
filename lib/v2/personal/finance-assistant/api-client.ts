import { fetchJson } from "@/lib/v2/client/fetch-json";
import type {
  FinanceAllocationPlan,
  FinanceAssistantApplyResult,
  FinanceAssistantChatResponse,
  FinanceAssistantChatTurn,
  FinanceAssistantContext,
} from "@/lib/v2/personal/finance-assistant/types";

export async function fetchFinanceAssistantContext() {
  return fetchJson<{ context: FinanceAssistantContext }>("/api/v2/personal/finance/assistant/chat");
}

export async function sendFinanceAssistantMessage(input: {
  message: string;
  history: FinanceAssistantChatTurn[];
}) {
  return fetchJson<FinanceAssistantChatResponse>("/api/v2/personal/finance/assistant/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function applyFinanceAssistantPlan(plan: FinanceAllocationPlan) {
  return fetchJson<FinanceAssistantApplyResult>("/api/v2/personal/finance/assistant/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
}
