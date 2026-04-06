"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  const linkClass = (active: boolean) =>
    `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium whitespace-nowrap ${
      active
        ? "border-blue-500 text-gray-900"
        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
    }`;

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-y-2 min-h-14 py-2 sm:min-h-16 sm:py-0">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/board" className="text-lg font-bold text-gray-900 shrink-0">
              Team Tracker
            </Link>
            <div className="flex flex-wrap items-center gap-x-6">
              <Link
                href="/board"
                className={linkClass(pathname === "/board")}
              >
                Канбан
              </Link>
              <Link
                href="/agency"
                className={linkClass(pathname?.startsWith("/agency") ?? false)}
              >
                Проекты и финансы
              </Link>
              <Link
                href="/sales/leads"
                className={linkClass(pathname?.startsWith("/sales") ?? false)}
              >
                Продажи
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
