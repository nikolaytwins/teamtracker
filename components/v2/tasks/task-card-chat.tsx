"use client";

import { gradientForUser, initialsFromName } from "@/lib/v2/projects/portfolio-utils";
import { V2Icons } from "@/components/v2/ui/icons";
import { useEffect, useMemo, useRef } from "react";

export type TaskComment = {
  id: string;
  author_user_id: string;
  author_name: string;
  body: string;
  parent_comment_id: string | null;
  created_at: string;
};

function formatCommentTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "только что";
  if (diffMin < 60) return `${diffMin} мин`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} ч`;
  return d.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

type CommentNode = TaskComment & { replies: CommentNode[] };

function buildCommentTree(comments: TaskComment[]): CommentNode[] {
  const byId = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];
  for (const c of comments) {
    byId.set(c.id, { ...c, replies: [] });
  }
  for (const c of comments) {
    const node = byId.get(c.id)!;
    if (c.parent_comment_id && byId.has(c.parent_comment_id)) {
      byId.get(c.parent_comment_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function CommentBubble({
  comment,
  depth,
  onReply,
}: {
  comment: CommentNode;
  depth: number;
  onReply: (comment: TaskComment) => void;
}) {
  const initials = initialsFromName(comment.author_name);
  const gradient = gradientForUser(comment.author_user_id);

  return (
    <div className={depth > 0 ? "ml-8 mt-2 border-l-2 border-[var(--v2-ink-100)] pl-3" : "mt-3"}>
      <div className="flex gap-2.5">
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
          style={{ background: gradient }}
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)]">{comment.author_name}</span>
            <span className="text-[11px] text-[var(--v2-ink-400)]">{formatCommentTime(comment.created_at)}</span>
          </div>
          <p className="v2-tight mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--v2-ink-700)]">
            {comment.body}
          </p>
          <button
            type="button"
            onClick={() => onReply(comment)}
            className="v2-tight mt-1 text-[11.5px] font-medium text-[var(--v2-brand-600)] hover:text-[var(--v2-brand-700)]"
          >
            Ответить
          </button>
        </div>
      </div>
      {comment.replies.map((r) => (
        <CommentBubble key={r.id} comment={r} depth={depth + 1} onReply={onReply} />
      ))}
    </div>
  );
}

export function TaskCardChat({
  comments,
  draft,
  onDraftChange,
  replyTo,
  onCancelReply,
  onSubmit,
  saving,
  error,
  onReply,
}: {
  comments: TaskComment[];
  draft: string;
  onDraftChange: (v: string) => void;
  replyTo: TaskComment | null;
  onCancelReply: () => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  error?: string | null;
  onReply: (comment: TaskComment) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const tree = useMemo(() => buildCommentTree(comments), [comments]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [comments.length]);

  return (
    <section className="flex min-h-0 flex-col border-t border-[var(--v2-ink-100)] bg-[var(--v2-ink-50)]/40">
      <div className="flex items-center gap-2 border-b border-[var(--v2-ink-100)]/80 px-5 py-3">
        <V2Icons.chat className="h-4 w-4 text-[var(--v2-ink-500)]" />
        <h3 className="v2-tight text-[14px] font-semibold text-[var(--v2-ink-900)]">Обсуждение</h3>
        <span className="v2-tnum ml-1 text-[12px] text-[var(--v2-ink-400)]">{comments.length}</span>
      </div>

      <div ref={scrollRef} className="max-h-[280px] min-h-[120px] flex-1 overflow-y-auto px-5 py-2">
        {tree.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[var(--v2-ink-400)]">Начните обсуждение — задайте вопрос или оставьте заметку</p>
        ) : (
          tree.map((c) => <CommentBubble key={c.id} comment={c} depth={0} onReply={onReply} />)
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-[var(--v2-ink-100)] bg-white p-4">
        {error ? <p className="mb-2 text-[12px] text-red-600">{error}</p> : null}
        {replyTo ? (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-[var(--v2-brand-50)] px-3 py-1.5 text-[12px] text-[var(--v2-brand-700)]">
            <span>
              Ответ для <strong>{replyTo.author_name}</strong>
            </span>
            <button type="button" onClick={onCancelReply} className="text-[var(--v2-ink-500)] hover:text-[var(--v2-ink-800)]">
              ✕
            </button>
          </div>
        ) : null}
        <div className="flex gap-2">
          <textarea
            rows={2}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder={replyTo ? `Ответить ${replyTo.author_name.split(" ")[0]}…` : "Написать комментарий…"}
            className="v2-input min-h-[44px] flex-1 resize-none text-[13px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={saving || !draft.trim()}
            className="v2-btn-primary inline-flex h-11 shrink-0 items-center px-4 disabled:opacity-40"
          >
            <V2Icons.arrowR className="h-4 w-4" />
          </button>
        </div>
      </form>
    </section>
  );
}
