"use client";

import { useMemo } from "react";

type Member = { user_id: string; display_name: string; role: string };

function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function ProjectMembersPicker({
  members,
  teamMemberIds,
  onTeamMemberIdsChange,
  clientAccessEnabled,
  onClientAccessEnabledChange,
  clientUserIds,
  onClientUserIdsChange,
  showClientAccessToggle = true,
}: {
  members: Member[];
  teamMemberIds: string[];
  onTeamMemberIdsChange: (ids: string[]) => void;
  clientAccessEnabled: boolean;
  onClientAccessEnabledChange: (enabled: boolean) => void;
  clientUserIds: string[];
  onClientUserIdsChange: (ids: string[]) => void;
  showClientAccessToggle?: boolean;
}) {
  const teamCandidates = useMemo(() => members.filter((m) => m.role !== "client"), [members]);
  const clientCandidates = useMemo(() => members.filter((m) => m.role === "client"), [members]);

  return (
    <>
      {showClientAccessToggle ? (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[var(--v2-ink-200)] px-3 py-2.5">
          <input
            type="checkbox"
            checked={clientAccessEnabled}
            onChange={(e) => onClientAccessEnabledChange(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="v2-tight block text-[13px] font-medium text-[var(--v2-ink-900)]">Доступ для клиента</span>
            <span className="v2-tight block text-[11.5px] text-[var(--v2-ink-500)]">Клиент сможет добавлять задачи в проект</span>
          </span>
        </label>
      ) : null}

      <div className="mt-4">
        <p className="v2-tight mb-2 text-[12px] font-medium text-[var(--v2-ink-600)]">Команда проекта</p>
        <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-[var(--v2-ink-200)] p-2">
          {teamCandidates.length === 0 ? (
            <p className="v2-tight px-1 py-2 text-[12px] text-[var(--v2-ink-400)]">Нет участников</p>
          ) : (
            teamCandidates.map((m) => (
              <label key={m.user_id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--v2-ink-50)]">
                <input
                  type="checkbox"
                  checked={teamMemberIds.includes(m.user_id)}
                  onChange={() => onTeamMemberIdsChange(toggleId(teamMemberIds, m.user_id))}
                />
                <span className="v2-tight text-[13px] text-[var(--v2-ink-800)]">{m.display_name}</span>
                <span className="v2-tight ml-auto text-[11px] text-[var(--v2-ink-400)]">{m.role}</span>
              </label>
            ))
          )}
        </div>
      </div>

      {clientAccessEnabled ? (
        <div className="mt-4">
          <p className="v2-tight mb-2 text-[12px] font-medium text-[var(--v2-ink-600)]">Клиенты с доступом</p>
          <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border border-[var(--v2-ink-200)] p-2">
            {clientCandidates.length === 0 ? (
              <p className="v2-tight px-1 py-2 text-[12px] text-[var(--v2-ink-400)]">
                Создайте пользователя с ролью «Клиент» в разделе Команда
              </p>
            ) : (
              clientCandidates.map((m) => (
                <label key={m.user_id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--v2-ink-50)]">
                  <input
                    type="checkbox"
                    checked={clientUserIds.includes(m.user_id)}
                    onChange={() => onClientUserIdsChange(toggleId(clientUserIds, m.user_id))}
                  />
                  <span className="v2-tight text-[13px] text-[var(--v2-ink-800)]">{m.display_name}</span>
                </label>
              ))
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
