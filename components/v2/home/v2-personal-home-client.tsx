"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode, type SVGProps } from "react";
import { appPath } from "@/lib/api-url";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { V2Icons } from "@/components/v2/ui/icons";
import type { BrandDoc } from "@/lib/v2/personal/seeds/brand-seed";
import type { LifeStrategyDoc } from "@/lib/v2/personal/seeds/life-strategy-seed";
import {
  HOME_BETS,
  HOME_CHECKS,
  HOME_LILA_BAN,
  HOME_MONEY,
  HOME_MONTHS,
  HOME_NOT_NOW,
  HOME_RULES,
  HOME_RULE_CONTRAST,
  HOME_SEASON,
  HOME_SPRINT,
  HOME_SPRINT_GOALS,
  HOME_TIME_NOTE,
  HOME_TRACKS,
  HOME_TRAININGS,
  HOME_VIDEO,
  HOME_VIDEO_ST,
  HOME_WEEK,
  HOME_WEEK_DONE_SEED,
  homeFmt,
  homeFmtK,
  type HomeSeason,
  type HomeVideoItem,
  type HomeVideoStatus,
} from "@/lib/v2/personal/seeds/home-seed";

type IconProps = SVGProps<SVGSVGElement>;

function IcMinus(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M6 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IcVideo(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="3" y="6" width="12.5" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m15.5 11 4.2-2.6c.5-.3 1.3 0 1.3.7v5.8c0 .7-.8 1-1.3.7l-4.2-2.6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/** Статусы роликов из документа «Личный бренд» приводим к словарю главной. */
const BRAND_STATUS: Record<string, HomeVideoStatus> = {
  Опубликован: "опубликовано",
  Ready: "монтаж",
  Script: "сценарий",
  Idea: "идея",
};

function toVideoStatus(status: string): HomeVideoStatus {
  if (status in HOME_VIDEO_ST) return status as HomeVideoStatus;
  return BRAND_STATUS[status] ?? "идея";
}

function videoOpacity(status: HomeVideoStatus) {
  if (status === "опубликовано") return 1;
  if (status === "монтаж") return 0.7;
  return 0.28;
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/* -------------------------------- СЕЗОН ---------------------------------- */
function SeasonHero({ season }: { season: HomeSeason }) {
  return (
    <section
      className="rounded-2xl px-8 py-8 text-white shadow-[var(--v2-shadow-soft)]"
      style={{ background: "var(--v2-brand-600)" }}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">{season.kicker}</span>
        <span className="h-1 w-1 rounded-full bg-white/25" />
        <span className="v2-tight text-[12px] text-white/55">{season.dates}</span>
      </div>
      <p
        className="v2-tight mt-3.5 max-w-[52ch] text-[30px] font-medium leading-[1.28] text-white"
        style={{ textWrap: "pretty" }}
      >
        {season.idea}
      </p>
      <div className="mt-7 flex items-center gap-4">
        <div className="h-1 max-w-[420px] flex-1 overflow-hidden rounded-full bg-white/15">
          <span
            className="block h-full rounded-full bg-white/80"
            style={{ width: `${Math.round(season.progress * 100)}%` }}
          />
        </div>
        <span className="v2-tight shrink-0 text-[12px] text-white/45">Review · {season.review}</span>
        <Link
          href={appPath("/v2/personal/life-strategy")}
          className="v2-tight ml-auto inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-white/85 transition hover:text-white"
        >
          Стратегия <V2Icons.arrowR className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}

/* -------------------------------- ЛИЛА ----------------------------------- */
function LilaBanner() {
  return (
    <section
      className="flex items-start gap-7 rounded-2xl bg-white px-8 py-7"
      style={{
        boxShadow:
          "0 1px 2px rgba(16,24,40,0.03), 0 12px 36px -16px rgba(30,52,120,0.12), inset 3px 0 0 #DC2626",
      }}
    >
      <span
        className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[24px] text-white"
        style={{ background: "#DC2626" }}
      >
        {HOME_LILA_BAN.mark}
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-ink-400)]">
          {HOME_LILA_BAN.title}
        </div>
        <div
          className="v2-tight mt-1.5 max-w-[46ch] text-[24px] font-semibold leading-snug text-[var(--v2-ink-900)]"
          style={{ textWrap: "pretty" }}
        >
          {HOME_LILA_BAN.text}
        </div>
        <p
          className="v2-tight mt-2.5 max-w-[62ch] text-[15px] leading-relaxed text-[var(--v2-ink-500)]"
          style={{ textWrap: "pretty" }}
        >
          {HOME_LILA_BAN.note}
        </p>
      </div>
    </section>
  );
}

/* ------------------------------- МЕСЯЦЫ ---------------------------------- */
function MonthBand({ month, setMonth }: { month: string; setMonth: (id: string) => void }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="v2-tight text-[19px] font-semibold text-[var(--v2-ink-900)]">Расписание сезона</h2>
        <span className="v2-tight text-[13px] text-[var(--v2-ink-500)]">
          Четыре периода до Review. Клик — выбрать текущий.
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {HOME_MONTHS.map((x) => {
          const active = x.id === month;
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => setMonth(x.id)}
              className={`flex flex-col rounded-2xl p-5 text-left transition ${
                active
                  ? "text-white shadow-[var(--v2-shadow-soft)]"
                  : "bg-white shadow-[var(--v2-shadow-card)] hover:shadow-[var(--v2-shadow-cardHv)]"
              }`}
              style={active ? { background: "var(--v2-brand-600)" } : undefined}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
                    active ? "text-white/50" : "text-[var(--v2-ink-400)]"
                  }`}
                >
                  {x.tag}
                </span>
                {x.state === "сейчас" ? (
                  <span
                    className={`rounded px-1.5 py-[2px] text-[10px] font-semibold uppercase tracking-[0.1em] ${
                      active
                        ? "bg-white/15 text-white/80"
                        : "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]"
                    }`}
                  >
                    сейчас
                  </span>
                ) : null}
              </div>
              <div
                className={`v2-tighter mt-2 text-[22px] font-semibold ${
                  active ? "text-white" : "text-[var(--v2-ink-900)]"
                }`}
              >
                {x.label}
              </div>
              <div
                className={`v2-tight mt-2 text-[16px] font-medium leading-snug ${
                  active ? "text-white" : "text-[var(--v2-ink-900)]"
                }`}
                style={{ textWrap: "pretty" }}
              >
                {x.headline}
              </div>
              <p
                className={`v2-tight mt-2 text-[13px] leading-relaxed ${
                  active ? "text-white/60" : "text-[var(--v2-ink-500)]"
                }`}
                style={{ textWrap: "pretty" }}
              >
                {x.lead}
              </p>
              <div
                className={`mt-4 flex flex-col gap-1.5 border-t pt-3.5 ${
                  active ? "border-white/10" : "border-[var(--v2-ink-100)]"
                }`}
              >
                {x.focus.map((f, i) => (
                  <div key={f} className="flex gap-2.5">
                    <span
                      className={`v2-tnum mt-[3px] shrink-0 text-[10.5px] font-semibold ${
                        active ? "text-white/30" : "text-[var(--v2-ink-300)]"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`v2-tight text-[13px] leading-snug ${
                        active ? "text-white/85" : "text-[var(--v2-ink-700)]"
                      }`}
                      style={{ textWrap: "pretty" }}
                    >
                      {f}
                    </span>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------------------- ЦЕЛИ СПРИНТА -------------------------------- */
function SprintGoals() {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="v2-tight text-[19px] font-semibold text-[var(--v2-ink-900)]">{HOME_SPRINT.label}</h2>
        <span className="v2-tight text-[13px] text-[var(--v2-ink-500)]">{HOME_SPRINT.dates}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {HOME_SPRINT_GOALS.map((g) => (
          <div
            key={g.id}
            className="flex flex-col rounded-2xl bg-white p-5 shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]"
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: g.tint }} />
              <span className="v2-tight text-[15px] font-semibold text-[var(--v2-ink-900)]">{g.name}</span>
            </div>
            <div className="mt-3 rounded-xl px-3 py-2.5" style={{ background: g.bg }}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: g.tint }}>
                Цель
              </div>
              <div className="v2-tight mt-0.5 text-[14px] font-medium leading-snug text-[var(--v2-ink-900)]">
                {g.goal}
              </div>
            </div>
            <div className="mt-3.5 flex flex-col gap-2">
              {g.items.map((it) => (
                <div key={it} className="v2-tight flex gap-2.5 text-[13px] leading-relaxed text-[var(--v2-ink-600)]">
                  <IcMinus className="mt-[4px] h-3.5 w-3.5 shrink-0 text-[var(--v2-ink-300)]" />
                  <span>{it}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------- СТАВКИ СЕЗОНА ------------------------------- */
function BetCards() {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="v2-tight text-[19px] font-semibold text-[var(--v2-ink-900)]">Ставки сезона</h2>
        <span className="v2-tight text-[13px] text-[var(--v2-ink-500)]">
          Главные гипотезы. Проверяются до 30 ноября.
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {HOME_BETS.map((b) => (
          <div
            key={b.id}
            className="flex flex-col rounded-2xl bg-white p-5 shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]"
          >
            <div className="flex items-center gap-2.5">
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-[14px]"
                style={{ background: b.bg }}
              >
                {b.mark}
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: b.tint }}>
                  {b.kicker}
                </div>
                <div className="v2-tight truncate text-[15px] font-semibold text-[var(--v2-ink-900)]">{b.name}</div>
              </div>
            </div>
            <p
              className="v2-tight mt-3.5 text-[14px] leading-[1.55] text-[var(--v2-ink-800)]"
              style={{ textWrap: "pretty" }}
            >
              {b.hyp}
            </p>
            <div className="mt-auto flex items-center gap-3 pt-4">
              <span className="v2-tight text-[12px] text-[var(--v2-ink-500)]">{b.horizon}</span>
              <Link
                href={appPath(b.href)}
                className="v2-tight ml-auto inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-[var(--v2-brand-700)] transition hover:text-[var(--v2-brand-800)]"
              >
                Открыть <V2Icons.arrowR className="h-3 w-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function NotNow() {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-[var(--v2-shadow-card)]">
      <div className="flex items-baseline gap-3">
        <h3 className="v2-tight text-[15px] font-semibold text-[var(--v2-ink-900)]">Не сейчас</h3>
        <span className="v2-tight text-[12.5px] text-[var(--v2-ink-500)]">
          Решения, которые сознательно отложены до Review.
        </span>
      </div>
      <div className="mt-3.5 grid grid-cols-3 gap-x-6 gap-y-2">
        {HOME_NOT_NOW.map((n) => (
          <div key={n} className="v2-tight flex items-center gap-2.5 text-[13.5px] text-[var(--v2-ink-600)]">
            <IcMinus className="h-3.5 w-3.5 shrink-0 text-[var(--v2-ink-300)]" />
            {n}
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------- ДЕНЬГИ --------------------------------- */
function MoneyCard({
  label,
  value,
  note,
  href,
  good,
}: {
  label: string;
  value: string;
  note: string;
  href: string;
  good?: boolean;
}) {
  return (
    <Link
      href={appPath(href)}
      className="block rounded-2xl bg-white p-4 shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]"
    >
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">{label}</div>
      <div
        className={`v2-tnum v2-tighter mt-1.5 text-[24px] font-semibold ${
          good ? "text-emerald-600" : "text-[var(--v2-ink-900)]"
        }`}
      >
        {value}
      </div>
      <div className="v2-tight mt-1 text-[11.5px] text-[var(--v2-ink-500)]">{note}</div>
    </Link>
  );
}

function MoneyStrip() {
  return (
    <section className="grid grid-cols-4 gap-3">
      <MoneyCard
        label="Капитал всего"
        value={`${homeFmt(HOME_MONEY.capital)} ₽`}
        note="+86 тыс ₽ за 2026 год"
        href="/v2/personal/finance"
      />
      <MoneyCard
        label="В распоряжении"
        value={`${homeFmt(HOME_MONEY.available)} ₽`}
        note="карта, ИП и наличные"
        href="/v2/personal/finance"
      />
      <MoneyCard
        label={`Ожидается за ${HOME_MONEY.month}`}
        value={`${homeFmt(HOME_MONEY.expected)} ₽`}
        note={`оплачено ${homeFmt(HOME_MONEY.paid)} ₽ · 9 проектов`}
        href="/v2/agency"
      />
      <MoneyCard
        label="Прогноз конца месяца"
        value={`+${homeFmt(HOME_MONEY.forecast)} ₽`}
        note={`расходы ${homeFmtK(HOME_MONEY.expenses)} ₽`}
        href="/v2/personal/finance"
        good
      />
    </section>
  );
}

/* -------------------------------- НЕДЕЛЯ --------------------------------- */
function WeekBoard({
  done,
  toggle,
  focusDone,
  toggleFocus,
}: {
  done: string[];
  toggle: (id: string) => void;
  focusDone: string[];
  toggleFocus: (id: string) => void;
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-[var(--v2-shadow-soft)]">
      <div className="flex items-baseline gap-3">
        <h2 className="v2-tight text-[19px] font-semibold text-[var(--v2-ink-900)]">{HOME_WEEK.label}</h2>
        <span className="v2-tight text-[13px] text-[var(--v2-ink-500)]">Планирую неделями, не днями.</span>
        <Link
          href={appPath("/v2/personal/tasks/inbox")}
          className="v2-tight ml-auto shrink-0 text-[12.5px] font-medium text-[var(--v2-brand-700)] transition hover:text-[var(--v2-brand-800)]"
        >
          Задачи недели →
        </Link>
      </div>

      <div className="mt-4 rounded-xl bg-[var(--v2-ink-50)] p-4">
        <div className="mb-3 flex items-baseline gap-2.5">
          <h3 className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)]">{HOME_WEEK.focusTitle}</h3>
          <span className="v2-tight text-[11.5px] text-[var(--v2-ink-500)]">цели, которые я ставлю заранее</span>
          <span className="v2-tnum v2-tight ml-auto text-[11.5px] text-[var(--v2-ink-500)]">
            {focusDone.length} из {HOME_WEEK.focus.length}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {HOME_WEEK.focus.map((f) => {
            const on = focusDone.includes(f.id);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => toggleFocus(f.id)}
                className={`rounded-xl bg-white px-3.5 py-3 text-left shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)] ${
                  on ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-md transition ${
                      on ? "bg-emerald-500 text-white" : "bg-[var(--v2-ink-100)] text-transparent"
                    }`}
                  >
                    <V2Icons.check className="h-[11px] w-[11px]" />
                  </span>
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]">
                    {f.area}
                  </span>
                </div>
                <p
                  className={`v2-tight mt-2 text-[13px] leading-snug text-[var(--v2-ink-800)] ${
                    on ? "line-through" : ""
                  }`}
                  style={{ textWrap: "pretty" }}
                >
                  {f.text}
                </p>
                <span className="v2-tnum v2-tight mt-2 inline-block rounded bg-[var(--v2-ink-100)] px-1.5 py-[2px] text-[10.5px] text-[var(--v2-ink-500)]">
                  {f.state}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {Object.entries(HOME_WEEK.kinds).map(([id, k]) => (
          <span key={id} className="v2-tight inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--v2-ink-500)]">
            <span className="h-2 w-2 rounded-full" style={{ background: k.tint }} />
            {k.label}
          </span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2">
        {HOME_WEEK.days.map((d) => (
          <div
            key={d.id}
            className={`flex min-h-[132px] min-w-0 flex-col gap-1.5 rounded-xl p-2 ${
              d.today
                ? "bg-[var(--v2-brand-50)] ring-1 ring-[var(--v2-brand-200)]"
                : d.past
                  ? "bg-[var(--v2-ink-50)]/60"
                  : "bg-[var(--v2-ink-50)]"
            }`}
          >
            <div className="flex items-baseline gap-1.5 px-0.5">
              <span
                className={`text-[10.5px] font-semibold uppercase tracking-[0.08em] ${
                  d.today ? "text-[var(--v2-brand-700)]" : "text-[var(--v2-ink-400)]"
                }`}
              >
                {d.d}
              </span>
              <span
                className={`v2-tnum text-[13px] font-semibold ${
                  d.today ? "text-[var(--v2-brand-700)]" : "text-[var(--v2-ink-700)]"
                }`}
              >
                {d.n}
              </span>
            </div>
            {d.items.map((it, i) => {
              const k = HOME_WEEK.kinds[it.k] ?? { label: it.k, tint: "#71717A", bg: "#F4F4F5" };
              const itemId = `${d.id}${i}`;
              const isDone = done.includes(itemId);
              return (
                <button
                  key={itemId}
                  type="button"
                  title={`${k.label} — ${it.t}`}
                  onClick={() => toggle(itemId)}
                  className={`min-w-0 rounded-lg px-1.5 py-1.5 text-left transition ${isDone ? "opacity-45" : ""}`}
                  style={{ background: k.bg }}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: k.tint }} />
                    {isDone ? <V2Icons.check className="ml-auto h-3 w-3 shrink-0" style={{ color: k.tint }} /> : null}
                  </span>
                  <span
                    className={`v2-tight mt-1 block text-[11.5px] leading-snug text-[var(--v2-ink-800)] ${
                      isDone ? "line-through" : ""
                    }`}
                    style={{ textWrap: "pretty", overflowWrap: "anywhere" }}
                  >
                    {it.t}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------- ВРЕМЯ → ПРИБЫЛЬ ------------------------------ */
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">{label}</div>
      <div
        className={`v2-tnum v2-tight mt-1 text-[19px] font-semibold ${
          accent ? "text-[var(--v2-brand-700)]" : "text-[var(--v2-ink-900)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

const TIME_COLS = "grid gap-x-5 items-center";
const TIME_GRID = { gridTemplateColumns: "136px minmax(0,1fr) 116px 104px" } as const;

function TimeProfit() {
  const rows = useMemo(
    () => HOME_TRACKS.map((t) => ({ ...t, rate: t.money ? Math.round(t.money / t.hours) : 0 })),
    [],
  );
  const totalH = rows.reduce((s, r) => s + r.hours, 0);
  const totalM = rows.reduce((s, r) => s + r.money, 0);
  const maxH = Math.max(...rows.map((r) => r.hours), 1);
  const maxRate = Math.max(...rows.map((r) => r.rate), 1);
  const betHours = rows.filter((r) => r.kind === "bet").reduce((s, r) => s + r.hours, 0);

  return (
    <section className="rounded-2xl bg-white p-6 shadow-[var(--v2-shadow-soft)]">
      <div className="flex items-baseline gap-3">
        <h2 className="v2-tight text-[19px] font-semibold text-[var(--v2-ink-900)]">Время → прибыль</h2>
        <span className="v2-tnum v2-tight text-[13px] text-[var(--v2-ink-500)]">
          {HOME_MONEY.month} · {totalH} ч · {homeFmt(totalM)} ₽
        </span>
        <Link
          href={appPath("/v2/personal/time")}
          className="v2-tight ml-auto shrink-0 text-[12.5px] font-medium text-[var(--v2-brand-700)] transition hover:text-[var(--v2-brand-800)]"
        >
          Время и экономика →
        </Link>
      </div>
      <p className="v2-tight mt-1.5 text-[12.5px] text-[var(--v2-ink-500)]">{HOME_TIME_NOTE}</p>
      <div
        className={`${TIME_COLS} mt-5 border-b border-[var(--v2-ink-100)] pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]`}
        style={TIME_GRID}
      >
        <span>Направление</span>
        <span>Часы</span>
        <span className="text-right">Деньги месяца</span>
        <span className="text-right">₽ / час</span>
      </div>
      <div className="divide-y divide-[var(--v2-ink-100)]">
        {rows.map((r) => (
          <div key={r.id} className={`${TIME_COLS} py-3.5`} style={TIME_GRID}>
            <div className="min-w-0">
              <div className="v2-tight truncate text-[14px] font-semibold text-[var(--v2-ink-900)]">{r.label}</div>
              <div className="v2-tight truncate text-[11.5px] text-[var(--v2-ink-500)]">{r.note}</div>
            </div>
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${(r.hours / maxH) * 100}%`, background: r.tint }}
                />
              </div>
              <span className="v2-tnum w-11 shrink-0 text-[13px] text-[var(--v2-ink-700)]">{r.hours} ч</span>
            </div>
            <div className="text-right">
              {r.money > 0 ? (
                <span className="v2-tnum text-[14px] font-semibold text-[var(--v2-ink-900)]">
                  {homeFmt(r.money)} ₽
                </span>
              ) : (
                <span className="v2-tight text-[12px] text-[var(--v2-ink-400)]">ставка</span>
              )}
            </div>
            <div className="text-right">
              {r.rate > 0 ? (
                <div className="inline-flex flex-col items-end">
                  <span className="v2-tnum text-[14px] font-semibold" style={{ color: r.tint }}>
                    {homeFmt(r.rate)} ₽
                  </span>
                  <span className="mt-1 h-1 w-[68px] overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${(r.rate / maxRate) * 100}%`, background: r.tint }}
                    />
                  </span>
                </div>
              ) : (
                <span className="v2-tight text-[12px] text-[var(--v2-ink-400)]">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-4 gap-4 border-t border-[var(--v2-ink-100)] pt-4">
        <Stat label="Всего часов" value={`${totalH} ч`} />
        <Stat label="Деньги месяца" value={`${homeFmt(totalM)} ₽`} />
        <Stat
          label="Средний ₽/час"
          value={`${homeFmt(totalH ? Math.round(totalM / totalH) : 0)} ₽`}
          accent
        />
        <Stat label="Часы в ставки" value={`${betHours} ч`} />
      </div>
    </section>
  );
}

/* ------------------------- ПРАВИЛА И МИНИМУМ ------------------------------ */
function RulesCard({
  state,
  toggle,
}: {
  state: Record<string, boolean>;
  toggle: (id: string) => void;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-[var(--v2-shadow-card)]">
      <h3 className="v2-tight text-[15px] font-semibold text-[var(--v2-ink-900)]">Минимум недели</h3>
      <p className="v2-tight mt-1 text-[12px] text-[var(--v2-ink-500)]">Сделал — можно отдыхать.</p>

      <div className="mt-3.5 flex flex-col gap-0.5">
        {HOME_CHECKS.map((r) => {
          const on = state[r.id];
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => toggle(r.id)}
              className="-mx-1 flex items-start gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-[var(--v2-ink-50)]"
            >
              <span
                className={`mt-[1px] inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md transition ${
                  on ? "bg-emerald-500 text-white" : "bg-[var(--v2-ink-100)] text-transparent"
                }`}
              >
                <V2Icons.check className="h-3 w-3" />
              </span>
              <span className="min-w-0">
                <span
                  className={`v2-tight block text-[13.5px] font-medium ${
                    on ? "text-[var(--v2-ink-500)] line-through" : "text-[var(--v2-ink-900)]"
                  }`}
                >
                  {r.label}
                </span>
                <span className="v2-tight block text-[11.5px] text-[var(--v2-ink-500)]">{r.note}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-xl bg-[var(--v2-ink-50)] px-3 py-2.5">
        <span className="v2-tight text-[13px] font-medium text-[var(--v2-ink-900)]">{HOME_TRAININGS.label}</span>
        <span className="ml-auto flex items-center gap-1">
          {Array.from({ length: HOME_TRAININGS.total }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-5 rounded-full ${
                i < HOME_TRAININGS.done ? "bg-emerald-500" : "bg-[var(--v2-ink-200)]"
              }`}
            />
          ))}
        </span>
        <span className="v2-tnum v2-tight text-[12px] text-[var(--v2-ink-500)]">
          {HOME_TRAININGS.done} из {HOME_TRAININGS.total}
        </span>
      </div>
    </section>
  );
}

function RulesBand({ rules }: { rules: string[] }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-[var(--v2-shadow-soft)]">
      <div className="flex items-baseline gap-3">
        <h2 className="v2-tight text-[19px] font-semibold text-[var(--v2-ink-900)]">Правила недели</h2>
        <span className="v2-tight text-[13px] text-[var(--v2-ink-500)]">Рамки, а не производственный план.</span>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-3">
        {rules.map((r, i) => (
          <div key={`${i}-${r}`} className="rounded-xl bg-[var(--v2-ink-50)] px-4 py-3.5">
            <div className="v2-tnum text-[10.5px] font-semibold text-[var(--v2-ink-300)]">
              {String(i + 1).padStart(2, "0")}
            </div>
            <p
              className="v2-tight mt-1 text-[14px] leading-snug text-[var(--v2-ink-800)]"
              style={{ textWrap: "pretty" }}
            >
              {r}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div
          className="v2-tight rounded-xl bg-emerald-50 px-4 py-3.5 text-[14px] leading-relaxed text-emerald-900"
          style={{ textWrap: "pretty" }}
        >
          {HOME_RULE_CONTRAST.ok}
        </div>
        <div
          className="v2-tight rounded-xl bg-[var(--v2-ink-100)] px-4 py-3.5 text-[14px] leading-relaxed text-[var(--v2-ink-600)]"
          style={{ textWrap: "pretty" }}
        >
          {HOME_RULE_CONTRAST.no}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- РОЛИКИ --------------------------------- */
function VideoCard({ videos }: { videos: HomeVideoItem[] }) {
  const pub = videos.filter((v) => v.st === "опубликовано").length;
  return (
    <section className="rounded-2xl bg-white p-5 shadow-[var(--v2-shadow-card)]">
      <div className="flex items-center gap-2">
        <IcVideo className="h-[16px] w-[16px] text-[var(--v2-ink-400)]" />
        <h3 className="v2-tight text-[15px] font-semibold text-[var(--v2-ink-900)]">Ролики</h3>
        <span className="v2-tnum v2-tight ml-auto text-[12px] text-[var(--v2-ink-500)]">
          {pub} из {HOME_VIDEO.goal} на YouTube
        </span>
      </div>
      <div className="mt-2.5 flex gap-1">
        {videos.map((v) => (
          <span
            key={`bar-${v.n}`}
            className="h-1.5 flex-1 rounded-full"
            style={{ background: HOME_VIDEO_ST[v.st].tint, opacity: videoOpacity(v.st) }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-col divide-y divide-[var(--v2-ink-100)]">
        {videos.map((v) => {
          const s = HOME_VIDEO_ST[v.st];
          return (
            <div key={v.n} className="py-2.5">
              <div className="flex items-start gap-2">
                <span className="v2-tnum mt-[3px] shrink-0 text-[10.5px] font-semibold text-[var(--v2-ink-300)]">
                  {v.n}
                </span>
                <span
                  className="v2-tight flex-1 text-[13px] font-medium leading-snug text-[var(--v2-ink-900)]"
                  style={{ textWrap: "pretty" }}
                >
                  {v.t}
                </span>
                <span
                  className="v2-tight shrink-0 rounded px-1.5 py-[2px] text-[10.5px] font-semibold"
                  style={{ background: s.bg, color: s.tint }}
                >
                  {v.st}
                </span>
              </div>
              <div className="v2-tight mt-1 flex items-center gap-2 pl-[22px] text-[11.5px] text-[var(--v2-ink-500)]">
                <span className="v2-tnum">{v.date}</span>
                {v.views !== "—" ? (
                  <>
                    <span className="text-[var(--v2-ink-300)]">·</span>
                    <span className="v2-tnum font-medium text-[var(--v2-ink-700)]">{v.views} просмотров</span>
                  </>
                ) : null}
              </div>
              {v.react ? (
                <div className="v2-tight mt-0.5 pl-[22px] text-[11.5px] text-[var(--v2-ink-500)]">{v.react}</div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-3 border-t border-[var(--v2-ink-100)] pt-3">
        <p className="v2-tight text-[12px] leading-relaxed text-[var(--v2-ink-500)]">{HOME_VIDEO.question}</p>
        <Link
          href={appPath("/v2/personal/brand")}
          className="v2-tight mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--v2-brand-700)] transition hover:text-[var(--v2-brand-800)]"
        >
          Личный бренд <V2Icons.arrowR className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}

/* --------------------------------- HOME ---------------------------------- */
export function V2PersonalHomeClient() {
  const [today, setToday] = useState(HOME_SEASON.day);
  const [season, setSeason] = useState<HomeSeason>(HOME_SEASON);
  const [rules, setRules] = useState<string[]>(HOME_RULES);
  const [videos, setVideos] = useState<HomeVideoItem[]>(HOME_VIDEO.yt);

  const [month, setMonth] = useState("aug");
  const [doneItems, setDoneItems] = useState<string[]>(HOME_WEEK_DONE_SEED);
  const [focusDone, setFocusDone] = useState<string[]>([]);
  const [checks, setChecks] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(HOME_CHECKS.map((r) => [r.id, r.done])),
  );

  const toggleItem = (id: string) =>
    setDoneItems((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleFocus = (id: string) =>
    setFocusDone((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleCheck = (id: string) => setChecks((p) => ({ ...p, [id]: !p[id] }));

  useEffect(() => {
    setToday(
      capitalize(
        new Date().toLocaleDateString("ru-RU", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      ),
    );
  }, []);

  useEffect(() => {
    let alive = true;

    const loadStrategy = async () => {
      try {
        const { doc } = await fetchJson<{ doc: LifeStrategyDoc }>(
          "/api/v2/personal/life-docs/life_strategy",
        );
        if (!alive || !doc) return;
        if (doc.season) {
          setSeason((prev) => ({
            ...prev,
            kicker: doc.season.kicker || prev.kicker,
            dates: doc.season.dates || prev.dates,
            idea: doc.season.lead ? doc.season.lead.replace(/\s*\n+\s*/g, " ") : prev.idea,
            review: doc.season.review || prev.review,
          }));
        }
        const source = doc.weekRules?.length ? doc.weekRules : doc.rulePool ?? [];
        const texts = source.map((r) => r.text).filter(Boolean).slice(0, 5);
        if (texts.length) setRules(texts);
      } catch {
        // оставляем seed-контент
      }
    };

    const loadBrand = async () => {
      try {
        const { doc } = await fetchJson<{ doc: BrandDoc }>("/api/v2/personal/life-docs/brand");
        if (!alive || !doc?.videos?.length) return;
        setVideos(
          doc.videos.slice(0, 6).map((v, i) => ({
            n: String(i + 1).padStart(2, "0"),
            t: v.title,
            st: toVideoStatus(v.status),
            date: v.date,
            views: v.m?.v30 ? homeFmtK(v.m.v30) : "—",
            react: v.m
              ? `${v.m.comments} комментов · +${v.m.subs} подписчиков`
              : v.next || v.sub || "",
          })),
        );
      } catch {
        // оставляем seed-контент
      }
    };

    void loadStrategy();
    void loadBrand();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-20 pt-4">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="v2-tight flex items-center gap-2 text-[13px] text-[var(--v2-ink-500)]">
            <span className="font-medium text-[var(--v2-ink-900)]">Главная</span>
            <span className="text-[var(--v2-ink-300)]">/</span>
            <span className="text-[var(--v2-ink-400)]">{today}</span>
          </div>
          <Link
            href={appPath("/v2/personal/observations")}
            className="v2-tight ml-auto inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[12.5px] font-medium text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]"
          >
            <V2Icons.plus className="h-4 w-4 text-[var(--v2-ink-400)]" /> Наблюдение
          </Link>
        </div>

        <SeasonHero season={season} />
        <LilaBanner />
        <MonthBand month={month} setMonth={setMonth} />
        <SprintGoals />
        <BetCards />
        <NotNow />
        <MoneyStrip />
        <div className="grid grid-cols-[minmax(0,1fr)_336px] items-start gap-6">
          <div className="flex min-w-0 flex-col gap-6">
            <WeekBoard
              done={doneItems}
              toggle={toggleItem}
              focusDone={focusDone}
              toggleFocus={toggleFocus}
            />
            <TimeProfit />
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <RulesCard state={checks} toggle={toggleCheck} />
            <VideoCard videos={videos} />
          </div>
        </div>
        <RulesBand rules={rules} />
      </div>
    </div>
  );
}
