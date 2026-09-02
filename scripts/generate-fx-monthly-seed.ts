/**
 * Генерирует SQL seed помесячных курсов USD из API ЦБ.
 * Usage: npx tsx scripts/generate-fx-monthly-seed.ts > supabase/migrations/073_fx_monthly_usd_seed.sql
 */

import {
  averageUsdRatesByMonth,
  fetchCbrUsdDailyRates,
} from "../lib/v2/personal/fx-monthly-rates";

const FROM_YEAR = 2018;
const TO_YEAR = new Date().getFullYear();

async function main() {
  const allMonthly = new Map<string, { avg: number; days: number; year: number; month: number }>();

  for (let year = FROM_YEAR; year <= TO_YEAR; year++) {
  process.stderr.write(`Fetching ${year}…\n`);
    const daily = await fetchCbrUsdDailyRates(new Date(year, 0, 1), new Date(year, 11, 31));
    const monthly = averageUsdRatesByMonth(daily);
    for (const [key, { avg, days }] of monthly) {
      const [y, m] = key.split("-").map(Number);
      allMonthly.set(key, { avg, days, year: y!, month: m! });
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  const rows = [...allMonthly.values()].sort((a, b) => a.year - b.year || a.month - b.month);

  console.log("-- 073 — seed средних курсов USD (ЦБ), 2018–текущий год");
  console.log("-- Сгенерировано scripts/generate-fx-monthly-seed.ts");
  console.log("");
  console.log("INSERT INTO v2_fx_monthly_rates (year, month, currency_code, avg_rate_to_rub, sample_days, source, updated_at)");
  console.log("VALUES");

  const lines = rows.map(
    (r, i) =>
      `  (${r.year}, ${r.month}, 'USD', ${(Math.round(r.avg * 10000) / 10000).toFixed(4)}, ${r.days}, 'cbr', now())${i < rows.length - 1 ? "," : ""}`
  );
  console.log(lines.join("\n"));
  console.log("ON CONFLICT (year, month, currency_code) DO UPDATE SET");
  console.log("  avg_rate_to_rub = EXCLUDED.avg_rate_to_rub,");
  console.log("  sample_days = EXCLUDED.sample_days,");
  console.log("  updated_at = now();");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
