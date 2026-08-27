"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { appPath } from "@/lib/api-url";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { FINANCE_MONTH_NAMES, formatRub } from "@/lib/v2/finance/meta";
import { homeFmt } from "@/lib/v2/personal/seeds/home-seed";
import type { HomeFinanceStripPayload } from "@/lib/v2/home/load-home-finance";

const HERO_BLUE = "#2d5eef";

function pctDelta(cur: number, prev: number): number | null {
  if (!prev) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

function formatPct(n: number): string {
  const sign = n >= 0 ? "▲" : "▼";
  return `${sign} ${Math.abs(n).toFixed(1).replace(".", ",")}%`;
}

export function HomeFinanceHero({ initialFinance }: { initialFinance: HomeFinanceStripPayload | null }) {
  const [finance, setFinance] = useState(initialFinance);
  const [prevProfit, setPrevProfit] = useState<number | null>(null);

  useEffect(() => {
    if (finance) return;
    void (async () => {
      try {
        const data = await fetchJson<HomeFinanceStripPayload>("/api/v2/finance/dashboard");
        setFinance({ year: data.year, month: data.month, summary: data.summary });
      } catch {
        setFinance(null);
      }
    })();
  }, [finance]);

  useEffect(() => {
    if (!finance) return;
    let py = finance.year;
    let pm = finance.month - 1;
    if (pm < 1) {
      pm = 12;
      py -= 1;
    }
    void (async () => {
      try {
        const data = await fetchJson<HomeFinanceStripPayload>(
          `/api/v2/finance/dashboard?year=${py}&month=${pm}`
        );
        setPrevProfit(data.summary.profit);
      } catch {
        setPrevProfit(null);
      }
    })();
  }, [finance]);

  const monthLabel = useMemo(() => {
    if (!finance) return "";
    return `${FINANCE_MONTH_NAMES[finance.month - 1]?.toLowerCase() ?? ""} ${finance.year}`;
  }, [finance]);

  if (!finance) return null;

  const { summary } = finance;
  const delta = prevProfit != null ? pctDelta(summary.profit, prevProfit) : null;
  const deltaRub = prevProfit != null ? summary.profit - prevProfit : null;

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
            <span className="h-[5px] w-[5px] rounded-full bg-white/35" />
            <span className="v2-tight text-[13.5px] text-white/60">
              {summary.projectCount} проектов
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <span className="v2-tnum text-[62px] font-semibold leading-none tracking-[-0.042em]">
              {formatRub(summary.profit)}
            </span>
            {delta != null ? (
              <span className="v2-tight inline-flex items-center gap-1 rounded-[10px] bg-white/16 px-[11px] py-1.5 text-[15px] font-semibold">
                {formatPct(delta)}
              </span>
            ) : null}
          </div>
          {deltaRub != null ? (
            <p className="v2-tnum v2-tight mt-3 text-[14.5px] text-white/65">
              К прошлому месяцу {deltaRub >= 0 ? "+" : "−"}
              {homeFmt(Math.abs(deltaRub))} ₽
            </p>
          ) : null}
        </div>

        <div className="mt-3 grid max-w-[880px] grid-cols-1 gap-3.5 sm:grid-cols-[1.18fr_1fr_1fr]">
          <Link
            href={appPath("/v2/agency")}
            className="block rounded-2xl bg-[var(--v2-ink-50)] px-[18px] py-4 transition hover:bg-[var(--v2-ink-100)]"
          >
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[var(--v2-ink-400)]">
              Предполагаемая выручка
            </span>
            <div className="v2-tnum v2-tight mt-2 text-[25px] font-semibold tracking-[-0.03em] text-[var(--v2-ink-900)]">
              {formatRub(summary.expectedRevenue)}
            </div>
          </Link>
          <Link
            href={appPath("/v2/agency")}
            className="block rounded-2xl bg-[var(--v2-ink-50)] px-[18px] py-4 transition hover:bg-[var(--v2-ink-100)]"
          >
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[var(--v2-ink-400)]">
              Фактическая выручка
            </span>
            <div className="v2-tnum v2-tight mt-2 text-[25px] font-semibold tracking-[-0.03em] text-[var(--v2-ink-900)]">
              {formatRub(summary.actualRevenue)}
            </div>
          </Link>
          <Link
            href={appPath("/v2/agency")}
            className="block rounded-2xl bg-[var(--v2-ink-50)] px-[18px] py-4 transition hover:bg-[var(--v2-ink-100)]"
          >
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[var(--v2-ink-400)]">
              Расходы
            </span>
            <div className="v2-tnum v2-tight mt-2 text-[25px] font-semibold tracking-[-0.03em] text-[var(--v2-ink-900)]">
              {formatRub(summary.totalExpenses)}
            </div>
          </Link>
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
