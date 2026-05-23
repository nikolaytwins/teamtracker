"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import type { V2ProjectRow } from "@/lib/v2/types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CommandPalette } from "@/components/v2/shell/command-palette";

type Me = { id: string; name: string; role: string };
type Member = { user_id: string; display_name: string; role: string };

type V2Bootstrap = {
  me: Me | null;
  members: Member[];
  projects: V2ProjectRow[];
  loading: boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<V2Bootstrap>({
  me: null,
  members: [],
  projects: [],
  loading: true,
  refresh: async () => {},
});

export function useV2Bootstrap() {
  return useContext(Ctx);
}

const NAV = [
  { href: "/v2/home", label: "Главная", admin: false },
  { href: "/v2/inbox", label: "Входящие", admin: false },
  { href: "/v2/week", label: "Неделя", admin: false },
  { href: "/v2/calendar", label: "Календарь", admin: false },
  { href: "/v2/kanban", label: "Канбан", admin: false },
  { href: "/v2/projects", label: "Проекты", admin: false },
  { href: "/v2/admin/dashboard", label: "Дашборд", admin: true },
  { href: "/v2/admin/people", label: "Команда", admin: true },
  { href: "/v2/admin/activity", label: "Активность", admin: true },
  { href: "/v2/agency", label: "Финансы", admin: true },
  { href: "/v2/sales/leads", label: "Лиды", admin: true },
  { href: "/v2/sales/profi", label: "Profi.ru", admin: true },
];

export function V2AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<V2ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const refresh = useCallback(async () => {
    const [meRes, projRes] = await Promise.all([
      fetch(apiUrl("/api/v2/auth/me"), { credentials: "include" }).then((r) => r.json()),
      fetch(apiUrl("/api/v2/projects"), { credentials: "include" }).then((r) => r.json()),
    ]);
    setMe(meRes.user ?? null);
    setMembers(meRes.members ?? []);
    setProjects(projRes.projects ?? []);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isAdmin = me?.role === "admin";
  const nav = NAV.filter((n) => !n.admin || isAdmin);

  return (
    <Ctx.Provider value={{ me, members, projects, loading, refresh }}>
      <div className="flex min-h-screen">
        <aside className="flex w-[244px] shrink-0 flex-col bg-white shadow-[var(--v2-shadow-soft)]">
          <div className="px-3 pt-4">
            <div className="mb-3 flex items-center gap-2.5 px-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--v2-brand-500)] to-[var(--v2-brand-600)] text-xs font-bold text-white">
                Т
              </span>
              <span className="text-[13.5px] font-semibold tracking-tight">Тим v2</span>
            </div>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="mb-3 flex h-9 w-full items-center gap-2 rounded-lg bg-[var(--v2-ink-100)]/70 px-2.5 text-[12.5px] text-[var(--v2-ink-500)]"
            >
              Поиск… <span className="ml-auto font-mono text-[10px]">⌘K</span>
            </button>
            <nav className="space-y-0.5">
              {nav.map((item) => {
                const active = pathname === appPath(item.href) || pathname?.startsWith(appPath(item.href + "/"));
                return (
                  <Link
                    key={item.href}
                    href={appPath(item.href)}
                    className={`flex h-9 items-center rounded-lg px-3 text-[13px] font-medium ${
                      active
                        ? "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]"
                        : "text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mb-2 mt-4 px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
              Проекты
            </div>
            <div className="max-h-40 space-y-0.5 overflow-y-auto px-1 pb-2">
              {projects
                .filter((p) => p.scope === "team")
                .map((p) => (
                  <Link
                    key={p.id}
                    href={appPath(`/v2/projects?project=${p.id}`)}
                    className="flex h-8 items-center gap-2 rounded-lg px-2 text-[13px] hover:bg-[var(--v2-ink-50)]"
                  >
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold"
                      style={{ background: p.color_bg ?? "#eee", color: p.color_tint ?? "#333" }}
                    >
                      {p.short_name}
                    </span>
                    <span className="truncate">{p.name}</span>
                  </Link>
                ))}
            </div>
          </div>
          {me && (
            <div className="mt-auto border-t px-3 py-3 text-[13px] font-medium">{me.name}</div>
          )}
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </Ctx.Provider>
  );
}
