"use client";

import { appPath } from "@/lib/api-url";
import { V2Icons } from "@/components/v2/ui/icons";
import type { V2ShellUser } from "@/components/v2/shell/v2-user-account-menu";
import { userInitials } from "@/lib/v2/format";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof V2Icons;
};

const SECTION_PREFIXES: Record<string, string[]> = {
  "/v2/agency/plan": ["/v2/agency/plan", "/v2/personal/ideas-tasks", "/v2/personal/tasks"],
  "/v2/agency/overview": ["/v2/agency/overview", "/v2/agency/impulse", "/v2/agency/projects"],
  "/v2/personal/finance": ["/v2/personal/finance"],
  "/v2/personal/goals": ["/v2/personal/goals", "/v2/personal/wishes"],
  "/v2/personal/articles": [
    "/v2/personal/articles",
    "/v2/personal/sexuality",
    "/v2/personal/manifestations",
    "/v2/personal/life-goals",
    "/v2/personal/game",
    "/v2/personal/important",
    "/v2/personal/moscow",
    "/v2/personal/manifest",
  ],
};

function isActive(href: string, pathname: string) {
  const prefixes = SECTION_PREFIXES[href] ?? [href];
  if (href === "/v2/agency/overview" && pathname === appPath("/v2/agency")) return true;
  return prefixes.some((prefix) => {
    const full = appPath(prefix);
    return pathname === full || pathname.startsWith(`${full}/`);
  });
}

const TAB_ORDER = ["/v2/home", "/v2/agency/plan", "/v2/personal/finance", "/v2/personal/hypotheses"];

function MenuGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function V2MobileNav({
  nav,
  personalNav,
  footerNav,
  me,
  roleLabel,
  canCreateTask,
  onOpenSearch,
  onNewTask,
  onOpenProfile,
  onLogout,
}: {
  nav: NavItem[];
  personalNav: NavItem[];
  footerNav: NavItem[];
  me: V2ShellUser | null;
  roleLabel: string;
  canCreateTask: boolean;
  onOpenSearch: () => void;
  onNewTask: () => void;
  onOpenProfile: () => void;
  onLogout: () => void | Promise<void>;
}) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const all = [...nav, ...personalNav, ...footerNav];
  const tabs = TAB_ORDER.map((href) => all.find((item) => item.href === href)).filter(
    (item): item is NavItem => Boolean(item)
  );
  const tabHrefs = new Set(tabs.map((item) => item.href));
  const menuActive = !tabs.some((item) => isActive(item.href, pathname));

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--v2-ink-100)] bg-white/95 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Основная навигация"
      >
        <div className="mx-auto flex h-16 max-w-xl items-stretch px-1">
          {tabs.map((item) => {
            const Icon = V2Icons[item.icon];
            const active = isActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={appPath(item.href)}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition active:bg-[var(--v2-ink-50)] ${
                  active ? "text-[var(--v2-brand-700)]" : "text-[var(--v2-ink-500)]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={`h-[22px] w-[22px] ${active ? "text-[var(--v2-brand-600)]" : ""}`} />
                <span className="max-w-full truncate px-1">{item.label === "План и задачи" ? "План" : item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition active:bg-[var(--v2-ink-50)] ${
              menuActive || open ? "text-[var(--v2-brand-700)]" : "text-[var(--v2-ink-500)]"
            }`}
            aria-expanded={open}
            aria-label="Открыть меню"
          >
            <MenuGlyph className="h-[22px] w-[22px]" />
            <span>Меню</span>
          </button>
        </div>
      </nav>

      {open ? (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Меню">
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(10,10,11,0.38)]"
            onClick={() => setOpen(false)}
            aria-label="Закрыть меню"
          />
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[26px] bg-white shadow-[var(--v2-shadow-pop)]"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
          >
            <div className="flex items-center gap-3 px-5 pb-2 pt-3">
              <span className="mx-auto h-1.5 w-10 rounded-full bg-[var(--v2-ink-200)]" aria-hidden />
            </div>
            <div className="flex items-center gap-3 px-5 pb-3">
              {me ? (
                <button type="button" onClick={() => run(onOpenProfile)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  {me.avatarUrl?.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={me.avatarUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--v2-brand-400)] to-[var(--v2-brand-600)] text-[14px] font-semibold text-white">
                      {userInitials(me.name)}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="v2-tight block truncate text-[16px] font-semibold text-[var(--v2-ink-900)]">{me.name}</span>
                    <span className="block truncate text-[13px] text-[var(--v2-ink-500)]">{me.title?.trim() || roleLabel}</span>
                  </span>
                </button>
              ) : (
                <span className="v2-tight flex-1 text-[16px] font-semibold">Тим Трекер</span>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--v2-ink-100)] text-[var(--v2-ink-700)]"
                aria-label="Закрыть"
              >
                <CloseGlyph className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => run(onOpenSearch)}
                  className="flex h-12 items-center gap-2.5 rounded-2xl bg-[var(--v2-ink-100)] px-4 text-[15px] font-medium text-[var(--v2-ink-700)]"
                >
                  <V2Icons.search className="h-[18px] w-[18px]" />
                  Поиск
                </button>
                {canCreateTask ? (
                  <button
                    type="button"
                    onClick={() => run(onNewTask)}
                    className="flex h-12 items-center gap-2.5 rounded-2xl bg-[var(--v2-ink-900)] px-4 text-[15px] font-medium text-white"
                  >
                    <V2Icons.plus className="h-[18px] w-[18px]" />
                    Новая задача
                  </button>
                ) : null}
              </div>

              <MenuGroup title="Разделы" items={nav.filter((item) => !tabHrefs.has(item.href))} pathname={pathname} />
              <MenuGroup title="Личное" items={personalNav.filter((item) => !tabHrefs.has(item.href))} pathname={pathname} />
              <MenuGroup title="Ассистент" items={footerNav.filter((item) => !tabHrefs.has(item.href))} pathname={pathname} />

              {me ? (
                <button
                  type="button"
                  onClick={() => run(() => void onLogout())}
                  className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl text-[15px] font-medium text-[var(--v2-ink-500)] active:bg-[var(--v2-ink-50)]"
                >
                  Выйти
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function MenuGroup({ title, items, pathname }: { title: string; items: NavItem[]; pathname: string }) {
  if (!items.length) return null;
  return (
    <div className="mt-5">
      <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">{title}</div>
      <div className="overflow-hidden rounded-2xl bg-[var(--v2-ink-50)]">
        {items.map((item) => {
          const Icon = V2Icons[item.icon];
          const active = isActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={appPath(item.href)}
              className={`flex h-[52px] items-center gap-3 border-b border-white px-4 text-[16px] font-medium last:border-b-0 active:bg-[var(--v2-ink-100)] ${
                active ? "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]" : "text-[var(--v2-ink-800)]"
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${active ? "text-[var(--v2-brand-600)]" : "text-[var(--v2-ink-500)]"}`} />
              <span className="flex-1 truncate">{item.label}</span>
              <V2Icons.chevR className="h-4 w-4 text-[var(--v2-ink-300)]" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
