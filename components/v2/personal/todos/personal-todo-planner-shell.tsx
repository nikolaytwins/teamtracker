"use client";

import { PersonalTodoProvider, usePersonalTodo } from "@/components/v2/personal/todos/personal-todo-context";
import { V2Icons } from "@/components/v2/ui/icons";
import { appPath } from "@/lib/api-url";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const NAV_ITEMS = [
  { href: "/v2/personal/tasks/inbox", label: "Входящие", icon: "inbox" as const, countKey: "inbox" as const },
  { href: "/v2/personal/tasks/week", label: "Неделя", icon: "cal" as const },
  { href: "/v2/personal/tasks/kanban", label: "Канбан", icon: "kanban" as const },
] as const;

function NavIcon({ name }: { name: (typeof NAV_ITEMS)[number]["icon"] }) {
  const Icon = V2Icons[name];
  return <Icon className="h-4 w-4 shrink-0" />;
}

function PersonalTodoPlannerShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const { counts, focusQuickAdd } = usePersonalTodo();

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
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function PersonalTodoPlannerShell({ children }: { children: React.ReactNode }) {
  return (
    <PersonalTodoProvider>
      <PersonalTodoPlannerShellInner>{children}</PersonalTodoPlannerShellInner>
    </PersonalTodoProvider>
  );
}
