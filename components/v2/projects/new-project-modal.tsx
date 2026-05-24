"use client";

import { fromDateInputValue } from "@/lib/v2/format";
import { ClientNameInput } from "@/components/v2/projects/client-name-input";
import { TeamMembersPicker, type TeamMemberOption } from "@/components/v2/projects/team-members-picker";
import { useState } from "react";

export type NewProjectModalInput = {
  name: string;
  engagementType: "one_off" | "retainer";
  clientName: string | null;
  clientId: string | null;
  releaseAt: string | null;
  projectSumRub: number | null;
  teamMemberIds: string[];
};

export function NewProjectModal({
  open,
  members,
  onClose,
  onCreate,
}: {
  open: boolean;
  members: TeamMemberOption[];
  onClose: () => void;
  onCreate: (input: NewProjectModalInput) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [engagementType, setEngagementType] = useState<"one_off" | "retainer">("one_off");
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [releaseLocal, setReleaseLocal] = useState("");
  const [noReleaseDate, setNoReleaseDate] = useState(true);
  const [projectSumRub, setProjectSumRub] = useState("");
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  function reset() {
    setName("");
    setEngagementType("one_off");
    setClientName("");
    setClientId(null);
    setReleaseLocal("");
    setNoReleaseDate(true);
    setProjectSumRub("");
    setTeamMemberIds([]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <form
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-[var(--v2-shadow-pop)]"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setSaving(true);
          try {
            await onCreate({
              name: name.trim(),
              engagementType,
              clientName: clientName.trim() || null,
              clientId,
              releaseAt: noReleaseDate ? null : releaseLocal ? fromDateInputValue(releaseLocal) : null,
              projectSumRub: projectSumRub.trim() ? Math.round(Number(projectSumRub)) : null,
              teamMemberIds,
            });
            reset();
            onClose();
          } finally {
            setSaving(false);
          }
        }}
      >
        <h2 className="v2-tight text-lg font-semibold text-[var(--v2-ink-900)]">Новый проект</h2>
        <p className="v2-tight mt-1 text-[13px] text-[var(--v2-ink-500)]">
          Статус «Не начат» выставится автоматически
        </p>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[12px] font-medium text-[var(--v2-ink-600)]">Название</span>
          <input
            autoFocus
            className="v2-input"
            placeholder="Название проекта"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[12px] font-medium text-[var(--v2-ink-600)]">Клиент</span>
          <ClientNameInput value={clientName} onChange={setClientName} onClientIdChange={setClientId} />
        </label>

        <div className="mt-4">
          <p className="mb-2 text-[12px] font-medium text-[var(--v2-ink-600)]">Тип проекта</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setEngagementType("one_off")}
              className={`rounded-xl border px-3 py-3 text-left transition ${engagementType === "one_off" ? "border-[var(--v2-brand-400)] bg-[var(--v2-brand-50)]" : "border-[var(--v2-ink-200)] hover:border-[var(--v2-ink-300)]"}`}
            >
              <div className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)]">Разовый</div>
              <div className="v2-tight mt-1 text-[11.5px] text-[var(--v2-ink-500)]">Этапы и задачи по плану</div>
            </button>
            <button
              type="button"
              onClick={() => setEngagementType("retainer")}
              className={`rounded-xl border px-3 py-3 text-left transition ${engagementType === "retainer" ? "border-[var(--v2-brand-400)] bg-[var(--v2-brand-50)]" : "border-[var(--v2-ink-200)] hover:border-[var(--v2-ink-300)]"}`}
            >
              <div className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)]">Постоянный</div>
              <div className="v2-tight mt-1 text-[11.5px] text-[var(--v2-ink-500)]">Ежемесячные задачи</div>
            </button>
          </div>
        </div>

        <label className="mt-4 block text-[12px]">
          <span className="text-[var(--v2-ink-600)]">Сумма проекта, ₽</span>
          <input
            type="number"
            min={0}
            step={1000}
            className="v2-input mt-1.5 w-full"
            value={projectSumRub}
            onChange={(e) => setProjectSumRub(e.target.value)}
            placeholder="Сколько оплатил клиент"
          />
        </label>

        <div className="mt-4">
          <span className="mb-1.5 block text-[12px] font-medium text-[var(--v2-ink-600)]">Дата релиза</span>
          <label className="mb-2 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={noReleaseDate}
              onChange={(e) => {
                setNoReleaseDate(e.target.checked);
                if (e.target.checked) setReleaseLocal("");
              }}
            />
            <span className="v2-tight text-[13px] text-[var(--v2-ink-700)]">Без даты</span>
          </label>
          {!noReleaseDate ? (
            <input
              type="date"
              className="v2-input w-full"
              value={releaseLocal}
              onChange={(e) => setReleaseLocal(e.target.value)}
            />
          ) : null}
        </div>

        <div className="mt-4">
          <TeamMembersPicker members={members} selectedIds={teamMemberIds} onChange={setTeamMemberIds} />
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-[var(--v2-ink-100)] pt-4">
          <button
            type="button"
            className="v2-input text-sm"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={saving}
          >
            Отмена
          </button>
          <button type="submit" disabled={saving || !name.trim()} className="v2-btn-primary disabled:opacity-50">
            {saving ? "Создание…" : "Создать"}
          </button>
        </div>
      </form>
    </div>
  );
}
