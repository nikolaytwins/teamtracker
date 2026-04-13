"use client";

import AppShell from "@/components/AppShell";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/sales/profi", label: "Profi.ru" },
  { href: "/sales/leads", label: "Лиды" },
  { href: "/sales/threads", label: "Threads" },
  { href: "/sales/analytics", label: "Аналитика" },
];

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AppShell>
      <div className="bg-[var(--bg)] border-b border-[var(--border)] rounded-xl">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs text-[var(--muted-foreground)] pt-3">Продажи</p>
          <div className="flex flex-wrap gap-x-8 gap-y-1">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`py-3 px-1 border-b-2 text-sm font-medium ${
                  pathname === tab.href
                    ? "border-[var(--primary)] text-[var(--primary)]"
                    : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--text)] hover:border-[var(--border)]"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </AppShell>
  );
}
