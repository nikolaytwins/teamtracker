"use client";

import { ProjectMembersPicker } from "@/components/v2/projects/project-members-picker";
import { useState } from "react";

type Member = { user_id: string; display_name: string; role: string };

export function NewProjectModal({
  open,
  members,
  onClose,
  onCreate,
}: {
  open: boolean;
  members: Member[];
  onClose: () => void;
  onCreate: (input: {
    name: string;
    engagementType: "one_off" | "retainer";
    clientAccessEnabled: boolean;
    teamMemberIds: string[];
    clientUserIds: string[];
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [engagementType, setEngagementType] = useState<"one_off" | "retainer">("one_off");
  const [clientAccessEnabled, setClientAccessEnabled] = useState(false);
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [clientUserIds, setClientUserIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  function reset() {
    setName("");
    setEngagementType("one_off");
    setClientAccessEnabled(false);
    setTeamMemberIds([]);
    setClientUserIds([]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <form
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-[var(--v2-shadow-pop)]"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setSaving(true);
          try {
            await onCreate({
              name: name.trim(),
              engagementType,
              clientAccessEnabled,
              teamMemberIds,
              clientUserIds: clientAccessEnabled ? clientUserIds : [],
            });
            reset();
            onClose();
          } finally {
            setSaving(false);
          }
        }}
      >
        <h2 className="v2-tight text-lg font-semibold text-[var(--v2-ink-900)]">Новый проект</h2>
        <p className="v2-tight mt-1 text-[13px] text-[var(--v2-ink-500)]">Выберите тип проекта и участников</p>

        <input
          autoFocus
          className="v2-input mt-4"
          placeholder="Название проекта"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="mt-4">
          <p className="v2-tight mb-2 text-[12px] font-medium text-[var(--v2-ink-600)]">Тип проекта</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setEngagementType("one_off")}
              className={`rounded-xl border px-3 py-3 text-left transition ${engagementType === "one_off" ? "border-[var(--v2-brand-400)] bg-[var(--v2-brand-50)]" : "border-[var(--v2-ink-200)] hover:border-[var(--v2-ink-300)]"}`}
            >
              <div className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)]">Разовый</div>
              <div className="v2-tight mt-1 text-[11.5px] text-[var(--v2-ink-500)]">Этапы и задачи планируются заранее</div>
            </button>
            <button
              type="button"
              onClick={() => setEngagementType("retainer")}
              className={`rounded-xl border px-3 py-3 text-left transition ${engagementType === "retainer" ? "border-[var(--v2-brand-400)] bg-[var(--v2-brand-50)]" : "border-[var(--v2-ink-200)] hover:border-[var(--v2-ink-300)]"}`}
            >
              <div className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)]">Постоянный</div>
              <div className="v2-tight mt-1 text-[11.5px] text-[var(--v2-ink-500)]">Ежемесячные задачи, история по месяцам</div>
            </button>
          </div>
        </div>

        <div className="mt-4">
          <ProjectMembersPicker
            members={members}
            teamMemberIds={teamMemberIds}
            onTeamMemberIdsChange={setTeamMemberIds}
            clientAccessEnabled={clientAccessEnabled}
            onClientAccessEnabledChange={setClientAccessEnabled}
            clientUserIds={clientUserIds}
            onClientUserIdsChange={setClientUserIds}
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="v2-input text-sm"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Отмена
          </button>
          <button type="submit" disabled={saving || !name.trim()} className="v2-btn-primary disabled:opacity-50">
            Создать
          </button>
        </div>
      </form>
    </div>
  );
}
