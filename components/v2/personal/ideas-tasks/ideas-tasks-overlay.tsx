"use client";

import { useEffect, type ReactNode } from "react";

export function IdeasTasksToast({
  message,
  actionLabel,
  onAction,
}: {
  message: string | null;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className={`toast${message ? " on" : ""}`} aria-live="polite">
      <span>{message ?? ""}</span>
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function IdeasTasksDrawer({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div className={`scrim${open ? " on" : ""}`} onClick={onClose} aria-hidden={!open} />
      <aside className={`drawer${open ? " on" : ""}`} aria-label="Карточка" aria-hidden={!open}>
        <div className="dr-h">
          <strong style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>{title}</strong>
          <button type="button" className="iconbtn" onClick={onClose} title="Закрыть">
            ✕
          </button>
        </div>
        <div className="dr-b">{children}</div>
        {footer ? <div className="dr-f">{footer}</div> : null}
      </aside>
    </>
  );
}
