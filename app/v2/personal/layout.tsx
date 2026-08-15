"use client";

import { appPath } from "@/lib/api-url";
import Link from "next/link";
import { usePathname } from "next/navigation";

const PERSONAL_TABS = [
  {
    href: "/v2/personal/ideas",
    label: "Идеи",
    match: (p: string) => p.startsWith(appPath("/v2/personal/ideas")),
  },
  {
    href: "/v2/personal/wishes",
    label: "Желания",
    match: (p: string) => p.startsWith(appPath("/v2/personal/wishes")),
  },
] as const;

const STRATEGY_TABS = [
  {
    href: "/v2/personal/life-strategy",
    label: "Общая стратегия",
    match: (p: string) => p.startsWith(appPath("/v2/personal/life-strategy")),
  },
  {
    href: "/v2/personal/brand",
    label: "Личный бренд",
    match: (p: string) => p.startsWith(appPath("/v2/personal/brand")),
  },
  {
    href: "/v2/personal/my-code",
    label: "Мой код",
    match: (p: string) => p.startsWith(appPath("/v2/personal/my-code")),
  },
  {
    href: "/v2/personal/strategy",
    label: "База данных",
    match: (p: string) =>
      p === appPath("/v2/personal/strategy") || p.startsWith(appPath("/v2/personal/strategy/")),
  },
] as const;

const DASHBOARD_TABS = [
  {
    href: "/v2/personal/dashboard/youtube",
    label: "YouTube",
    match: (p: string) => p.startsWith(appPath("/v2/personal/dashboard")),
  },
] as const;

const FINANCE_TABS = [
  {
    href: "/v2/personal/finance",
    label: "Финансы",
    match: (p: string) => p === appPath("/v2/personal/finance"),
  },
  {
    href: "/v2/personal/finance/forecast",
    label: "Прогноз",
    match: (p: string) => p.startsWith(appPath("/v2/personal/finance/forecast")),
  },
  {
    href: "/v2/personal/finance/transactions",
    label: "Транзакции",
    match: (p: string) => p.startsWith(appPath("/v2/personal/finance/transactions")),
  },
  {
    href: "/v2/personal/finance/accounts",
    label: "Счета и активы",
    match: (p: string) => p.startsWith(appPath("/v2/personal/finance/accounts")),
  },
  {
    href: "/v2/personal/finance/history",
    label: "История дохода",
    match: (p: string) => p.startsWith(appPath("/v2/personal/finance/history")),
  },
] as const;

function isStrategyBlockPath(pathname: string) {
  const strategyDb =
    pathname === appPath("/v2/personal/strategy") ||
    pathname.startsWith(appPath("/v2/personal/strategy/"));
  return (
    pathname.startsWith(appPath("/v2/personal/life-strategy")) ||
    pathname.startsWith(appPath("/v2/personal/brand")) ||
    pathname.startsWith(appPath("/v2/personal/my-code")) ||
    strategyDb
  );
}

export default function PersonalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const inFinance = pathname.startsWith(appPath("/v2/personal/finance"));
  const inTasks = pathname.startsWith(appPath("/v2/personal/tasks"));
  const inCalendar = pathname.startsWith(appPath("/v2/personal/calendar"));
  const inTime = pathname.startsWith(appPath("/v2/personal/time"));
  const inDashboard = pathname.startsWith(appPath("/v2/personal/dashboard"));
  const inObservations = pathname.startsWith(appPath("/v2/personal/observations"));
  if (inTasks || inCalendar || inTime || inObservations) {
    return <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>;
  }

  const inStrategy = isStrategyBlockPath(pathname);
  const tabs = inFinance
    ? FINANCE_TABS
    : inDashboard
      ? DASHBOARD_TABS
      : inStrategy
        ? STRATEGY_TABS
        : PERSONAL_TABS;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-[var(--v2-ink-100)] bg-white px-6">
        <div className="flex gap-1 py-2">
          {tabs.map((tab) => {
            const active = tab.match(pathname);
            return (
              <Link
                key={tab.href}
                href={appPath(tab.href)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
                  active
                    ? "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]"
                    : "text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-900)]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
