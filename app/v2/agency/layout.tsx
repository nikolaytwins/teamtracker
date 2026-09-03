"use client";

import { appPath } from "@/lib/api-url";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/v2/agency/overview",
    label: "Агентство",
    match: (p: string) => p.startsWith(appPath("/v2/agency/overview")),
  },
  {
    href: "/v2/agency",
    label: "Все направления",
    match: (p: string) =>
      p === appPath("/v2/agency") || p.startsWith(appPath("/v2/agency/projects")),
  },
  {
    href: "/v2/agency/kanban",
    label: "Канбан",
    match: (p: string) => p.startsWith(appPath("/v2/agency/kanban")),
  },
  {
    href: "/v2/agency/plan",
    label: "План",
    match: (p: string) => p.startsWith(appPath("/v2/agency/plan")),
  },
  {
    href: "/v2/agency/sofia",
    label: "София",
    match: (p: string) => p.startsWith(appPath("/v2/agency/sofia")),
  },
] as const;

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-[var(--v2-ink-100)] bg-white px-6">
        <div className="flex gap-1 py-2">
          {TABS.map((tab) => {
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
