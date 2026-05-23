"use client";

import type { V2ProjectRow } from "@/lib/v2/types";

export function ChipBar({
  projectFilter,
  setProjectFilter,
  counts,
  projects,
}: {
  projectFilter: string;
  setProjectFilter: (id: string) => void;
  counts: Record<string, number>;
  projects: V2ProjectRow[];
}) {
  const teamProjects = projects.filter((p) => p.scope === "team");
  const items = [{ id: "all", label: "Все проекты" as string, short: null as string | null, bg: null as string | null, ink: null as string | null }, ...teamProjects.map((p) => ({
    id: p.id,
    label: p.name,
    short: p.short_name,
    bg: p.color_bg,
    ink: p.color_ink ?? p.color_tint,
  }))];

  return (
    <div className="v2-no-scrollbar mb-5 flex items-center gap-2 overflow-x-auto">
      {items.map((it) => {
        const active = projectFilter === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => setProjectFilter(it.id)}
            className={`v2-tight inline-flex h-8 shrink-0 items-center gap-2 rounded-full text-[12.5px] transition ${
              active
                ? "bg-[var(--v2-brand-600)] pl-3 pr-3 text-white shadow-[var(--v2-shadow-glow)]"
                : "bg-white pl-1 pr-3 text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] hover:shadow-[var(--v2-shadow-cardHv)]"
            }`}
          >
            {!active && it.short ? (
              <span
                className="inline-flex h-[20px] w-[20px] items-center justify-center rounded-full text-[11px] font-semibold"
                style={{ background: it.bg ?? "#eee", color: it.ink ?? "#333" }}
              >
                {it.short}
              </span>
            ) : null}
            <span className="font-medium">{it.label}</span>
            <span className={`v2-tnum text-[11px] ${active ? "text-white/70" : "text-[var(--v2-ink-400)]"}`}>
              {counts[it.id] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
