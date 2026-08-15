import type { V2FinanceBusinessLine, V2FinanceProjectView } from "@/lib/v2/finance/types";
import type { TimeDoc, TimeProject } from "@/lib/v2/personal/seeds/time-seed";

/** time project id → finance business_line */
export const TIME_PROJECT_FINANCE_LINE: Partial<Record<string, V2FinanceBusinessLine>> = {
  agency: "agency",
  course: "impulse",
  saas: "qmagic",
};

export type TimeFinanceLineMetrics = {
  revenue: number;
  actualRevenue: number;
  profit: number;
  projectExpenses: number;
  projectCount: number;
};

export type TimeFinanceSnapshot = Record<V2FinanceBusinessLine, TimeFinanceLineMetrics>;

function emptyLine(): TimeFinanceLineMetrics {
  return { revenue: 0, actualRevenue: 0, profit: 0, projectExpenses: 0, projectCount: 0 };
}

export function computeTimeFinanceSnapshot(projects: V2FinanceProjectView[]): TimeFinanceSnapshot {
  const lines: V2FinanceBusinessLine[] = ["agency", "impulse", "qmagic"];
  const out = {
    agency: emptyLine(),
    impulse: emptyLine(),
    qmagic: emptyLine(),
  } satisfies TimeFinanceSnapshot;

  for (const line of lines) {
    const rows = projects.filter((p) => p.business_line === line);
    const revenue = Math.round(rows.reduce((s, p) => s + p.effective_total_amount, 0));
    const actualRevenue = Math.round(rows.reduce((s, p) => s + p.paid_amount, 0));
    const projectExpenses = Math.round(rows.reduce((s, p) => s + p.total_expenses, 0));
    out[line] = {
      revenue,
      actualRevenue,
      profit: revenue - projectExpenses,
      projectExpenses,
      projectCount: rows.length,
    };
  }
  return out;
}

/** Overlay live finance ₽ onto mapped time projects (does not mutate other fields). */
export function applyTimeFinanceSnapshot(doc: TimeDoc, snap: TimeFinanceSnapshot): TimeDoc {
  return {
    ...doc,
    projects: doc.projects.map((p) => applyFinanceToProject(p, snap)),
  };
}

function applyFinanceToProject(p: TimeProject, snap: TimeFinanceSnapshot): TimeProject {
  const line = TIME_PROJECT_FINANCE_LINE[p.id];
  if (!line) return p;
  const m = snap[line];
  return {
    ...p,
    money: true,
    revenue: m.revenue,
    profit: m.profit,
    name: p.id === "saas" ? "Qmagic" : p.name,
    role: p.id === "saas" ? (p.role || "Асимметрия") : p.role,
  };
}

export function isFinanceLinkedTimeProject(projectId: string): boolean {
  return Boolean(TIME_PROJECT_FINANCE_LINE[projectId]);
}
