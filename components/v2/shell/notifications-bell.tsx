"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { V2NotificationWithMeta } from "@/lib/v2/notifications/notification-repo";
import { V2Icons } from "@/components/v2/ui/icons";
import { IconBtn } from "@/components/v2/ui/primitives";
import { useCallback, useEffect, useRef, useState } from "react";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function V2NotificationsBell({
  onOpenTask,
}: {
  onOpenTask?: (taskId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<V2NotificationWithMeta[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const data = await fetchJson<{ notifications: V2NotificationWithMeta[]; unreadCount: number }>(
      "/api/v2/notifications"
    );
    setItems(data.notifications);
    setUnread(data.unreadCount);
  }, []);

  useEffect(() => {
    load().catch(() => {});
    const id = setInterval(() => load().catch(() => {}), 60_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function markRead(id: string) {
    await fetchJson("/api/v2/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  async function markAllRead() {
    await fetchJson("/api/v2/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    await load();
  }

  return (
    <div ref={panelRef} className="relative">
      <IconBtn
        title="Уведомления"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
      >
        <span className="relative">
          <V2Icons.bell className="h-[18px] w-[18px]" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--v2-brand-500)] ring-2 ring-white" />
          ) : null}
        </span>
      </IconBtn>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[360px] overflow-hidden rounded-2xl border border-[var(--v2-ink-100)] bg-white shadow-[var(--v2-shadow-pop)]">
          <div className="flex items-center justify-between border-b border-[var(--v2-ink-100)] px-4 py-3">
            <span className="v2-tight text-[14px] font-semibold text-[var(--v2-ink-900)]">Уведомления</span>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-[12px] font-medium text-[var(--v2-brand-600)] hover:text-[var(--v2-brand-700)]"
              >
                Прочитать все
              </button>
            ) : null}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-[var(--v2-ink-500)]">Пока нет уведомлений</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    void markRead(n.id);
                    if (n.entity_type === "task" && n.entity_id) {
                      onOpenTask?.(n.entity_id);
                      setOpen(false);
                    }
                  }}
                  className={`flex w-full flex-col gap-1 border-b border-[var(--v2-ink-50)] px-4 py-3 text-left transition hover:bg-[var(--v2-ink-50)] ${
                    n.read_at ? "opacity-70" : "bg-[var(--v2-brand-50)]/30"
                  }`}
                >
                  <span className="v2-tight text-[13px] font-medium text-[var(--v2-ink-900)]">{n.title}</span>
                  {n.body ? <span className="text-[12px] leading-snug text-[var(--v2-ink-600)]">{n.body}</span> : null}
                  <span className="text-[11px] text-[var(--v2-ink-400)]">{formatWhen(n.created_at)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
