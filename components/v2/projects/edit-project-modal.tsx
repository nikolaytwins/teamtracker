"use client";

import { fromDateInputValue, toDateInputValue } from "@/lib/v2/format";
import type { ProjectDetailPayload } from "@/lib/v2/projects/project-detail-types";
import { v2StatusToKanban } from "@/lib/v2/projects/portfolio-types";
import type { PortfolioKanbanStatus } from "@/lib/v2/projects/portfolio-types";
import { STATUS_META, STATUS_ORDER } from "@/components/v2/projects/portfolio-meta";
import { ProjectMembersPicker } from "@/components/v2/projects/project-members-picker";
import { useEffect, useState } from "react";

type Member = { user_id: string; display_name: string; role: string };

export function EditProjectModal({
  open,
  detail,
  members,
  meId,
  onClose,
  onSave,
}: {
  open: boolean;
  detail: ProjectDetailPayload;
  members: Member[];
  meId: string | null;
  onClose: () => void;
  onSave: (input: {
    name: string;
    status: PortfolioKanbanStatus;
    engagementType: "one_off" | "retainer";
    clientAccessEnabled: boolean;
    contractRef: string | null;
    releaseAt: string | null;
    budgetRub: number | null;
    teamMemberUserIds: string[];
    clientUserIds: string[];
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<PortfolioKanbanStatus>("in_progress");
  const [engagementType, setEngagementType] = useState<"one_off" | "retainer">("one_off");
  const [clientAccessEnabled, setClientAccessEnabled] = useState(false);
  const [contractRef, setContractRef] = useState("");
  const [releaseLocal, setReleaseLocal] = useState("");
  const [budgetRub, setBudgetRub] = useState("");
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [clientUserIds, setClientUserIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(detail.name);
    setStatus(v2StatusToKanban(detail.status));
    setEngagementType(detail.engagementType);
    setClientAccessEnabled(detail.clientAccessEnabled);
    setContractRef(detail.contractRef ?? "");
    setReleaseLocal(toDateInputValue(detail.releaseAt));
    setBudgetRub(detail.budgetRub != null ? String(detail.budgetRub) : "");
    setTeamMemberIds(detail.team.map((m) => m.userId).filter((id) => id !== meId));
    setClientUserIds(detail.clients.map((m) => m.userId));
  }, [open, detail, meId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4">
      <form
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-[var(--v2-shadow-pop)]"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setSaving(true);
          try {
            await onSave({
              name: name.trim(),
              status,
              engagementType,
              clientAccessEnabled,
              contractRef: contractRef.trim() || null,
              releaseAt: releaseLocal ? fromDateInputValue(releaseLocal) : null,
              budgetRub: budgetRub.trim() ? Math.round(Number(budgetRub)) : null,
              teamMemberUserIds: teamMemberIds,
              clientUserIds: clientAccessEnabled ? clientUserIds : [],
            });
            onClose();
          } finally {
            setSaving(false);
          }
        }}
      >
        <h2 className="v2-tight text-lg font-semibold text-[var(--v2-ink-900)]">Редактировать проект</h2>
        <p className="v2-tight mt-1 text-[13px] text-[var(--v2-ink-500)]">Название, статус, бюджет и участники</p>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[12px] font-medium text-[var(--v2-ink-600)]">Название</span>
          <input autoFocus className="v2-input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[12px] font-medium text-[var(--v2-ink-600)]">Статус</span>
          <select
            className="v2-input"
            value={status}
            onChange={(e) => setStatus(e.target.value as PortfolioKanbanStatus)}
          >
            {STATUS_ORDER.map((key) => (
              <option key={key} value={key}>
                {STATUS_META[key].label}
              </option>
            ))}
          </select>
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

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-[12px]">
            <span className="text-[var(--v2-ink-600)]">Договор / реф.</span>
            <input className="v2-input mt-1.5 w-full" value={contractRef} onChange={(e) => setContractRef(e.target.value)} placeholder="№ договора" />
          </label>
          <label className="block text-[12px]">
            <span className="text-[var(--v2-ink-600)]">Бюджет, ₽</span>
            <input
              type="number"
              min={0}
              step={1000}
              className="v2-input mt-1.5 w-full"
              value={budgetRub}
              onChange={(e) => setBudgetRub(e.target.value)}
              placeholder="500000"
            />
          </label>
        </div>

        <label className="mt-4 block text-[12px]">
          <span className="text-[var(--v2-ink-600)]">Дата релиза</span>
          <input type="date" className="v2-input mt-1.5 w-full" value={releaseLocal} onChange={(e) => setReleaseLocal(e.target.value)} />
        </label>

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

        <div className="mt-5 flex justify-end gap-2 border-t border-[var(--v2-ink-100)] pt-4">
          <button type="button" className="v2-input text-sm" onClick={onClose} disabled={saving}>
            Отмена
          </button>
          <button type="submit" disabled={saving || !name.trim()} className="v2-btn-primary disabled:opacity-50">
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </form>
    </div>
  );
}
