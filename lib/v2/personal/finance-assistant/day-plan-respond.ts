import { listPlanDayModes, listPlanItems } from "@/lib/v2/agency/plan/plan-repo";
import { addDays, parseYmd, toYmd } from "@/lib/v2/agency/plan/plan-utils";
import { loadDayPlanContext } from "@/lib/v2/personal/finance-assistant/day-plan-context";
import { decisionFromDayPlan } from "@/lib/v2/personal/finance-assistant/day-plan-decision";
import { respondDayPlanViaOpenRouter } from "@/lib/v2/personal/finance-assistant/day-plan-openrouter";
import {
  DAY_PLAN_RULES_TEXT,
  proposeDayWeekPlan,
  resolveWeekStart,
} from "@/lib/v2/personal/finance-assistant/day-plan-rules";
import type {
  FinanceAssistantChatResponse,
  FinanceAssistantChatTurn,
  FinanceAssistantMessage,
} from "@/lib/v2/personal/finance-assistant/types";
import type { V2SessionContext } from "@/lib/v2/types";

function id() {
  return `dp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function wantsPlan(message: string): boolean {
  return /план|распредел|раскид|разлож|расписан|недел|день|стратег|творч|свидан|выходн|работ/i.test(
    message
  );
}

function isSmallTalk(message: string): boolean {
  return /^(привет|здравствуй|добрый\s+(день|утро|вечер)|hi|hello|hey)[!.?\s]*$/i.test(
    message.trim()
  );
}

function wantsRules(message: string): boolean {
  return /как\s+(работа|дел)|правила|систем|чеклист|что\s+должно/i.test(message);
}

export function dayPlanFallbackBubble(): FinanceAssistantMessage {
  return {
    id: id(),
    role: "assistant",
    kind: "bubble",
    text: "Давай соберём неделю: стратегия, творчество, выход в люди, свидание с Лерой, выходной и минимум три рабочих дня по 4 часа. Напиши ограничения — раскидаю и по одобрению занесу в план.",
    chips: [
      "Распланируй эту неделю",
      "Следующая неделя",
      "Стратегия в понедельник, свидание в субботу",
    ],
  };
}

export async function respondDayPlanAssistant(
  ctx: V2SessionContext,
  input: { message: string; history?: FinanceAssistantChatTurn[] }
): Promise<FinanceAssistantChatResponse> {
  const weekStart = resolveWeekStart(input.message);
  const context = await loadDayPlanContext(ctx, { weekStart, message: input.message });

  const llm = await respondDayPlanViaOpenRouter({
    message: input.message,
    history: input.history ?? [],
    context,
  });
  if (llm?.length) {
    const planMsg = llm.find(
      (m): m is Extract<FinanceAssistantMessage, { kind: "decision" }> =>
        m.role === "assistant" && m.kind === "decision" && Boolean(m.day_plan)
    );
    return { messages: llm, day_plan: planMsg?.day_plan ?? null };
  }

  return respondDayPlanRules(ctx, input.message, weekStart);
}

async function respondDayPlanRules(
  ctx: V2SessionContext,
  message: string,
  weekStart: string
): Promise<FinanceAssistantChatResponse> {
  const context = await loadDayPlanContext(ctx, { weekStart });

  if (isSmallTalk(message)) {
    return {
      messages: [
        {
          id: id(),
          role: "assistant",
          kind: "bubble",
          text: `Привет. Режим планирования дня: ${context.free_hint}`,
          chips: [
            "Распланируй эту неделю",
            "Что ещё не закрыто?",
            "Стратегия в понедельник",
          ],
        },
      ],
    };
  }

  if (wantsRules(message) || /что\s+ещё\s+не\s+закры/i.test(message)) {
    return {
      messages: [
        {
          id: id(),
          role: "assistant",
          kind: "bubble",
          text: `${DAY_PLAN_RULES_TEXT.join("\n")}\n\n${context.free_hint}`,
          chips: ["Распланируй эту неделю", "Следующая неделя"],
          actions: [{ type: "link", href: "/v2/agency/plan", label: "Календарь" }],
        },
      ],
    };
  }

  if (!wantsPlan(message)) {
    return {
      messages: [
        {
          id: id(),
          role: "assistant",
          kind: "clarify",
          text: "Напиши, какую неделю планируем и какие дни уже заняты — например: «распланируй неделю, свидание в субботу, мероприятие в среду».",
          chips: [
            "Распланируй эту неделю",
            "Следующая неделя: стратегия в пн",
            "Свидание в пятницу, выходной в воскресенье",
          ],
        },
      ],
    };
  }

  const weekEnd = toYmd(addDays(parseYmd(weekStart), 6));
  const [items, dayModes] = await Promise.all([
    listPlanItems(ctx, weekStart, weekEnd),
    listPlanDayModes(ctx, weekStart, weekEnd),
  ]);

  const plan = proposeDayWeekPlan({
    weekStart,
    items,
    dayModes,
    message,
  });

  return { messages: [decisionFromDayPlan(plan)], day_plan: plan };
}
