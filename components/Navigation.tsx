"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type MeUser = { name: string; title: string; avatarUrl: string | null; role?: string };

type NtfItem = {
  id: string;
  type: string;
  payload: string;
  read_at: string | null;
  created_at: string;
};

type NavIconName = "me" | "board" | "time" | "calendar" | "agency" | "profi" | "sales" | "team" | "load";

function NavGlyph({ name }: { name: NavIconName }) {
  const c = "h-[18px] w-[18px] shrink-0 stroke-[1.75]";
  switch (name) {
    case "me":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
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
    case "calendar":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
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

function formatNtfText(n: NtfItem): string {
  try {
    const p = JSON.parse(n.payload) as Record<string, unknown>;
    if (n.type === "subtask_assigned") {
      const role = p.role === "lead" ? "лидом" : "исполнителем";
      const title = String(p.subtaskTitle ?? "подзадача");
      const card = String(p.cardName ?? "карточка");
      return `Вы назначены ${role}: «${title}» · ${card}`;
    }
    if (n.type === "approval_stale") {
      const card = String(p.cardName ?? "проект");
      const since = p.waitingSince ? new Date(String(p.waitingSince)).toLocaleDateString("ru-RU") : "";
      return since ? `Согласование «${card}» без ответа с ${since}` : `Согласование «${card}» — долго без ответа`;
    }
  } catch {
    /* ignore */
  }
  return n.type;
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
  const [ntfOpen, setNtfOpen] = useState(false);
  const [ntfItems, setNtfItems] = useState<NtfItem[]>([]);
  const [ntfUnread, setNtfUnread] = useState(0);
  const ntfWrapRef = useRef<HTMLDivElement>(null);
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

  const loadNotifications = useCallback(async () => {
    if (!me) return;
    const r = await fetch(apiUrl("/api/me/notifications"));
    if (!r.ok) return;
    const d = (await r.json()) as { items?: NtfItem[]; unreadCount?: number };
    setNtfItems(Array.isArray(d.items) ? d.items : []);
    setNtfUnread(typeof d.unreadCount === "number" ? d.unreadCount : 0);
  }, [me]);

  useEffect(() => {
    void loadNotifications();
  }, [me, pathname, loadNotifications]);

  useEffect(() => {
    if (!ntfOpen) return;
    function onDoc(e: MouseEvent) {
      if (!ntfWrapRef.current?.contains(e.target as Node)) setNtfOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [ntfOpen]);

  async function markRead(ids: string[]) {
    if (ids.length === 0) return;
    await fetch(apiUrl("/api/me/notifications"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    await loadNotifications();
  }

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
  const navItems: { href: string; label: string; active: boolean; icon: NavIconName }[] = isMemberUser
    ? [{ href: appPath("/me"), label: "Профиль", active: pathname === "/me", icon: "me" }]
    : [
        { href: appPath("/me"), label: "Профиль", active: pathname === "/me", icon: "me" },
        {
          href: appPath("/board"),
          label: "Канбан",
          active:
            pathname === "/board" ||
            (!!pathname?.startsWith("/board/") &&
              !pathname.startsWith("/board/time-analytics") &&
              !pathname.startsWith("/board/calendar") &&
              !pathname.startsWith("/board/team-load")),
          icon: "board",
        },
        {
          href: appPath("/board/time-analytics"),
          label: "Время",
          active: pathname === "/board/time-analytics",
          icon: "time",
        },
        {
          href: appPath("/board/calendar"),
          label: "Календарь",
          active: pathname?.startsWith("/board/calendar") ?? false,
          icon: "calendar",
        },
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
        { href: appPath("/admin/users"), label: "Команда", active: pathname?.startsWith("/admin") ?? false, icon: "team" },
        {
          href: appPath("/board/team-load"),
          label: "Загрузка",
          active: pathname?.startsWith("/board/team-load") ?? false,
          icon: "load",
        },
      ]
    : [];

  function BrandMark({ compact }: { compact?: boolean }) {
    return (
      <Link href={appPath("/me")} className={`flex items-center gap-3 ${compact ? "" : ""}`}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30">
          <span className="text-sm font-bold tracking-tight">TT</span>
        </div>
        {!compact ? (
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold tracking-tight text-[var(--text)]">Team Tracker</div>
            <p className="text-[11px] text-[var(--muted-foreground)]">Профиль · канбан · финансы</p>
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
                ref={ntfWrapRef}
                className={
                  sidebarCollapsed
                    ? "flex flex-col items-center gap-2 border-0 bg-transparent p-0 shadow-none"
                    : "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)]"
                }
              >
                {sidebarCollapsed ? (
                  <div className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNtfOpen((o) => !o)}
                      className="relative rounded-xl p-2.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface)]"
                      aria-label="Уведомления"
                      title="Уведомления"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                      </svg>
                      {ntfUnread > 0 ? (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--danger)] px-0.5 text-[10px] font-bold text-white">
                          {ntfUnread > 9 ? "9+" : ntfUnread}
                        </span>
                      ) : null}
                    </button>
                    <Link
                      href={appPath("/me")}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-xs font-semibold text-[var(--text)] hover:ring-2 hover:ring-[var(--primary-soft)]"
                      title={`${me.name} — профиль`}
                    >
                      {me.avatarUrl ? (
                        <img src={me.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        me.name.charAt(0).toUpperCase()
                      )}
                    </Link>
                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface)]"
                      title="Выйти"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex items-center justify-between gap-2">
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
                      <button
                        type="button"
                        onClick={() => setNtfOpen((o) => !o)}
                        className="relative shrink-0 rounded-xl p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-2)]"
                        aria-label="Уведомления"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                          />
                        </svg>
                        {ntfUnread > 0 ? (
                          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--danger)] px-0.5 text-[10px] font-bold text-white">
                            {ntfUnread > 9 ? "9+" : ntfUnread}
                          </span>
                        ) : null}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-left text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface)]"
                    >
                      Выйти
                    </button>
                  </>
                )}
                {ntfOpen ? (
                  <div
                    className={`max-h-72 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-elevated)] ${
                      sidebarCollapsed
                        ? "fixed bottom-4 z-[70] w-[min(20rem,calc(100vw-5.5rem))]"
                        : "mt-2"
                    }`}
                    style={
                      sidebarCollapsed
                        ? { left: "max(0.5rem, calc(var(--sidebar-w, 4.5rem) + 6px))" }
                        : undefined
                    }
                  >
                    <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
                      <span className="text-xs font-semibold text-[var(--text)]">Уведомления</span>
                      {ntfItems.some((x) => !x.read_at) ? (
                        <button
                          type="button"
                          className="text-xs font-medium text-[var(--primary)] hover:underline"
                          onClick={() => void markRead(ntfItems.filter((x) => !x.read_at).map((x) => x.id))}
                        >
                          Прочитать все
                        </button>
                      ) : null}
                    </div>
                    {ntfItems.length === 0 ? (
                      <p className="px-3 py-4 text-center text-sm text-[var(--muted-foreground)]">Пока пусто</p>
                    ) : (
                      <ul className="py-1">
                        {ntfItems.map((n) => (
                          <li key={n.id}>
                            <button
                              type="button"
                              className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-2)] ${
                                n.read_at ? "text-[var(--muted-foreground)]" : "font-medium text-[var(--text)]"
                              }`}
                              onClick={() => {
                                if (!n.read_at) void markRead([n.id]);
                                setNtfOpen(false);
                                router.push(appPath("/board"));
                              }}
                            >
                              {formatNtfText(n)}
                              <span className="mt-0.5 block text-[10px] text-[var(--muted-foreground)]">
                                {new Date(n.created_at).toLocaleString("ru-RU")}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
}
