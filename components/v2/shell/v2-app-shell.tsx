"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import { userInitials } from "@/lib/v2/format";
import type { V2ProjectRow, V2TaskWithMeta, V2WorkspaceRow } from "@/lib/v2/types";
import { V2Icons } from "@/components/v2/ui/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CommandPalette } from "@/components/v2/shell/command-palette";
import { NewTaskModal } from "@/components/v2/tasks/new-task-modal";

type Me = { id: string; name: string; role: string };
type Member = { user_id: string; display_name: string; role: string };

type V2Bootstrap = {
  me: Me | null;
  workspace: V2WorkspaceRow | null;
  members: Member[];
  projects: V2ProjectRow[];
  taskCounts: { open: number; inbox: number; byProject: Record<string, number> };
  loading: boolean;
  refresh: () => Promise<void>;
  openNewTask: (projectId?: string | null, title?: string) => void;
  openCommandPalette: () => void;
};

const Ctx = createContext<V2Bootstrap>({
  me: null,
  workspace: null,
  members: [],
  projects: [],
  taskCounts: { open: 0, inbox: 0, byProject: {} },
  loading: true,
  refresh: async () => {},
  openNewTask: () => {},
  openCommandPalette: () => {},
});

export function useV2Bootstrap() {
  return useContext(Ctx);
}

type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof V2Icons;
  countKey?: "inbox" | "open";
  admin?: boolean;
  kbd?: string;
};

const NAV: NavItem[] = [
  { href: "/v2/week", label: "Главная", icon: "home" },
  { href: "/v2/inbox", label: "Входящие", icon: "inbox", countKey: "inbox" },
  { href: "/v2/home", label: "Мои задачи", icon: "tasks", countKey: "open" },
  { href: "/v2/calendar", label: "Календарь", icon: "cal" },
  { href: "/v2/projects", label: "Клиенты", icon: "clients" },
  { href: "/v2/admin/people", label: "Команда", icon: "team", admin: true },
  { href: "/v2/admin/dashboard", label: "Отчёты", icon: "reports", admin: true },
];

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
        className={`h-[18px] w-[18px] ${
          active ? "text-[var(--v2-brand-600)]" : "text-[var(--v2-ink-500)] group-hover:text-[var(--v2-ink-800)]"
        }`}
      />
      <span className="flex-1 text-left font-medium">{item.label}</span>
      {count != null && count > 0 ? (
        <span
          className={`v2-tnum rounded-md px-1.5 py-0.5 text-[11px] ${
            active ? "bg-white text-[var(--v2-brand-700)]" : "bg-[var(--v2-ink-100)] text-[var(--v2-ink-600)] group-hover:bg-white"
          }`}
        >
          {count}
        </span>
      ) : null}
      {item.kbd && !active ? <span className="font-mono text-[10.5px] text-[var(--v2-ink-400)]">{item.kbd}</span> : null}
    </Link>
  );
}

export function V2AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [workspace, setWorkspace] = useState<V2WorkspaceRow | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<V2ProjectRow[]>([]);
  const [tasks, setTasks] = useState<V2TaskWithMeta[]>([]);
  const [inboxCount, setInboxCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskProjectId, setNewTaskProjectId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const openNewTask = useCallback((projectId?: string | null, title?: string) => {
    setNewTaskProjectId(projectId ?? null);
    setNewTaskTitle(title ?? "");
    setNewTaskOpen(true);
  }, []);

  const refresh = useCallback(async () => {
    const [meRes, projRes, taskRes, inboxRes] = await Promise.all([
      fetch(apiUrl("/api/v2/auth/me"), { credentials: "include" }).then((r) => r.json()),
      fetch(apiUrl("/api/v2/projects"), { credentials: "include" }).then((r) => r.json()),
      fetch(apiUrl("/api/v2/tasks?grouped=1"), { credentials: "include" }).then((r) => r.json()),
      fetch(apiUrl("/api/v2/inbox"), { credentials: "include" }).then((r) => r.json()),
    ]);
    setMe(meRes.user ?? null);
    setWorkspace(meRes.workspace ?? null);
    setMembers(meRes.members ?? []);
    setProjects(projRes.projects ?? []);
    setTasks(taskRes.tasks ?? []);
    const buckets = inboxRes.buckets ?? {};
    const inboxTotal = Object.values(buckets as Record<string, unknown[]>).reduce((n, arr) => n + (arr?.length ?? 0), 0);
    setInboxCount(inboxTotal);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        openNewTask();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openNewTask]);

  const isAdmin = me?.role === "admin";
  const nav = NAV.filter((n) => !n.admin || isAdmin);
  const teamProjects = useMemo(() => projects.filter((p) => p.scope === "team"), [projects]);

  const taskCounts = useMemo(() => {
    const open = tasks.filter((t) => !t.completed_at && !t.inbox_bucket).length;
    const byProject: Record<string, number> = {};
    for (const t of tasks) {
      if (t.completed_at || !t.project_id) continue;
      byProject[t.project_id] = (byProject[t.project_id] ?? 0) + 1;
    }
    return { open, inbox: inboxCount, byProject };
  }, [tasks, inboxCount]);

  const roleLabel = me?.role === "admin" ? "Администратор" : "Участник";

  return (
    <Ctx.Provider
      value={{
        me,
        workspace,
        members,
        projects,
        taskCounts,
        loading,
        refresh,
        openNewTask,
        openCommandPalette: () => setPaletteOpen(true),
      }}
    >
      <div className="flex min-h-screen">
        <aside className="flex w-[244px] shrink-0 flex-col gap-1 bg-white px-3 pb-3 pt-4 shadow-[var(--v2-shadow-soft)]">
          <button
            type="button"
            className="mb-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-[var(--v2-ink-50)]"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--v2-brand-500)] to-[var(--v2-brand-600)] text-white shadow-[var(--v2-shadow-glow)]">
              <V2Icons.logo className="h-[18px] w-[18px]" />
            </span>
            <span className="flex flex-col text-left leading-tight">
              <span className="v2-tight text-[13.5px] font-semibold text-[var(--v2-ink-900)]">Тим</span>
              <span className="text-[11px] text-[var(--v2-ink-500)]">{workspace?.name ?? "Рабочее пространство"}</span>
            </span>
            <V2Icons.chev className="ml-auto h-4 w-4 text-[var(--v2-ink-400)]" />
          </button>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
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
              const count =
                item.countKey === "inbox"
                  ? taskCounts.inbox
                  : item.countKey === "open"
                    ? taskCounts.open
                    : undefined;
              return <NavLink key={item.href} item={item} active={active} count={count} />;
            })}
          </nav>

          <div className="mb-2 mt-4 px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
            Проекты
          </div>
          <div className="space-y-0.5 px-1">
            {teamProjects.map((p) => (
              <Link
                key={p.id}
                href={appPath(`/v2/projects?project=${p.id}`)}
                className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-[13px] text-[var(--v2-ink-600)] transition hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-900)]"
              >
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-semibold"
                  style={{
                    background: p.color_bg ?? "#eee",
                    color: p.color_ink ?? p.color_tint ?? "#333",
                  }}
                >
                  {p.short_name ?? p.name.slice(0, 1)}
                </span>
                <span className="v2-tight flex-1 truncate text-left font-medium">{p.name}</span>
                <span className="v2-tnum text-[11px] text-[var(--v2-ink-400)]">{taskCounts.byProject[p.id] ?? 0}</span>
              </Link>
            ))}
          </div>

          {me ? (
            <div className="mx-1 mt-auto pt-4">
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl bg-[var(--v2-ink-50)] px-2 py-2 transition hover:bg-[var(--v2-ink-100)]/70"
              >
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--v2-brand-400)] to-[var(--v2-brand-600)] text-[12.5px] font-semibold text-white ring-2 ring-white">
                  {userInitials(me.name)}
                </div>
                <div className="leading-tight">
                  <div className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)]">{me.name}</div>
                  <div className="text-[11px] text-[var(--v2-ink-500)]">{roleLabel}</div>
                </div>
                <V2Icons.chev className="ml-auto h-4 w-4 text-[var(--v2-ink-400)]" />
              </button>
            </div>
          ) : null}
        </aside>
        <main className="min-w-0 flex-1 flex flex-col">{children}</main>
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onCreateTask={(text) => openNewTask(null, text)}
        />
        <NewTaskModal
          open={newTaskOpen}
          onClose={() => setNewTaskOpen(false)}
          projects={projects}
          members={members}
          defaultProjectId={newTaskProjectId}
          initialTitle={newTaskTitle}
          currentUserId={me?.id}
          onCreated={() => void refresh()}
        />
      </div>
    </Ctx.Provider>
  );
}
