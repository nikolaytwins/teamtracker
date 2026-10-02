import { ensureFinanceFunds, ensureCapitalItems } from "@/lib/v2/personal/personal-finance-repo";
import { FINANCE_RULES_TEXT } from "@/lib/v2/personal/finance-assistant/rules";
import type { FinanceAssistantContext } from "@/lib/v2/personal/finance-assistant/types";
import type { V2SessionContext } from "@/lib/v2/types";
import { getV2Supabase } from "@/lib/v2/db/client";

export async function loadFinanceAssistantContext(ctx: V2SessionContext): Promise<FinanceAssistantContext> {
  const userId = ctx.userId;
  const funds = await ensureFinanceFunds(userId);
  const capital = await ensureCapitalItems(userId);
  const cushion = funds.find((f) => f.fund_key === "cushion");
  const fundsSum = funds.reduce((s, f) => s + f.amount_rub, 0);
  const sb = getV2Supabase();
  const { data: accounts } = await sb
    .from("v2_personal_accounts")
    .select("name, balance_rub, disposable, currency_code")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  const freeAccount = (accounts ?? []).find((a) => a.disposable && a.currency_code === "RUB");

  return {
    funds: funds.map((f) => ({
      id: f.id,
      fund_key: f.fund_key,
      name: f.name,
      amount_rub: f.amount_rub,
    })),
    cushion_rub: cushion?.amount_rub ?? 0,
    capital_rub: capital.reduce((s, c) => s + c.amount_rub, 0),
    free_hint: freeAccount
      ? `Свободные деньги клади на счёт «${freeAccount.name}» (сейчас ${Math.round(Number(freeAccount.balance_rub) || 0).toLocaleString("ru-RU")} ₽).`
      : "Свободные деньги держи на расходной карте / рублёвом счёте в обороте.",
    rules_short: [...FINANCE_RULES_TEXT, `Сейчас в фондах: ${Math.round(fundsSum).toLocaleString("ru-RU")} ₽.`],
  };
}
