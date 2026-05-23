"use client";

import { appPath } from "@/lib/api-url";
import type { V2ProjectRow } from "@/lib/v2/types";
import Link from "next/link";

export function V2Sidebar({
  projects,
  userName,
  taskCount,
}: {
  projects: V2ProjectRow[];
  userName?: string;
  taskCount?: number;
}) {
  const team = projects.filter((p) => p.scope === "team");

  return (
    <aside className="flex w-[244px] shrink-0 flex-col gap-1 bg-white px-3 pb-3 pt-4 shadow-[var(--v2-shadow-soft)]">
      <div className="mb-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--v2-brand-500)] to-[var(--v2-brand-600)] text-white shadow-[var(--v2-shadow-glow)]">
          <span className="text-xs font-bold">Т</span>
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[13.5px] font-semibold tracking-tight">Тим</span>
          <span className="text-[11px] text-[var(--v2-ink-500)]">Студия</span>
        </span>
      </div>

      <nav className="space-y-0.5">
        <Link
          href={appPath("/v2/home")}
          className="flex h-9 items-center gap-3 rounded-lg bg-[var(--v2-brand-50)] px-3 text-[13.5px] font-medium text-[var(--v2-brand-700)]"
        >
          Мои задачи
          {taskCount != null && (
            <span className="ml-auto rounded-md bg-white px-1.5 py-0.5 text-[11px] tabular-nums">{taskCount}</span>
          )}
        </Link>
        <Link href={appPath("/home")} className="flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)]">
          v1
        </Link>
      </nav>

      <div className="mb-2 mt-4 px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
        Проекты
      </div>
      <div className="max-h-72 space-y-0.5 overflow-y-auto px-1">
        {team.map((p) => (
          <div key={p.id} className="flex h-8 items-center gap-2.5 rounded-lg px-2 text-[13px] text-[var(--v2-ink-600)]">
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-semibold"
              style={{ background: p.color_bg ?? "#eee", color: p.color_tint ?? "#333" }}
            >
              {p.short_name}
            </span>
            <span className="truncate font-medium tracking-tight">{p.name}</span>
          </div>
        ))}
      </div>

      {userName && (
        <div className="mt-auto rounded-xl bg-[var(--v2-ink-50)] px-2 py-2">
          <div className="text-[13px] font-semibold tracking-tight">{userName}</div>
        </div>
      )}
    </aside>
  );
}
