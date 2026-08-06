import { getAdminDashboard } from "@/lib/v2/admin/people-stats";
import {
  computeFinanceMonthSummary,
  listFinanceGeneralExpenses,
  listFinanceProjectsForMonth,
} from "@/lib/v2/finance/finance-repo";
import type { V2FinanceMonthSummary } from "@/lib/v2/finance/types";
import { loadPersonalFinanceDashboard } from "@/lib/v2/personal/personal-finance-repo";
import {
  loadPersonalTodoBootstrap,
  loadPersonalTodoList,
} from "@/lib/v2/personal/personal-todo-repo";
import type { PersonalTodoRow } from "@/lib/v2/personal/todo-types";
import { personalTodoTodayYmd } from "@/lib/v2/personal/todo-date";
import { loadWeekFocus, type WeekFocusPayload } from "@/lib/v2/personal/week-focus-repo";
import { strategyBoardSnapshot } from "@/lib/v2/strategy/current-month";
import type {
  StrategyMonthFocus,
  StrategyPrincipleCard,
  StrategyProjectCard,
} from "@/lib/v2/strategy/board-content";
import type { V2SessionContext } from "@/lib/v2/types";

export type V2DashboardPayload = {
  now: {
    year: number;
    month: number;
    monthLabel: string;
    dateYmd: string;
  };
  strategy: {
    currentFocus: StrategyMonthFocus | null;
    nextFocus: StrategyMonthFocus | null;
    bans: StrategyPrincipleCard[];
    principles: StrategyPrincipleCard[];
    nearProjects: StrategyProjectCard[];
  };
  personal: {
    finance: {
      disposable: number;
      netWorth: number;
      budgetLimit: number;
      budgetSpent: number;
      budgetLeft: number;
      monthProfit: number;
      incomeReceived: number;
      incomeExpected: number;
      forecastDelta: number;
    } | null;
    todos: { inbox: number; today: number; overdue: number };
    todayTodos: Pick<PersonalTodoRow, "id" | "title" | "due_date" | "priority">[];
    weekFocus: WeekFocusPayload | null;
  };
  agency: { summary: V2FinanceMonthSummary } | null;
  team: { activeProjects: number; openTasks: number; overdueTasks: number } | null;
};

export async function loadV2Dashboard(ctx: V2SessionContext): Promise<V2DashboardPayload> {
  const nowDate = new Date();
  const year = nowDate.getFullYear();
  const month = nowDate.getMonth() + 1;
  const dateYmd = personalTodoTodayYmd();
  const strategy = strategyBoardSnapshot(nowDate);
  const isAdmin = ctx.role === "admin";

  const [financeRes, todoBoot, todayList, weekFocus, agencyRes, teamRes] = await Promise.all([
    loadPersonalFinanceDashboard(ctx, year, month)
      .then((d) => d)
      .catch((e) => {
        console.error("dashboard finance:", e);
        return null;
      }),
    loadPersonalTodoBootstrap(ctx).catch((e) => {
      console.error("dashboard todos boot:", e);
      return {
        projects: [],
        inboxProjectId: "",
        counts: { inbox: 0, today: 0, overdue: 0 },
      };
    }),
    loadPersonalTodoList(ctx, "today").catch((e) => {
      console.error("dashboard todos today:", e);
      return { view: "today" as const, todos: [] as PersonalTodoRow[] };
    }),
    loadWeekFocus(ctx, dateYmd).catch((e) => {
      console.error("dashboard week focus:", e);
      return null;
    }),
    isAdmin
      ? Promise.all([
          listFinanceProjectsForMonth(ctx, year, month),
          listFinanceGeneralExpenses(ctx, year, month),
        ])
          .then(([projects, generalExpenses]) => ({
            summary: computeFinanceMonthSummary(projects, generalExpenses, year, month),
          }))
          .catch((e) => {
            console.error("dashboard agency:", e);
            return null;
          })
      : Promise.resolve(null),
    isAdmin
      ? getAdminDashboard(ctx).catch((e) => {
          console.error("dashboard team:", e);
          return null;
        })
      : Promise.resolve(null),
  ]);

  return {
    now: { year, month, monthLabel: strategy.monthLabel, dateYmd },
    strategy: {
      currentFocus: strategy.currentFocus,
      nextFocus: strategy.nextFocus,
      bans: strategy.bans,
      principles: strategy.principles,
      nearProjects: strategy.nearProjects,
    },
    personal: {
      finance: financeRes
        ? {
            disposable: financeRes.summary.disposable,
            netWorth: financeRes.summary.netWorth,
            budgetLimit: financeRes.budget.limit_rub,
            budgetSpent: financeRes.summary.budgetSpent,
            budgetLeft: financeRes.summary.budgetLeft,
            monthProfit: financeRes.summary.monthProfit,
            incomeReceived: financeRes.summary.incomeReceived,
            incomeExpected: financeRes.summary.incomeExpected,
            forecastDelta: financeRes.summary.forecastDelta,
          }
        : null,
      todos: todoBoot.counts,
      todayTodos: todayList.todos.slice(0, 6).map((t) => ({
        id: t.id,
        title: t.title,
        due_date: t.due_date,
        priority: t.priority,
      })),
      weekFocus,
    },
    agency: agencyRes,
    team: teamRes
      ? {
          activeProjects: teamRes.activeProjects ?? 0,
          openTasks: teamRes.openTasks ?? 0,
          overdueTasks: teamRes.overdueTasks ?? 0,
        }
      : null,
  };
}
