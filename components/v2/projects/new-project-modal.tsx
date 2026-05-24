"use client";

import { fromDateInputValue } from "@/lib/v2/format";
import { ClientNameInput } from "@/components/v2/projects/client-name-input";
import { PROJECT_KIND_OPTIONS } from "@/lib/v2/projects/project-kind";
import { TeamMembersPicker, type TeamMemberOption } from "@/components/v2/projects/team-members-picker";
import { PriorityFlagPicker } from "@/components/v2/tasks/task-field-pickers";
import { MoneyRubInput } from "@/components/v2/ui/money-rub-input";
import type { V2ProjectKind, V2TaskPriority } from "@/lib/v2/types";
import { useState } from "react";

export type NewProjectModalInput = {
  name: string;
  engagementType: "one_off" | "retainer";
  projectKind: V2ProjectKind | null;
  priority: V2TaskPriority;
  clientName: string | null;
  clientId: string | null;
  releaseAt: string | null;
  projectSumRub: number | null;
  paidRub: number | null;
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
  const [projectKind, setProjectKind] = useState<V2ProjectKind>("site");
  const [priority, setPriority] = useState<V2TaskPriority>("medium");
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [releaseLocal, setReleaseLocal] = useState("");
  const [noReleaseDate, setNoReleaseDate] = useState(false);
  const [projectSumDisplay, setProjectSumDisplay] = useState("");
  const [projectSumRub, setProjectSumRub] = useState<number | null>(null);
  const [paidDisplay, setPaidDisplay] = useState("");
  const [paidRub, setPaidRub] = useState<number | null>(null);
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  function reset() {
    setName("");
    setEngagementType("one_off");
    setProjectKind("site");
    setPriority("medium");
    setClientName("");
    setClientId(null);
    setReleaseLocal("");
    setNoReleaseDate(false);
    setProjectSumDisplay("");
    setProjectSumRub(null);
    setPaidDisplay("");
    setPaidRub(null);
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
              projectKind: engagementType === "one_off" ? projectKind : null,
              priority,
              clientName: clientName.trim() || null,
              clientId,
              releaseAt: noReleaseDate ? null : releaseLocal ? fromDateInputValue(releaseLocal) : null,
              projectSumRub,
              paidRub,
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
          <p className="mb-2 text-[12px] font-medium text-[var(--v2-ink-600)]">Формат</p>
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

        {engagementType === "one_off" ? (
          <div className="mt-4">
            <p className="mb-2 text-[12px] font-medium text-[var(--v2-ink-600)]">Вид проекта</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {PROJECT_KIND_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setProjectKind(opt.value)}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${projectKind === opt.value ? "border-[var(--v2-brand-400)] bg-[var(--v2-brand-50)]" : "border-[var(--v2-ink-200)] hover:border-[var(--v2-ink-300)]"}`}
                >
                  <div className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)]">{opt.label}</div>
                  <div className="v2-tight mt-0.5 text-[10.5px] leading-snug text-[var(--v2-ink-500)]">{opt.hint}</div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          <p className="mb-2 text-[12px] font-medium text-[var(--v2-ink-600)]">Приоритет</p>
          <PriorityFlagPicker value={priority} onChange={setPriority} />
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[12px] font-medium text-[var(--v2-ink-600)]">Финансы</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-[12px]">
              <span className="text-[var(--v2-ink-600)]">Сумма проекта, ₽</span>
              <span className="mt-0.5 block text-[11px] text-[var(--v2-ink-400)]">100% стоимости по договору</span>
              <MoneyRubInput
                value={projectSumDisplay}
                placeholder="100 000"
                onChange={(display, amount) => {
                  setProjectSumDisplay(display);
                  setProjectSumRub(amount);
                }}
              />
            </label>
            <label className="block text-[12px]">
              <span className="text-[var(--v2-ink-600)]">Оплачено клиентом, ₽</span>
              <span className="mt-0.5 block text-[11px] text-[var(--v2-ink-400)]">Предоплата или частичная оплата</span>
              <MoneyRubInput
                value={paidDisplay}
                placeholder="20 000"
                onChange={(display, amount) => {
                  setPaidDisplay(display);
                  setPaidRub(amount);
                }}
              />
            </label>
          </div>
        </div>

        <div className="mt-4">
          <span className="mb-1.5 block text-[12px] font-medium text-[var(--v2-ink-600)]">Дата релиза</span>
          {!noReleaseDate ? (
            <input
              type="date"
              className="v2-input mb-2 w-full"
              value={releaseLocal}
              onChange={(e) => setReleaseLocal(e.target.value)}
            />
          ) : null}
          <label className="flex cursor-pointer items-center gap-2">
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
