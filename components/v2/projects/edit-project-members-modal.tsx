"use client";

import { ProjectMembersPicker } from "@/components/v2/projects/project-members-picker";
import { useEffect, useState } from "react";

type Member = { user_id: string; display_name: string; role: string };

export function EditProjectMembersModal({
  open,
  projectName,
  members,
  meId,
  initialTeamMemberIds,
  initialClientUserIds,
  initialClientAccessEnabled,
  onClose,
  onSave,
}: {
  open: boolean;
  projectName: string;
  members: Member[];
  meId: string | null;
  initialTeamMemberIds: string[];
  initialClientUserIds: string[];
  initialClientAccessEnabled: boolean;
  onClose: () => void;
  onSave: (input: {
    teamMemberUserIds: string[];
    clientUserIds: string[];
    clientAccessEnabled: boolean;
  }) => Promise<void>;
}) {
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [clientUserIds, setClientUserIds] = useState<string[]>([]);
  const [clientAccessEnabled, setClientAccessEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTeamMemberIds(initialTeamMemberIds.filter((id) => id !== meId));
    setClientUserIds(initialClientUserIds);
    setClientAccessEnabled(initialClientAccessEnabled);
  }, [open, initialTeamMemberIds, initialClientUserIds, initialClientAccessEnabled, meId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <form
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-[var(--v2-shadow-pop)]"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            await onSave({
              teamMemberUserIds: teamMemberIds,
              clientUserIds: clientAccessEnabled ? clientUserIds : [],
              clientAccessEnabled,
            });
            onClose();
          } finally {
            setSaving(false);
          }
        }}
      >
        <h2 className="v2-tight text-lg font-semibold text-[var(--v2-ink-900)]">Участники проекта</h2>
        <p className="v2-tight mt-1 text-[13px] text-[var(--v2-ink-500)]">{projectName}</p>

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
          <button type="button" className="v2-input text-sm" onClick={onClose} disabled={saving}>
            Отмена
          </button>
          <button type="submit" disabled={saving} className="v2-btn-primary disabled:opacity-50">
            Сохранить
          </button>
        </div>
      </form>
    </div>
  );
}
