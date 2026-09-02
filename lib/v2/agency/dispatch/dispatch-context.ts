import { buildDispatchFinanceSnapshot } from "@/lib/v2/agency/dispatch/dispatch-finance-summary";
import {
  getDispatchRules,
  listDispatchProjectsForContext,
  splitDispatchProjectsForPlan,
} from "@/lib/v2/agency/dispatch/dispatch-repo";
import type { DispatchContext, DispatchPlanSnapshot } from "@/lib/v2/agency/dispatch/dispatch-types";
import type { V2SessionContext } from "@/lib/v2/types";

function buildPlanSnapshot(
  year: number,
  month: number,
  projects: Awaited<ReturnType<typeof listDispatchProjectsForContext>>,
  rules: Awaited<ReturnType<typeof getDispatchRules>>
): DispatchPlanSnapshot {
  const { activeProjects, approvalRiskProjects, totalPlannedHoursRemaining } =
    splitDispatchProjectsForPlan(projects);

  return {
    year,
    month,
    plannedHoursPerDay: rules.rules.capacity.plannedHoursPerDay,
    reserveShare: rules.rules.capacity.reserveShare,
    activeProjects,
    approvalRiskProjects,
    totalPlannedHoursRemaining,
    protected: {
      strategyHoursPerWeek: rules.rules.protected.strategyHoursPerWeek,
      arkaliumDaysPerWeek: rules.rules.protected.arkaliumDaysPerWeek,
    },
  };
}

export async function buildDispatchContext(
  ctx: V2SessionContext,
  year: number,
  month: number
): Promise<DispatchContext> {
  const rules = await getDispatchRules();
  const projects = await listDispatchProjectsForContext(ctx, year, month);
  const finance = await buildDispatchFinanceSnapshot(ctx, year, month, rules.rules, projects);
  const plan = buildPlanSnapshot(year, month, projects, rules);

  return {
    generatedAt: new Date().toISOString(),
    rules,
    finance,
    plan,
  };
}

export function parseDispatchYearMonth(searchParams: URLSearchParams): {
  year: number;
  month: number;
} {
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");
  let year = yearParam ? Number(yearParam) : NaN;
  let month = monthParam ? Number(monthParam) : NaN;

  const valid = Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12;
  if (!valid) {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }
  return { year, month };
}
