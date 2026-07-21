"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import { apiUrl } from "@/lib/api-url";
import type {
  PersonalIdea,
  PersonalIdeaImage,
  PersonalIdeasBoard,
  PersonalIdeaTag,
} from "@/lib/v2/personal/personal-ideas-repo";
import { V2Icons } from "@/components/v2/ui/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_ACCENT = "#F59E0B";

function snippet(text: string, max = 120) {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

function formatRelative(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `сегодня, ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return `вчера, ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M14.5 3.5 20.5 9.5l-2.3 2.3-1-.4-3.6 3.6.6 3.6-1.6 1.6-3.9-3.9-4.4 4.4-1.4-1.4 4.4-4.4-3.9-3.9 1.6-1.6 3.6.6 3.6-3.6-.4-1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IdeaCard({
  idea,
  index,
  onOpen,
  onDelete,
}: {
  idea: PersonalIdea;
  index: number;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const primary = idea.tags[0];
  const accent = primary?.color || DEFAULT_ACCENT;
  const restTags = idea.tags.slice(1);

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--v2-shadow-card)] transition-all duration-200 hover:shadow-[var(--v2-shadow-cardHv)]"
      style={{ animation: `v2-idea-card-in .4s cubic-bezier(.2,.7,.2,1) both`, animationDelay: `${index * 25}ms` }}
    >
      <span aria-hidden className="absolute bottom-0 left-0 top-0 w-[3px]" style={{ background: accent }} />

      <div className="absolute right-3 top-3 z-10 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Удалить"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--v2-ink-100)] text-[var(--v2-ink-500)] transition hover:bg-red-50 hover:text-red-500"
        >
          <V2Icons.trash className="h-[13px] w-[13px]" />
        </button>
      </div>

      <button type="button" onClick={onOpen} className="flex flex-1 flex-col py-4 pl-5 pr-4 text-left">
        <div className="flex items-center gap-2 pr-14">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] v2-tight"
            style={{ color: accent }}
          >
            <V2Icons.spark className="h-[13px] w-[13px]" />
            {primary?.name ?? "Идея"}
          </span>
          {idea.pinned ? <PinIcon className="h-3.5 w-3.5 text-[var(--v2-ink-400)]" /> : null}
        </div>

        <h3 className="v2-tight mt-2.5 text-[15px] font-semibold leading-snug text-[var(--v2-ink-900)]">
          {idea.title || "Без названия"}
        </h3>
        {idea.body ? (
          <p className="v2-tight mt-1.5 text-[12.5px] leading-relaxed text-[var(--v2-ink-500)]">
            {snippet(idea.body)}
          </p>
        ) : null}

        {restTags.length > 0 || idea.tags.length === 1 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(idea.tags.length === 1 ? idea.tags : restTags).map((t) => (
              <span
                key={t.id}
                className="v2-tight rounded-md bg-[var(--v2-ink-100)] px-1.5 py-[3px] text-[11px] font-medium text-[var(--v2-ink-600)]"
              >
                {t.name}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex items-center gap-2 pt-3.5">
          {idea.images.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--v2-ink-500)]">
              <V2Icons.paperclip className="h-3.5 w-3.5" />
              {idea.images.length}
            </span>
          ) : (
            <span className="text-[11.5px] font-medium text-[var(--v2-ink-500)] v2-tight">
              {primary ? `#${primary.name}` : "Без тега"}
            </span>
          )}
          <span className="ml-auto text-[11px] text-[var(--v2-ink-500)] v2-tnum">
            {formatRelative(idea.updated_at)}
          </span>
        </div>
      </button>
    </div>
  );
}

function IdeaEditorModal({
  open,
  idea,
  allTags,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  idea: PersonalIdea | null;
  allTags: PersonalIdeaTag[];
  onClose: () => void;
  onSaved: (board: PersonalIdeasBoard) => void;
  onDeleted: () => void;
}) {
  const isNew = !idea;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [tagFocus, setTagFocus] = useState(false);
  const [images, setImages] = useState<PersonalIdeaImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (idea) {
      setIdeaId(idea.id);
      setTitle(idea.title);
      setBody(idea.body);
      setPinned(idea.pinned);
      setTagNames(idea.tags.map((t) => t.name));
      setImages(idea.images);
    } else {
      setIdeaId(null);
      setTitle("");
      setBody("");
      setPinned(false);
      setTagNames([]);
      setImages([]);
    }
    setTagDraft("");
  }, [open, idea]);

  const suggestions = useMemo(() => {
    const q = tagDraft.trim().toLowerCase().replace(/^#/, "");
    if (!q) {
      return allTags
        .filter((t) => !tagNames.some((n) => n.toLowerCase() === t.name.toLowerCase()))
        .slice(0, 6);
    }
    return allTags
      .filter(
        (t) =>
          t.name.toLowerCase().includes(q) &&
          !tagNames.some((n) => n.toLowerCase() === t.name.toLowerCase())
      )
      .slice(0, 6);
  }, [allTags, tagDraft, tagNames]);

  const addTag = (name: string) => {
    const n = name.trim().replace(/^#/, "");
    if (!n) return;
    setTagNames((prev) => {
      if (prev.some((x) => x.toLowerCase() === n.toLowerCase())) return prev;
      return [...prev, n];
    });
    setTagDraft("");
  };

  const resolvedTagNames = () => {
    const draft = tagDraft.trim().replace(/^#/, "");
    const list = [...tagNames];
    if (draft && !list.some((x) => x.toLowerCase() === draft.toLowerCase())) list.push(draft);
    return list;
  };

  const reloadBoard = async () => {
    const board = await fetchJson<PersonalIdeasBoard>("/api/v2/personal/ideas");
    onSaved(board);
    return board;
  };

  const saveAndClose = async () => {
    setSaving(true);
    setError(null);
    try {
      const tags = resolvedTagNames();
      setTagNames(tags);
      setTagDraft("");
      if (ideaId) {
        await fetchJson(`/api/v2/personal/ideas/${ideaId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body, pinned, tagNames: tags }),
        });
      } else {
        await fetchJson("/api/v2/personal/ideas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body, pinned, tagNames: tags }),
        });
      }
      await reloadBoard();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const ensureSavedId = async (): Promise<string> => {
    const tags = resolvedTagNames();
    setTagNames(tags);
    setTagDraft("");
    if (ideaId) {
      await fetchJson(`/api/v2/personal/ideas/${ideaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, pinned, tagNames: tags }),
      });
      return ideaId;
    }
    const { idea: created } = await fetchJson<{ idea: PersonalIdea }>("/api/v2/personal/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, pinned, tagNames: tags }),
    });
    setIdeaId(created.id);
    return created.id;
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const id = await ensureSavedId();
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch(apiUrl(`/api/v2/personal/ideas/${id}/images`), {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Ошибка загрузки");
      const board = await reloadBoard();
      const fresh = board.ideas.find((i) => i.id === id);
      if (fresh) setImages(fresh.images);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить фото");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeImage = async (imageId: string) => {
    if (!ideaId) return;
    setError(null);
    try {
      await fetchJson(`/api/v2/personal/ideas/${ideaId}/images?imageId=${encodeURIComponent(imageId)}`, {
        method: "DELETE",
      });
      setImages((prev) => prev.filter((i) => i.id !== imageId));
      await reloadBoard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить фото");
    }
  };

  const removeIdea = async () => {
    if (!ideaId) {
      onClose();
      return;
    }
    if (!confirm("Удалить эту идею?")) return;
    setSaving(true);
    try {
      await fetchJson(`/api/v2/personal/ideas/${ideaId}`, { method: "DELETE" });
      onDeleted();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--v2-ink-900)]/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--v2-shadow-soft)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--v2-ink-100)] px-5 py-4">
          <h2 className="v2-tight text-[16px] font-semibold text-[var(--v2-ink-900)]">
            {isNew && !ideaId ? "Новая идея" : "Идея"}
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPinned((p) => !p)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium ${
                pinned
                  ? "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]"
                  : "text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-50)]"
              }`}
            >
              <PinIcon className="h-4 w-4" />
              {pinned ? "Закреплено" : "Закрепить"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-50)]"
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="О чём идея?"
            className="v2-tight h-10 w-full rounded-xl bg-[var(--v2-ink-100)]/70 px-3 text-[13.5px] text-[var(--v2-ink-900)] outline-none transition focus:bg-[var(--v2-ink-100)]"
            autoFocus={isNew && !ideaId}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Подробности, мысли, черновик…"
            rows={8}
            className="v2-tight w-full resize-y rounded-xl bg-[var(--v2-ink-100)]/70 px-3 py-2.5 text-[13.5px] leading-relaxed text-[var(--v2-ink-800)] outline-none transition focus:bg-[var(--v2-ink-100)]"
          />

          <div>
            <div className="text-[12px] font-medium text-[var(--v2-ink-600)]">Теги</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tagNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setTagNames((prev) => prev.filter((n) => n !== name))}
                  className="inline-flex items-center gap-1 rounded-md bg-[var(--v2-ink-100)] px-1.5 py-[3px] text-[11px] font-medium text-[var(--v2-ink-600)] hover:bg-red-50 hover:text-red-600"
                  title="Убрать тег"
                >
                  {name}
                  <span aria-hidden>×</span>
                </button>
              ))}
            </div>
            <div className="relative mt-2">
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onFocus={() => setTagFocus(true)}
                onBlur={() => {
                  window.setTimeout(() => setTagFocus(false), 150);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(tagDraft);
                  }
                }}
                placeholder="Тег и Enter — или Сохранить с текстом в поле"
                className="v2-tight h-10 w-full rounded-xl bg-[var(--v2-ink-100)]/70 px-3 text-[13px] outline-none transition focus:bg-[var(--v2-ink-100)]"
              />
              {tagFocus && suggestions.length > 0 ? (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-[var(--v2-ink-100)] bg-white shadow-[var(--v2-shadow-soft)]">
                  {suggestions.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addTag(t.name)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-[var(--v2-ink-50)]"
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                      {t.name}
                    </button>
                  ))}
                  {tagDraft.trim() &&
                  !allTags.some(
                    (t) => t.name.toLowerCase() === tagDraft.trim().replace(/^#/, "").toLowerCase()
                  ) ? (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addTag(tagDraft)}
                      className="flex w-full items-center gap-2 border-t border-[var(--v2-ink-100)] px-3 py-2 text-left text-[13px] text-[var(--v2-brand-700)] hover:bg-[var(--v2-brand-50)]"
                    >
                      <V2Icons.plus className="h-3.5 w-3.5" />
                      Создать «{tagDraft.trim().replace(/^#/, "")}»
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="text-[12px] font-medium text-[var(--v2-ink-600)]">Фотографии</div>
              <button
                type="button"
                disabled={uploading || saving}
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--v2-ink-100)]/70 px-2.5 text-[12px] font-medium text-[var(--v2-ink-700)] hover:bg-[var(--v2-ink-100)] disabled:opacity-50"
              >
                <V2Icons.plus className="h-3.5 w-3.5" />
                {uploading ? "Загрузка…" : "Добавить"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => void uploadFiles(e.target.files)}
              />
            </div>
            {images.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-[var(--v2-ink-400)]">Пока без фото</p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {images.map((img) => (
                  <div key={img.id} className="group/img relative overflow-hidden rounded-xl bg-[var(--v2-ink-100)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.name} className="aspect-square w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => void removeImage(img.id)}
                      className="absolute right-1.5 top-1.5 hidden rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] text-white group-hover/img:block"
                    >
                      Удалить
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--v2-ink-100)] px-5 py-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => void removeIdea()}
            className="text-[13px] text-red-500 hover:underline disabled:opacity-50"
          >
            {ideaId ? "Удалить" : "Отмена"}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-xl px-3.5 text-[12.5px] text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-100)]"
            >
              Закрыть
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveAndClose()}
              className="h-9 rounded-xl bg-[var(--v2-ink-900)] px-3.5 text-[12.5px] font-medium text-white transition hover:bg-[var(--v2-ink-700)] disabled:opacity-50"
            >
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PersonalIdeasClient() {
  const [board, setBoard] = useState<PersonalIdeasBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterTagId, setFilterTagId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeIdea, setActiveIdea] = useState<PersonalIdea | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<PersonalIdeasBoard>("/api/v2/personal/ideas");
      setBoard(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить идеи");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let ideas = board?.ideas ?? [];
    if (filterTagId) ideas = ideas.filter((i) => i.tags.some((t) => t.id === filterTagId));
    const q = query.trim().toLowerCase();
    if (q) {
      ideas = ideas.filter((i) => {
        const hay = `${i.title} ${i.body} ${i.tags.map((t) => t.name).join(" ")}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return ideas;
  }, [board, filterTagId, query]);

  const pinned = filtered.filter((i) => i.pinned);
  const rest = filtered.filter((i) => !i.pinned);

  const openNew = () => {
    setActiveIdea(null);
    setEditorOpen(true);
  };

  const openIdea = (idea: PersonalIdea) => {
    setActiveIdea(idea);
    setEditorOpen(true);
  };

  const deleteIdea = async (id: string) => {
    if (!confirm("Удалить эту идею?")) return;
    try {
      await fetchJson(`/api/v2/personal/ideas/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить");
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <style>{`
        @keyframes v2-idea-card-in {
          from { opacity: 0; transform: translateY(8px) scale(.99); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
      <div className="mx-auto max-w-[1240px] px-6 pb-24 pt-8 lg:px-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="v2-tighter text-[40px] font-semibold leading-[1.05] text-[var(--v2-ink-900)]">
              Идеи и заметки
            </h1>
            <p className="v2-tight mt-2 max-w-[58ch] text-[14.5px] text-[var(--v2-ink-500)]">
              Всё, что рождается между брифами: идеи, сценарии, наблюдения и референсы по проектам.{" "}
              {board ? (
                <>
                  <span className="font-medium text-[var(--v2-ink-800)]">{board.ideas.length}</span> записей.
                </>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-medium text-white shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)]"
          >
            <V2Icons.plus className="h-4 w-4" />
            Новая идея
          </button>
        </div>

        <div className="relative mb-5 overflow-hidden rounded-2xl bg-white shadow-[var(--v2-shadow-soft)]">
          <div className="v2-dotgrid pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative flex h-14 items-center gap-3 px-4">
            <V2Icons.search className="h-[18px] w-[18px] text-[var(--v2-ink-400)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по заметкам, идеям, сценариям…"
              className="v2-tight flex-1 bg-transparent text-[14.5px] text-[var(--v2-ink-900)] outline-none placeholder:text-[var(--v2-ink-400)]"
            />
          </div>
        </div>

        {board ? (
          <div className="mb-6 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setFilterTagId(null)}
              className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-full px-3 text-[12.5px] transition v2-tight ${
                filterTagId == null
                  ? "bg-[var(--v2-brand-600)] text-white shadow-[var(--v2-shadow-glow)]"
                  : "bg-white text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] hover:shadow-[var(--v2-shadow-cardHv)]"
              }`}
            >
              <span className="font-medium">Все</span>
              <span
                className={`v2-tnum text-[11px] ${filterTagId == null ? "text-white/70" : "text-[var(--v2-ink-400)]"}`}
              >
                {board.ideas.length}
              </span>
            </button>
            {board.tags.map((t) => {
              const active = filterTagId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilterTagId((id) => (id === t.id ? null : t.id))}
                  className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-full px-3 text-[12.5px] transition v2-tight ${
                    active
                      ? "bg-[var(--v2-brand-600)] text-white shadow-[var(--v2-shadow-glow)]"
                      : "bg-white text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] hover:shadow-[var(--v2-shadow-cardHv)]"
                  }`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: active ? "#fff" : t.color }}
                  />
                  <span className="font-medium">{t.name}</span>
                  <span className={`v2-tnum text-[11px] ${active ? "text-white/70" : "text-[var(--v2-ink-400)]"}`}>
                    {t.idea_count}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
          </div>
        ) : null}

        {loading && !board ? (
          <div className="py-16 text-center text-[13px] text-[var(--v2-ink-400)]">Загрузка…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center text-[13.5px] text-[var(--v2-ink-500)] shadow-[var(--v2-shadow-card)]">
            {query || filterTagId ? "Ничего не найдено" : "Пока нет идей — создайте первую"}
            {!query && !filterTagId ? (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={openNew}
                  className="inline-flex h-9 items-center rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-medium text-white"
                >
                  Новая идея
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-8">
            {pinned.length > 0 ? (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <PinIcon className="h-4 w-4 text-[var(--v2-ink-400)]" />
                  <h2 className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-700)]">Закреплённые</h2>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pinned.map((idea, i) => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      index={i}
                      onOpen={() => openIdea(idea)}
                      onDelete={() => void deleteIdea(idea.id)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-700)]">Все записи</h2>
                <span className="v2-tnum text-[12px] text-[var(--v2-ink-400)]">{rest.length}</span>
              </div>
              {rest.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((idea, i) => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      index={i}
                      onOpen={() => openIdea(idea)}
                      onDelete={() => void deleteIdea(idea.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-white p-10 text-center text-[13.5px] text-[var(--v2-ink-500)] shadow-[var(--v2-shadow-card)]">
                  Нет записей в этом фильтре
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <IdeaEditorModal
        open={editorOpen}
        idea={activeIdea}
        allTags={board?.tags ?? []}
        onClose={() => setEditorOpen(false)}
        onSaved={(next) => {
          setBoard(next);
          if (activeIdea) {
            const fresh = next.ideas.find((i) => i.id === activeIdea.id);
            if (fresh) setActiveIdea(fresh);
          }
        }}
        onDeleted={() => void load()}
      />
    </div>
  );
}
