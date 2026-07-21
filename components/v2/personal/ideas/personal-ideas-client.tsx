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

function snippet(text: string, max = 140) {
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
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function IdeaSticker({
  idea,
  onOpen,
}: {
  idea: PersonalIdea;
  onOpen: () => void;
}) {
  const primary = idea.tags[0];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex min-h-[200px] flex-col rounded-2xl p-4 text-left shadow-[var(--v2-shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--v2-shadow-cardHv)]"
      style={{ background: idea.accent }}
    >
      <div className="flex items-start justify-between gap-2">
        {primary ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-[var(--v2-ink-700)]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: primary.color }} />
            {primary.name}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium text-[var(--v2-ink-500)]">
            Без тега
          </span>
        )}
        {idea.pinned ? (
          <V2Icons.flag className="h-4 w-4 shrink-0 text-[var(--v2-ink-500)]" />
        ) : null}
      </div>
      <h3 className="v2-tight mt-3 text-[16px] font-semibold leading-snug text-[var(--v2-ink-900)]">
        {idea.title || "Без названия"}
      </h3>
      {idea.body ? (
        <p className="mt-2 flex-1 text-[13px] leading-relaxed text-[var(--v2-ink-600)]">
          {snippet(idea.body)}
        </p>
      ) : (
        <div className="flex-1" />
      )}
      {idea.tags.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {idea.tags.slice(1).map((t) => (
            <span
              key={t.id}
              className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] text-[var(--v2-ink-600)]"
            >
              #{t.name}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-[var(--v2-ink-500)]">
        <span>{formatRelative(idea.updated_at)}</span>
        {idea.images.length > 0 ? (
          <span className="inline-flex items-center gap-1">
            <V2Icons.paperclip className="h-3.5 w-3.5" />
            {idea.images.length}
          </span>
        ) : null}
      </div>
    </button>
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
    if (!q) return allTags.filter((t) => !tagNames.some((n) => n.toLowerCase() === t.name.toLowerCase())).slice(0, 6);
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
    if (tagNames.some((x) => x.toLowerCase() === n.toLowerCase())) {
      setTagDraft("");
      return;
    }
    setTagNames((prev) => [...prev, n]);
    setTagDraft("");
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
      if (ideaId) {
        await fetchJson(`/api/v2/personal/ideas/${ideaId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body, pinned, tagNames }),
        });
      } else {
        await fetchJson("/api/v2/personal/ideas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body, pinned, tagNames }),
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
    if (ideaId) {
      await fetchJson(`/api/v2/personal/ideas/${ideaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, pinned, tagNames }),
      });
      return ideaId;
    }
    const { idea: created } = await fetchJson<{ idea: PersonalIdea }>("/api/v2/personal/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, pinned, tagNames }),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--v2-shadow-pop)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--v2-ink-100)] px-5 py-4">
          <h2 className="v2-tight text-lg font-semibold text-[var(--v2-ink-900)]">
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
              <V2Icons.flag className="h-4 w-4" />
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
            placeholder="Заголовок"
            className="v2-tight w-full border-0 bg-transparent text-[22px] font-semibold text-[var(--v2-ink-900)] outline-none placeholder:text-[var(--v2-ink-300)]"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Подробности, мысли, черновик…"
            rows={8}
            className="w-full resize-y rounded-xl border border-[var(--v2-ink-100)] bg-[var(--v2-ink-50)]/50 px-3 py-2.5 text-[14px] leading-relaxed text-[var(--v2-ink-800)] outline-none focus:border-[var(--v2-brand-300)]"
          />

          <div>
            <div className="text-[12px] font-medium text-[var(--v2-ink-600)]">Теги</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tagNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setTagNames((prev) => prev.filter((n) => n !== name))}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--v2-ink-100)] px-2.5 py-1 text-[12px] text-[var(--v2-ink-700)] hover:bg-red-50 hover:text-red-600"
                  title="Убрать тег"
                >
                  #{name}
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
                placeholder="Напишите тег и Enter — или выберите из списка"
                className="h-10 w-full rounded-xl border border-[var(--v2-ink-200)] px-3 text-[13px] outline-none focus:border-[var(--v2-brand-300)]"
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
                      #{t.name}
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
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--v2-ink-200)] px-2.5 text-[12px] font-medium text-[var(--v2-ink-700)] hover:bg-[var(--v2-ink-50)] disabled:opacity-50"
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
                  <div key={img.id} className="group relative overflow-hidden rounded-xl bg-[var(--v2-ink-100)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.name} className="aspect-square w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => void removeImage(img.id)}
                      className="absolute right-1.5 top-1.5 hidden rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] text-white group-hover:block"
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
              className="h-9 rounded-xl px-4 text-[13px] text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)]"
            >
              Закрыть
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveAndClose()}
              className="h-9 rounded-xl bg-[var(--v2-brand-600)] px-4 text-[13px] font-medium text-white hover:bg-[var(--v2-brand-700)] disabled:opacity-50"
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
    const ideas = board?.ideas ?? [];
    if (!filterTagId) return ideas;
    return ideas.filter((i) => i.tags.some((t) => t.id === filterTagId));
  }, [board, filterTagId]);

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

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-[var(--v2-ink-50)]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="v2-tight text-[28px] font-semibold tracking-tight text-[var(--v2-ink-900)]">
              Идеи
            </h1>
            <p className="mt-1 text-[13px] text-[var(--v2-ink-500)]">
              {board
                ? `${board.ideas.length} ${board.ideas.length === 1 ? "стикер" : "стикеров"} — мысли, черновики и заметки по проектам`
                : "Стикеры с идеями и тегами"}
            </p>
          </div>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--v2-brand-600)] px-4 text-[13px] font-medium text-white hover:bg-[var(--v2-brand-700)]"
          >
            <V2Icons.plus className="h-4 w-4" />
            Новая идея
          </button>
        </div>

        {board ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterTagId(null)}
              className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition ${
                filterTagId == null
                  ? "bg-[var(--v2-ink-900)] text-white"
                  : "bg-white text-[var(--v2-ink-600)] shadow-[var(--v2-shadow-soft)] hover:bg-[var(--v2-ink-50)]"
              }`}
            >
              Все типы {board.ideas.length}
            </button>
            {board.tags.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilterTagId((id) => (id === t.id ? null : t.id))}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition ${
                  filterTagId === t.id
                    ? "bg-[var(--v2-ink-900)] text-white"
                    : "bg-white text-[var(--v2-ink-600)] shadow-[var(--v2-shadow-soft)] hover:bg-[var(--v2-ink-50)]"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: filterTagId === t.id ? "#fff" : t.color }}
                />
                {t.name} {t.idea_count}
              </button>
            ))}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
          </div>
        ) : null}

        {loading && !board ? (
          <div className="mt-16 text-center text-[13px] text-[var(--v2-ink-400)]">Загрузка…</div>
        ) : filtered.length === 0 ? (
          <div className="mt-16 rounded-2xl border border-dashed border-[var(--v2-ink-200)] bg-white px-6 py-14 text-center">
            <p className="text-[15px] font-medium text-[var(--v2-ink-800)]">Пока пусто</p>
            <p className="mt-1 text-[13px] text-[var(--v2-ink-500)]">
              Создайте первый стикер с идеей и тегами для быстрой фильтрации
            </p>
            <button
              type="button"
              onClick={openNew}
              className="mt-4 inline-flex h-9 items-center rounded-xl bg-[var(--v2-brand-600)] px-4 text-[13px] font-medium text-white"
            >
              Добавить идею
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {pinned.length > 0 ? (
              <section>
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
                  Закреплено
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pinned.map((idea) => (
                    <IdeaSticker key={idea.id} idea={idea} onOpen={() => openIdea(idea)} />
                  ))}
                </div>
              </section>
            ) : null}
            {rest.length > 0 ? (
              <section>
                {pinned.length > 0 ? (
                  <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
                    Остальные
                  </div>
                ) : null}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((idea) => (
                    <IdeaSticker key={idea.id} idea={idea} onOpen={() => openIdea(idea)} />
                  ))}
                </div>
              </section>
            ) : null}
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
