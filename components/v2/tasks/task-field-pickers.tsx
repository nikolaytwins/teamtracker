"use client";

import { gradientForUser, initialsFromName } from "@/lib/v2/projects/portfolio-utils";
import type { V2TaskPriority } from "@/lib/v2/types";
import { PRIORITY_META, V2Icons } from "@/components/v2/ui/icons";

type MemberOption = { user_id: string; display_name: string };

export function AssigneeAvatarPicker({
  members,
  value,
  onChange,
  allowEmpty = true,
}: {
  members: MemberOption[];
  value: string | null;
  onChange: (userId: string | null) => void;
  allowEmpty?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {allowEmpty ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`inline-flex h-10 min-w-[72px] items-center justify-center rounded-xl border px-3 text-[12px] font-medium transition ${
            value === null
              ? "border-[var(--v2-brand-400)] bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]"
              : "border-[var(--v2-ink-200)] text-[var(--v2-ink-500)] hover:border-[var(--v2-ink-300)]"
          }`}
        >
          —
        </button>
      ) : null}
      {members.map((m) => {
        const active = value === m.user_id;
        const initials = initialsFromName(m.display_name);
        const gradient = gradientForUser(m.user_id);
        return (
          <button
            key={m.user_id}
            type="button"
            title={m.display_name}
            onClick={() => onChange(m.user_id)}
            className={`inline-flex items-center gap-2 rounded-xl border px-2 py-1.5 transition ${
              active
                ? "border-[var(--v2-brand-400)] bg-[var(--v2-brand-50)] shadow-[var(--v2-shadow-card)]"
                : "border-[var(--v2-ink-200)] hover:border-[var(--v2-ink-300)] hover:bg-[var(--v2-ink-50)]"
            }`}
          >
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
              style={{ background: gradient }}
            >
              {initials}
            </span>
            <span className="v2-tight max-w-[88px] truncate text-[12px] font-medium text-[var(--v2-ink-800)]">
              {m.display_name.split(" ")[0]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function PriorityFlagPicker({
  value,
  onChange,
  compact = false,
}: {
  value: V2TaskPriority;
  onChange: (priority: V2TaskPriority) => void;
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
      {(["urgent", "high", "medium", "low"] as V2TaskPriority[]).map((key) => {
        const m = PRIORITY_META[key];
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`v2-tight flex w-full min-w-0 items-center gap-1.5 rounded-xl border px-2.5 py-2 text-left transition ${
              active ? "border-[var(--v2-brand-400)] bg-[var(--v2-brand-50)]" : "border-[var(--v2-ink-200)] hover:border-[var(--v2-ink-300)]"
            }`}
          >
            <V2Icons.flag className="h-4 w-4 shrink-0" style={{ color: m.dot }} />
            <span
              className="min-w-0 truncate text-[12px] font-medium"
              style={{ color: active ? m.ink : "var(--v2-ink-700)" }}
            >
              {m.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
