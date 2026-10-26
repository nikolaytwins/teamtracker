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
] as const;

const ARTICLE_TABS = [
  {
    href: "/v2/personal/articles",
    label: "Все",
    match: (p: string) => p === "/v2/personal/articles" || p === appPath("/v2/personal/articles"),
  },
  {
    href: "/v2/personal/sexuality",
    label: "Сексуальность",
    match: (p: string) =>
      p.startsWith("/v2/personal/sexuality") || p.startsWith(appPath("/v2/personal/sexuality")),
  },
  {
    href: "/v2/personal/manifestations",
    label: "Манифестации",
    match: (p: string) =>
      p.startsWith("/v2/personal/manifestations") || p.startsWith(appPath("/v2/personal/manifestations")),
  },
  {
    href: "/v2/personal/life-goals",
    label: "Цели",
    match: (p: string) =>
      p.startsWith("/v2/personal/life-goals") || p.startsWith(appPath("/v2/personal/life-goals")),
  },
  {
    href: "/v2/personal/game",
    label: "Игра",
    match: (p: string) => p.startsWith("/v2/personal/game") || p.startsWith(appPath("/v2/personal/game")),
  },
  {
    href: "/v2/personal/moscow",
    label: "Москва",
    match: (p: string) => p.startsWith("/v2/personal/moscow") || p.startsWith(appPath("/v2/personal/moscow")),
  },
  {
    href: "/v2/personal/manifest",
    label: "Манифест",
    match: (p: string) => isManifestArticle(p),
  },
  {
    href: "/v2/personal/articles/rostov-content-plan",
    label: "Контент-план",
    match: (p: string) =>
      p.startsWith("/v2/personal/articles/rostov-content-plan") ||
      p.startsWith(appPath("/v2/personal/articles/rostov-content-plan")),
  },
  {
    href: "/v2/personal/articles/rostov-ugc",
    label: "UGC",
    match: (p: string) =>
      p.startsWith("/v2/personal/articles/rostov-ugc") ||
      p.startsWith(appPath("/v2/personal/articles/rostov-ugc")),
  },
] as const;

function isManifestArticle(pathname: string) {
  const prefixed = appPath("/v2/personal/manifest");
  return (
    pathname === "/v2/personal/manifest" ||
    pathname.startsWith("/v2/personal/manifest/") ||
    pathname === prefixed ||
    pathname.startsWith(`${prefixed}/`)
  );
}

const MANIFEST_TABS = [
  {
    href: "/v2/personal/manifest",
    label: "Манифест",
    match: (p: string) => p.startsWith(appPath("/v2/personal/manifest")),
  },
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
    href: "/v2/personal/finance/assistant",
    label: "Помощник",
    match: (p: string) => p.startsWith(appPath("/v2/personal/finance/assistant")),
  },
  {
    href: "/v2/personal/finance/system",
    label: "Финансовая система",
    match: (p: string) => p.startsWith(appPath("/v2/personal/finance/system")),
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

function isManifestBlockPath(pathname: string) {
  const strategyDb =
    pathname === appPath("/v2/personal/strategy") ||
    pathname.startsWith(appPath("/v2/personal/strategy/"));
  return (
    (pathname.startsWith(appPath("/v2/personal/manifest")) &&
      !pathname.startsWith(appPath("/v2/personal/manifestations")) &&
      !isManifestArticle(pathname)) ||
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
  const inSport = pathname.startsWith(appPath("/v2/personal/sport"));
  const inIdeasTasks = pathname.startsWith(appPath("/v2/personal/ideas-tasks"));
  const inHypotheses =
    pathname.startsWith("/v2/personal/hypotheses") ||
    pathname.startsWith(appPath("/v2/personal/hypotheses"));
  const inGoals =
    pathname.startsWith("/v2/personal/goals") || pathname.startsWith(appPath("/v2/personal/goals"));
  const inWishGoal =
    pathname.startsWith("/v2/personal/wishes/") ||
    pathname.startsWith(appPath("/v2/personal/wishes/"));
  const inArticles =
    pathname.startsWith("/v2/personal/articles") ||
    pathname.startsWith(appPath("/v2/personal/articles")) ||
    pathname.startsWith("/v2/personal/life-goals") ||
    pathname.startsWith(appPath("/v2/personal/life-goals")) ||
    pathname.startsWith("/v2/personal/manifestations") ||
    pathname.startsWith(appPath("/v2/personal/manifestations")) ||
    pathname.startsWith("/v2/personal/sexuality") ||
    pathname.startsWith(appPath("/v2/personal/sexuality")) ||
    pathname.startsWith("/v2/personal/game") ||
    pathname.startsWith(appPath("/v2/personal/game")) ||
    pathname.startsWith("/v2/personal/moscow") ||
    pathname.startsWith(appPath("/v2/personal/moscow")) ||
    isManifestArticle(pathname);
  const inLifeImportant =
    pathname.startsWith("/v2/personal/life-important") ||
    pathname.startsWith(appPath("/v2/personal/life-important")) ||
    pathname.startsWith("/v2/personal/important") ||
    pathname.startsWith(appPath("/v2/personal/important"));
  if (
    inTasks ||
    inCalendar ||
    inTime ||
    inObservations ||
    inSport ||
    inIdeasTasks ||
    inHypotheses ||
    inGoals ||
    inWishGoal ||
    inLifeImportant
  ) {
    return <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>;
  }

  const inManifest = isManifestBlockPath(pathname);
  const tabs = inFinance
    ? FINANCE_TABS
    : inDashboard
      ? DASHBOARD_TABS
      : inArticles
        ? ARTICLE_TABS
        : inManifest
          ? MANIFEST_TABS
          : PERSONAL_TABS;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="sticky top-0 z-30 shrink-0 border-b border-[var(--v2-ink-100)] bg-white/95 backdrop-blur lg:static lg:bg-white lg:px-6 lg:backdrop-blur-none">
        <div className="v2-no-scrollbar flex snap-x gap-1 overflow-x-auto px-3 py-2 lg:overflow-visible lg:px-0">
          {tabs.map((tab) => {
            const active = tab.match(pathname);
            return (
              <Link
                key={tab.href}
                href={appPath(tab.href)}
                ref={active ? (node) => node?.scrollIntoView({ block: "nearest", inline: "center" }) : undefined}
                className={`shrink-0 snap-start whitespace-nowrap rounded-lg px-3.5 py-2.5 text-[14px] font-medium transition lg:px-3 lg:py-1.5 lg:text-[13px] ${
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
