import { loadFinanceAssistantContext } from "@/lib/v2/personal/finance-assistant/context";
import { respondFinanceViaOpenRouter } from "@/lib/v2/personal/finance-assistant/openrouter";
import {
  allocateAvailableIncome,
  parseAvailableRub,
} from "@/lib/v2/personal/finance-assistant/rules";
import type {
  FinanceAllocationPlan,
  FinanceAssistantChatResponse,
  FinanceAssistantChatTurn,
  FinanceAssistantMessage,
} from "@/lib/v2/personal/finance-assistant/types";
import type { V2SessionContext } from "@/lib/v2/types";

function id() {
  return `fa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function rub(n: number): string {
  return `${Math.round(n).toLocaleString("ru-RU")} ₽`;
}

export function financeAssistantFallbackBubble(): FinanceAssistantMessage {
  return {
    id: id(),
    role: "assistant",
    kind: "bubble",
    text: "Напиши, сколько сейчас доступно на жизнь после зарплаты бизнеса — разложу по платежам, свободным и фондам.",
    chips: ["Заработал 170 000", "Заработал 200 000", "Заработал 280 000"],
  };
}

function planDecisionMessage(
  plan: FinanceAllocationPlan,
  freeHint: string,
  cushionRub: number,
  capitalRub: number
): FinanceAssistantMessage {
  const why = plan.lines
    .filter((l) => l.amount_rub > 0 || l.key === "payments" || l.key === "free")
    .map((l) => ({
      text: `**${l.label}** — ${rub(l.amount_rub)}${l.note ? `: ${l.note}` : ""}`,
      warn: false,
    }));
  why.push({ text: freeHint, warn: false });
  why.push({
    text: `Сейчас подушка ${rub(cushionRub)}, капитал ${rub(capitalRub)}.`,
    warn: false,
  });

  const canApply = plan.lines.some((l) => l.fund_key && l.amount_rub > 0);

  return {
    id: id(),
    role: "assistant",
    kind: "decision",
    headline: plan.mode_label,
    decision: plan.summary,
    alternative:
      plan.mode === "weak"
        ? "Пока месяц слабый — целевые фонды не пополняю."
        : plan.mode === "economy"
          ? "До 200к целевые фонды (одежда / подарки / Лера) не трогаю."
          : "Сверх 200к: 80% подушка, 20% свободные.",
    why,
    plan,
    actions: canApply
      ? [
          { type: "apply_allocation", plan, label: "Записать в фонды" },
          { type: "link", href: "/v2/personal/finance/system", label: "Система" },
        ]
      : [{ type: "prefill", text: "Заработал 250 000", label: "Другая сумма" }],
  };
}

function isSmallTalk(message: string): boolean {
  return /^(привет|здравствуй|добрый\s+(день|утро|вечер)|hi|hello|hey)[!.?\s]*$/i.test(message.trim());
}

function wantsRules(message: string): boolean {
  return /как\s+(работа|дел)|правила|систем|разлож|куда\s+клад|как\s+дел/i.test(message);
}

export async function respondFinanceAssistant(
  ctx: V2SessionContext,
  input: { message: string; history?: FinanceAssistantChatTurn[] }
): Promise<FinanceAssistantChatResponse> {
  const context = await loadFinanceAssistantContext(ctx);
  const parsed = parseAvailableRub(input.message);

  const llm = await respondFinanceViaOpenRouter({
    message: input.message,
    history: input.history ?? [],
    context,
    parsedAvailable: parsed,
  });
  if (llm?.length) {
    const planMsg = llm.find(
      (m): m is Extract<FinanceAssistantMessage, { kind: "decision" }> =>
        m.role === "assistant" && m.kind === "decision" && Boolean(m.plan)
    );
    return {
      messages: llm,
      plan: planMsg?.plan ?? null,
    };
  }

  return respondFinanceRules(input.message, context);
}

function respondFinanceRules(
  message: string,
  context: Awaited<ReturnType<typeof loadFinanceAssistantContext>>
): FinanceAssistantChatResponse {
  if (isSmallTalk(message)) {
    return {
      messages: [
        {
          id: id(),
          role: "assistant",
          kind: "bubble",
          text: `Привет. Я финансовый помощник: скажи доступный доход на жизнь — разложу по правилам. Подушка сейчас ${rub(context.cushion_rub)}.`,
          chips: ["Заработал 170 000", "Заработал 200 000", "Заработал 280 000", "Как работает система?"],
        },
      ],
    };
  }

  if (wantsRules(message)) {
    return {
      messages: [
        {
          id: id(),
          role: "assistant",
          kind: "bubble",
          text: context.rules_short.join("\n\n"),
          chips: ["Заработал 200 000", "Заработал 280 000"],
          actions: [{ type: "link", href: "/v2/personal/finance/system", label: "Открыть систему" }],
        },
      ],
    };
  }

  const available = parseAvailableRub(message);
  if (available == null) {
    return {
      messages: [
        {
          id: id(),
          role: "assistant",
          kind: "clarify",
          text: "Сколько сейчас доступно на жизнь после зарплаты бизнеса? Напиши сумму в рублях.",
          chips: ["170000", "200000", "250000", "300000"],
        },
      ],
    };
  }

  const plan = allocateAvailableIncome(available);
  const msg = planDecisionMessage(plan, context.free_hint, context.cushion_rub, context.capital_rub);
  return { messages: [msg], plan };
}
