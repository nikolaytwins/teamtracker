"use client";

import { apiUrl, appPath } from "@/lib/api-url";
import type { V2ProjectRow, V2TaskWithMeta, V2WorkspaceRow } from "@/lib/v2/types";
import { V2Icons } from "@/components/v2/ui/icons";
import { ProfileModal } from "@/components/ProfileModal";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CommandPalette } from "@/components/v2/shell/command-palette";
import { NewTaskModal, type LockedProjectHint } from "@/components/v2/tasks/new-task-modal";
import { V2ShellSidebar } from "@/components/v2/shell/v2-shell-sidebar";
import type { V2ShellUser } from "@/components/v2/shell/v2-user-account-menu";

type Me = V2ShellUser & { role: string };
type Member = { user_id: string; display_name: string; role: string; avatar_url?: string | null };

export type TaskCreationContext = {
  projectId: string;
  lockedProject: LockedProjectHint;
  workMonth?: string | null;
};

type V2Bootstrap = {
  me: Me | null;
  workspace: V2WorkspaceRow | null;
  members: Member[];
  projects: V2ProjectRow[];
  taskCounts: { open: number; byProject: Record<string, number> };
  loading: boolean;
  refresh: () => Promise<void>;
  openNewTask: (projectId?: string | null, title?: string) => void;
  setTaskCreationContext: (ctx: TaskCreationContext | null) => void;
  openCommandPalette: () => void;
};

const Ctx = createContext<V2Bootstrap>({
  me: null,
  workspace: null,
  members: [],
  projects: [],
  taskCounts: { open: 0, byProject: {} },
  loading: true,
  refresh: async () => {},
  openNewTask: () => {},
  setTaskCreationContext: () => {},
  openCommandPalette: () => {},
});

export function useV2Bootstrap() {
  return useContext(Ctx);
}

type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof V2Icons;
  countKey?: "open";
  admin?: boolean;
  kbd?: string;
};

const NAV: NavItem[] = [
  { href: "/v2/home", label: "Главная", icon: "home", countKey: "open" },
  { href: "/v2/projects", label: "Проекты", icon: "projects" },
  { href: "/v2/agency", label: "Проекты и финансы", icon: "reports", admin: true },
  { href: "/v2/admin/people", label: "Команда", icon: "team", admin: true },
];

const PERSONAL_NAV: NavItem[] = [
  { href: "/v2/personal/tasks/today", label: "Задачи", icon: "tasks" },
  { href: "/v2/personal/finance", label: "Финансы", icon: "ruble" },
];

export function V2AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [workspace, setWorkspace] = useState<V2WorkspaceRow | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<V2ProjectRow[]>([]);
  const [tasks, setTasks] = useState<V2TaskWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskProjectId, setNewTaskProjectId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskLockedProject, setNewTaskLockedProject] = useState<LockedProjectHint | null>(null);
  const [newTaskWorkMonth, setNewTaskWorkMonth] = useState<string | null>(null);
  const [taskCreationContext, setTaskCreationContext] = useState<TaskCreationContext | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const openNewTask = useCallback(
    (projectId?: string | null, title?: string) => {
      const pid = projectId ?? taskCreationContext?.projectId ?? null;
      setNewTaskProjectId(pid);
      setNewTaskTitle(title ?? "");

      if (pid && taskCreationContext?.projectId === pid) {
        setNewTaskLockedProject(taskCreationContext.lockedProject);
        setNewTaskWorkMonth(taskCreationContext.workMonth ?? null);
      } else if (pid) {
        const p = projects.find((x) => x.id === pid);
        setNewTaskLockedProject(
          p
            ? {
                name: p.name,
                shortName: p.short_name,
                colorBg: p.color_bg,
                colorTint: p.color_tint,
                colorInk: p.color_ink,
              }
            : null
        );
        setNewTaskWorkMonth(null);
      } else {
        setNewTaskLockedProject(null);
        setNewTaskWorkMonth(null);
      }

      setNewTaskOpen(true);
    },
    [taskCreationContext, projects]
  );

  const refresh = useCallback(async () => {
    const [meRes, projRes, taskRes] = await Promise.all([
      fetch(apiUrl("/api/v2/auth/me"), { credentials: "include" }).then((r) => r.json()),
      fetch(apiUrl("/api/v2/projects"), { credentials: "include" }).then((r) => r.json()),
      fetch(apiUrl("/api/v2/tasks?grouped=1"), { credentials: "include" }).then((r) => r.json()),
    ]);
    setMe(meRes.user ?? null);
    setWorkspace(meRes.workspace ?? null);
    setMembers(meRes.members ?? []);
    setProjects(projRes.projects ?? []);
    setTasks(taskRes.tasks ?? []);
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
  const isClient = me?.role === "client";
  const nav = NAV.filter((n) => {
    if (n.admin && !isAdmin) return false;
    if (isClient) return n.href === "/v2/projects";
    return true;
  });
  const personalNav = isClient ? [] : PERSONAL_NAV;
  const teamProjects = useMemo(() => projects.filter((p) => p.scope === "team"), [projects]);

  const taskCounts = useMemo(() => {
    const open = tasks.filter((t) => !t.completed_at && !t.inbox_bucket).length;
    const byProject: Record<string, number> = {};
    for (const t of tasks) {
      if (t.completed_at || !t.project_id) continue;
      byProject[t.project_id] = (byProject[t.project_id] ?? 0) + 1;
    }
    return { open, byProject };
  }, [tasks]);

  const roleLabel =
    me?.role === "admin"
      ? "Администратор"
      : me?.role === "client"
        ? "Клиент"
        : me?.role === "designer"
          ? "Дизайнер"
          : me?.role === "pm"
            ? "ПМ"
            : "Участник";

  const logout = useCallback(async () => {
    await fetch(apiUrl("/api/auth/logout"), { method: "POST" });
    router.push(appPath("/login"));
    router.refresh();
  }, [router]);

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
        setTaskCreationContext,
        openCommandPalette: () => setPaletteOpen(true),
      }}
    >
      <div className="flex min-h-screen">
        <V2ShellSidebar
          nav={nav}
          personalNav={personalNav}
          teamProjects={teamProjects}
          taskCounts={taskCounts}
          me={me}
          roleLabel={roleLabel}
          onOpenSearch={() => setPaletteOpen(true)}
          onOpenProfile={() => setProfileOpen(true)}
          onLogout={logout}
        />
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onCreateTask={(text) => openNewTask(null, text)}
        />
        <NewTaskModal
          open={newTaskOpen}
          onClose={() => {
            setNewTaskOpen(false);
            setNewTaskProjectId(null);
            setNewTaskTitle("");
            setNewTaskLockedProject(null);
            setNewTaskWorkMonth(null);
          }}
          projects={projects}
          members={members}
          defaultProjectId={newTaskProjectId}
          lockedProject={newTaskLockedProject}
          workMonth={newTaskWorkMonth}
          initialTitle={newTaskTitle}
          currentUserId={me?.id}
          onCreated={() => void refresh()}
        />
        {me?.id ? (
          <ProfileModal
            open={profileOpen}
            user={{
              id: me.id,
              login: me.login ?? "",
              name: me.name,
              title: me.title ?? "",
              avatarUrl: me.avatarUrl ?? null,
            }}
            onClose={() => setProfileOpen(false)}
            onProfileSaved={(u) => {
              setMe((prev) =>
                prev
                  ? {
                      ...prev,
                      name: u.name,
                      title: u.title,
                      avatarUrl: u.avatarUrl,
                      login: u.login,
                    }
                  : prev
              );
            }}
          />
        ) : null}
      </div>
    </Ctx.Provider>
  );
}
