"use client";

import { PersonalAmt, PersonalMaskProvider } from "./personal-finance-mask";
import {
  PersonalCapitalChart,
  PersonalIncomeBars,
  PersonalSpark,
} from "./personal-finance-charts";
import { PersonalOperationModal } from "./personal-operation-modal";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  formatPersonalPct,
  PERSONAL_BRANDS,
  PERSONAL_MONTH_NAMES,
} from "@/lib/v2/personal/formatters";
import type {
  PersonalAccountRow,
  PersonalCapitalRow,
  PersonalFinanceDashboard,
  PersonalIncomeRow,
  PersonalMonthSnapshotRow,
} from "@/lib/v2/personal/types";
import { V2Icons } from "@/components/v2/ui/icons";
import { appPath } from "@/lib/api-url";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function adjacentPersonalMonth(year: number, month: number, delta: -1 | 1) {
  let m = month + delta;
  let y = year;
  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }
  return { year: y, month: m };
}

function monthLabel(year: number, month: number) {
  return `${PERSONAL_MONTH_NAMES[month - 1]} ${year}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

const PERSONAL_ICON_MAP: Record<string, keyof typeof V2Icons> = {
  wallet: "ruble",
  bank: "clients",
  cash: "ruble",
  shield: "star",
  target: "flag",
  coin: "ruble",
  tv: "folder",
  key: "link",
  card: "ruble",
  other: "folder",
};

function PfAccountIcon({ iconKey, className }: { iconKey: string; className?: string }) {
  const key = PERSONAL_ICON_MAP[iconKey] ?? "folder";
  const Icon = V2Icons[key];
  return <Icon className={className} />;
}

const PfUiIcons = {
  eye: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  eyeOff: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M4 4l16 16M9.5 9.7A2.7 2.7 0 0 0 12 14.7c.7 0 1.3-.25 1.8-.66M6.3 6.7C3.9 8.2 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.6 0 3-.46 4.2-1.15M10.5 5.7c.48-.13 1-.2 1.5-.2 6 0 9.5 6.5 9.5 6.5s-.8 1.5-2.3 3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  up: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M12 19V5m0 0-6 6m6-6 6 6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  down: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M12 5v14m0 0 6-6m-6 6-6-6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  wallet: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M4 8a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v0H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="16.5" cy="13" r="1.3" fill="currentColor" />
    </svg>
  ),
  trendUp: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M4 16.5 9.5 11l3.2 3.2L20 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15 7h5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  coin: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9.5 9.5h3.2a1.8 1.8 0 0 1 0 3.6H9.5m0 0V16m0-6.5V8m1.6 8.5v-1.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  receipt: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M6 3.5h12v17l-2.2-1.4-2.4 1.4-1.4-1.4-1.4 1.4-2.4-1.4L6 20.5v-17Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9 8h6M9 11.5h6M9 15h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  info: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 11v5m0-8.2v.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
};

function PfCard({ className = "", children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-2xl bg-white shadow-[var(--v2-shadow-soft)] ${className}`} {...p}>
      {children}
    </div>
  );
}

function PfDelta({ value, suffix = "", size = "sm" }: { value: number; suffix?: string; size?: "sm" | "md" }) {
  const up = value >= 0;
  const Icn = up ? PfUiIcons.up : PfUiIcons.down;
  return (
    <span
      className={`v2-tight inline-flex items-center gap-0.5 font-medium ${size === "sm" ? "text-[12px]" : "text-[13px]"} ${
        up ? "text-emerald-600" : "text-red-500"
      }`}
    >
      <Icn className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {formatPersonalPct(value)}
      {suffix}
    </span>
  );
}

function PfBrandChip({ id, size = "sm" }: { id: string; size?: "sm" | "md" }) {
  const b = PERSONAL_BRANDS[id];
  if (!b) return null;
  const sm = size === "sm";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-white text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] ${
        sm ? "py-[3px] pl-1 pr-2.5 text-[12px]" : "py-1 pl-1.5 pr-3 text-[13px]"
      }`}
    >
      <span
        className={`inline-flex items-center justify-center rounded-full font-semibold ${sm ? "h-[18px] w-[18px] text-[10.5px]" : "h-5 w-5 text-[11px]"}`}
        style={{ background: b.bg, color: b.ink || b.tint }}
      >
        {b.short}
      </span>
      <span className="v2-tight font-medium">{b.name}</span>
    </span>
  );
}

function PfSectionTitle({
  accent = "#0A0A0B",
  title,
  right,
}: {
  accent?: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center gap-2.5 px-0.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
      <h3 className="v2-tight text-[14px] font-semibold text-[var(--v2-ink-900)]">{title}</h3>
      {right ? <div className="ml-auto">{right}</div> : null}
    </div>
  );
}

function PfIconBtn({
  children,
  title,
  onClick,
  active,
  className = "",
}: {
  children: React.ReactNode;
  title?: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition ${
        active
          ? "bg-[var(--v2-brand-50)] text-[var(--v2-brand-600)]"
          : "text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function computeCapitalDeltaPct(history: PersonalMonthSnapshotRow[]) {
  if (history.length < 2) return null;
  const cur = history[history.length - 1]!;
  const prev = history[history.length - 2]!;
  if (!prev.capital_total_rub) return null;
  return ((cur.capital_total_rub - prev.capital_total_rub) / prev.capital_total_rub) * 100;
}

function PfTopbar({
  masked,
  setMasked,
  onOperation,
  canOperate,
}: {
  masked: boolean;
  setMasked: (fn: (v: boolean) => boolean) => void;
  onOperation: () => void;
  canOperate: boolean;
}) {
  return (
    <div className="flex h-14 items-center gap-3 border-b border-[var(--v2-ink-100)]/70 px-7">
      <div className="v2-tight flex items-center gap-2 text-[13px] text-[var(--v2-ink-500)]">
        <span className="text-[var(--v2-ink-400)]">Личное</span>
        <span className="text-[var(--v2-ink-300)]">/</span>
        <span className="font-medium text-[var(--v2-ink-900)]">Финансы</span>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <PfIconBtn
          title={masked ? "Показать суммы" : "Скрыть суммы"}
          onClick={() => setMasked((v) => !v)}
          active={masked}
        >
          {masked ? (
            <PfUiIcons.eyeOff className="h-[18px] w-[18px]" />
          ) : (
            <PfUiIcons.eye className="h-[18px] w-[18px]" />
          )}
        </PfIconBtn>
        <button
          type="button"
          onClick={onOperation}
          disabled={!canOperate}
          title={canOperate ? undefined : "Сначала добавьте счёт"}
          className="v2-tight ml-1 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-3.5 text-[12.5px] font-medium text-white shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <V2Icons.plus className="h-4 w-4" />
          Операция
        </button>
      </div>
    </div>
  );
}

function PfPageHead({
  year,
  month,
  forecastEnd,
  onMonthChange,
  today,
}: {
  year: number;
  month: number;
  forecastEnd: number;
  onMonthChange: (y: number, m: number) => void;
  today: Date;
}) {
  const prev = adjacentPersonalMonth(year, month, -1);
  const next = adjacentPersonalMonth(year, month, 1);
  const nowY = today.getFullYear();
  const nowM = today.getMonth() + 1;
  const nextDisabled = next.year > nowY || (next.year === nowY && next.month > nowM);
  const positive = forecastEnd >= 0;
  const monthName = PERSONAL_MONTH_NAMES[month - 1]?.toLowerCase() ?? "";

  return (
    <div className="mb-7 flex items-end justify-between gap-6">
      <div>
        <div className="v2-tight text-[12.5px] font-medium text-[var(--v2-ink-500)]">
          Личные финансы · {monthLabel(year, month)}
        </div>
        <h1 className="v2-tighter mt-1 text-[40px] font-semibold leading-[1.05] text-[var(--v2-ink-900)]">
          Деньги под контролем
        </h1>
        <p className="v2-tight mt-2 max-w-[60ch] text-[14.5px] text-[var(--v2-ink-500)]">
          {PERSONAL_MONTH_NAMES[month - 1]} идёт{" "}
          <span className={`font-medium ${positive ? "text-emerald-600" : "text-red-500"}`}>
            {positive ? "в плюс" : "в минус"}
          </span>
          : к концу {monthName} ожидается остаток{" "}
          <PersonalAmt v={forecastEnd} short className="font-medium text-[var(--v2-ink-800)]" /> с учётом поступлений и
          плановых трат.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-1 rounded-xl bg-white/80 p-1 shadow-[var(--v2-shadow-card)] backdrop-blur lg:flex">
          <button
            type="button"
            onClick={() => onMonthChange(prev.year, prev.month)}
            className="v2-tight h-8 rounded-lg px-3 text-[12.5px] font-medium text-[var(--v2-ink-600)] transition hover:text-[var(--v2-ink-900)]"
          >
            {PERSONAL_MONTH_NAMES[prev.month - 1]}
          </button>
          <button
            type="button"
            className="v2-tight h-8 rounded-lg bg-[var(--v2-brand-50)] px-3 text-[12.5px] font-medium text-[var(--v2-brand-700)]"
          >
            {PERSONAL_MONTH_NAMES[month - 1]}
          </button>
          <button
            type="button"
            disabled={nextDisabled}
            onClick={() => !nextDisabled && onMonthChange(next.year, next.month)}
            className="v2-tight h-8 rounded-lg px-3 text-[12.5px] font-medium text-[var(--v2-ink-400)] disabled:cursor-not-allowed"
          >
            {PERSONAL_MONTH_NAMES[next.month - 1]}
          </button>
        </div>
        <button
          type="button"
          className="v2-tight inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/80 px-3 text-[12.5px] text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] backdrop-blur transition hover:shadow-[var(--v2-shadow-cardHv)]"
        >
          <V2Icons.download className="h-4 w-4 text-[var(--v2-ink-500)]" />
          Экспорт
        </button>
      </div>
    </div>
  );
}

function PfHeroCards({
  summary,
  accounts,
  history,
  year,
  month,
}: {
  summary: PersonalFinanceDashboard["summary"];
  accounts: PersonalAccountRow[];
  history: PersonalMonthSnapshotRow[];
  year: number;
  month: number;
}) {
  const capSeries = history.map((h) => h.capital_total_rub);
  const cushion = accounts.find((a) => a.account_type === "cushion");
  const goal = accounts.find((a) => a.account_type === "goal");
  const capitalDelta = computeCapitalDeltaPct(history);
  const incomePct = summary.incomeExpected ? (summary.incomeReceived / summary.incomeExpected) * 100 : 0;
  const monthName = PERSONAL_MONTH_NAMES[month - 1]?.toLowerCase() ?? "";

  const StatCard = ({
    label,
    icon: Icon,
    accent,
    value,
    children,
    spark,
    sparkColor,
    footer,
  }: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
    value: number;
    children?: React.ReactNode;
    spark?: number[];
    sparkColor?: string;
    footer?: React.ReactNode;
  }) => (
    <PfCard className="flex flex-col p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-lg"
            style={{ background: `${accent}14`, color: accent }}
          >
            <Icon className="h-[15px] w-[15px]" />
          </span>
          {label}
        </div>
        {spark && spark.length >= 2 ? <PersonalSpark data={spark} color={sparkColor || accent} w={96} h={30} /> : null}
      </div>
      <div className="v2-tighter mt-3 text-[32px] font-semibold leading-none text-[var(--v2-ink-900)]">
        <PersonalAmt v={value} />
      </div>
      {children}
      {footer ? (
        <div className="v2-tight mt-3 border-t border-[var(--v2-ink-100)]/80 pt-3 text-[12px] text-[var(--v2-ink-500)]">
          {footer}
        </div>
      ) : null}
    </PfCard>
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <StatCard
        label="В распоряжении"
        icon={PfUiIcons.wallet}
        accent="#3B6FF7"
        value={summary.disposable}
        footer={<span>Карта, ИП и наличные — то, чем можно пользоваться прямо сейчас</span>}
      />

      <StatCard
        label="Капитал всего"
        icon={PfUiIcons.trendUp}
        accent="#10B981"
        value={summary.netWorth}
        spark={capSeries}
        sparkColor="#10B981"
        footer={
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {cushion ? (
              <span>
                Подушка{" "}
                <span className="font-medium text-[var(--v2-ink-700)]">
                  <PersonalAmt v={cushion.balance_rub} short />
                </span>
              </span>
            ) : null}
            {goal ? (
              <span>
                Цели{" "}
                <span className="font-medium text-[var(--v2-ink-700)]">
                  <PersonalAmt v={goal.balance_rub} short />
                </span>
              </span>
            ) : null}
            <span>
              Активы{" "}
              <span className="font-medium text-[var(--v2-ink-700)]">
                <PersonalAmt v={summary.capitalSum} short />
              </span>
            </span>
          </div>
        }
      >
        {capitalDelta != null ? (
          <div className="mt-2 flex items-center gap-2">
            <PfDelta value={capitalDelta} />
            <span className="text-[12px] text-[var(--v2-ink-500)]">за месяц</span>
          </div>
        ) : null}
      </StatCard>

      <StatCard
        label={`Доход за ${monthName}`}
        icon={PfUiIcons.coin}
        accent="#F59E0B"
        value={summary.incomeExpected}
        footer={
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Получено{" "}
              <span className="font-medium text-[var(--v2-ink-700)]">
                <PersonalAmt v={summary.incomeReceived} short />
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--v2-ink-300)]" />
              Ждём{" "}
              <span className="font-medium text-[var(--v2-ink-700)]">
                <PersonalAmt v={summary.incomePending} short />
              </span>
            </span>
          </div>
        }
      >
        <div className="mt-2.5 flex h-[6px] overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
          <div className="h-full bg-emerald-500" style={{ width: `${incomePct}%` }} />
        </div>
      </StatCard>
    </div>
  );
}

function PfForecastCard({
  summary,
  budgetLimit,
  year,
  month,
}: {
  summary: PersonalFinanceDashboard["summary"];
  budgetLimit: number;
  year: number;
  month: number;
}) {
  const positive = summary.forecastEnd >= 0;
  const steps = [
    { label: "Сейчас на счетах", v: summary.disposable, op: "" },
    { label: "Ожидаемые поступления", v: summary.incomePending, op: "+" },
    { label: "Плановые траты", v: -summary.budgetLeft, op: "−" },
    { label: "Налог в этом месяце", v: 0, op: "−" },
  ];
  const monthName = PERSONAL_MONTH_NAMES[month - 1]?.toLowerCase() ?? "";

  return (
    <PfCard className="relative overflow-hidden p-6">
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-[360px] w-[360px] rounded-full blur-3xl"
        style={{ background: positive ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)" }}
      />
      <div className="relative grid grid-cols-12 items-center gap-6">
        <div className="col-span-12 lg:col-span-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-500)]">
            <V2Icons.clock className="h-4 w-4" />
            Прогноз на конец {monthName} {year}
          </div>
          <div
            className={`v2-tighter mt-3 text-[44px] font-semibold leading-none ${positive ? "text-emerald-600" : "text-red-500"}`}
          >
            <PersonalAmt v={summary.forecastEnd} signed />
          </div>
          <div className="mt-2 inline-flex items-center gap-2 text-[12.5px]">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${
                positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
              }`}
            >
              {positive ? "Месяц в плюсе" : "Месяц в минусе"}
            </span>
            <span className="text-[var(--v2-ink-500)]">после всех платежей</span>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {steps.map((s, i) => (
              <div key={i} className="relative rounded-xl bg-[var(--v2-ink-50)]/70 px-3.5 py-3">
                {i > 0 ? (
                  <span className="absolute -left-[11px] top-1/2 hidden -translate-y-1/2 text-[15px] font-medium text-[var(--v2-ink-300)] sm:block">
                    {s.op}
                  </span>
                ) : null}
                <div className="v2-tight min-h-[28px] text-[11px] leading-tight text-[var(--v2-ink-500)]">{s.label}</div>
                <div
                  className={`v2-tight mt-1 text-[16px] font-semibold ${s.v < 0 ? "text-[var(--v2-ink-700)]" : "text-[var(--v2-ink-900)]"}`}
                >
                  <PersonalAmt v={s.v} short signed={i > 0} />
                </div>
              </div>
            ))}
          </div>
          <div className="v2-tight mt-3 flex items-center gap-1.5 text-[12px] text-[var(--v2-ink-500)]">
            <PfUiIcons.info className="h-3.5 w-3.5 text-[var(--v2-ink-400)]" />
            Расчёт по плановому бюджету{" "}
            <PersonalAmt v={budgetLimit} short className="font-medium text-[var(--v2-ink-700)]" /> и подтверждённым
            счетам. Подушка и капитал не учитываются.
          </div>
        </div>
      </div>
    </PfCard>
  );
}

function PfAccountRow({ a }: { a: PersonalAccountRow }) {
  const goalPct = a.goal_amount_rub ? Math.min(a.balance_rub / a.goal_amount_rub, 1) : null;
  return (
    <div className="group flex items-center gap-3.5 px-4 py-3 transition hover:bg-[var(--v2-ink-50)]/70">
      <span
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${a.accent}14`, color: a.accent }}
      >
        <PfAccountIcon iconKey={a.icon_key} className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="v2-tight truncate text-[14px] font-medium text-[var(--v2-ink-900)]">{a.name}</span>
          {!a.disposable ? (
            <span className="rounded bg-[var(--v2-ink-100)] px-1.5 py-[1px] text-[10px] font-semibold uppercase tracking-wide text-[var(--v2-ink-400)]">
              резерв
            </span>
          ) : null}
        </div>
        {a.note ? <div className="v2-tight mt-0.5 text-[12px] text-[var(--v2-ink-500)]">{a.note}</div> : null}
        {goalPct != null && a.goal_amount_rub ? (
          <div className="mt-1.5 flex max-w-[230px] items-center gap-2">
            <div className="h-[4px] flex-1 overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
              <div className="h-full rounded-full" style={{ width: `${goalPct * 100}%`, background: a.accent }} />
            </div>
            <span className="v2-tnum text-[10.5px] text-[var(--v2-ink-400)]">
              {Math.round(goalPct * 100)}% из <PersonalAmt v={a.goal_amount_rub} short />
            </span>
          </div>
        ) : null}
      </div>
      <div className="v2-tight shrink-0 text-right text-[15px] font-semibold text-[var(--v2-ink-900)]">
        <PersonalAmt v={a.balance_rub} />
      </div>
    </div>
  );
}

function PfCapitalRow({ c }: { c: PersonalCapitalRow }) {
  const tint = c.tint || "#52525B";
  return (
    <div className="flex items-center gap-3.5 px-4 py-3 transition hover:bg-[var(--v2-ink-50)]/70">
      <span
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${tint}16`, color: tint }}
      >
        <PfAccountIcon iconKey={c.icon_key} className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="v2-tight truncate text-[14px] font-medium text-[var(--v2-ink-900)]">{c.name}</span>
          {c.unit_label ? (
            <span className="rounded bg-[var(--v2-ink-100)]/80 px-1.5 py-[1px] font-mono text-[11px] text-[var(--v2-ink-500)]">
              {c.unit_label}
            </span>
          ) : null}
        </div>
        {c.meta ? <div className="v2-tight mt-0.5 text-[12px] text-[var(--v2-ink-500)]">{c.meta}</div> : null}
      </div>
      <div className="v2-tight shrink-0 text-right text-[15px] font-semibold text-[var(--v2-ink-900)]">
        <PersonalAmt v={c.amount_rub} />
      </div>
    </div>
  );
}

function PfAccountsAndCapital({
  accounts,
  capital,
  summary,
}: {
  accounts: PersonalAccountRow[];
  capital: PersonalCapitalRow[];
  summary: PersonalFinanceDashboard["summary"];
}) {
  const accountsTotal = summary.disposable + summary.reserves;
  const manageLink = appPath("/v2/personal/finance/accounts");

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div>
        <PfSectionTitle
          accent="#3B6FF7"
          title="Счета"
          right={
            <div className="flex items-center gap-3">
              <span className="text-[12.5px] text-[var(--v2-ink-500)]">
                Всего{" "}
                <span className="font-semibold text-[var(--v2-ink-800)]">
                  <PersonalAmt v={accountsTotal} short />
                </span>
              </span>
              <Link
                href={manageLink}
                className="text-[12.5px] font-medium text-[var(--v2-brand-600)] transition hover:text-[var(--v2-brand-700)]"
              >
                Управление
              </Link>
            </div>
          }
        />
        {accounts.length === 0 ? (
          <PfCard className="p-8 text-center">
            <p className="text-[14px] text-[var(--v2-ink-600)]">Счетов пока нет</p>
            <p className="v2-tight mt-1 text-[13px] text-[var(--v2-ink-500)]">
              Добавьте карту, ИП или резервы, чтобы видеть баланс
            </p>
            <Link
              href={manageLink}
              className="v2-tight mt-4 inline-flex h-9 items-center rounded-xl bg-[var(--v2-brand-600)] px-4 text-[13px] font-medium text-white transition hover:bg-[var(--v2-brand-700)]"
            >
              Перейти к счетам
            </Link>
          </PfCard>
        ) : (
          <PfCard className="divide-y divide-[var(--v2-ink-100)]/70 overflow-hidden">
            {accounts.map((a) => (
              <PfAccountRow key={a.id} a={a} />
            ))}
          </PfCard>
        )}
      </div>
      <div>
        <PfSectionTitle
          accent="#10B981"
          title="Капитал"
          right={
            <div className="flex items-center gap-3">
              <span className="text-[12.5px] text-[var(--v2-ink-500)]">
                Активы{" "}
                <span className="font-semibold text-[var(--v2-ink-800)]">
                  <PersonalAmt v={summary.capitalSum} short />
                </span>
              </span>
              <Link
                href={manageLink}
                className="text-[12.5px] font-medium text-[var(--v2-brand-600)] transition hover:text-[var(--v2-brand-700)]"
              >
                Управление
              </Link>
            </div>
          }
        />
        {capital.length === 0 ? (
          <PfCard className="p-8 text-center">
            <p className="text-[14px] text-[var(--v2-ink-600)]">Капитал не добавлен</p>
            <p className="v2-tight mt-1 text-[13px] text-[var(--v2-ink-500)]">
              Учтите активы, валюту и залоги для полной картины
            </p>
            <Link
              href={manageLink}
              className="v2-tight mt-4 inline-flex h-9 items-center rounded-xl bg-[var(--v2-brand-600)] px-4 text-[13px] font-medium text-white transition hover:bg-[var(--v2-brand-700)]"
            >
              Добавить активы
            </Link>
          </PfCard>
        ) : (
          <PfCard className="divide-y divide-[var(--v2-ink-100)]/70 overflow-hidden">
            {capital.map((c) => (
              <PfCapitalRow key={c.id} c={c} />
            ))}
          </PfCard>
        )}
      </div>
    </div>
  );
}

function PfChartsSection({
  history,
  masked,
  year,
  month,
}: {
  history: PersonalMonthSnapshotRow[];
  masked: boolean;
  year: number;
  month: number;
}) {
  const capitalDelta = computeCapitalDeltaPct(history);
  if (history.length < 2) {
    return (
      <PfCard className="p-8 text-center text-sm text-[var(--v2-ink-500)]">
        Недостаточно данных для графиков — история появится после первого месяца
      </PfCard>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div>
        <PfSectionTitle
          accent="#3B6FF7"
          title="Капитал по месяцам"
          right={capitalDelta != null ? <PfDelta value={capitalDelta} size="md" /> : null}
        />
        <PfCard className="p-4 pt-5">
          <PersonalCapitalChart data={history} masked={masked} currentYear={year} currentMonth={month} />
        </PfCard>
      </div>
      <div>
        <PfSectionTitle
          accent="#0A0A0B"
          title="Доход и расход"
          right={
            <div className="flex items-center gap-3 text-[11.5px] text-[var(--v2-ink-500)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-[var(--v2-brand-500)]" />
                доход
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-[var(--v2-ink-200)]" />
                расход
              </span>
            </div>
          }
        />
        <PfCard className="p-4 pt-5">
          <PersonalIncomeBars data={history} masked={masked} currentYear={year} currentMonth={month} />
        </PfCard>
      </div>
    </div>
  );
}

function PfHistoryTable({
  history,
  year,
  month,
}: {
  history: PersonalMonthSnapshotRow[];
  year: number;
  month: number;
}) {
  const rows = [...history].reverse();

  return (
    <div>
      <PfSectionTitle accent="#9A8CFF" title="История по месяцам" />
      {rows.length === 0 ? (
        <PfCard className="p-8 text-center text-sm text-[var(--v2-ink-500)]">История пока пуста</PfCard>
      ) : (
        <PfCard className="overflow-hidden">
          <div className="grid grid-cols-[1.4fr_1fr_0.9fr_1fr_1fr] border-b border-[var(--v2-ink-100)]/70 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-400)]">
            <div>Месяц</div>
            <div className="text-right">Капитал</div>
            <div className="text-right">Динамика</div>
            <div className="text-right">Заработано</div>
            <div className="text-right">Потрачено</div>
          </div>
          <div className="divide-y divide-[var(--v2-ink-100)]/70">
            {rows.map((h, i) => {
              const prev = rows[i + 1];
              const delta = prev ? h.capital_total_rub - prev.capital_total_rub : 0;
              const deltaPct = prev && prev.capital_total_rub ? (delta / prev.capital_total_rub) * 100 : 0;
              const isCurrent = h.year === year && h.month === month;
              const full = monthLabel(h.year, h.month);
              return (
                <div
                  key={`${h.year}-${h.month}`}
                  className={`grid grid-cols-[1.4fr_1fr_0.9fr_1fr_1fr] items-center px-5 py-3 text-[13.5px] transition hover:bg-[var(--v2-ink-50)]/60 ${
                    isCurrent ? "bg-[var(--v2-brand-50)]/40" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="v2-tight font-medium text-[var(--v2-ink-900)]">{full}</span>
                    {isCurrent ? (
                      <span className="rounded bg-[var(--v2-brand-50)] px-1.5 py-[1px] text-[10px] font-semibold uppercase tracking-wide text-[var(--v2-brand-700)]">
                        сейчас
                      </span>
                    ) : null}
                  </div>
                  <div className="v2-tight text-right font-semibold text-[var(--v2-ink-900)]">
                    <PersonalAmt v={h.capital_total_rub} />
                  </div>
                  <div className="text-right">{prev ? <PfDelta value={deltaPct} /> : <span className="text-[var(--v2-ink-300)]">—</span>}</div>
                  <div className="v2-tnum text-right font-medium text-emerald-600">
                    <PersonalAmt v={h.earned_rub} short />
                  </div>
                  <div className="v2-tnum text-right text-[var(--v2-ink-600)]">
                    <PersonalAmt v={h.spent_rub} short />
                  </div>
                </div>
              );
            })}
          </div>
        </PfCard>
      )}
    </div>
  );
}

function PfIncomeList({
  incomes,
  summary,
  onToggle,
}: {
  incomes: PersonalIncomeRow[];
  summary: PersonalFinanceDashboard["summary"];
  onToggle: (id: string, status: PersonalIncomeRow["status"]) => void;
}) {
  const received = incomes.filter((i) => i.status === "received");
  const expected = incomes.filter((i) => i.status === "expected");

  const Row = ({ i }: { i: PersonalIncomeRow }) => {
    const got = i.status === "received";
    return (
      <button
        type="button"
        onClick={() => onToggle(i.id, i.status)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--v2-ink-50)]/70"
        title={got ? "Отметить как ожидаемое" : "Отметить как получено"}
      >
        <span
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            got ? "bg-emerald-50 text-emerald-600" : "bg-[var(--v2-ink-100)] text-[var(--v2-ink-400)]"
          }`}
        >
          {got ? <V2Icons.check className="h-4 w-4" /> : <V2Icons.clock className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="v2-tight truncate text-[13.5px] font-medium text-[var(--v2-ink-900)]">{i.title}</div>
          <div className="mt-1 flex items-center gap-2">
            <PfBrandChip id={i.brand_key} />
            <span className="v2-tight text-[12px] text-[var(--v2-ink-500)]">
              {got ? "получено" : "ожидается"} {i.date_label || ""}
            </span>
          </div>
        </div>
        <div
          className={`v2-tight shrink-0 text-[14px] font-semibold ${got ? "text-[var(--v2-ink-900)]" : "text-[var(--v2-ink-500)]"}`}
        >
          <PersonalAmt v={i.amount_rub} />
        </div>
      </button>
    );
  };

  return (
    <div>
      <PfSectionTitle
        accent="#F59E0B"
        title="Поступления по проектам"
        right={
          <span className="text-[12.5px] text-[var(--v2-ink-500)]">
            Всего{" "}
            <span className="font-semibold text-[var(--v2-ink-800)]">
              <PersonalAmt v={summary.incomeExpected} short />
            </span>
          </span>
        }
      />
      <PfCard className="overflow-hidden">
        {incomes.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--v2-ink-500)]">Поступлений за месяц нет</div>
        ) : (
          <>
            <div className="px-4 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-600">
              Получено · <PersonalAmt v={summary.incomeReceived} short />
            </div>
            <div className="divide-y divide-[var(--v2-ink-100)]/70">
              {received.length === 0 ? (
                <div className="px-4 py-4 text-[13px] text-[var(--v2-ink-400)]">Пока ничего не получено</div>
              ) : (
                received.map((i) => <Row key={i.id} i={i} />)
              )}
            </div>
            <div className="border-t border-[var(--v2-ink-100)]/70 px-4 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-400)]">
              Ожидается · <PersonalAmt v={summary.incomePending} short />
            </div>
            <div className="divide-y divide-[var(--v2-ink-100)]/70">
              {expected.length === 0 ? (
                <div className="px-4 py-4 text-[13px] text-[var(--v2-ink-400)]">Все поступления получены</div>
              ) : (
                expected.map((i) => <Row key={i.id} i={i} />)
              )}
            </div>
          </>
        )}
      </PfCard>
    </div>
  );
}

function PfTaxCard({
  tax,
  taxAdvances,
  summary,
}: {
  tax: PersonalFinanceDashboard["tax"];
  taxAdvances: PersonalFinanceDashboard["taxAdvances"];
  summary: PersonalFinanceDashboard["summary"];
}) {
  const accrued = summary.taxAccrued;
  const reducedPayable = Math.max(accrued - tax.insurance_deduction_rub, 0);
  const paidPct = reducedPayable > 0 ? Math.min(tax.paid_advances_rub / reducedPayable, 1) : 1;

  const rows: { label: string; value: number; bold?: boolean }[] = [
    { label: "Доход с начала года", value: tax.year_income_rub },
    { label: `Налог ${Math.round(tax.tax_rate * 100)}\u202F%`, value: accrued },
    { label: "− вычет страховых взносов", value: -tax.insurance_deduction_rub },
    { label: "К уплате за год", value: reducedPayable, bold: true },
  ];

  return (
    <div>
      <PfSectionTitle
        accent="#EF4444"
        title="Налоги ИП"
        right={<span className="text-[12px] text-[var(--v2-ink-500)]">{tax.scheme}</span>}
      />
      <PfCard className="p-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">
              Осталось заплатить
            </div>
            <div className="v2-tighter mt-1.5 text-[30px] font-semibold leading-none text-[var(--v2-ink-900)]">
              <PersonalAmt v={summary.taxRemaining} />
            </div>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500">
            <PfUiIcons.receipt className="h-5 w-5" />
          </span>
        </div>

        <div className="mt-4 flex h-[7px] overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
          <div className="h-full bg-emerald-500" style={{ width: `${paidPct * 100}%` }} title="оплачено" />
        </div>
        <div className="mt-2 flex items-center justify-between text-[12px]">
          <span className="inline-flex items-center gap-1.5 text-[var(--v2-ink-500)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Оплачено авансами{" "}
            <span className="font-medium text-[var(--v2-ink-800)]">
              <PersonalAmt v={tax.paid_advances_rub} short />
            </span>
          </span>
          <span className="v2-tnum text-[var(--v2-ink-400)]">{Math.round(paidPct * 100)}%</span>
        </div>

        <div className="mt-4 space-y-2 border-t border-[var(--v2-ink-100)]/80 pt-4 text-[13px]">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="v2-tight text-[var(--v2-ink-500)]">{row.label}</span>
              <span className={`v2-tnum ${row.bold ? "font-semibold text-[var(--v2-ink-900)]" : "text-[var(--v2-ink-700)]"}`}>
                {row.value < 0 ? (
                  <>
                    −<PersonalAmt v={Math.abs(row.value)} />
                  </>
                ) : (
                  <PersonalAmt v={row.value} />
                )}
              </span>
            </div>
          ))}
        </div>

        {taxAdvances.length > 0 ? (
          <div className="mt-4 space-y-2">
            {taxAdvances.map((a) => (
              <div
                key={a.id}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${
                  a.planned ? "bg-[var(--v2-ink-50)] text-[var(--v2-ink-500)]" : "bg-emerald-50/70"
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
                    a.planned ? "bg-white text-[var(--v2-ink-400)]" : "bg-emerald-500 text-white"
                  }`}
                >
                  {a.planned ? <V2Icons.clock className="h-3.5 w-3.5" /> : <V2Icons.check className="h-3.5 w-3.5" />}
                </span>
                <span className="v2-tight flex-1 text-[12.5px]">{a.label}</span>
                <span className="text-[11.5px] text-[var(--v2-ink-500)]">{a.advance_date || ""}</span>
                <span className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-800)]">
                  <PersonalAmt v={a.amount_rub} short />
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </PfCard>
    </div>
  );
}

function PfBudgetCard({
  budget,
  budgetCategories,
  summary,
  year,
  month,
  today,
}: {
  budget: PersonalFinanceDashboard["budget"];
  budgetCategories: PersonalFinanceDashboard["budgetCategories"];
  summary: PersonalFinanceDashboard["summary"];
  year: number;
  month: number;
  today: Date;
}) {
  const left = summary.budgetLeft;
  const pctSpent = budget.limit_rub ? summary.budgetSpent / budget.limit_rub : 0;
  const dim = daysInMonth(year, month);
  const day =
    year === today.getFullYear() && month === today.getMonth() + 1
      ? today.getDate()
      : year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth() + 1)
        ? dim
        : 1;
  const pacePerDay = day > 0 ? summary.budgetSpent / day : 0;
  const projected = pacePerDay * dim;
  const surplus = budget.limit_rub - projected;
  const monthName = PERSONAL_MONTH_NAMES[month - 1]?.toLowerCase() ?? "";

  return (
    <div>
      <PfSectionTitle accent="#3B6FF7" title={`Траты на жизнь · ${monthName}`} />
      <PfCard className="p-5">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 flex flex-col md:col-span-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">
              Потрачено из лимита
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="v2-tighter text-[30px] font-semibold leading-none text-[var(--v2-ink-900)]">
                <PersonalAmt v={summary.budgetSpent} />
              </span>
            </div>
            <div className="v2-tight mt-1 text-[13px] text-[var(--v2-ink-500)]">
              из <PersonalAmt v={budget.limit_rub} className="font-medium text-[var(--v2-ink-700)]" /> · осталось{" "}
              <PersonalAmt v={left} className="font-medium text-emerald-600" />
            </div>
            <div className="mt-3 h-[10px] overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--v2-brand-500)] to-[var(--v2-brand-600)]"
                style={{ width: `${Math.min(pctSpent * 100, 100)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[12px] text-[var(--v2-ink-500)]">
              <span>{Math.round(pctSpent * 100)}% бюджета</span>
              <span>
                день {day} из {dim}
              </span>
            </div>
            {surplus > 0 && day > 0 ? (
              <div className="v2-tight mt-auto flex items-start gap-1.5 pt-4 text-[12px] text-[var(--v2-ink-500)]">
                <V2Icons.spark className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--v2-brand-500)]" />
                Темп ниже среднего — при таком ритме уложитесь в лимит с запасом ≈{" "}
                <PersonalAmt v={Math.round(surplus)} short className="font-medium text-[var(--v2-ink-700)]" />.
              </div>
            ) : null}
          </div>
          <div className="col-span-12 md:col-span-8">
            {budgetCategories.length === 0 ? (
              <p className="text-sm text-[var(--v2-ink-500)]">Категории бюджета не настроены</p>
            ) : (
              <div className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
                {budgetCategories.map((c) => {
                  const p = c.limit_rub ? Math.min(c.spent_rub / c.limit_rub, 1) : 0;
                  const over = c.limit_rub ? c.spent_rub / c.limit_rub > 0.92 : false;
                  return (
                    <div key={c.id}>
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="v2-tight inline-flex items-center gap-2 text-[var(--v2-ink-700)]">
                          <span className="h-2 w-2 rounded-sm" style={{ background: c.tint }} />
                          {c.name}
                        </span>
                        <span className="v2-tnum text-[var(--v2-ink-500)]">
                          <span className="font-medium text-[var(--v2-ink-900)]">
                            <PersonalAmt v={c.spent_rub} short />
                          </span>{" "}
                          / <PersonalAmt v={c.limit_rub} short />
                        </span>
                      </div>
                      <div className="mt-1.5 h-[6px] overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${p * 100}%`, background: over ? "#EF4444" : c.tint }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </PfCard>
    </div>
  );
}

export function PersonalFinanceClient() {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [data, setData] = useState<PersonalFinanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [masked, setMasked] = useState(false);
  const [operationOpen, setOperationOpen] = useState(false);
  const [monthReady, setMonthReady] = useState(false);
  const skipMonthReload = useRef(true);

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchJson<PersonalFinanceDashboard>(
        `/api/v2/personal/finance/dashboard?year=${y}&month=${m}`
      );
      setData(payload);
      setYear(payload.year);
      setMonth(payload.month);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await fetchJson<PersonalFinanceDashboard>("/api/v2/personal/finance/dashboard");
        setData(payload);
        setYear(payload.year);
        setMonth(payload.month);
        setMonthReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!monthReady) return;
    if (skipMonthReload.current) {
      skipMonthReload.current = false;
      return;
    }
    void load(year, month);
  }, [year, month, monthReady, load]);

  const reload = useCallback(() => load(year, month), [load, year, month]);

  const toggleIncome = async (id: string, status: PersonalIncomeRow["status"]) => {
    const next = status === "received" ? "expected" : "received";
    try {
      await fetchJson(`/api/v2/personal/finance/incomes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обновить поступление");
    }
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="text-[var(--v2-ink-700)]">{error}</p>
        <p className="mt-2 text-sm text-[var(--v2-ink-500)]">
          Проверьте Supabase и примените миграцию 018_v2_personal_finance.sql
        </p>
      </div>
    );
  }

  if (!data) return null;

  const { summary, accounts, capital, incomes, tax, taxAdvances, budget, budgetCategories, history } = data;

  return (
    <PersonalMaskProvider masked={masked}>
      <div className="flex min-h-full flex-col">
        <PfTopbar
          masked={masked}
          setMasked={setMasked}
          onOperation={() => setOperationOpen(true)}
          canOperate={accounts.length > 0}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1200px] px-6 pb-24 pt-8 lg:px-10">
            {error ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <PfPageHead
              year={year}
              month={month}
              forecastEnd={summary.forecastEnd}
              onMonthChange={(y, m) => {
                setYear(y);
                setMonth(m);
              }}
              today={today}
            />

            <div className="space-y-7">
              <PfHeroCards summary={summary} accounts={accounts} history={history} year={year} month={month} />
              <PfForecastCard summary={summary} budgetLimit={budget.limit_rub} year={year} month={month} />
              <PfAccountsAndCapital accounts={accounts} capital={capital} summary={summary} />
              <PfChartsSection history={history} masked={masked} year={year} month={month} />
              <PfHistoryTable history={history} year={year} month={month} />
              <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
                <PfIncomeList incomes={incomes} summary={summary} onToggle={(id, status) => void toggleIncome(id, status)} />
                <PfTaxCard tax={tax} taxAdvances={taxAdvances} summary={summary} />
              </div>
              <PfBudgetCard
                budget={budget}
                budgetCategories={budgetCategories}
                summary={summary}
                year={year}
                month={month}
                today={today}
              />
            </div>
          </div>
        </div>

        <PersonalOperationModal
          open={operationOpen}
          onClose={() => setOperationOpen(false)}
          year={year}
          month={month}
          accounts={accounts}
          budgetCategories={budgetCategories}
          onDone={() => void reload()}
        />
      </div>
    </PersonalMaskProvider>
  );
}
