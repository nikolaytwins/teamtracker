import {
  allocateAvailableIncome,
  FINANCE_RULES,
  FINANCE_RULES_TEXT,
  formatPlanForPrompt,
  parseAvailableRub,
} from "@/lib/v2/personal/finance-assistant/rules";
import type {
  FinanceAllocationPlan,
  FinanceAssistantContext,
  FinanceAssistantMessage,
} from "@/lib/v2/personal/finance-assistant/types";

function id() {
  return `fa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function rub(n: number): string {
  return `${Math.round(n).toLocaleString("ru-RU")} ₽`;
}

type LlmPayload = {
  kind: "decision" | "bubble" | "clarify";
  text?: string;
  decision?: string;
  alternative?: string;
  why?: { text: string; warn?: boolean }[];
  chips?: string[];
  available_rub?: number;
};

function planDecision(
  plan: FinanceAllocationPlan,
  context: FinanceAssistantContext
): Extract<FinanceAssistantMessage, { kind: "decision" }> {
  const why = plan.lines
    .filter((l) => l.amount_rub > 0 || l.key === "payments" || l.key === "free")
    .map((l) => ({
      text: `**${l.label}** — ${rub(l.amount_rub)}${l.note ? `: ${l.note}` : ""}`,
      warn: l.amount_rub === 0 && (l.key === "clothing" || l.key === "gifts" || l.key === "lera"),
    }));

  why.push({ text: context.free_hint, warn: false });
  why.push({
    text: `Подушка сейчас ${rub(context.cushion_rub)}, капитал ${rub(context.capital_rub)}.`,
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
        ? "Когда появится запас до 170к — сначала восстанови свободные, потом целевые фонды."
        : plan.mode === "economy"
          ? "Если дотянешь до 200к — добавятся одежда, подарки и сюрпризы Лере."
          : "Сверх 200к: 80% в подушку/капитал, 20% в свободные.",
    why,
    plan,
    actions: canApply
      ? [
          { type: "apply_allocation", plan, label: "Записать в фонды" },
          { type: "link", href: "/v2/personal/finance/system", label: "Открыть систему" },
        ]
      : [
          { type: "link", href: "/v2/personal/finance", label: "К финансам" },
          { type: "prefill", text: "Заработал 250 000", label: "Другая сумма" },
        ],
  };
}

function normalizeLlm(
  raw: LlmPayload,
  context: FinanceAssistantContext,
  fallbackPlan: FinanceAllocationPlan | null
): FinanceAssistantMessage[] | null {
  if (raw.kind === "clarify" && raw.text) {
    return [
      {
        id: id(),
        role: "assistant",
        kind: "clarify",
        text: raw.text,
        chips: raw.chips?.length
          ? raw.chips
          : ["Заработал 170 000", "Заработал 200 000", "Заработал 280 000"],
      },
    ];
  }

  const available =
    typeof raw.available_rub === "number" && raw.available_rub > 0
      ? Math.round(raw.available_rub)
      : fallbackPlan?.available_rub ?? null;

  if (raw.kind === "decision" && (raw.decision || available != null)) {
    const plan = available != null ? allocateAvailableIncome(available) : fallbackPlan;
    if (plan) {
      const base = planDecision(plan, context) as Extract<
        FinanceAssistantMessage,
        { kind: "decision" }
      >;
      return [
        {
          ...base,
          decision: raw.decision ?? base.decision,
          alternative: raw.alternative ?? base.alternative,
        },
      ];
    }
  }

  if (raw.kind === "bubble" && raw.text) {
    return [
      {
        id: id(),
        role: "assistant",
        kind: "bubble",
        text: raw.text,
        chips: raw.chips,
      },
    ];
  }

  return null;
}

export async function respondFinanceViaOpenRouter(input: {
  message: string;
  history: { role: "user" | "assistant"; text: string }[];
  context: FinanceAssistantContext;
  parsedAvailable: number | null;
}): Promise<FinanceAssistantMessage[] | null> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) return null;

  const model = process.env.OPENROUTER_CHAT_MODEL?.trim() || "google/gemini-2.5-flash";
  const planHint =
    input.parsedAvailable != null
      ? formatPlanForPrompt(allocateAvailableIncome(input.parsedAvailable))
      : "сумма ещё не распознана — попроси назвать доступный личный доход в рублях";

  const fundLines = input.context.funds
    .map((f) => `- ${f.name}${f.fund_key ? ` [${f.fund_key}]` : ""}: ${rub(f.amount_rub)}`)
    .join("\n");

  const system = `Ты — София, финансовый помощник в Team Tracker.
Отвечай коротко, по-русски. Верни ТОЛЬКО JSON без markdown.

Правила распределения личного дохода (после зарплаты бизнеса ${rub(FINANCE_RULES.salaryRub)}):
${FINANCE_RULES_TEXT.map((r) => `- ${r}`).join("\n")}

${input.context.free_hint}

Текущие фонды:
${fundLines || "пусто"}

Расчёт по правилам для этой реплики:
${planHint}

Формат ответа — один объект:
{
  "kind": "decision" | "bubble" | "clarify",
  "decision": "главное решение одной фразой (для decision)",
  "alternative": "запасной вариант",
  "why": [{"text": "факт", "warn": true|false}],
  "text": "для bubble/clarify",
  "chips": ["варианты"],
  "available_rub": 250000
}

Если пользователь назвал сумму заработка/доступного дохода — kind=decision и обязательно available_rub.
Если суммы нет — kind=clarify, спроси сколько доступно на жизнь после зарплаты бизнеса.
Не придумывай другие проценты — только правила выше.
Свободные деньги и обязательные платежи НЕ пишутся в фонды автоматически.`;

  const messages = [
    { role: "system" as const, content: system },
    ...input.history.slice(-8).map((h) => ({
      role: h.role === "user" ? ("user" as const) : ("assistant" as const),
      content: h.text,
    })),
    { role: "user" as const, content: input.message },
  ];

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.TEAM_TRACKER_PUBLIC_ORIGIN || "https://tt.twinlabs.ru",
        "X-Title": "Team Tracker Finance Sofia",
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as LlmPayload;
    const fallback =
      input.parsedAvailable != null ? allocateAvailableIncome(input.parsedAvailable) : null;
    return normalizeLlm(parsed, input.context, fallback);
  } catch {
    return null;
  }
}
