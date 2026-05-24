import { DEFAULT_HOURLY_RATE } from "@/lib/v2/projects/portfolio-utils";

export function hourlyRateByUserId(users: Array<{ id: string; hourly_rate_rub: number | null }>): Map<string, number> {
  const map = new Map<string, number>();
  for (const u of users) {
    const rate = u.hourly_rate_rub;
    map.set(u.id, rate != null && rate > 0 ? rate : DEFAULT_HOURLY_RATE);
  }
  return map;
}

export function computeSpentRub(
  hoursByMember: Record<string, number>,
  rateByUser: Map<string, number>
): number {
  let spent = 0;
  for (const [userId, hours] of Object.entries(hoursByMember)) {
    if (hours <= 0) continue;
    const rate = rateByUser.get(userId) ?? DEFAULT_HOURLY_RATE;
    spent += hours * rate;
  }
  return Math.round(spent);
}

export function projectSumRub(budgetRub: number | null | undefined): number {
  return budgetRub != null && budgetRub > 0 ? Math.round(budgetRub) : 0;
}
