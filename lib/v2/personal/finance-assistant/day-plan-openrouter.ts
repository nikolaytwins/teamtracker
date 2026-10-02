import { dayModeMap } from "@/lib/v2/agency/plan/plan-calendar-logic";
import type { PlanDayMode, PlanItemRow } from "@/lib/v2/agency/plan/plan-types";
import { decisionFromDayPlan } from "@/lib/v2/personal/finance-assistant/day-plan-decision";
import {
  DAY_PLAN_BLOCK_MINUTES,
  DAY_PLAN_RULES_TEXT,
  DAY_PLAN_WORK_HOURS,
  formatPlanForPrompt,
  proposeDayWeekPlan,
} from "@/lib/v2/personal/finance-assistant/day-plan-rules";
import type {
  DayPlanContext,
  DayPlanEntry,
  DayWeekPlan,
} from "@/lib/v2/personal/finance-assistant/day-plan-types";
import type { FinanceAssistantMessage } from "@/lib/v2/personal/finance-assistant/types";

function id() {
  return `dp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type LlmPayload = {
  kind: "decision" | "bubble" | "clarify";
  text?: string;
  decision?: string;
  alternative?: string;
  chips?: string[];
  week_start?: string;
  placements?: Array<{
    role: "strategy" | "creative" | "rest" | "social" | "lera" | "work";
    date: string;
    title?: string;
    time?: string;
    minutes?: number;
  }>;
};

function placementsToEntries(
  placements: NonNullable<LlmPayload["placements"]>
): DayPlanEntry[] {
  const entries: DayPlanEntry[] = [];
  for (const p of placements) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) continue;
    if (p.role === "strategy" || p.role === "creative" || p.role === "rest") {
      entries.push({
        type: "mode",
        plan_date: p.date,
        mode: p.role as PlanDayMode,
        block_title:
          p.role === "rest"
            ? undefined
            : p.title || (p.role === "strategy" ? "Стратегический блок" : "Творческий блок"),
        planned_minutes: p.role === "rest" ? undefined : p.minutes ?? DAY_PLAN_BLOCK_MINUTES,
      });
      continue;
    }
    if (p.role === "social" || p.role === "lera") {
      entries.push({
        type: "event",
        plan_date: p.date,
        kind: "personal",
        title: p.title || (p.role === "lera" ? "Свидание с Лерой" : "Социальное событие"),
        event_time: p.time ?? "19:00",
        duration_label: p.role === "lera" ? "3 ч" : "2 ч",
        planned_minutes: p.minutes ?? (p.role === "lera" ? 180 : 120),
      });
      continue;
    }
    if (p.role === "work") {
      entries.push({
        type: "work",
        plan_date: p.date,
        title: p.title || "Рабочий день",
        planned_minutes: p.minutes ?? DAY_PLAN_WORK_HOURS * 60,
        priority: 3,
      });
    }
  }
  return entries;
}

function mergeWithRules(
  context: DayPlanContext,
  raw: LlmPayload,
  fallback: DayWeekPlan
): DayWeekPlan {
  if (!raw.placements?.length) return fallback;
  const entries = placementsToEntries(raw.placements);
  if (!entries.length) return fallback;

  // Rebuild checklist via propose on empty + override entries carefully:
  // Use fallback checklist recompute by stuffing synthetic items
  const modes = dayModeMap(
    context.days
      .filter((d) => d.mode)
      .map((d) => ({ plan_date: d.date, mode: d.mode! }))
  );
  const items: PlanItemRow[] = context.days.flatMap((d) =>
    d.items.map((it) => ({
      id: it.id,
      kind: it.kind as PlanItemRow["kind"],
      project_id: null,
      title: it.title,
      plan_date: it.plan_date,
      planned_minutes: it.planned_minutes,
      event_time: it.event_time,
      duration_label: null,
      sort_order: 0,
      priority: (it.priority as PlanItemRow["priority"]) || 3,
      completed_at: null,
    }))
  );

  const rebuilt = proposeDayWeekPlan({
    weekStart: raw.week_start && /^\d{4}-\d{2}-\d{2}$/.test(raw.week_start)
      ? raw.week_start
      : context.week_start,
    items,
    dayModes: [...modes.entries()].map(([plan_date, mode]) => ({ plan_date, mode })),
    message: "llm-merge",
  });

  // Prefer LLM entries if they cover the week reasonably
  return {
    ...rebuilt,
    week_start: raw.week_start ?? rebuilt.week_start,
    week_end: rebuilt.week_end,
    summary: raw.decision ?? rebuilt.summary,
    entries: entries.length >= 4 ? entries : rebuilt.entries,
  };
}

export async function respondDayPlanViaOpenRouter(input: {
  message: string;
  history: { role: "user" | "assistant"; text: string }[];
  context: DayPlanContext;
}): Promise<FinanceAssistantMessage[] | null> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) return null;

  const model = process.env.OPENROUTER_CHAT_MODEL?.trim() || "google/gemini-2.5-flash";

  const daysBlob = input.context.days
    .map((d) => {
      const its = d.items.map((i) => `${i.kind}:${i.title}`).join("; ") || "пусто";
      return `${d.date} (${d.weekday}) mode=${d.mode ?? "normal"} ${d.hours}ч | ${its}`;
    })
    .join("\n");

  const fallback = proposeDayWeekPlan({
    weekStart: input.context.week_start,
    items: input.context.days.flatMap((d) =>
      d.items.map(
        (it) =>
          ({
            id: it.id,
            kind: it.kind,
            project_id: null,
            title: it.title,
            plan_date: it.plan_date,
            planned_minutes: it.planned_minutes,
            event_time: it.event_time,
            duration_label: null,
            sort_order: 0,
            priority: it.priority,
            completed_at: null,
          }) as PlanItemRow
      )
    ),
    dayModes: input.context.days
      .filter((d) => d.mode)
      .map((d) => ({ plan_date: d.date, mode: d.mode! })),
    message: input.message,
  });

  const system = `Ты — София, помощник планирования недели в Team Tracker.
Отвечай коротко по-русски. Верни ТОЛЬКО JSON без markdown.

Правила недели:
${DAY_PLAN_RULES_TEXT.map((r) => `- ${r}`).join("\n")}

Рабочий день = ${DAY_PLAN_WORK_HOURS} часа. Стратегия/творчество = блок ~${DAY_PLAN_BLOCK_MINUTES / 60} ч, можно совмещать с мероприятиями. Выходной — без работы.

Текущая неделя ${input.context.week_start}…${input.context.week_end}:
${daysBlob}

${input.context.free_hint}

Черновик по правилам:
${formatPlanForPrompt(fallback)}

Формат:
{
  "kind": "decision" | "bubble" | "clarify",
  "decision": "краткое резюме недели",
  "alternative": "что можно сдвинуть",
  "text": "для bubble/clarify",
  "chips": ["…"],
  "week_start": "YYYY-MM-DD",
  "placements": [
    {"role":"strategy"|"creative"|"rest"|"social"|"lera"|"work","date":"YYYY-MM-DD","title":"…","time":"19:00","minutes":240}
  ]
}

Если пользователь просит распланировать неделю — kind=decision и placements (закрыть все роли).
Учитывай уже занятые дни и явные пожелания («свидание в субботу»).
Не ставь работу на rest. Нужно ≥3 work placements.`;

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
        "X-Title": "Team Tracker Day Plan Sofia",
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: "json_object" },
        temperature: 0.35,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as LlmPayload;

    if (parsed.kind === "clarify" && parsed.text) {
      return [
        {
          id: id(),
          role: "assistant",
          kind: "clarify",
          text: parsed.text,
          chips: parsed.chips?.length
            ? parsed.chips
            : ["Распланируй эту неделю", "Следующая неделя"],
        },
      ];
    }

    if (parsed.kind === "bubble" && parsed.text) {
      return [
        {
          id: id(),
          role: "assistant",
          kind: "bubble",
          text: parsed.text,
          chips: parsed.chips,
        },
      ];
    }

    if (parsed.kind === "decision") {
      const plan = mergeWithRules(input.context, parsed, fallback);
      const msg = decisionFromDayPlan(plan) as Extract<FinanceAssistantMessage, { kind: "decision" }>;
      return [
        {
          ...msg,
          decision: parsed.decision ?? msg.decision,
          alternative: parsed.alternative ?? msg.alternative,
        },
      ];
    }

    return null;
  } catch {
    return null;
  }
}
