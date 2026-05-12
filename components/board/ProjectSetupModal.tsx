"use client";

import { apiUrl } from "@/lib/api-url";
import { ProjectSubtasksPanel } from "@/components/board/ProjectSubtasksPanel";
import { useCallback, useEffect, useRef, useState } from "react";

type TeamUser = { id: string; displayName: string; avatarUrl?: string | null };

function userInitial(name: string): string {
  const t = name.trim();
  return t ? t.charAt(0).toUpperCase() : "?";
}

function parseExtra(s: string | null | undefined): { ownerUserIds?: string[] } {
  if (!s) return {};
  try {
    const o = JSON.parse(s);
    return typeof o === "object" && o !== null ? o : {};
  } catch {
    return {};
  }
}

export function ProjectSetupModal({
  open,
  cardId,
  cardName,
  cardExtra,
  onClose,
  onChanged,
}: {
  open: boolean;
  cardId: string;
  cardName: string;
  cardExtra: string | null;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [ownerIds, setOwnerIds] = useState<string[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    const ex = parseExtra(cardExtra);
    setOwnerIds(Array.isArray(ex.ownerUserIds) ? ex.ownerUserIds.filter((x) => typeof x === "string") : []);
  }, [open, cardId, cardExtra]);

  useEffect(() => {
    if (!open) return;
    void fetch(apiUrl("/api/team/users"))
      .then((r) => r.json())
      .then((d: { users?: TeamUser[] }) => {
        if (Array.isArray(d.users)) {
          setUsers(
            d.users.map((u) => ({
              id: String(u.id ?? ""),
              displayName: String(u.displayName ?? ""),
              avatarUrl: u.avatarUrl ?? null,
            }))
          );
        }
      })
      .catch(() => setUsers([]));
  }, [open]);

  const persistOwners = useCallback(
    (nextIds: string[]) => {
      if (!cardId) return;
      const prev = parseExtra(cardExtra);
      const extra = JSON.stringify({ ...prev, ownerUserIds: nextIds.length ? nextIds : undefined });
      void fetch(apiUrl(`/api/cards/${cardId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extra }),
      }).then((r) => {
        if (r.ok) onChanged?.();
      });
    },
    [cardId, cardExtra, onChanged]
  );

  function toggleOwner(uid: string) {
    setOwnerIds((prev) => {
      const has = prev.includes(uid);
      const next = has ? prev.filter((x) => x !== uid) : [...prev, uid];
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persistOwners(next), 400);
      return next;
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[55] flex justify-center overflow-y-auto bg-black/45 px-3 py-6 sm:px-6 sm:py-10"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative my-auto w-full max-w-2xl min-h-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-elevated)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
          aria-label="Закрыть"
        >
          ✕
        </button>
        <div className="max-h-[min(88vh,920px)] overflow-y-auto px-5 pb-8 pt-12 sm:px-8 sm:pt-10">
          <h2 className="pr-10 text-lg font-semibold text-[var(--text)]">Настройка проекта</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{cardName}</p>

          <div className="mt-6 rounded-xl border border-[var(--border)]/80 bg-[var(--surface-2)]/25 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Ответственные за проект
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
              Выберите людей с ответственностью на уровне проекта (отображаются на карточке и участвуют в фильтре).
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {users.length === 0 ? (
                <span className="text-xs text-[var(--muted-foreground)]">Загрузка команды…</span>
              ) : (
                users.map((u) => {
                  const on = ownerIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleOwner(u.id)}
                      className={`flex items-center gap-2 rounded-full border px-2 py-1 text-left text-xs font-medium transition-colors ${
                        on
                          ? "border-[var(--primary)] bg-[var(--primary-soft)]/30 text-[var(--text)]"
                          : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--border)] text-[11px] font-semibold">
                          {userInitial(u.displayName)}
                        </span>
                      )}
                      <span className="max-w-[10rem] truncate">{u.displayName}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-6">
            <ProjectSubtasksPanel cardId={cardId} variant="full" onChanged={onChanged} />
          </div>
        </div>
      </div>
    </div>
  );
}
