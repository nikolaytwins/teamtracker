import { ensureFinanceFunds, updatePersonalFinanceFund } from "@/lib/v2/personal/personal-finance-repo";
import type {
  FinanceAllocationPlan,
  FinanceAssistantApplyResult,
} from "@/lib/v2/personal/finance-assistant/types";
import type { V2SessionContext } from "@/lib/v2/types";

/** Ключи фондов, которые можно пополнять из плана ассистента. */
const APPLYABLE_KEYS = new Set(["clothing", "gifts", "lera", "cushion"]);

/**
 * По одобрению пользователя прибавляет суммы из плана к фондам.
 * Платежи и «свободные» не пишутся в фонды — только подсказка.
 */
export async function applyFinanceAllocation(
  ctx: V2SessionContext,
  plan: FinanceAllocationPlan
): Promise<FinanceAssistantApplyResult> {
  const funds = await ensureFinanceFunds(ctx.userId);
  const byKey = new Map(funds.filter((f) => f.fund_key).map((f) => [f.fund_key!, f]));

  const applied: FinanceAssistantApplyResult["applied"] = [];
  const skipped: string[] = [];

  for (const line of plan.lines) {
    if (!line.fund_key || !APPLYABLE_KEYS.has(line.fund_key)) {
      if (line.amount_rub > 0 && (line.key === "payments" || line.key === "free")) {
        skipped.push(`${line.label}: ${line.amount_rub} ₽ — держи вручную (не фонд)`);
      }
      continue;
    }
    if (line.amount_rub <= 0) continue;

    const fund = byKey.get(line.fund_key);
    if (!fund) {
      skipped.push(`${line.label}: фонд «${line.fund_key}» не найден`);
      continue;
    }

    const before = fund.amount_rub;
    const after = before + line.amount_rub;
    const updated = await updatePersonalFinanceFund(ctx, fund.id, { amount_rub: after });
    applied.push({
      fund_key: line.fund_key,
      name: updated?.name ?? fund.name,
      before,
      after: updated?.amount_rub ?? after,
      delta: line.amount_rub,
    });
  }

  return { ok: true, applied, skipped };
}
