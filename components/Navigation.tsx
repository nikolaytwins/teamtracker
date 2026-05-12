"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import { canAccessPmBoard, type TtUserRole } from "@/lib/roles";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";

type MeUser = { name: string; title: string; avatarUrl: string | null; role?: TtUserRole | string };

type NavIconName =
  | "home"
  | "tasks"
  | "board"
  | "time"
  | "agency"
  | "profi"
  | "sales"
  | "team"
  | "load";

function NavGlyph({ name }: { name: NavIconName }) {
  const c = "h-[18px] w-[18px] shrink-0 stroke-[1.75]";
  switch (name) {
    case "home":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125a1.125 1.125 0 001.125 1.125H9.75v-4.875a.375.375 0 01.375-.375h3.75a.375.375 0 01.375.375V21h3.75a1.125 1.125 0 001.125-1.125V9.75M8.25 21h8.25"
          />
        </svg>
      );
    case "tasks":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "board":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75a2.25 2.25 0 012.25-2.25h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-2.25z" />
        </svg>
      );
    case "time":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "agency":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
        </svg>
      );
    case "profi":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
      );
    case "sales":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      );
    case "team":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      );
    case "load":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      );
    default:
      return null;
  }
}

function UserAccountOverflowMenu({
  onLogout,
  collapsed,
}: {
  onLogout: () => void | Promise<void>;
  collapsed: boolean;
}) {
  return (
    <div className={`group/user-menu relative shrink-0 ${collapsed ? "flex justify-center" : ""}`}>
      <button
        type="button"
        className="rounded-xl p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
        aria-label="Меню аккаунта"
        aria-haspopup="menu"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="5" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="12" cy="19" r="1.75" />
        </svg>
      </button>
      <div
        className={`pointer-events-none absolute bottom-full z-[85] flex opacity-0 invisible transition-opacity duration-150 group-hover/user-menu:pointer-events-auto group-hover/user-menu:visible group-hover/user-menu:opacity-100 group-focus-within/user-menu:pointer-events-auto group-focus-within/user-menu:visible group-focus-within/user-menu:opacity-100 ${
          collapsed ? "left-1/2 w-max -translate-x-1/2 pb-1.5" : "right-0 pb-1.5"
        }`}
      >
        <div
          role="menu"
          aria-label="Аккаунт"
          className="min-w-[9.5rem] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-elevated)]"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text)] transition-colors hover:bg-[var(--surface-2)]"
            onClick={() => void onLogout()}
          >
            <svg className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
}

function linkClass(active: boolean, collapsed?: boolean) {
  const c = Boolean(collapsed);
  return `group flex w-full items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all duration-200 ${
    c ? "justify-center px-2" : "px-3"
  } ${
    active
      ? "bg-[var(--surface)] text-[var(--primary)] shadow-[var(--shadow-card)] ring-1 ring-[var(--border)]"
      : "text-[var(--muted-foreground)] hover:bg-[var(--surface)]/90 hover:text-[var(--text)]"
  }`;
}

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<MeUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useLayoutEffect(() => {
    try {
      const raw = localStorage.getItem("tt_sidebar_collapsed");
      const c = raw === "1";
      setSidebarCollapsed(c);
      if (c) {
        document.documentElement.style.setProperty("--sidebar-w", "4.5rem");
      } else {
        document.documentElement.style.removeProperty("--sidebar-w");
      }
    } catch {
      /* ignore */
    }
  }, []);

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("tt_sidebar_collapsed", next ? "1" : "0");
        if (next) {
          document.documentElement.style.setProperty("--sidebar-w", "4.5rem");
        } else {
          document.documentElement.style.removeProperty("--sidebar-w");
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("tt_theme") : null;
    const initial: "light" | "dark" =
      saved === "dark" || saved === "light"
        ? saved
        : typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  useEffect(() => {
    void fetch(apiUrl("/api/auth/me"))
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setMe(d.user as MeUser);
        else setMe(null);
      })
      .catch(() => setMe(null));
  }, [pathname]);

  async function logout() {
    await fetch(apiUrl("/api/auth/logout"), { method: "POST" });
    router.push(appPath("/login"));
    router.refresh();
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("tt_theme", next);
  }

  const showAgencyNav = me != null && me.role === "admin";
  const isMemberUser = me?.role === "member";
  const showPmBoardNav = me != null && canAccessPmBoard(me.role as TtUserRole);
  const navItems: { href: string; label: string; active: boolean; icon: NavIconName }[] = isMemberUser
    ? [
        { href: appPath("/home"), label: "Главная", active: pathname === "/home" || (pathname?.startsWith("/home/") ?? false), icon: "home" },
        { href: appPath("/tasks"), label: "Задачи", active: pathname === "/tasks", icon: "tasks" },
      ]
    : [
        { href: appPath("/home"), label: "Главная", active: pathname === "/home" || (pathname?.startsWith("/home/") ?? false), icon: "home" },
        { href: appPath("/tasks"), label: "Задачи", active: pathname === "/tasks", icon: "tasks" },
        ...(showPmBoardNav
          ? [
              {
                href: appPath("/board"),
                label: "Проекты",
                active: pathname === "/board" || !!pathname?.startsWith("/board/"),
                icon: "board" as const,
              },
            ]
          : []),
      ];

  const adminItems: { href: string; label: string; active: boolean; icon: NavIconName }[] = showAgencyNav
    ? [
        { href: appPath("/agency"), label: "Проекты и финансы", active: pathname?.startsWith("/agency") ?? false, icon: "agency" },
        { href: appPath("/sales/profi"), label: "Profi.ru", active: pathname === "/sales/profi", icon: "profi" },
        {
          href: appPath("/sales/leads"),
          label: "Продажи",
          active: Boolean(pathname?.startsWith("/sales")) && pathname !== "/sales/profi",
          icon: "sales",
        },
        { href: appPath("/admin/dashboard"), label: "Дашборд", active: pathname?.startsWith("/admin") ?? false, icon: "team" },
      ]
    : [];

  function BrandMark({ compact }: { compact?: boolean }) {
    return (
      <Link href={appPath("/home")} className={`flex items-center gap-3 ${compact ? "" : ""}`}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30">
          <span className="text-sm font-bold tracking-tight">TT</span>
        </div>
        {!compact ? (
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold tracking-tight text-[var(--text)]">Team Tracker</div>
            <p className="text-[11px] text-[var(--muted-foreground)]">Профиль · проекты · финансы</p>
          </div>
        ) : null}
      </Link>
    );
  }

  function renderNavLinks(collapsed?: boolean) {
    const c = Boolean(collapsed);
    return (
      <>
        {navItems.map((item) => (
          <motion.div key={item.href} whileTap={{ scale: 0.98 }}>
            <Link
              href={item.href}
              className={linkClass(item.active, c)}
              title={c ? item.label : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <span className={item.active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)] group-hover:text-[var(--text)]"}>
                <NavGlyph name={item.icon} />
              </span>
              {!c && item.label}
            </Link>
          </motion.div>
        ))}
        {adminItems.length > 0 && !c ? (
          <div className="my-3 px-1">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Управление</p>
          </div>
        ) : adminItems.length > 0 && c ? (
          <div className="my-2 border-t border-[var(--border)] pt-2" aria-hidden />
        ) : null}
        {adminItems.map((item) => (
          <motion.div key={item.href} whileTap={{ scale: 0.98 }}>
            <Link
              href={item.href}
              className={linkClass(item.active, c)}
              title={c ? item.label : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <span className={item.active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)] group-hover:text-[var(--text)]"}>
                <NavGlyph name={item.icon} />
              </span>
              {!c && item.label}
            </Link>
          </motion.div>
        ))}
      </>
    );
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex min-h-14 items-center justify-between gap-3 px-4 pb-0.5">
          <BrandMark compact />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="tt-focus-ring min-h-11 min-w-11 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs font-medium text-[var(--muted-foreground)] sm:min-h-0 sm:min-w-0 sm:py-2"
            >
              {theme === "dark" ? "Светлая" : "Тёмная"}
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="tt-focus-ring min-h-11 min-w-11 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs font-medium text-[var(--muted-foreground)] sm:min-h-0 sm:min-w-0 sm:py-2"
            >
              Меню
            </button>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
          <motion.aside
            initial={{ x: -28, opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="absolute left-0 top-0 h-full w-[min(19rem,88vw)] border-r border-[var(--border)] bg-[var(--sidebar-bg)] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[var(--text)]">Разделы</span>
              <button type="button" onClick={() => setMobileOpen(false)} className="text-sm text-[var(--muted-foreground)]">
                Закрыть
              </button>
            </div>
            <nav className="flex flex-col gap-0.5">{renderNavLinks(false)}</nav>
          </motion.aside>
        </div>
      ) : null}

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-w)] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)]/95 px-2 py-6 backdrop-blur-xl transition-[width] duration-200 ease-out lg:flex lg:px-3">
        <div className="flex h-full min-h-0 flex-col">
          <div className={`mb-6 flex w-full gap-2 px-1 ${sidebarCollapsed ? "flex-col items-center" : "items-start justify-between"}`}>
            {sidebarCollapsed ? <BrandMark compact /> : (
              <div className="min-w-0 flex-1">
                <BrandMark />
              </div>
            )}
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className="tt-focus-ring shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              aria-expanded={!sidebarCollapsed}
              aria-label={sidebarCollapsed ? "Развернуть боковое меню" : "Свернуть боковое меню"}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                {sidebarCollapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                )}
              </svg>
            </button>
          </div>
          {!sidebarCollapsed ? (
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Рабочие места</p>
          ) : null}
          <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-0.5">{renderNavLinks(sidebarCollapsed)}</nav>
          <div className="mt-auto space-y-2 border-t border-[var(--border)] pt-4">
            {!sidebarCollapsed ? (
              <button
                type="button"
                onClick={toggleTheme}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)]"
              >
                <span className="text-base" aria-hidden>
                  {theme === "dark" ? "☀️" : "🌙"}
                </span>
                Тема: {theme === "dark" ? "тёмная" : "светлая"}
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleTheme}
                className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface)]"
                title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
              >
                <span className="text-lg" aria-hidden>
                  {theme === "dark" ? "☀️" : "🌙"}
                </span>
              </button>
            )}
            {me ? (
              <div
                className={
                  sidebarCollapsed
                    ? "flex flex-col items-center gap-2 border-0 bg-transparent p-0 shadow-none"
                    : "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)]"
                }
              >
                {sidebarCollapsed ? (
                  <div className="flex flex-col items-center gap-2">
                    <Link
                      href={appPath("/home")}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-xs font-semibold text-[var(--text)] hover:ring-2 hover:ring-[var(--primary-soft)]"
                      title={`${me.name} — главная`}
                    >
                      {me.avatarUrl ? (
                        <img src={me.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        me.name.charAt(0).toUpperCase()
                      )}
                    </Link>
                    <UserAccountOverflowMenu onLogout={logout} collapsed />
                  </div>
                ) : (
                  <div className="mb-0 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-xs font-semibold text-[var(--text)]">
                        {me.avatarUrl ? (
                          <img src={me.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          me.name.charAt(0).toUpperCase()
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[var(--text)]">{me.name}</div>
                        <div className="truncate text-xs text-[var(--muted-foreground)]">{me.title}</div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <UserAccountOverflowMenu onLogout={logout} collapsed={false} />
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
}
