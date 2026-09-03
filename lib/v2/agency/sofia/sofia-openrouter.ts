import type { DispatchContext } from "@/lib/v2/agency/dispatch/dispatch-types";
import type { SofiaChatTurn, SofiaContextPanel, SofiaMessage } from "@/lib/v2/agency/sofia/sofia-types";
import { formatRub } from "@/lib/v2/finance/meta";

function id() {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type LlmPayload = {
  kind: "decision" | "bubble" | "clarify";
  text?: string;
  decision?: string;
  alternative?: string;
  why?: { text: string; warn?: boolean }[];
  planChanges?: { label: string; value: string; accent?: boolean }[];
  clientMessage?: string;
  chips?: string[];
};

function normalizeLlmMessage(raw: LlmPayload): SofiaMessage | null {
  if (raw.kind === "clarify" && raw.text) {
    return {
      id: id(),
      role: "sofia",
      kind: "clarify",
      text: raw.text,
      chips: raw.chips?.length ? raw.chips : ["4 часа", "8 часов", "10 часов"],
    };
  }
  if (raw.kind === "bubble" && raw.text) {
    return {
      id: id(),
      role: "sofia",
      kind: "bubble",
      text: raw.text,
      chips: raw.chips,
    };
  }
  if (raw.kind === "decision" && raw.decision) {
    return {
      id: id(),
      role: "sofia",
      kind: "decision",
      headline: "Главное решение",
      decision: raw.decision,
      alternative: raw.alternative,
      why: raw.why?.length ? raw.why : [{ text: raw.text ?? "См. контекст слева." }],
      planChanges: raw.planChanges,
      clientMessage: raw.clientMessage,
      actions: raw.clientMessage
        ? [{ type: "copy_client", text: raw.clientMessage }]
        : undefined,
    };
  }
  return null;
}

export async function respondSofiaViaOpenRouter(input: {
  message: string;
  history: SofiaChatTurn[];
  year: number;
  month: number;
  context: SofiaContextPanel;
  dispatch: DispatchContext;
}): Promise<SofiaMessage[] | null> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) return null;

  const model =
    process.env.OPENROUTER_CHAT_MODEL?.trim() || "google/gemini-2.5-flash";

  const pricing = input.dispatch.rules.rules.pricing;
  const system = `Ты — София, рабочий диспетчер дизайн-агентства в TeamTracker.
Отвечай коротко, по-русски. Верни ТОЛЬКО JSON без markdown.

Формат ответа — один объект:
{
  "kind": "decision" | "bubble" | "clarify",
  "decision": "главное решение одной фразой (для decision)",
  "alternative": "запасной вариант (опционально)",
  "why": [{"text": "факт", "warn": true|false}],
  "planChanges": [{"label": "...", "value": "...", "accent": true|false}],
  "clientMessage": "готовый текст клиенту (если нужен)",
  "text": "для bubble/clarify",
  "chips": ["варианты ответа"]
}

Используй kind=decision для решений о проекте/цене/сроке.
Используй kind=clarify если не хватает часов или цены.
Используй kind=bubble для коротких ответов.

Контекст ${input.context.monthLabel} ${input.year}:
- работа до: ${input.context.workScheduledUntil ?? "не распределена"}
- окно: ${input.context.nextFreeWindow ?? "нет"}
- надёжная прибыль: ${formatRub(input.context.reliableProfitRub)}
- плановая: ${formatRub(input.context.plannedProfitRub)}
- порог ставки: ${formatRub(pricing.minEffectiveRateRub)}/ч
- сроки: ${input.context.deadlinesNote}
- активные проекты: ${input.dispatch.plan.activeProjects.map((p) => p.name).join(", ") || "нет"}`;

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
        "X-Title": "Team Tracker Sofia",
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: "json_object" },
        temperature: 0.4,
      }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as LlmPayload;
    const msg = normalizeLlmMessage(parsed);
    return msg ? [msg] : null;
  } catch {
    return null;
  }
}
