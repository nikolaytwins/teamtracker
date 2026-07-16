"use client";

import { appPath } from "@/lib/api-url";
import type { V2ProjectRow } from "@/lib/v2/types";
import {
  readNavPinnedProjects,
  readNavProjectsExpanded,
  readSidebarCollapsed,
  writeNavPinnedProjects,
  writeNavProjectsExpanded,
  writeSidebarCollapsed,
} from "@/lib/v2/shell/nav-storage";
import { V2UserAccountMenu, type V2ShellUser } from "@/components/v2/shell/v2-user-account-menu";
import { V2Icons } from "@/components/v2/ui/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof V2Icons;
  countKey?: "open";
  admin?: boolean;
};

function NavLink({
  item,
  active,
  count,
}: {
  item: NavItem;
  active: boolean;
  count?: number;
}) {
  const Icon = V2Icons[item.icon];
  return (
    <Link
      href={appPath(item.href)}
      className={`group flex h-9 w-full items-center gap-3 rounded-lg px-3 text-[13.5px] transition v2-tight ${
        active
          ? "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]"
          : "text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-900)]"
      }`}
    >
      <Icon
        className={`h-[18px] w-[18px] shrink-0 ${
          active ? "text-[var(--v2-brand-600)]" : "text-[var(--v2-ink-500)] group-hover:text-[var(--v2-ink-800)]"
        }`}
      />
      <span className="flex-1 truncate text-left font-medium">{item.label}</span>
      {count != null && count > 0 ? (
        <span
          className={`v2-tnum shrink-0 rounded-md px-1.5 py-0.5 text-[11px] ${
            active ? "bg-white text-[var(--v2-brand-700)]" : "bg-[var(--v2-ink-100)] text-[var(--v2-ink-600)] group-hover:bg-white"
          }`}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}

function ProjectNavLink({
  project,
  taskCount,
  active,
  pinned,
  onTogglePin,
}: {
  project: V2ProjectRow;
  taskCount: number;
  active: boolean;
  pinned: boolean;
  onTogglePin: () => void;
}) {
  return (
    <div
      className={`group flex h-8 w-full items-center gap-1 rounded-lg pr-1 transition ${
        active ? "bg-[var(--v2-brand-50)]" : "hover:bg-[var(--v2-ink-50)]"
      }`}
    >
      <Link
        href={appPath(`/v2/projects/${project.id}`)}
        className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] ${
          active ? "text-[var(--v2-brand-700)]" : "text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
        }`}
      >
        <span
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold"
          style={{
            background: project.color_bg ?? "#eee",
            color: project.color_ink ?? project.color_tint ?? "#333",
          }}
        >
          {project.short_name ?? project.name.slice(0, 1)}
        </span>
        <span className="v2-tight truncate text-left font-medium">{project.name}</span>
        <span className={`v2-tnum shrink-0 text-[11px] ${active ? "text-[var(--v2-brand-600)]" : "text-[var(--v2-ink-400)]"}`}>
          {taskCount}
        </span>
      </Link>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onTogglePin();
        }}
        title={pinned ? "Открепить" : "Закрепить в меню"}
        className={`mr-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition ${
          pinned
            ? "text-amber-500 opacity-100"
            : "text-[var(--v2-ink-400)] opacity-0 group-hover:opacity-100 hover:bg-white hover:text-amber-500"
        }`}
      >
        {pinned ? <V2Icons.starFill className="h-3.5 w-3.5" /> : <V2Icons.star className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

export function V2ShellSidebar({
  nav,
  personalNav = [],
  teamProjects,
  taskCounts,
  me,
  roleLabel,
  onOpenSearch,
  onOpenProfile,
  onLogout,
}: {
  nav: NavItem[];
  personalNav?: NavItem[];
  teamProjects: V2ProjectRow[];
  taskCounts: { open: number; byProject: Record<string, number> };
  me: V2ShellUser | null;
  roleLabel: string;
  onOpenSearch: () => void;
  onOpenProfile: () => void;
  onLogout: () => void | Promise<void>;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(readSidebarCollapsed());
    setProjectsExpanded(readNavProjectsExpanded());
    setPinnedIds(readNavPinnedProjects());
    setHydrated(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      writeSidebarCollapsed(next);
      return next;
    });
  }, []);

  const toggleProjectsExpanded = useCallback(() => {
    setProjectsExpanded((prev) => {
      const next = !prev;
      writeNavProjectsExpanded(next);
      return next;
    });
  }, []);

  const togglePin = useCallback((projectId: string) => {
    setPinnedIds((prev) => {
      const next = prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId];
      writeNavPinnedProjects(next);
      return next;
    });
  }, []);

  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);

  const { pinnedProjects, otherProjects } = useMemo(() => {
    const pinned: V2ProjectRow[] = [];
    const other: V2ProjectRow[] = [];
    const byId = new Map(teamProjects.map((p) => [p.id, p]));
    for (const id of pinnedIds) {
      const p = byId.get(id);
      if (p) pinned.push(p);
    }
    for (const p of teamProjects) {
      if (!pinnedSet.has(p.id)) other.push(p);
    }
    return { pinnedProjects: pinned, otherProjects: other };
  }, [teamProjects, pinnedIds, pinnedSet]);

  const showOtherProjects = projectsExpanded && otherProjects.length > 0;

  if (!hydrated) {
    return <aside className="w-[244px] shrink-0 bg-white shadow-[var(--v2-shadow-soft)]" aria-hidden />;
  }

  if (collapsed) {
    return (
      <>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="fixed left-3 top-4 z-40 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[var(--v2-ink-600)] shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-900)]"
          title="Показать меню"
          aria-label="Показать меню"
        >
          <V2Icons.chevR className="h-4 w-4" />
        </button>
        {pinnedProjects.length > 0 ? (
          <aside className="fixed left-3 top-16 z-40 flex w-10 flex-col gap-1 rounded-xl bg-white p-1 shadow-[var(--v2-shadow-card)]">
            {pinnedProjects.map((p) => {
              const active =
                pathname === appPath(`/v2/projects/${p.id}`) ||
                (pathname?.startsWith(appPath(`/v2/projects/${p.id}/`)) ?? false);
              return (
                <Link
                  key={p.id}
                  href={appPath(`/v2/projects/${p.id}`)}
                  title={p.name}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-semibold transition ${
                    active ? "ring-2 ring-[var(--v2-brand-400)]" : "hover:opacity-90"
                  }`}
                  style={{
                    background: p.color_bg ?? "#eee",
                    color: p.color_ink ?? p.color_tint ?? "#333",
                  }}
                >
                  {p.short_name ?? p.name.slice(0, 1)}
                </Link>
              );
            })}
          </aside>
        ) : null}
        {me ? (
          <div className="fixed bottom-4 left-3 z-40 rounded-xl bg-white p-1 shadow-[var(--v2-shadow-card)]">
            <V2UserAccountMenu
              user={me}
              roleLabel={roleLabel}
              compact
              onOpenProfile={onOpenProfile}
              onLogout={onLogout}
            />
          </div>
        ) : null}
      </>
    );
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[244px] shrink-0 flex-col gap-1 overflow-y-auto bg-white px-3 pb-3 pt-4 shadow-[var(--v2-shadow-soft)]">
      <div className="mb-2 flex items-center gap-1">
        <Link
          href={appPath("/v2/home")}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-[var(--v2-ink-50)]"
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--v2-brand-500)] to-[var(--v2-brand-600)] text-white shadow-[var(--v2-shadow-glow)]">
            <V2Icons.logo className="h-[18px] w-[18px]" />
          </span>
          <span className="v2-tight truncate text-[13.5px] font-semibold text-[var(--v2-ink-900)]">Тим Трекер</span>
        </Link>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--v2-ink-400)] transition hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-900)]"
          title="Скрыть меню"
          aria-label="Скрыть меню"
        >
          <V2Icons.chevL className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={onOpenSearch}
        className="mb-3 flex h-9 items-center gap-2 rounded-lg bg-[var(--v2-ink-100)]/70 px-2.5 text-[var(--v2-ink-500)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-700)]"
      >
        <V2Icons.search className="h-[15px] w-[15px]" />
        <span className="text-[12.5px]">Найти задачу…</span>
        <span className="ml-auto rounded-md bg-white px-1.5 py-px font-mono text-[10.5px] tracking-wider text-[var(--v2-ink-400)]">
          ⌘K
        </span>
      </button>

      <nav className="space-y-0.5">
        {nav.map((item) => {
          const active = pathname === appPath(item.href) || pathname?.startsWith(appPath(item.href + "/"));
          const count = item.countKey === "open" ? taskCounts.open : undefined;
          return <NavLink key={item.href} item={item} active={!!active} count={count} />;
        })}
      </nav>

      {personalNav.length > 0 ? (
        <div className="mt-4">
          <div className="mb-1 px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
            Личное
          </div>
          <nav className="space-y-0.5">
            {personalNav.map((item) => {
              const href = appPath(item.href);
              let active = pathname === href || (pathname?.startsWith(`${href}/`) ?? false);
              // Не подсвечивать оба пункта разом: матчим секцию, а не весь /v2/personal
              if (item.href.startsWith("/v2/personal/tasks")) {
                active = pathname?.startsWith(appPath("/v2/personal/tasks")) ?? false;
              } else if (item.href.startsWith("/v2/personal/finance")) {
                active = pathname?.startsWith(appPath("/v2/personal/finance")) ?? false;
              }
              return <NavLink key={item.href} item={item} active={!!active} />;
            })}
          </nav>
        </div>
      ) : null}

      {pinnedProjects.length > 0 ? (
        <div className="mt-4">
          <div className="mb-1 px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
            Закреплённые
          </div>
          <div className="space-y-0.5 px-1">
            {pinnedProjects.map((p) => (
              <ProjectNavLink
                key={p.id}
                project={p}
                taskCount={taskCounts.byProject[p.id] ?? 0}
                active={
                  pathname === appPath(`/v2/projects/${p.id}`) ||
                  (pathname?.startsWith(appPath(`/v2/projects/${p.id}/`)) ?? false)
                }
                pinned
                onTogglePin={() => togglePin(p.id)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {teamProjects.length > 0 ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={toggleProjectsExpanded}
            className="mb-1 flex w-full items-center gap-1 px-3 py-1 text-left transition hover:text-[var(--v2-ink-800)]"
            aria-expanded={projectsExpanded}
          >
            <V2Icons.chev
              className={`h-3.5 w-3.5 shrink-0 text-[var(--v2-ink-400)] transition-transform ${projectsExpanded ? "" : "-rotate-90"}`}
            />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
              Проекты
            </span>
            {!projectsExpanded && otherProjects.length > 0 ? (
              <span className="v2-tnum ml-1 text-[10px] text-[var(--v2-ink-400)]">{otherProjects.length}</span>
            ) : null}
          </button>
          {showOtherProjects ? (
            <div className="space-y-0.5 px-1">
              {otherProjects.map((p) => (
                <ProjectNavLink
                  key={p.id}
                  project={p}
                  taskCount={taskCounts.byProject[p.id] ?? 0}
                  active={
                    pathname === appPath(`/v2/projects/${p.id}`) ||
                    (pathname?.startsWith(appPath(`/v2/projects/${p.id}/`)) ?? false)
                  }
                  pinned={false}
                  onTogglePin={() => togglePin(p.id)}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {me ? (
        <div className="mx-1 mt-auto pt-4">
          <V2UserAccountMenu
            user={me}
            roleLabel={roleLabel}
            onOpenProfile={onOpenProfile}
            onLogout={onLogout}
          />
        </div>
      ) : null}
    </aside>
  );
}
