"use client";

import Link from "next/link";
import { useMemo } from "react";
import { appPath } from "@/lib/api-url";
import { HomePersonalFinanceProvider, useHomePersonalFinance } from "@/components/v2/home/personal/home-personal-finance-context";
import type { HomePersonalFinancePayload } from "@/lib/v2/home/load-home-finance";
import { HomeDynamicsChart } from "@/components/v2/home/personal/home-dynamics-chart";
import { HomeFinanceHero } from "@/components/v2/home/personal/home-finance-hero";
import { HomeSeasonBand } from "@/components/v2/home/personal/home-season-band";
import { HomeWeekFocus } from "@/components/v2/home/personal/home-week-focus";
import { allocateGoals, cushionPool } from "@/components/v2/personal/finance/personal-finance-system";
import {
  HOME_BETS,
  HOME_CHECKS,
  HOME_LILA_BAN,
  HOME_NOT_NOW,
  HOME_RULES,
  HOME_RULE_CONTRAST,
  HOME_TRAININGS,
  homeFmt,
} from "@/lib/v2/personal/seeds/home-seed";

function LilaBan() {
  return (
    <section
      className="flex items-center gap-[18px] rounded-[20px] bg-[#fff5f5] px-7 py-5"
      style={{ boxShadow: "inset 4px 0 0 #dc2626, var(--v2-shadow-card)" }}
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#dc2626] text-[20px] text-white">
        {HOME_LILA_BAN.mark}
      </span>
      <div className="min-w-0 flex-1">
        <div className="v2-tight text-[19px] font-semibold leading-snug tracking-[-0.02em] text-[#7f1d1d]">
          {HOME_LILA_BAN.text}
        </div>
        <div className="v2-tight mt-1 text-[14.5px] text-[#b91c1c] opacity-85">{HOME_LILA_BAN.note}</div>
      </div>
      <span className="hidden shrink-0 text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[#dc2626] sm:block">
        {HOME_LILA_BAN.title}
      </span>
    </section>
  );
}

function BetCards() {
  return (
    <section className="v2-card px-7 py-6">
      <div className="mb-[18px] flex flex-wrap items-baseline gap-3.5">
        <h2 className="v2-tight text-[24px] font-semibold tracking-[-0.028em] text-[var(--v2-ink-900)]">
          Ставки сезона
        </h2>
        <span className="v2-tight text-[14.5px] text-[var(--v2-ink-500)]">
          Три гипотезы. Проверяются до 30 ноября.
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {HOME_BETS.map((b) => (
          <div key={b.id} className="flex flex-col rounded-[18px] bg-[var(--v2-ink-50)] p-6">
            <div className="text-[11.5px] font-semibold uppercase tracking-[0.13em]" style={{ color: b.tint }}>
              {b.kicker}
            </div>
            <div className="v2-tight mt-2 text-[24px] font-semibold tracking-[-0.03em] text-[var(--v2-ink-900)]">
              {b.name}
            </div>
            <p className="v2-tight mt-3 text-[15.5px] leading-relaxed text-[var(--v2-ink-600)]">{b.hyp}</p>
            <div className="mt-auto flex items-center gap-3 pt-5">
              <span className="v2-tight text-[13.5px] text-[var(--v2-ink-500)]">{b.horizon}</span>
              <Link
                href={appPath(b.href)}
                className="v2-tight ml-auto text-[14px] font-medium text-[var(--v2-brand-700)] hover:text-[var(--v2-brand-600)]"
              >
                Открыть →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function GoalsAndNotNow() {
  const { dashboard } = useHomePersonalFinance();

  const goals = useMemo(() => {
    if (!dashboard) return [];
    const pool = cushionPool(dashboard.accounts);
    return allocateGoals(dashboard.goals, pool);
  }, [dashboard]);

  const capitalBase = dashboard?.summary.netWorth ?? 0;

  return (
    <div className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
      <section className="v2-card flex h-full flex-col px-7 py-6">
        <div className="mb-[18px] flex flex-wrap items-baseline gap-3.5">
          <h2 className="v2-tight text-[24px] font-semibold tracking-[-0.028em] text-[var(--v2-ink-900)]">Цели</h2>
          <span className="v2-tight text-[14.5px] text-[var(--v2-ink-500)]">
            Общие, без срока. Считаются от капитала {homeFmt(capitalBase)} ₽
          </span>
        </div>
        {goals.length ? (
          <div className="grid flex-1 grid-cols-1 gap-3.5 sm:grid-cols-2">
            {goals.map((g) => {
              const pct = Math.min(100, Math.round(g.pct * 100));
              return (
                <div key={g.id} className="flex flex-col rounded-[18px] bg-[var(--v2-ink-50)] px-[22px] py-5">
                  <div className="v2-tight text-[17px] font-semibold tracking-[-0.02em] text-[var(--v2-ink-900)]">
                    {g.title}
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="v2-tnum text-[28px] font-semibold tracking-[-0.034em] text-[var(--v2-ink-900)]">
                      {homeFmt(g.filled)} ₽
                    </span>
                    <span className="v2-tight text-[14px] text-[var(--v2-ink-400)]">из {homeFmt(g.target_rub)} ₽</span>
                  </div>
                  <div className="mt-3.5 h-3 overflow-hidden rounded-full bg-[var(--v2-ink-200)]">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-[var(--v2-brand-500)] to-[var(--v2-brand-700)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between text-[13.5px] text-[var(--v2-ink-500)]">
                    <span className="v2-tnum text-[16px] font-semibold text-[var(--v2-ink-800)]">{pct}%</span>
                    <span className="v2-tnum">осталось {homeFmt(g.left)} ₽</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="v2-tight text-[14.5px] text-[var(--v2-ink-500)]">
            Цели подгружаются из{" "}
            <Link href={appPath("/v2/personal/finance")} className="text-[var(--v2-brand-700)] hover:underline">
              личных финансов
            </Link>
            …
          </p>
        )}
      </section>

      <section className="v2-card flex h-full flex-col px-7 py-6">
        <div className="mb-[18px] flex flex-wrap items-baseline gap-3.5">
          <h2 className="v2-tight text-[24px] font-semibold tracking-[-0.028em] text-[var(--v2-ink-900)]">Не сейчас</h2>
          <span className="v2-tight text-[14.5px] text-[var(--v2-ink-500)]">отложено до Review</span>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2">
          {HOME_NOT_NOW.map((n) => (
            <div
              key={n}
              className="v2-tight flex min-h-[72px] items-center rounded-[18px] bg-[var(--v2-ink-50)] px-4 py-3.5 text-[15px] font-medium leading-snug text-[var(--v2-ink-700)]"
            >
              {n}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function RulesBand() {
  return (
    <section className="v2-card px-7 py-6">
      <div className="grid grid-cols-1 items-stretch gap-[26px] lg:grid-cols-[minmax(0,1fr)_minmax(240px,340px)]">
        <div>
          <div className="mb-[18px] flex flex-wrap items-baseline gap-3.5">
            <h2 className="v2-tight text-[24px] font-semibold tracking-[-0.028em] text-[var(--v2-ink-900)]">
              Правила недели
            </h2>
            <span className="v2-tight text-[14.5px] text-[var(--v2-ink-500)]">Рамки, а не производственный план.</span>
          </div>
          <div className="flex flex-col gap-3">
            {HOME_RULES.map((r, i) => (
              <div key={r} className="flex items-start gap-4 rounded-2xl bg-[var(--v2-ink-50)] px-5 py-[18px]">
                <span className="v2-tnum pt-0.5 text-[14px] font-semibold text-[var(--v2-ink-300)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="v2-tight text-[16.5px] font-medium leading-snug tracking-[-0.015em] text-[var(--v2-ink-800)]">
                  {r}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden min-h-[340px] overflow-hidden rounded-[18px] bg-[var(--v2-ink-100)] lg:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={appPath("/home/rules-photo.png")}
            alt=""
            className="h-full w-full object-cover object-[50%_18%]"
          />
        </div>
      </div>

      <div className="mt-7 border-t border-[var(--v2-ink-100)] pt-6">
        <div className="mb-4 flex flex-wrap items-baseline gap-3.5">
          <h3 className="v2-tight text-[19px] font-semibold text-[var(--v2-ink-900)]">Минимум недели</h3>
          <span className="v2-tight text-[14.5px] text-[var(--v2-ink-500)]">
            сделал — можно отдыхать; просто помню, не отмечаю
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HOME_CHECKS.map((r) => (
            <div key={r.id} className="rounded-[14px] bg-[var(--v2-ink-50)] px-4 py-3.5">
              <b className="v2-tight block text-[15.5px] font-semibold tracking-[-0.015em] text-[var(--v2-ink-900)]">
                {r.label}
              </b>
              <span className="v2-tight mt-0.5 block text-[13px] text-[var(--v2-ink-400)]">{r.note}</span>
            </div>
          ))}
          <div className="rounded-[14px] bg-[var(--v2-ink-50)] px-4 py-3.5">
            <b className="v2-tight block text-[15.5px] font-semibold tracking-[-0.015em] text-[var(--v2-ink-900)]">
              {HOME_TRAININGS.label}
            </b>
            <span className="v2-tight mt-0.5 block text-[13px] text-[var(--v2-ink-400)]">
              {HOME_TRAININGS.total} раза в неделю
            </span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="v2-tight rounded-2xl bg-emerald-50 px-4 py-3.5 text-[15px] leading-relaxed text-emerald-900">
            {HOME_RULE_CONTRAST.ok}
          </div>
          <div className="v2-tight rounded-2xl bg-[var(--v2-ink-100)] px-4 py-3.5 text-[15px] leading-relaxed text-[var(--v2-ink-600)]">
            {HOME_RULE_CONTRAST.no}
          </div>
        </div>
      </div>
    </section>
  );
}

export function V2PersonalHomeClient({ initialFinance }: { initialFinance?: HomePersonalFinancePayload | null }) {
  return (
    <HomePersonalFinanceProvider initial={initialFinance}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1720px] flex-col gap-7 px-9 pb-24 pt-7">
          <HomeFinanceHero />
          <LilaBan />
          <HomeWeekFocus />
          <HomeSeasonBand />
          <BetCards />
          <HomeDynamicsChart />
          <GoalsAndNotNow />
          <RulesBand />
        </div>
      </div>
    </HomePersonalFinanceProvider>
  );
}
