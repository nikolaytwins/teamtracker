"use client";

import { V2Icons } from "@/components/v2/ui/icons";
import { useEffect, useRef, useState } from "react";

export function DeleteProjectConfirmModal({
  open,
  projectName,
  saving,
  onClose,
  onConfirm,
}: {
  open: boolean;
  projectName: string;
  saving?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-project-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[var(--v2-shadow-pop)]"
      >
        <h2 id="delete-project-title" className="v2-tight text-lg font-semibold text-[var(--v2-ink-900)]">
          Удалить проект?
        </h2>
        <p className="v2-tight mt-2 text-[14px] leading-relaxed text-[var(--v2-ink-600)]">
          Вы уверены, что хотите удалить проект «{projectName}»? Это действие нельзя отменить — проект исчезнет из
          портфеля, а его задачи останутся без привязки к проекту.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="v2-input text-sm" onClick={onClose} disabled={saving}>
            Отмена
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void onConfirm()}
            className="v2-tight inline-flex h-9 items-center rounded-xl bg-red-600 px-4 text-[13px] font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? "Удаление…" : "Да, удалить"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProjectActionsMenu({
  projectName,
  canDelete,
  onEditRequest,
  onDeleteRequest,
  buttonClassName = "",
  iconSize = "md",
}: {
  projectName: string;
  canDelete: boolean;
  onEditRequest?: () => void;
  onDeleteRequest: () => void;
  buttonClassName?: string;
  iconSize?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!canDelete && !onEditRequest) return null;

  const iconClass = iconSize === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title="Действия"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--v2-ink-500)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)] ${buttonClassName}`}
      >
        <V2Icons.more className={iconClass} />
      </button>
      {open ? (
        <div
          className="absolute right-0 top-full z-30 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-[var(--v2-ink-100)] bg-white py-1 shadow-[var(--v2-shadow-pop)]"
          onClick={(e) => e.stopPropagation()}
        >
          {onEditRequest ? (
            <button
              type="button"
              className="v2-tight flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[var(--v2-ink-800)] transition hover:bg-[var(--v2-ink-50)]"
              onClick={() => {
                setOpen(false);
                onEditRequest();
              }}
            >
              <V2Icons.edit className="h-4 w-4 shrink-0" />
              Редактировать проект
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              className="v2-tight flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-red-600 transition hover:bg-red-50"
              onClick={() => {
                setOpen(false);
                onDeleteRequest();
              }}
            >
              <V2Icons.trash className="h-4 w-4 shrink-0" />
              Удалить проект
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
