import { SP_GOAL, type SportWeek, type SportWeekAvg } from "@/lib/v2/personal/seeds/sport-seed";

export const SP_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

export function n1(v: number | null | undefined): string {
  return v == null || Number.isNaN(v) ? "—" : (Math.round(v * 10) / 10).toFixed(1);
}

export function n2(v: number | null | undefined): string {
  return v == null || Number.isNaN(v) ? "—" : (Math.round(v * 100) / 100).toFixed(2);
}

export function sgn(v: number | null | undefined, d = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  const abs = Math.abs(v).toFixed(d);
  if (v > 0) return `+${abs}`;
  if (v < 0) return `−${abs}`;
  return "0";
}

export function num(v: unknown): number | null {
  if (v === "" || v == null) return null;
  const x = parseFloat(String(v).replace(",", "."));
  return Number.isNaN(x) ? null : x;
}

export function fatPct(a: SportWeekAvg | null | undefined): number | null {
  return a && a.w && a.f != null ? (a.f / a.w) * 100 : null;
}

export function spAvg(wk: SportWeek): SportWeekAvg | null | undefined {
  const ds = (wk.days || [])
    .map((d) => ({ w: num(d?.w), f: num(d?.f) }))
    .filter((d) => d.w != null);
  if (!ds.length) return wk.avg;
  const w = ds.reduce((s, d) => s + (d.w ?? 0), 0) / ds.length;
  const fs = ds.filter((d) => d.f != null);
  const f = fs.length ? fs.reduce((s, d) => s + (d.f ?? 0), 0) / fs.length : (wk.avg?.f ?? null);
  return { w, f, l: f != null ? w - f : null, n: ds.length };
}

export type SportVerdict = { head: string; sub: string };

export function spVerdict(rows: Array<{ a?: SportWeekAvg | null; kcal?: number | null }>): SportVerdict {
  const A = rows.filter((r) => r.a && r.a.w != null);
  if (A.length < 2) return { head: "", sub: "" };
  const first = A[0]!.a!;
  const last = A[A.length - 1]!.a!;
  const dl = last.l != null && first.l != null ? last.l - first.l : null;
  const df = last.f != null && first.f != null ? last.f - first.f : null;
  const gL = last.l != null ? SP_GOAL.lTarget - last.l : null;
  const gF = last.f != null ? SP_GOAL.fTarget - last.f : null;
  const kcal = [...rows].reverse().find((r) => r.kcal)?.kcal;
  let v = "Изменений почти нет — данных на вывод пока мало.";
  if (dl != null && df != null) {
    if (dl > 0.3 && df <= 0.2) v = "Набор идёт чисто: безжировая растёт, жир стоит на месте.";
    else if (dl > 0.3) v = "Набор идёт, но не чисто — жир прибавляется вместе с массой.";
    else if (df > 0.2) v = "Безжировая стоит, жир растёт. Смотри калории и белок.";
    else if (dl < -0.3) v = "Безжировая уходит. Это уже потеря, а не сушка.";
  }
  return {
    head: `До цели ${gL != null ? sgn(gL, 1) : "—"} кг мышц и ${gF != null ? sgn(gF, 1) : "—"} кг жира`,
    sub: `За ${A.length - 1} нед.: безжировая ${sgn(dl, 2)} кг, жир ${sgn(df, 2)} кг${kcal ? ` на ${kcal} ккал` : ""}. ${v}`,
  };
}

export function weekChartLabel(label: string): string {
  return label.replace("Неделя ", "Н").replace("До питания", "старт");
}
