import { NextRequest, NextResponse } from "next/server";
import { loadDayPlanContext } from "@/lib/v2/personal/finance-assistant/day-plan-context";
import {
  dayPlanFallbackBubble,
  respondDayPlanAssistant,
} from "@/lib/v2/personal/finance-assistant/day-plan-respond";
import { loadFinanceAssistantContext } from "@/lib/v2/personal/finance-assistant/context";
import {
  financeAssistantFallbackBubble,
  respondFinanceAssistant,
} from "@/lib/v2/personal/finance-assistant/respond";
import type { AssistantDomain } from "@/lib/v2/personal/finance-assistant/day-plan-types";
import type { FinanceAssistantChatTurn } from "@/lib/v2/personal/finance-assistant/types";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";

function parseDomain(raw: unknown): AssistantDomain {
  return raw === "day" ? "day" : "finance";
}

export async function GET(request: NextRequest) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;

  const domain = parseDomain(request.nextUrl.searchParams.get("domain"));

  try {
    if (domain === "day") {
      const context = await loadDayPlanContext(auth.ctx);
      return NextResponse.json({ domain, context });
    }
    const context = await loadFinanceAssistantContext(auth.ctx);
    return NextResponse.json({ domain, context });
  } catch (error) {
    console.error("v2/personal/finance/assistant/chat GET:", error);
    return NextResponse.json({ error: "Failed to load context" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;

  let body: { message?: string; history?: FinanceAssistantChatTurn[]; domain?: AssistantDomain };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });
  const domain = parseDomain(body.domain);

  try {
    if (domain === "day") {
      const result = await respondDayPlanAssistant(auth.ctx, {
        message,
        history: body.history,
      });
      return NextResponse.json({ ...result, domain });
    }
    const result = await respondFinanceAssistant(auth.ctx, {
      message,
      history: body.history,
    });
    return NextResponse.json({ ...result, domain });
  } catch (error) {
    console.error("v2/personal/finance/assistant/chat POST:", error);
    return NextResponse.json({
      domain,
      messages: [domain === "day" ? dayPlanFallbackBubble() : financeAssistantFallbackBubble()],
    });
  }
}
