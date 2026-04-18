"use client";

import { apiUrl } from "@/lib/api-url";
import { useCallback, useEffect, useState } from "react";

type CommentRow = {
  id: string;
  author_display_name: string;
  author_user_id: string;
  body: string;
  created_at: string;
};

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function CardCommentsPanel({ cardId }: { cardId: string }) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cardId) return;
    setErr(null);
    try {
      const r = await fetch(apiUrl(`/api/cards/${cardId}/comments`));
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Не загрузилось");
      const list = Array.isArray(d.comments) ? d.comments : [];
      setComments(
        list.map((c: Record<string, unknown>) => ({
          id: String(c.id ?? ""),
          author_display_name: String(c.author_display_name ?? ""),
          author_user_id: String(c.author_user_id ?? ""),
          body: String(c.body ?? ""),
          created_at: String(c.created_at ?? ""),
        }))
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const b = text.trim();
    if (!b || saving) return;
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch(apiUrl(`/api/cards/${cardId}/comments`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: b }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.error === "string" ? d.error : "Не отправилось");
      setText("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
      <h2 className="text-base font-semibold text-[var(--text)]">Комментарии</h2>
      <p className="mt-1 text-xs text-[var(--muted-foreground)]">Лента по проекту, новые сообщения внизу.</p>
      {err ? <p className="mt-2 text-sm text-[var(--danger)]">{err}</p> : null}
      <div className="mt-4 max-h-[min(50vh,420px)] space-y-3 overflow-y-auto rounded-lg border border-[var(--border)]/60 bg-[var(--bg)]/20 p-3">
        {loading ? (
          <p className="text-sm text-[var(--muted-foreground)]">Загрузка…</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">Пока нет комментариев.</p>
        ) : (
          comments.map((c) => (
            <article key={c.id} className="rounded-lg border border-[var(--border)]/50 bg-[var(--surface)]/90 px-3 py-2.5 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-[var(--muted-foreground)]">
                <span className="font-semibold text-[var(--text)]">{c.author_display_name}</span>
                <time dateTime={c.created_at}>{formatWhen(c.created_at)}</time>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[var(--text)] leading-relaxed">{c.body}</p>
            </article>
          ))
        )}
      </div>
      <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-2">
        <label className="block text-xs font-medium text-[var(--muted-foreground)]">Новый комментарий</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Текст…"
          className="tt-input w-full resize-y text-sm"
          maxLength={8000}
        />
        <button
          type="submit"
          disabled={saving || !text.trim()}
          className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40"
        >
          {saving ? "Отправка…" : "Отправить"}
        </button>
      </form>
    </div>
  );
}
