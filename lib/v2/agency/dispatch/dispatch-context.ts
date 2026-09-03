import { buildDispatchFinanceSnapshotFromLoaded } from "@/lib/v2/agency/dispatch/dispatch-finance-summary";
import {
  getDispatchRules,
  loadEffectiveTotals,
  mapRawAgencyProjects,
  selectDispatchProjectsForContext,
  splitDispatchProjectsForPlan,
} from "@/lib/v2/agency/dispatch/dispatch-repo";
import type { DispatchContext, DispatchPlanSnapshot } from "@/lib/v2/agency/dispatch/dispatch-types";
import { listFinanceGeneralExpenses } from "@/lib/v2/finance/finance-repo";
import { getAgencyRepoV2 } from "@/lib/agency-store";
import type { V2SessionContext } from "@/lib/v2/types";

function buildPlanSnapshot(
  year: number,
  month: number,
  projects: Awaited<ReturnType<typeof selectDispatchProjectsForContext>>,
  rules: Awaited<ReturnType<typeof getDispatchRules>>
): DispatchPlanSnapshot {
  const { activeProjects, approvalRiskProjects, totalPlannedHoursRemaining } =
    splitDispatchProjectsForPlan(projects, year, month);

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
  month: number,
  options?: { loadProjectDetails?: boolean }
): Promise<DispatchContext> {
  const loadDetails = options?.loadProjectDetails ?? false;

  const [rules, rawProjects, generalExpenses] = await Promise.all([
    getDispatchRules(),
    getAgencyRepoV2().listProjectsWithTotalExpenses(),
    listFinanceGeneralExpenses(ctx, year, month),
  ]);

  const effectiveTotals = loadDetails
    ? await loadEffectiveTotals(rawProjects)
    : new Map<string, number>();
  const allAgency = mapRawAgencyProjects(rawProjects, effectiveTotals);
  const projects = selectDispatchProjectsForContext(allAgency, year, month);
  const finance = buildDispatchFinanceSnapshotFromLoaded(
    ctx.workspaceId,
    year,
    month,
    rules.rules,
    projects,
    allAgency,
    generalExpenses
  );
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
