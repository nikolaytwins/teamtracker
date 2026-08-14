import { getAgencyRepoV2, isSupabaseAgencyConfigured } from "@/lib/agency-store";
import { getAdminDashboard } from "@/lib/v2/admin/people-stats";
import { listFinanceMonthSummaries } from "@/lib/v2/finance/finance-repo";
import type { V2FinanceMonthSummary } from "@/lib/v2/finance/types";
import { lastNMonthKeys } from "@/lib/v2/leads/lead-analytics";
import type { V2SessionContext } from "@/lib/v2/types";
import type { ProfiStatsShape } from "@/components/sales/profi-analytics-section";

export type AgencyOverviewMonthPoint = V2FinanceMonthSummary & {
  key: string;
  label: string;
};

export type AgencyOverviewBreakdownItem = {
  key: string;
  label: string;
  totalAmount: number;
  count: number;
  percent: number;
};

export type AgencyOverviewPayload = {
  months: AgencyOverviewMonthPoint[];
  current: AgencyOverviewMonthPoint | null;
  averages: {
    monthsWithRevenue: number;
    avgMonthlyRevenue: number;
    avgMonthlyProfit: number;
    totalRevenue12: number;
    totalProfit12: number;
  };
  byService: { items: AgencyOverviewBreakdownItem[]; total: number };
  byClient: { items: AgencyOverviewBreakdownItem[]; total: number };
  profi: ProfiStatsShape | null;
  ops: { activeProjects: number; openTasks: number; overdueTasks: number };
};

const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const SERVICE_LABELS: Record<string, string> = {
  site: "Сайт",
  presentation: "Презентация",
  small_task: "Мелкая задача",
  subscription: "Подписка",
  ai_development: "AI-разработка",
};

const CLIENT_LABELS: Record<string, string> = {
  "": "Не указан",
  permanent: "Постоянник",
  referral: "Рекомендация",
  profi_ru: "Профи.ру",
  networking: "Нетворкинг",
};

function emptySummary(year: number, month: number): V2FinanceMonthSummary {
  return {
    year,
    month,
    expectedRevenue: 0,
    actualRevenue: 0,
    projectExpenses: 0,
    manualGeneralExpenses: 0,
    taxAmount: 0,
    totalExpenses: 0,
    profit: 0,
    margin: 0,
    projectCount: 0,
  };
}

export async function loadAgencyOverview(ctx: V2SessionContext): Promise<AgencyOverviewPayload> {
  const monthKeys = lastNMonthKeys(12);
  const summaries = await listFinanceMonthSummaries(ctx, monthKeys);

  const monthsDesc: AgencyOverviewMonthPoint[] = monthKeys.map(({ year, month }) => {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const s = summaries.get(key) ?? emptySummary(year, month);
    return {
      ...s,
      key,
      label: `${MONTH_NAMES[month - 1] ?? month} ${year}`,
    };
  });

  const months = [...monthsDesc].reverse();

  const withRevenue = monthsDesc.filter((m) => m.expectedRevenue > 0 || m.actualRevenue > 0);
  const n = withRevenue.length || 1;
  const totalRevenue12 = withRevenue.reduce((s, m) => s + m.actualRevenue, 0);
  const totalProfit12 = withRevenue.reduce((s, m) => s + m.profit, 0);

  const now = new Date();
  const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const current = monthsDesc.find((m) => m.key === curKey) ?? monthsDesc[0] ?? null;

  let byService: AgencyOverviewPayload["byService"] = { items: [], total: 0 };
  let byClient: AgencyOverviewPayload["byClient"] = { items: [], total: 0 };
  let profi: ProfiStatsShape | null = null;

  if (isSupabaseAgencyConfigured()) {
    const repo = getAgencyRepoV2();
    const [svc, cli, outreach] = await Promise.all([
      repo.revenueByService(),
      repo.revenueByClient(),
      repo.outreachListJson("profi", true, { omitItems: true }),
    ]);

    const svcItems = (svc.items ?? []) as Array<{
      serviceType?: string;
      totalAmount: number;
      count: number;
      percent: number;
    }>;
    byService = {
      total: Number(svc.total) || 0,
      items: svcItems.map((it) => {
        const key = String(it.serviceType ?? "");
        return {
          key: key || "_",
          label: SERVICE_LABELS[key] ?? (key || "—"),
          totalAmount: Number(it.totalAmount) || 0,
          count: Number(it.count) || 0,
          percent: Number(it.percent) || 0,
        };
      }),
    };

    const cliItems = (cli.items ?? []) as Array<{
      clientType?: string | null;
      totalAmount: number;
      count: number;
      percent: number;
    }>;
    byClient = {
      total: Number(cli.total) || 0,
      items: cliItems.map((it) => {
        const key = String(it.clientType ?? "");
        return {
          key: key || "_",
          label: CLIENT_LABELS[key] ?? (key || "Не указан"),
          totalAmount: Number(it.totalAmount) || 0,
          count: Number(it.count) || 0,
          percent: Number(it.percent) || 0,
        };
      }),
    };

    const o = outreach as { stats?: ProfiStatsShape | null };
    profi = o.stats ?? null;
  }

  const ops = await getAdminDashboard(ctx).catch(() => ({
    activeProjects: 0,
    openTasks: 0,
    overdueTasks: 0,
  }));

  return {
    months,
    current,
    averages: {
      monthsWithRevenue: withRevenue.length,
      avgMonthlyRevenue: totalRevenue12 / n,
      avgMonthlyProfit: totalProfit12 / n,
      totalRevenue12,
      totalProfit12,
    },
    byService,
    byClient,
    profi,
    ops,
  };
}
