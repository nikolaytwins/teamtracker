import { listFinanceProjectsForMonth } from "@/lib/v2/finance/finance-repo";
import type { TimeDoc } from "@/lib/v2/personal/seeds/time-seed";
import {
  applyTimeFinanceSnapshot,
  computeTimeFinanceSnapshot,
  type TimeFinanceSnapshot,
} from "@/lib/v2/personal/time-finance";
import type { V2SessionContext } from "@/lib/v2/types";

export async function loadTimeFinanceSnapshot(
  ctx: V2SessionContext,
  year: number,
  month: number
): Promise<TimeFinanceSnapshot> {
  const projects = await listFinanceProjectsForMonth(ctx, year, month);
  return computeTimeFinanceSnapshot(projects);
}

export async function enrichTimeDocWithFinance(
  ctx: V2SessionContext,
  doc: TimeDoc,
  now = new Date()
): Promise<TimeDoc> {
  try {
    const snap = await loadTimeFinanceSnapshot(ctx, now.getFullYear(), now.getMonth() + 1);
    return applyTimeFinanceSnapshot(doc, snap);
  } catch (e) {
    console.warn("time finance enrich failed:", e);
    return doc;
  }
}
