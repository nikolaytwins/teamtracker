"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type MeUser = { name: string; title: string; avatarUrl: string | null; role?: string };

type NtfItem = {
  id: string;
  type: string;
  payload: string;
  read_at: string | null;
  created_at: string;
};

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

  const linkClass = (active: boolean) =>
    `inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${
      active
        ? "bg-[var(--primary-soft)] text-[var(--primary)]"
        : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
    }`;

  const showAgencyNav = me != null && me.role === "admin";
  const isMemberUser = me?.role === "member";
  const navItems = isMemberUser
    ? [{ href: appPath("/me"), label: "Профиль", active: pathname === "/me" }]
    : [
        { href: appPath("/me"), label: "Профиль", active: pathname === "/me" },
        { href: appPath("/board"), label: "Канбан", active: pathname === "/board" },
        { href: appPath("/board/time-analytics"), label: "Время", active: pathname === "/board/time-analytics" },
        { href: appPath("/board/calendar"), label: "Календарь", active: pathname?.startsWith("/board/calendar") ?? false },
      ];

  const adminItems = showAgencyNav
    ? [
        { href: appPath("/agency"), label: "Проекты и финансы", active: pathname?.startsWith("/agency") ?? false },
        { href: appPath("/sales/profi"), label: "Profi.ru", active: pathname === "/sales/profi" },
        {
          href: appPath("/sales/leads"),
          label: "Продажи",
          active: Boolean(pathname?.startsWith("/sales")) && pathname !== "/sales/profi",
        },
        { href: appPath("/admin/users"), label: "Команда", active: pathname?.startsWith("/admin") ?? false },
        { href: appPath("/board/team-load"), label: "Загрузка", active: pathname?.startsWith("/board/team-load") ?? false },
      ]
    : [];

  function renderNavLinks() {
    return (
      <>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.active)} onClick={() => setMobileOpen(false)}>
            {item.label}
          </Link>
        ))}
        {adminItems.length > 0 ? <div className="my-2 border-t border-[var(--border)]" /> : null}
        {adminItems.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.active)} onClick={() => setMobileOpen(false)}>
            {item.label}
          </Link>
        ))}
      </>
    );
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex h-14 max-w-[1800px] items-center justify-between px-4">
          <Link href={appPath("/me")} className="text-base font-semibold text-[var(--text)]">
            Team Tracker
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--muted)]"
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--muted)]"
            >
              Меню
            </button>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside
            className="absolute right-0 top-0 h-full w-72 border-l border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold text-[var(--text)]">Навигация</span>
              <button type="button" onClick={() => setMobileOpen(false)} className="text-sm text-[var(--muted)]">
                Закрыть
              </button>
            </div>
            <nav className="flex flex-col gap-1">{renderNavLinks()}</nav>
          </aside>
        </div>
      ) : null}

      <aside className="fixed inset-y-0 right-0 z-30 hidden w-72 border-l border-[var(--border)] bg-[var(--surface)] px-4 py-5 lg:block">
        <div className="flex h-full flex-col">
          <div className="mb-5">
            <Link href={appPath("/me")} className="text-lg font-bold text-[var(--text)]">
              Team Tracker
            </Link>
          </div>
          <nav className="flex flex-1 flex-col gap-1">{renderNavLinks()}</nav>
          <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-left text-sm text-[var(--muted)] hover:bg-[var(--surface-2)]"
            >
              Тема: {theme === "dark" ? "тёмная" : "светлая"}
            </button>
            {me ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold text-[var(--text)]">
                      {me.avatarUrl ? (
                        <img src={me.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        me.name.charAt(0).toUpperCase()
                      )}
                    </span>
                    <div>
                      <div className="max-w-[9rem] truncate text-sm font-medium text-[var(--text)]">{me.name}</div>
                      <div className="text-xs text-[var(--muted)]">{me.title}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNtfOpen((o) => !o)}
                    className="relative rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface)]"
                    aria-label="Уведомления"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                    {ntfUnread > 0 ? (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white">
                        {ntfUnread > 9 ? "9+" : ntfUnread}
                      </span>
                    ) : null}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-xs text-[var(--muted)] hover:bg-[var(--surface-2)]"
                >
                  Выйти
                </button>
                {ntfOpen ? (
                  <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                    <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
                      <span className="text-xs font-semibold text-[var(--text)]">Уведомления</span>
                      {ntfItems.some((x) => !x.read_at) ? (
                        <button
                          type="button"
                          className="text-xs text-[var(--primary)] hover:underline"
                          onClick={() => void markRead(ntfItems.filter((x) => !x.read_at).map((x) => x.id))}
                        >
                          Прочитать все
                        </button>
                      ) : null}
                    </div>
                    {ntfItems.length === 0 ? (
                      <p className="px-3 py-4 text-center text-sm text-[var(--muted)]">Пока пусто</p>
                    ) : (
                      <ul className="py-1">
                        {ntfItems.map((n) => (
                          <li key={n.id}>
                            <button
                              type="button"
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)] ${
                                n.read_at ? "text-[var(--muted)]" : "font-medium text-[var(--text)]"
                              }`}
                              onClick={() => {
                                if (!n.read_at) void markRead([n.id]);
                                setNtfOpen(false);
                                router.push(appPath("/board"));
                              }}
                            >
                              {formatNtfText(n)}
                              <span className="mt-0.5 block text-[10px] text-[var(--muted)]">
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
