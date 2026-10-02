import { NextRequest, NextResponse } from "next/server";
import { loadFinanceAssistantContext } from "@/lib/v2/personal/finance-assistant/context";
import {
  financeAssistantFallbackBubble,
  respondFinanceAssistant,
} from "@/lib/v2/personal/finance-assistant/respond";
import type { FinanceAssistantChatTurn } from "@/lib/v2/personal/finance-assistant/types";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";

export async function GET() {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;

  try {
    const context = await loadFinanceAssistantContext(auth.ctx);
    return NextResponse.json({ context });
  } catch (error) {
    console.error("v2/personal/finance/assistant/chat GET:", error);
    return NextResponse.json({ error: "Failed to load context" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;

  let body: { message?: string; history?: FinanceAssistantChatTurn[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });

  try {
    const result = await respondFinanceAssistant(auth.ctx, {
      message,
      history: body.history,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("v2/personal/finance/assistant/chat POST:", error);
    return NextResponse.json({ messages: [financeAssistantFallbackBubble()] });
  }
}
