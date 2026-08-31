import {
  computeFinanceMonthSummary,
  listFinanceGeneralExpenses,
  listFinanceProjectsForMonth,
} from "@/lib/v2/finance/finance-repo";
import type { V2FinanceMonthSummary } from "@/lib/v2/finance/types";
import { sortFinanceCards } from "@/lib/v2/personal/finance-card-order";
import { ensureFinanceGoals } from "@/lib/v2/personal/personal-finance-repo";
import { listPersonalIncomeHistory } from "@/lib/v2/personal/income-history-repo";
import type {
  PersonalAccountRow,
  PersonalFinanceGoalRow,
  PersonalIncomeHistoryRow,
} from "@/lib/v2/personal/types";
import { getV2Supabase } from "@/lib/v2/db/client";
import type { V2SessionContext } from "@/lib/v2/types";

export type HomeFinanceStripPayload = {
  year: number;
  month: number;
  summary: V2FinanceMonthSummary;
};

/** Минимальный набор данных для главной — без налогов, бюджета, FX и снапшотов. */
export type HomePersonalFinancePayload = {
  year: number;
  month: number;
  incomeHistory: PersonalIncomeHistoryRow[];
  accounts: PersonalAccountRow[];
  goals: PersonalFinanceGoalRow[];
  summary: {
    netWorth: number;
    projectExpectedRevenue: number;
    projectActualRevenue: number;
    projectCount: number;
    monthProfit: number;
    agencyTotalExpenses: number;
    avgProfit6m: number;
  };
};

export async function loadHomeFinanceStrip(ctx: V2SessionContext): Promise<HomeFinanceStripPayload | null> {
  if (ctx.role !== "admin") return null;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [projects, generalExpenses] = await Promise.all([
    listFinanceProjectsForMonth(ctx, year, month),
    listFinanceGeneralExpenses(ctx, year, month),
  ]);

  return {
    year,
    month,
    summary: computeFinanceMonthSummary(projects, generalExpenses, year, month),
  };
}

function mapHomeAccount(r: Record<string, unknown>): PersonalAccountRow {
  const currency = String(r.currency_code ?? "RUB");
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    name: String(r.name),
    account_type: String(r.account_type) as PersonalAccountRow["account_type"],
    icon_key: String(r.icon_key),
    accent: String(r.accent),
    balance_rub: Number(r.balance_rub) || 0,
    balance_native:
      r.balance_native != null ? Number(r.balance_native) || 0 : Number(r.balance_rub) || 0,
    currency_code: currency as PersonalAccountRow["currency_code"],
    fx_rate: r.fx_rate == null ? null : Number(r.fx_rate),
    fx_as_of: r.fx_as_of ? String(r.fx_as_of) : null,
    note: r.note ? String(r.note) : null,
    disposable: Boolean(r.disposable),
    in_cushion: Boolean(r.in_cushion),
    goal_amount_rub: r.goal_amount_rub == null ? null : Number(r.goal_amount_rub),
    sort_order: Number(r.sort_order) || 0,
  };
}

function avgProfit6mFromHistory(
  incomeHistory: PersonalIncomeHistoryRow[],
  year: number,
  month: number
): number {
  const past: number[] = [];
  for (let i = 1; i <= 6; i++) {
    let m = month - i;
    let y = year;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    const row = incomeHistory.find((r) => r.year === y && r.month === m);
    if (row?.profit_rub != null) past.push(row.profit_rub);
  }
  if (!past.length) return 0;
  return Math.round(past.reduce((s, v) => s + v, 0) / past.length);
}

function mergeIncomeHistoryForHome(
  userId: string,
  year: number,
  month: number,
  incomeHistory: PersonalIncomeHistoryRow[],
  accountsTotal: number,
  projectExpectedRevenue: number,
  monthProfit: number
): PersonalIncomeHistoryRow[] {
  const stored = incomeHistory.find((r) => r.year === year && r.month === month);
  const rows = incomeHistory.filter((r) => !(r.year === year && r.month === month));
  rows.unshift({
    user_id: userId,
    year,
    month,
    accounts_total_rub: accountsTotal,
    earned_rub: projectExpectedRevenue || stored?.earned_rub || null,
    profit_rub: monthProfit || stored?.profit_rub || null,
    spent_rub: stored?.spent_rub ?? null,
  });
  rows.sort((a, b) => b.year - a.year || b.month - a.month);
  return rows;
}

/** Быстрая загрузка главной: параллельные запросы, без FX refresh и полного дашборда. */
export async function loadHomePersonalFinance(ctx: V2SessionContext): Promise<HomePersonalFinancePayload> {
  const sb = getV2Supabase();
  const userId = ctx.userId;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [accountsRes, capitalRes, goals, incomeHistoryRaw, agencyStrip] = await Promise.all([
    sb.from("v2_personal_accounts").select("*").eq("user_id", userId).order("sort_order", { ascending: true }).order("created_at", { ascending: true }).order("id", { ascending: true }),
    sb.from("v2_personal_capital_items").select("amount_rub").eq("user_id", userId),
    ensureFinanceGoals(userId).catch(() => [] as PersonalFinanceGoalRow[]),
    listPersonalIncomeHistory(ctx, { sync: false }),
    ctx.role === "admin" ? loadHomeFinanceStrip(ctx) : Promise.resolve(null),
  ]);

  if (accountsRes.error) throw accountsRes.error;
  if (capitalRes.error) throw capitalRes.error;

  const accounts = sortFinanceCards((accountsRes.data ?? []).map((r) => mapHomeAccount(r as Record<string, unknown>)));
  const accountsTotal = accounts.reduce((s, a) => s + a.balance_rub, 0);
  const capitalSum = (capitalRes.data ?? []).reduce((s, r) => s + (Number(r.amount_rub) || 0), 0);
  const netWorth = accountsTotal + capitalSum;

  let projectExpectedRevenue = 0;
  let projectActualRevenue = 0;
  let projectCount = 0;
  let monthProfit = 0;
  let agencyTotalExpenses = 0;

  if (agencyStrip) {
    projectExpectedRevenue = agencyStrip.summary.expectedRevenue;
    projectActualRevenue = agencyStrip.summary.actualRevenue;
    projectCount = agencyStrip.summary.projectCount;
    monthProfit = agencyStrip.summary.profit;
    agencyTotalExpenses = agencyStrip.summary.totalExpenses;
  }

  const historyProfit = incomeHistoryRaw.find((r) => r.year === year && r.month === month)?.profit_rub;
  if (
    projectCount === 0 &&
    projectExpectedRevenue === 0 &&
    projectActualRevenue === 0 &&
    historyProfit != null
  ) {
    monthProfit = historyProfit;
  }

  const incomeHistory = mergeIncomeHistoryForHome(
    userId,
    year,
    month,
    incomeHistoryRaw,
    accountsTotal,
    projectExpectedRevenue,
    monthProfit
  );

  return {
    year,
    month,
    incomeHistory,
    accounts,
    goals,
    summary: {
      netWorth,
      projectExpectedRevenue,
      projectActualRevenue,
      projectCount,
      monthProfit,
      agencyTotalExpenses,
      avgProfit6m: avgProfit6mFromHistory(incomeHistoryRaw, year, month),
    },
  };
}
