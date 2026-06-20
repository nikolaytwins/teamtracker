"use client";

import { PersonalTodoProvider, usePersonalTodo } from "@/components/v2/personal/todos/personal-todo-context";
import { PersonalTodoQuickAdd } from "@/components/v2/personal/todos/personal-todo-quick-add";
import { V2Icons } from "@/components/v2/ui/icons";
import { appPath } from "@/lib/api-url";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { PersonalTodoProjectRow } from "@/lib/v2/personal/todo-types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/v2/personal/tasks/inbox", label: "Входящие", icon: "inbox" as const, countKey: "inbox" as const },
  { href: "/v2/personal/tasks/today", label: "Сегодня", icon: "home" as const, countKey: "today" as const },
  { href: "/v2/personal/tasks/upcoming", label: "Предстоящее", icon: "cal" as const },
  { href: "/v2/personal/tasks/week", label: "Неделя", icon: "tasks" as const },
  { href: "/v2/personal/tasks/completed", label: "Выполненные", icon: "check" as const },
] as const;

function NavIcon({ name }: { name: (typeof NAV_ITEMS)[number]["icon"] }) {
  const Icon = V2Icons[name];
  return <Icon className="h-4 w-4 shrink-0" />;
}

function PersonalTodoPlannerShellInner({
  children,
  defaultProjectId,
}: {
  children: React.ReactNode;
  defaultProjectId?: string | null;
}) {
  const pathname = usePathname() ?? "";
  const { counts, projects, refreshBootstrap, loading, focusQuickAdd } = usePersonalTodo();
  const projectFromPath = pathname.match(/\/personal\/tasks\/project\/([^/]+)/)?.[1] ?? null;
  const resolvedDefaultProject = defaultProjectId ?? projectFromPath;
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [projectError, setProjectError] = useState<string | null>(null);

  const userProjects = projects.filter((p) => !p.is_inbox);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        focusQuickAdd();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusQuickAdd]);

  function isActive(href: string) {
    return pathname === appPath(href) || pathname.startsWith(`${appPath(href)}/`);
  }

  function isProjectActive(projectId: string) {
    return pathname === appPath(`/v2/personal/tasks/project/${projectId}`);
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    const name = newProjectName.trim();
    if (!name) return;
    setProjectError(null);
    try {
      await fetchJson<{ project: PersonalTodoProjectRow }>("/api/v2/personal/todos/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setNewProjectName("");
      setCreatingProject(false);
      await refreshBootstrap();
    } catch (err) {
      setProjectError(err instanceof Error ? err.message : "Не удалось создать проект");
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <nav className="flex w-[200px] shrink-0 flex-col border-r border-[var(--v2-ink-100)] bg-white px-2 py-4">
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const badge = "countKey" in item ? counts[item.countKey] : 0;
            return (
              <Link
                key={item.href}
                href={appPath(item.href)}
                className={`v2-tight flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                  active
                    ? "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]"
                    : "text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-900)]"
                }`}
              >
                <NavIcon name={item.icon} />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {"countKey" in item && badge > 0 ? (
                  <span className="v2-tnum rounded-md bg-[var(--v2-ink-100)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--v2-ink-600)]">
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>

        <div className="mt-6 px-1">
          <div className="v2-tight mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-400)]">
            <span>Проекты</span>
            <button
              type="button"
              onClick={() => setCreatingProject((v) => !v)}
              className="inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 text-[var(--v2-ink-500)] transition hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-800)]"
              title="Новый проект"
            >
              <V2Icons.plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {creatingProject ? (
            <form onSubmit={(e) => void createProject(e)} className="mb-2 space-y-1.5">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Название проекта"
                autoFocus
                className="v2-tight w-full rounded-lg border border-[var(--v2-ink-200)] px-2 py-1.5 text-[12px] outline-none focus:border-[var(--v2-brand-400)]"
              />
              <div className="flex gap-1">
                <button
                  type="submit"
                  className="v2-tight flex-1 rounded-lg bg-[var(--v2-ink-900)] px-2 py-1 text-[11px] font-medium text-white"
                >
                  Создать
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreatingProject(false);
                    setNewProjectName("");
                  }}
                  className="v2-tight rounded-lg px-2 py-1 text-[11px] text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-50)]"
                >
                  Отмена
                </button>
              </div>
              {projectError ? <p className="v2-tight text-[11px] text-red-600">{projectError}</p> : null}
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreatingProject(true)}
              className="v2-tight mb-2 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium text-[var(--v2-brand-600)] transition hover:bg-[var(--v2-brand-50)]"
            >
              <V2Icons.plus className="h-3.5 w-3.5" />
              Новый проект
            </button>
          )}

          <div className="space-y-0.5">
            {loading ? (
              <p className="v2-tight px-2 py-1 text-[12px] text-[var(--v2-ink-400)]">…</p>
            ) : userProjects.length === 0 ? (
              <p className="v2-tight px-2 py-1 text-[12px] text-[var(--v2-ink-400)]">Пока нет проектов</p>
            ) : (
              userProjects.map((p) => {
                const active = isProjectActive(p.id);
                return (
                  <Link
                    key={p.id}
                    href={appPath(`/v2/personal/tasks/project/${p.id}`)}
                    className={`v2-tight flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] transition ${
                      active
                        ? "bg-[var(--v2-brand-50)] font-medium text-[var(--v2-brand-700)]"
                        : "text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-900)]"
                    }`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: p.color }}
                      aria-hidden
                    />
                    <span className="truncate">{p.name}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <PersonalTodoQuickAdd defaultProjectId={resolvedDefaultProject} />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function PersonalTodoPlannerShell({
  children,
  defaultProjectId,
}: {
  children: React.ReactNode;
  defaultProjectId?: string | null;
}) {
  return (
    <PersonalTodoProvider>
      <PersonalTodoPlannerShellInner defaultProjectId={defaultProjectId}>{children}</PersonalTodoPlannerShellInner>
    </PersonalTodoProvider>
  );
}
