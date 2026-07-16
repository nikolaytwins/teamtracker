"use client";

import { appPath } from "@/lib/api-url";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/v2/personal/tasks/inbox",
    label: "Задачи",
    match: (p: string) => p.includes(appPath("/v2/personal/tasks")),
  },
  {
    href: "/v2/personal/finance",
    label: "Финансы",
    match: (p: string) => p === appPath("/v2/personal/finance"),
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

export default function PersonalLayout({ children }: { children: React.ReactNode }) {
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
