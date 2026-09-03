import { buildDispatchContext } from "@/lib/v2/agency/dispatch/dispatch-context";
import { dayModeMap } from "@/lib/v2/agency/plan/plan-calendar-logic";
import { listPlanDayModes, listPlanItems } from "@/lib/v2/agency/plan/plan-repo";
import { addDays, fmtLong, fmtWeekday, mondayOf, toYmd } from "@/lib/v2/agency/plan/plan-utils";
import { buildSofiaContextPanel, estimateFreeHoursBefore } from "@/lib/v2/agency/sofia/sofia-context";
import { parseProjectQuery } from "@/lib/v2/agency/sofia/sofia-parse-input";
import type {
  SofiaChatTurn,
  SofiaContextPanel,
  SofiaMessage,
} from "@/lib/v2/agency/sofia/sofia-types";
import { respondSofiaViaOpenRouter } from "@/lib/v2/agency/sofia/sofia-openrouter";
import { buildReplanPreview } from "@/lib/v2/agency/plan/plan-replan";
import type { ReplanPreviewPayload } from "@/lib/v2/agency/plan/plan-replan-types";
import { formatRub } from "@/lib/v2/finance/meta";
import type { V2SessionContext } from "@/lib/v2/types";

function id() {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function fmtRate(n: number): string {
  return `${Math.round(n).toLocaleString("ru-RU")} ₽/ч`;
}

export type SofiaRespondResult = {
  messages: SofiaMessage[];
  replanPreview?: ReplanPreviewPayload;
};

export async function respondSofia(
  ctx: V2SessionContext,
  input: { message: string; history?: SofiaChatTurn[]; year: number; month: number }
): Promise<SofiaRespondResult> {
  const llm = await respondSofiaViaOpenRouter({
    message: input.message,
    history: input.history ?? [],
    year: input.year,
    month: input.month,
    context: await buildSofiaContextPanel(ctx, input.year, input.month),
    dispatch: await buildDispatchContext(ctx, input.year, input.month),
  });
  if (llm?.length) return { messages: llm };

  return respondSofiaRules(ctx, input.message, input.year, input.month);
}

async function respondSofiaRules(
  ctx: V2SessionContext,
  message: string,
  year: number,
  month: number
): Promise<SofiaRespondResult> {
  const parsed = parseProjectQuery(message);
  const panel = await buildSofiaContextPanel(ctx, year, month);
  const dispatch = await buildDispatchContext(ctx, year, month);
  const pricing = dispatch.rules.rules.pricing;

  if (parsed.isReplan || message === "Перестроить план") {
    const preview = await buildReplanPreview(ctx, year, month);
    if (preview.balanced) {
      return {
        messages: [
          {
            id: id(),
            role: "sofia",
            kind: "bubble",
            text: "План уже сбалансирован: перегрузов нет, бэклог пуст или всё размещено. Можно продолжать работу.",
          },
        ],
      };
    }
    return {
      replanPreview: preview,
      messages: [
        {
          id: id(),
          role: "sofia",
          kind: "bubble",
          text: `Собрала перестройку: ${preview.changes.length} ${preview.changes.length === 1 ? "изменение" : preview.changes.length < 5 ? "изменения" : "изменений"}. Клиентские дедлайны не двигаются, защищённые дни остаются.`,
          actions: [
            { type: "confirm_plan", previewId: preview.previewId, label: "Показать изменения" },
          ],
        },
      ],
    };
  }

  if (parsed.isNowQuestion || message === "Что делать сейчас?") {
    const active = dispatch.plan.activeProjects.filter((p) => p.dispatchWorkStatus === "in_progress");
    const next = active[0] ?? dispatch.plan.activeProjects[0];
    if (!next) {
      return {
        messages: [
          {
            id: id(),
            role: "sofia",
            kind: "bubble",
            text: "Активных проектов нет — хороший момент для стратегии или входящих. Если есть новый запрос, опишите цену, срок и часы.",
          },
        ],
      };
    }
    const hours = next.plannedHoursRemaining ?? "?";
    return {
      messages: [
        {
          id: id(),
          role: "sofia",
          kind: "bubble",
          text: `Сейчас логичнее продолжить «${next.name}» — ${hours} ч до дедлайна${next.workDeadline ? ` (${fmtLong(new Date(`${next.workDeadline}T12:00:00`))})` : ""}. Не переключайтесь, пока не закроете осмысленный блок.`,
        },
      ],
    };
  }

  if (parsed.isUrgent || message === "Прилетела срочная задача") {
    return {
      messages: [
        {
          id: id(),
          role: "sofia",
          kind: "decision",
          headline: "Главное решение",
          decision: "Сначала уточните, есть ли реальное последствие сегодня — команда стоит или срывается обещанный срок.",
          alternative: "Если последствия нет — ответьте клиенту в резервном окне, не прерывая текущий блок.",
          why: [
            { text: "Слово «срочно» само по себе не меняет приоритет." },
          { text: `Резерв — около ${Math.round(dispatch.plan.plannedHoursPerDay * dispatch.plan.reserveShare * 5)} ч в неделю, не для обычных проектов.` },
          { text: panel.nextFreeWindow ? `Ближайшее свободное окно — ${panel.nextFreeWindow}.` : "Свободных окон в ближайшие недели мало." },
        ],
        clientMessage:
          "Вижу запрос. Смогу вернуться с результатом [время]. Если нужно быстрее — давайте согласуем объём или отдельную оплату срочности.",
        actions: [{ type: "copy_client", text: "Вижу запрос. Смогу вернуться с результатом сегодня вечером. Если нужно быстрее — давайте согласуем объём или отдельную оплату срочности." }],
        },
      ],
    };
  }

  const looksLikeProject =
    parsed.isTakeQuestion ||
    parsed.priceRub != null ||
    parsed.hours != null ||
    parsed.deadline != null ||
    /проект|лендинг|сайт|презентац|обложк|дедлайн|срок/i.test(message);

  if (looksLikeProject) {
    if (!parsed.hours) {
      return {
        messages: [
          {
            id: id(),
            role: "sofia",
            kind: "clarify",
            text: "Чтобы проверить загрузку, мне нужна только примерная оценка: сколько часов может занять проект?",
            chips: ["4 часа", "8 часов", "10 часов", "Больше 16"],
          },
        ],
      };
    }

    const price = parsed.priceRub ?? 0;
    const rate = price > 0 ? price / parsed.hours : null;
    const minRate = pricing.minEffectiveRateRub;

    const today = new Date();
    const todayKey = toYmd(today);
    const from = todayKey;
    const toKey = parsed.deadline ? toYmd(parsed.deadline) : toYmd(addDays(today, 14));
    const [items, dayModes] = await Promise.all([
      listPlanItems(ctx, toYmd(mondayOf(today)), toYmd(addDays(mondayOf(today), 41))),
      listPlanDayModes(ctx, toYmd(mondayOf(today)), toYmd(addDays(mondayOf(today), 41))),
    ]);
    const modes = dayModeMap(dayModes);
    const freeH = estimateFreeHoursBefore(items, modes, from, toKey, dispatch.plan.plannedHoursPerDay);
    const fits = freeH >= parsed.hours;

    const safePrice = Math.ceil(minRate * parsed.hours / 1000) * 1000;
    const lowRate = rate != null && rate < minRate;

    let decision: string;
    let alternative: string | undefined;
    if (lowRate && !fits) {
      decision = `Не брать в текущих условиях — ставка ниже порога и ${parsed.hours} ч не помещаются до дедлайна.`;
      alternative = `Поднять цену до ${formatRub(safePrice)} или сдвинуть срок после ${panel.nextFreeWindow ?? "ближайшего окна"}.`;
    } else if (lowRate) {
      decision = `Брать только при цене от ${formatRub(safePrice)} или более позднем дедлайне.`;
      alternative = "Сократить объём первого этапа и сдать только ключевые экраны.";
    } else if (!fits) {
      decision = "Брать только если клиент согласен на более поздний срок или меньший объём.";
      alternative = panel.nextFreeWindow
        ? `Предложить старт ${panel.nextFreeWindow.toLowerCase()}.`
        : undefined;
    } else {
      decision = "Можно брать — ставка и загрузка выглядят безопасно.";
      alternative = panel.reliableProfitRub < dispatch.finance.reliableProfitMinRub
        ? "Учтите: надёжная прибыль месяца ещё ниже целевого порога."
        : undefined;
    }

    const why: { text: string; warn?: boolean }[] = [];
    if (rate != null) {
      why.push({
        text: `Ставка сейчас около ${fmtRate(rate)}${lowRate ? " — ниже нижнего порога." : "."}`,
        warn: lowRate,
      });
    }
    if (panel.workScheduledUntil) {
      why.push({ text: `Текущая работа распределена до ${panel.workScheduledUntil.split(", ").slice(1).join(", ") || panel.workScheduledUntil}.` });
    }
    why.push({
      text: fits
        ? `До дедлайна хватает примерно ${freeH} свободных проектных часов.`
        : `До дедлайна только ~${freeH} ч — нужно ${parsed.hours} ч.`,
      warn: !fits,
    });
    why.push({ text: "Стратегический день и творческий день сохраняются." });

    const deadlineLabel = parsed.deadline ? fmtLong(parsed.deadline) : "ближайшие дни";
    const clientMessage =
      price > 0 && lowRate
        ? `Смогу взять проект со сдачей ${deadlineLabel} при бюджете ${formatRub(safePrice)}. Если важно сохранить бюджет ${formatRub(price)}, предлагаю сократить первый этап до ключевых экранов.`
        : price > 0
          ? `Смогу взять проект со сдачей ${deadlineLabel} в бюджете ${formatRub(price)}.`
          : undefined;

    return {
      messages: [
        {
          id: id(),
          role: "sofia",
          kind: "decision",
          headline: "Главное решение",
          decision,
          alternative,
          why,
          planChanges: [
            {
              label: "Новый проект",
              value: parsed.deadline ? fmtWeekday(parsed.deadline) : "после текущей загрузки",
              accent: true,
            },
            {
              label: "Ближайшее окно после",
              value: panel.nextFreeWindow?.split(", ").slice(1).join(", ") ?? panel.nextFreeWindow ?? "—",
            },
          ],
          clientMessage,
          actions: clientMessage
            ? [
                { type: "copy_client", text: clientMessage },
                {
                  type: "prefill",
                  label: "Изменить условия",
                  text: `Клиент готов на ${formatRub(safePrice)}, но сдать нужно ${deadlineLabel}.`,
                },
                { type: "link", href: "/v2/agency", label: "Добавить проект" },
              ]
            : undefined,
        },
      ],
    };
  }

  if (parsed.isCapacityQuestion || message === "Можно брать новый проект?") {
    const ok =
      panel.deadlinesOk &&
      panel.reliableProfitRub >= dispatch.finance.reliableProfitMinRub * 0.85;
    return {
      messages: [
        {
          id: id(),
          role: "sofia",
          kind: "bubble",
          text: ok
            ? `По загрузке — да, если ставка не ниже ${formatRub(pricing.minEffectiveRateRub)}/ч. ${panel.nextFreeWindow ? `Ближайшее окно: ${panel.nextFreeWindow}.` : ""}`
            : `Сейчас лучше не добавлять без жёсткой проверки: ${panel.deadlinesNote.toLowerCase()}. Надёжная прибыль — ${formatRub(panel.reliableProfitRub)}.`,
          chips: ["Проверить цену и срок"],
        },
      ],
    };
  }

  if (message === "Проверить цену и срок" || parsed.isTakeQuestion) {
    return {
      messages: [
        {
          id: id(),
          role: "sofia",
          kind: "clarify",
          text: "Опишите цену, дедлайн и примерные часы — проверю ставку и место в плане.",
          chips: [],
        },
      ],
    };
  }

  return {
    messages: [
      {
        id: id(),
        role: "sofia",
        kind: "bubble",
        text: "Приняла. Если это про новый проект — напишите цену, дедлайн и часы. Если нужно перестроить план или выбрать следующий блок — скажите прямо.",
        chips: ["Можно брать новый проект?", "Что делать сейчас?", "Перестроить план"],
      },
    ],
  };
}

export function buildStaleChecks(
  projects: { id: string; name: string; plannedHoursRemaining: number | null }[]
): SofiaMessage[] {
  return projects
    .filter((p) => p.plannedHoursRemaining != null && p.plannedHoursRemaining > 0)
    .slice(0, 2)
    .map((p) => ({
      id: id(),
      role: "sofia" as const,
      kind: "stale_check" as const,
      projectId: p.id,
      text: `Сейчас считаю, что по «${p.name}» осталось около ${p.plannedHoursRemaining} часов. Это ещё актуально?`,
      chips: ["Да", "Осталось меньше", "Осталось больше"],
    }));
}

export type { SofiaContextPanel };
