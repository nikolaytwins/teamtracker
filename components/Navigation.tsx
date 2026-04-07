"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type MeUser = { name: string; title: string; avatarUrl: string | null };

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<MeUser | null>(null);

  useEffect(() => {
    void fetch(apiUrl("/api/auth/me"))
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setMe(d.user);
        else setMe(null);
      })
      .catch(() => setMe(null));
  }, [pathname]);

  async function logout() {
    await fetch(apiUrl("/api/auth/logout"), { method: "POST" });
    router.push(appPath("/login"));
    router.refresh();
  }

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
            <Link href={appPath("/me")} className="text-lg font-bold text-gray-900 shrink-0">
              Team Tracker
            </Link>
            <div className="flex flex-wrap items-center gap-x-6">
              <Link href={appPath("/me")} className={linkClass(pathname === "/me")}>
                Профиль
              </Link>
              <Link
                href={appPath("/board")}
                className={linkClass(pathname === "/board")}
              >
                Канбан
              </Link>
              <Link
                href={appPath("/board/time-analytics")}
                className={linkClass(pathname === "/board/time-analytics")}
              >
                Время
              </Link>
              <Link
                href={appPath("/agency")}
                className={linkClass(pathname?.startsWith("/agency") ?? false)}
              >
                Проекты и финансы
              </Link>
              <Link
                href={appPath("/sales/leads")}
                className={linkClass(pathname?.startsWith("/sales") ?? false)}
              >
                Продажи
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {me ? (
              <>
                <Link
                  href={appPath("/me")}
                  className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-gray-100 transition-colors"
                  title="Профиль"
                >
                  <span className="w-9 h-9 rounded-full bg-gray-200 border border-gray-300 overflow-hidden flex items-center justify-center text-sm font-semibold text-gray-700">
                    {me.avatarUrl ? (
                      <img src={me.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      me.name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="hidden sm:inline text-sm font-medium text-gray-800 max-w-[10rem] truncate">
                    {me.name}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="text-xs text-gray-500 hover:text-gray-800"
                >
                  Выйти
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}
