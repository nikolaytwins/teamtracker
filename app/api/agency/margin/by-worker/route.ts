import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";
import { getDb } from "@/lib/db";
import { parseISOWeekParam } from "@/lib/iso-week";
import { requireAgencyAccess } from "@/lib/require-role";
import { listUsersPublic } from "@/lib/tt-auth-db";

type TimeByUserProjectRow = { uid: string; projectId: string; s: number };
type TimeByProjectRow = { projectId: string; s: number };
function roundMoney(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

function normalizeName(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

export async function GET(request: NextRequest) {
  const access = await requireAgencyAccess();
  if (!access.ok) return access.response;

  try {
    const week = new URL(request.url).searchParams.get("week")?.trim();
    if (!week) {
      return NextResponse.json({ error: "week required (YYYY-Www)" }, { status: 400 });
    }
    const parsed = parseISOWeekParam(week);
    if (!parsed) {
      return NextResponse.json({ error: "week required (YYYY-Www)" }, { status: 400 });
    }

    const mondayIso = parsed.monday.toISOString();
    const nextMondayIso = parsed.nextMonday.toISOString();
    const pmDb = getDb();

    const users = listUsersPublic();
    const userById = new Map(users.map((u) => [u.id, u]));
    const userIdByName = new Map(users.map((u) => [normalizeName(u.display_name), u.id]));

    const timeByUserProject = pmDb
      .prepare(
        `SELECT e.worker_user_id as uid, c.source_project_id as projectId, SUM(e.duration_seconds) as s
         FROM pm_time_entries e
         JOIN pm_cards c ON c.id = e.card_id
         WHERE e.worker_user_id IS NOT NULL
           AND TRIM(e.worker_user_id) != ''
           AND e.ended_at IS NOT NULL
           AND e.duration_seconds IS NOT NULL
           AND c.source_project_id IS NOT NULL
           AND TRIM(c.source_project_id) != ''
           AND e.started_at >= ?
           AND e.started_at < ?
         GROUP BY e.worker_user_id, c.source_project_id`
      )
      .all(mondayIso, nextMondayIso) as TimeByUserProjectRow[];

    const timeByProject = pmDb
      .prepare(
        `SELECT c.source_project_id as projectId, SUM(e.duration_seconds) as s
         FROM pm_time_entries e
         JOIN pm_cards c ON c.id = e.card_id
         WHERE e.ended_at IS NOT NULL
           AND e.duration_seconds IS NOT NULL
           AND c.source_project_id IS NOT NULL
           AND TRIM(c.source_project_id) != ''
           AND e.started_at >= ?
           AND e.started_at < ?
         GROUP BY c.source_project_id`
      )
      .all(mondayIso, nextMondayIso) as TimeByProjectRow[];

    const projectIds = [...new Set(timeByProject.map((r) => r.projectId).filter(Boolean))];
    if (projectIds.length === 0) {
      return NextResponse.json({ week: parsed.week, byWorker: [], byProject: [] });
    }

    const repo = getAgencyRepo();
    const projects = await repo.getProjectsByIds(projectIds);
    const projectById = new Map(projects.map((p) => [p.id, p]));

    const expenses = await repo.sumDesignerExpensesByProjects(projectIds);

    const payoutByUserProject = new Map<string, number>();
    for (const e of expenses) {
      if (normalizeName(e.employeeRole) !== "designer") continue;
      const uid = userIdByName.get(normalizeName(e.employeeName));
      if (!uid) continue;
      const key = `${uid}::${e.projectId}`;
      payoutByUserProject.set(key, (payoutByUserProject.get(key) ?? 0) + (Number(e.s) || 0));
    }

    const secondsByProject = new Map<string, number>(timeByProject.map((r) => [r.projectId, Number(r.s) || 0]));

    const byProject = projectIds.map((projectId) => {
      const agencyProject = projectById.get(projectId);
      const totalSeconds = secondsByProject.get(projectId) ?? 0;
      const totalAmount = Number(agencyProject?.totalAmount) || 0;
      const rate = totalSeconds > 0 ? totalAmount / totalSeconds : null;
      return {
        projectId,
        projectName: agencyProject?.name ?? projectId,
        totalAmount: roundMoney(totalAmount),
        projectHours: Math.round((totalSeconds / 3600) * 10) / 10,
        ratePerHour: rate == null ? null : roundMoney(rate * 3600),
      };
    });

    const workerMap = new Map<
      string,
      {
        userId: string;
        name: string;
        role: string;
        hours: number;
        attributedRevenue: number;
        payouts: number;
        margin: number;
        projects: Array<{
          projectId: string;
          projectName: string;
          hours: number;
          attributedRevenue: number;
          payouts: number;
          margin: number;
        }>;
      }
    >();

    for (const row of timeByUserProject) {
      const user = userById.get(row.uid);
      if (!user) continue;
      const project = projectById.get(row.projectId);
      if (!project) continue;
      const projectSeconds = secondsByProject.get(row.projectId) ?? 0;
      const userSeconds = Number(row.s) || 0;
      const totalAmount = Number(project.totalAmount) || 0;
      const rate = projectSeconds > 0 ? totalAmount / projectSeconds : 0;
      const attributedRevenue = rate * userSeconds;
      const payout = payoutByUserProject.get(`${row.uid}::${row.projectId}`) ?? 0;
      const margin = attributedRevenue - payout;

      const current = workerMap.get(row.uid) ?? {
        userId: row.uid,
        name: user.display_name,
        role: user.role,
        hours: 0,
        attributedRevenue: 0,
        payouts: 0,
        margin: 0,
        projects: [],
      };
      current.hours += userSeconds / 3600;
      current.attributedRevenue += attributedRevenue;
      current.payouts += payout;
      current.margin += margin;
      current.projects.push({
        projectId: row.projectId,
        projectName: project.name,
        hours: Math.round((userSeconds / 3600) * 10) / 10,
        attributedRevenue: roundMoney(attributedRevenue),
        payouts: roundMoney(payout),
        margin: roundMoney(margin),
      });
      workerMap.set(row.uid, current);
    }

    const byWorker = [...workerMap.values()]
      .map((w) => ({
        ...w,
        hours: Math.round(w.hours * 10) / 10,
        attributedRevenue: roundMoney(w.attributedRevenue),
        payouts: roundMoney(w.payouts),
        margin: roundMoney(w.margin),
        projects: w.projects.sort((a, b) => b.hours - a.hours),
      }))
      .sort((a, b) => b.margin - a.margin || b.hours - a.hours);

    return NextResponse.json({ week: parsed.week, byWorker, byProject });
  } catch (error) {
    console.error("agency/margin/by-worker", error);
    return NextResponse.json({ error: "Failed to calculate margin" }, { status: 500 });
  }
}
