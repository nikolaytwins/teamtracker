import type { DayWeekPlan } from "@/lib/v2/personal/finance-assistant/day-plan-types";
import type { FinanceAssistantMessage } from "@/lib/v2/personal/finance-assistant/types";

function id() {
  return `dp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function decisionFromDayPlan(plan: DayWeekPlan): FinanceAssistantMessage {
  const why = plan.checklist.map((c) => ({
    text: `**${c.label}** — ${c.ok ? (c.plan_date ?? "ок") : "ещё не закрыто"}${c.note ? ` (${c.note})` : ""}`,
    warn: !c.ok,
  }));
  for (const n of plan.notes ?? []) why.push({ text: n, warn: true });

  const dayLines = plan.entries.map((e) => {
    if (e.type === "mode") {
      const m =
        e.mode === "strategy" ? "стратегия" : e.mode === "creative" ? "творчество" : "выходной";
      return `**${e.plan_date}** — режим «${m}»${e.block_title ? `, блок «${e.block_title}»` : ""}`;
    }
    if (e.type === "event") {
      return `**${e.plan_date}** — ${e.title}${e.event_time ? ` · ${e.event_time}` : ""}`;
    }
    return `**${e.plan_date}** — работа: ${e.title} (${Math.round(e.planned_minutes / 60)} ч)`;
  });

  return {
    id: id(),
    role: "assistant",
    kind: "decision",
    headline: `Неделя ${plan.week_start} — ${plan.week_end}`,
    decision: plan.summary,
    alternative:
      "Можно подвинуть любой день: напиши «стратегию на вторник» или «свидание в пятницу».",
    why: [...dayLines.map((t) => ({ text: t, warn: false })), ...why],
    day_plan: plan,
    actions: [
      { type: "apply_day_plan", plan, label: "Записать в план" },
      { type: "link", href: "/v2/agency/plan", label: "Открыть календарь" },
    ],
  };
}
