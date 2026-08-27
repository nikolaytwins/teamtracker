"use client";

import Link from "next/link";
import { useMemo } from "react";
import { appPath } from "@/lib/api-url";
import { useHomePersonalFinance } from "@/components/v2/home/personal/home-personal-finance-context";
import { FINANCE_MONTH_NAMES, formatRub } from "@/lib/v2/finance/meta";
import { homeFmt } from "@/lib/v2/personal/seeds/home-seed";

const HERO_BLUE = "#2d5eef";

function pctDelta(cur: number, prev: number): number | null {
  if (!prev) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

function formatPct(n: number): string {
  const sign = n >= 0 ? "▲" : "▼";
  return `${sign} ${Math.abs(n).toFixed(1).replace(".", ",")}%`;
}

function currentMonthLabel(): string {
  const now = new Date();
  const month = FINANCE_MONTH_NAMES[now.getMonth()]?.toLowerCase() ?? "";
  return `${month} ${now.getFullYear()}`;
}

function HeroSkeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--v2-ink-100)] ${className ?? ""}`} aria-hidden />;
}

export function HomeFinanceHero() {
  const { dashboard, loading } = useHomePersonalFinance();

  const monthLabel = useMemo(() => {
    if (!dashboard) return currentMonthLabel();
    return `${FINANCE_MONTH_NAMES[dashboard.month - 1]?.toLowerCase() ?? ""} ${dashboard.year}`;
  }, [dashboard]);

  const prevProfit = useMemo(() => {
    if (!dashboard) return null;
    let py = dashboard.year;
    let pm = dashboard.month - 1;
    if (pm < 1) {
      pm = 12;
      py -= 1;
    }
    const row = dashboard.incomeHistory.find((r) => r.year === py && r.month === pm);
    return row?.profit_rub ?? null;
  }, [dashboard]);

  const summary = dashboard?.summary;
  const profit = summary?.monthProfit ?? 0;
  const delta = prevProfit != null && summary ? pctDelta(profit, prevProfit) : null;
  const deltaRub = prevProfit != null && summary ? profit - prevProfit : null;
  const ready = Boolean(summary);

  return (
    <section className="v2-card grid overflow-hidden lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,560px)]">
      <div className="flex min-h-[430px] flex-col justify-center gap-2.5 px-8 py-8">
        <h1 className="v2-tight text-[40px] font-semibold leading-[1.1] tracking-[-0.036em] text-[var(--v2-ink-900)]">
          Показатели месяца
        </h1>

        <div
          className="mt-3 max-w-[880px] rounded-[20px] px-7 py-6 text-white"
          style={{ background: HERO_BLUE, boxShadow: "0 16px 40px -18px rgba(45,94,239,0.85)" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-white/60">
              Прибыль · {monthLabel}
            </span>
            {ready ? (
              <>
                <span className="h-[5px] w-[5px] rounded-full bg-white/35" />
                <span className="v2-tight text-[13.5px] text-white/60">
                  {summary!.projectCount} проектов
                </span>
              </>
            ) : loading ? (
              <HeroSkeleton className="ml-1 h-4 w-24 bg-white/20" />
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            {ready ? (
              <span className="v2-tnum text-[62px] font-semibold leading-none tracking-[-0.042em]">
                {formatRub(profit)}
              </span>
            ) : (
              <HeroSkeleton className="h-[62px] w-[min(280px,70%)] bg-white/20" />
            )}
            {ready && delta != null ? (
              <span className="v2-tight inline-flex items-center gap-1 rounded-[10px] bg-white/16 px-[11px] py-1.5 text-[15px] font-semibold">
                {formatPct(delta)}
              </span>
            ) : null}
          </div>
          {ready && deltaRub != null ? (
            <p className="v2-tnum v2-tight mt-3 text-[14.5px] text-white/65">
              К прошлому месяцу {deltaRub >= 0 ? "+" : "−"}
              {homeFmt(Math.abs(deltaRub))} ₽
            </p>
          ) : loading ? (
            <HeroSkeleton className="mt-3 h-4 w-52 bg-white/15" />
          ) : null}
        </div>

        <div className="mt-3 grid max-w-[880px] grid-cols-1 gap-3.5 sm:grid-cols-[1.18fr_1fr_1fr]">
          {(
            [
              ["Предполагаемая выручка", summary?.projectExpectedRevenue],
              ["Фактическая выручка", summary?.projectActualRevenue],
              ["Расходы", summary?.agencyTotalExpenses],
            ] as const
          ).map(([label, value]) => (
            <Link
              key={label}
              href={appPath("/v2/agency")}
              className="block rounded-2xl bg-[var(--v2-ink-50)] px-[18px] py-4 transition hover:bg-[var(--v2-ink-100)]"
            >
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[var(--v2-ink-400)]">
                {label}
              </span>
              {ready && value != null ? (
                <div className="v2-tnum v2-tight mt-2 text-[21px] font-medium tracking-[-0.02em] text-[var(--v2-ink-800)]">
                  {formatRub(value)}
                </div>
              ) : (
                <HeroSkeleton className="mt-2 h-7 w-[min(140px,80%)]" />
              )}
            </Link>
          ))}
        </div>
      </div>

      <div className="relative hidden min-h-[430px] overflow-hidden lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={appPath("/home/sophia-hero.png")}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[100%_42%]"
          style={{
            WebkitMaskImage:
              "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 11%, rgba(0,0,0,0.82) 22%, #000 36%)",
            maskImage:
              "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 11%, rgba(0,0,0,0.82) 22%, #000 36%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-[34%]"
          style={{
            background:
              "linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.45) 52%, rgba(255,255,255,0) 100%)",
          }}
        />
      </div>
    </section>
  );
}
