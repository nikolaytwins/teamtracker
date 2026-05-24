"use client";

import { useMemo, useState } from "react";

export type TeamMemberOption = {
  user_id: string;
  display_name: string;
  role: string;
  avatar_url?: string | null;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function MemberAvatar({ member }: { member: TeamMemberOption }) {
  if (member.avatar_url?.trim()) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={member.avatar_url}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white"
      />
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--v2-brand-100)] text-[11px] font-semibold text-[var(--v2-brand-700)] ring-2 ring-white">
      {initials(member.display_name)}
    </span>
  );
}

export function TeamMembersPicker({
  members,
  selectedIds,
  onChange,
}: {
  members: TeamMemberOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");

  const teamCandidates = useMemo(() => members.filter((m) => m.role !== "client"), [members]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teamCandidates;
    return teamCandidates.filter((m) => m.display_name.toLowerCase().includes(q));
  }, [teamCandidates, query]);

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  return (
    <div>
      <p className="v2-tight mb-2 text-[12px] font-medium text-[var(--v2-ink-600)]">Команда проекта</p>
      <input
        type="search"
        className="v2-input"
        placeholder="Поиск по имени…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {query.trim() && filtered.length > 0 ? (
        <ul className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-[var(--v2-ink-200)] bg-white py-1 shadow-sm">
          {filtered.map((m) => {
            const selected = selectedIds.includes(m.user_id);
            return (
              <li key={m.user_id}>
                <button
                  type="button"
                  onClick={() => toggle(m.user_id)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-[var(--v2-ink-50)] ${selected ? "bg-[var(--v2-brand-50)]" : ""}`}
                >
                  <MemberAvatar member={m} />
                  <span className="v2-tight min-w-0 flex-1 text-[13px] text-[var(--v2-ink-800)]">{m.display_name}</span>
                  {selected ? (
                    <span className="v2-tight text-[11px] font-medium text-[var(--v2-brand-600)]">Выбран</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {selectedIds.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedIds.map((id) => {
            const m = teamCandidates.find((x) => x.user_id === id);
            if (!m) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--v2-brand-200)] bg-[var(--v2-brand-50)] py-1 pl-1 pr-2.5 text-left"
                title="Убрать из команды"
              >
                <MemberAvatar member={m} />
                <span className="v2-tight text-[12px] font-medium text-[var(--v2-brand-800)]">{m.display_name}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mt-4">
        <p className="v2-tight mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--v2-ink-400)]">
          Выберите участников
        </p>
        {teamCandidates.length === 0 ? (
          <p className="v2-tight text-[12px] text-[var(--v2-ink-400)]">Нет участников</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {teamCandidates.map((m) => {
              const selected = selectedIds.includes(m.user_id);
              return (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => toggle(m.user_id)}
                  className={`rounded-full p-0.5 transition ${selected ? "ring-2 ring-[var(--v2-brand-500)] ring-offset-1" : "opacity-80 hover:opacity-100"}`}
                  title={m.display_name}
                >
                  <MemberAvatar member={m} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
