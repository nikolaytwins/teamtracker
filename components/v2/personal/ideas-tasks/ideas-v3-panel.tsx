"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import type {
  IdeaPriority,
  PersonalIdea,
  PersonalIdeasBoard,
  PersonalIdeaTag,
} from "@/lib/v2/personal/personal-ideas-repo";
import { useCallback, useEffect, useMemo, useState } from "react";

type IdeaView = "notes" | "kanban";

const PRIO_LABEL: Record<IdeaPriority, string> = {
  high: "высокий",
  normal: "обычный",
  low: "низкий",
};

const PRIO_CLASS: Record<IdeaPriority, string> = {
  high: "bg-[#FEE4E2] text-[#B42318]",
  normal: "bg-[var(--v2-ink-100)] text-[var(--v2-ink-600)]",
  low: "bg-[#EAECF0] text-[#475467]",
};

const PRIO_RANK: Record<IdeaPriority, number> = { high: 0, normal: 1, low: 2 };

const PROJECT_TINTS: Record<string, [string, string]> = {
  "": ["#F4F6FA", "#475467"],
};

function tintForProject(name: string, tags: PersonalIdeaTag[]): [string, string] {
  if (!name) return PROJECT_TINTS[""]!;
  const tag = tags.find((t) => t.name === name);
  if (!tag) return ["#E7EDFD", "#2A56EB"];
  return [`${tag.color}18`, tag.color];
}

function ideaProject(idea: PersonalIdea) {
  return idea.tags[0]?.name ?? "";
}

function formatIdeaDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function IdeaEditor({
  idea,
  tags,
  onClose,
  onSaved,
}: {
  idea: PersonalIdea;
  tags: PersonalIdeaTag[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(idea.title);
  const [body, setBody] = useState(idea.body);
  const [project, setProject] = useState(ideaProject(idea));
  const [prio, setPrio] = useState<IdeaPriority>(idea.idea_priority);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await fetchJson(`/api/v2/personal/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          idea_priority: prio,
          tagNames: project ? [project] : [],
        }),
      });
      onSaved();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onClick={onClose}>
      <div
        className="v2-card w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="v2-tight mb-4 text-[20px] font-semibold text-[var(--v2-ink-900)]">Идея</h3>
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="v2-tight h-11 w-full rounded-xl border-[1.5px] border-[var(--v2-ink-200)] px-3 text-[15px] outline-none focus:border-[var(--v2-brand-500)]"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Заметка"
            className="v2-tight w-full rounded-xl border-[1.5px] border-[var(--v2-ink-200)] px-3 py-2 text-[14px] outline-none focus:border-[var(--v2-brand-500)]"
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="v2-tight h-10 rounded-xl border-[1.5px] border-[var(--v2-ink-200)] px-3 text-[14px]"
            >
              <option value="">Без проекта</option>
              {tags.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              value={prio}
              onChange={(e) => setPrio(e.target.value as IdeaPriority)}
              className="v2-tight h-10 rounded-xl border-[1.5px] border-[var(--v2-ink-200)] px-3 text-[14px]"
            >
              <option value="normal">обычный</option>
              <option value="high">высокий</option>
              <option value="low">низкий</option>
            </select>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={busy || !title.trim()}
            onClick={() => void save()}
            className="v2-tight h-10 rounded-xl bg-[var(--v2-brand-600)] px-4 text-[14px] font-semibold text-white disabled:opacity-45"
          >
            Сохранить
          </button>
          <button type="button" onClick={onClose} className="v2-tight h-10 px-3 text-[14px] text-[var(--v2-ink-500)]">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

export function IdeasV3Panel() {
  const [board, setBoard] = useState<PersonalIdeasBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<IdeaView>("notes");
  const [search, setSearch] = useState("");
  const [prioFilter, setPrioFilter] = useState<"all" | IdeaPriority>("all");
  const [projFilter, setProjFilter] = useState<"all" | string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addProject, setAddProject] = useState("");
  const [addPrio, setAddPrio] = useState<IdeaPriority>("normal");
  const [editIdea, setEditIdea] = useState<PersonalIdea | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchJson<PersonalIdeasBoard>("/api/v2/personal/ideas");
      setBoard(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить идеи");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const activeIdeas = useMemo(
    () => (board?.ideas ?? []).filter((i) => !i.archived_at),
    [board]
  );

  const projectNames = useMemo(() => {
    const names = new Set<string>();
    for (const idea of activeIdeas) {
      const p = ideaProject(idea);
      if (p) names.add(p);
    }
    return [...names].sort((a, b) => a.localeCompare(b, "ru"));
  }, [activeIdeas]);

  const matchIdea = useCallback(
    (idea: PersonalIdea) => {
      const q = search.trim().toLowerCase();
      if (q && !idea.title.toLowerCase().includes(q) && !idea.body.toLowerCase().includes(q)) return false;
      if (prioFilter !== "all" && idea.idea_priority !== prioFilter) return false;
      return true;
    },
    [search, prioFilter]
  );

  const sorted = (items: PersonalIdea[]) =>
    [...items].sort((a, b) => {
      const r = PRIO_RANK[a.idea_priority] - PRIO_RANK[b.idea_priority];
      if (r !== 0) return r;
      return b.updated_at.localeCompare(a.updated_at);
    });

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }

  async function addIdea(e: React.FormEvent) {
    e.preventDefault();
    const title = addTitle.trim();
    if (!title) return;
    try {
      await fetchJson("/api/v2/personal/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          idea_priority: addPrio,
          tagNames: addProject ? [addProject] : [],
        }),
      });
      setAddTitle("");
      setShowAdd(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать идею");
    }
  }

  async function archiveIdea(idea: PersonalIdea) {
    await fetchJson(`/api/v2/personal/ideas/${idea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    await load();
    flash("Идея в архиве");
  }

  async function toTask(idea: PersonalIdea) {
    try {
      const pName = ideaProject(idea);
      let project_id: string | null = null;
      if (pName) {
        const boot = await fetchJson<{ projects: { id: string; name: string; is_inbox: boolean }[] }>(
          "/api/v2/personal/todos/bootstrap"
        );
        const match = boot.projects.find((p) => !p.is_inbox && p.name.toLowerCase() === pName.toLowerCase());
        if (match) project_id = match.id;
      }
      await fetchJson("/api/v2/personal/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: idea.title,
          description: idea.body || null,
          project_id,
        }),
      });
      await fetchJson(`/api/v2/personal/ideas/${idea.id}`, { method: "DELETE" });
      await load();
      flash("Теперь это задача");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать задачу");
    }
  }

  async function moveIdeaToProject(ideaId: string, project: string) {
    await fetchJson(`/api/v2/personal/ideas/${ideaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagNames: project ? [project] : [] }),
    });
    await load();
  }

  const groupsForNotes = useMemo(() => {
    const names = projFilter === "all" ? [...projectNames, ""] : [projFilter === "__none" ? "" : projFilter];
    return names.map((p) => ({
      project: p,
      items: sorted(activeIdeas.filter((i) => matchIdea(i) && ideaProject(i) === p)),
    }));
  }, [activeIdeas, projectNames, projFilter, matchIdea]);

  const kanbanCols = useMemo(() => {
    const cols = [...projectNames, ""];
    return cols.map((p) => ({
      project: p,
      items: sorted(activeIdeas.filter((i) => matchIdea(i) && ideaProject(i) === p)),
    }));
  }, [activeIdeas, projectNames, matchIdea]);

  function NoteCard({ idea }: { idea: PersonalIdea }) {
    const p = ideaProject(idea);
    const [bg, accent] = tintForProject(p, board?.tags ?? []);
    return (
      <div
        className="rounded-2xl border-[1.5px] border-[var(--v2-ink-100)] p-4 transition hover:shadow-[var(--v2-shadow-card)]"
        style={{ background: bg }}
      >
        <button type="button" onClick={() => setEditIdea(idea)} className="w-full text-left">
          <div className="v2-tight text-[16px] font-semibold tracking-[-0.015em]" style={{ color: accent }}>
            {idea.title}
          </div>
          {idea.body ? (
            <p className="v2-tight mt-1.5 line-clamp-3 text-[13.5px] text-[var(--v2-ink-600)]">{idea.body}</p>
          ) : null}
        </button>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${PRIO_CLASS[idea.idea_priority]}`}>
            {PRIO_LABEL[idea.idea_priority]}
          </span>
          <span className="v2-tnum text-[12px] text-[var(--v2-ink-400)]">{formatIdeaDate(idea.created_at)}</span>
          <div className="ml-auto flex gap-1">
            <button
              type="button"
              onClick={() => void toTask(idea)}
              className="v2-tight text-[12px] font-medium text-[var(--v2-brand-600)] hover:underline"
            >
              → задача
            </button>
            <button
              type="button"
              onClick={() => void archiveIdea(idea)}
              className="v2-tight text-[12px] font-medium text-[var(--v2-ink-500)] hover:underline"
            >
              архив
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      {toast ? (
        <div className="v2-tight fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[var(--v2-ink-900)] px-4 py-2.5 text-[14px] text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full bg-[var(--v2-ink-100)] p-1">
          {(
            [
              ["notes", "Заметки"],
              ["kanban", "Канбан"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={`v2-tight rounded-full px-4 py-1.5 text-[13px] font-medium transition ${
                view === key ? "bg-white text-[var(--v2-ink-900)] shadow-sm" : "text-[var(--v2-ink-600)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="v2-tight ml-auto h-10 rounded-xl bg-[var(--v2-brand-600)] px-4 text-[14px] font-semibold text-white hover:bg-[var(--v2-brand-700)]"
        >
          + Идея
        </button>
      </div>

      {showAdd ? (
        <form onSubmit={(e) => void addIdea(e)} className="v2-card mb-4 flex flex-wrap items-end gap-2 p-4">
          <input
            value={addTitle}
            onChange={(e) => setAddTitle(e.target.value)}
            placeholder="Заголовок идеи"
            className="v2-tight h-11 min-w-[200px] flex-1 rounded-xl border-[1.5px] border-[var(--v2-ink-200)] px-3 text-[15px] outline-none focus:border-[var(--v2-brand-500)]"
            autoFocus
          />
          <input
            value={addProject}
            onChange={(e) => setAddProject(e.target.value)}
            placeholder="Проект"
            list="idea-project-suggestions"
            className="v2-tight h-11 w-[160px] rounded-xl border-[1.5px] border-[var(--v2-ink-200)] px-3 text-[14px] outline-none focus:border-[var(--v2-brand-500)]"
          />
          <datalist id="idea-project-suggestions">
            {projectNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <select
            value={addPrio}
            onChange={(e) => setAddPrio(e.target.value as IdeaPriority)}
            className="v2-tight h-11 rounded-xl border-[1.5px] border-[var(--v2-ink-200)] px-3 text-[14px]"
          >
            <option value="normal">обычный</option>
            <option value="high">высокий</option>
            <option value="low">низкий</option>
          </select>
          <button
            type="submit"
            disabled={!addTitle.trim()}
            className="v2-tight h-11 rounded-xl bg-[var(--v2-brand-600)] px-4 text-[14px] font-semibold text-white disabled:opacity-45"
          >
            Сохранить
          </button>
        </form>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск"
          className="v2-tight h-10 min-w-[140px] flex-1 rounded-xl border-[1.5px] border-[var(--v2-ink-200)] bg-white px-3 text-[14px] outline-none focus:border-[var(--v2-brand-500)]"
        />
        <select
          value={prioFilter}
          onChange={(e) => setPrioFilter(e.target.value as "all" | IdeaPriority)}
          className="v2-tight h-10 rounded-xl border-[1.5px] border-[var(--v2-ink-200)] bg-white px-3 text-[14px]"
        >
          <option value="all">Все приоритеты</option>
          <option value="high">Высокий</option>
          <option value="normal">Обычный</option>
          <option value="low">Низкий</option>
        </select>
        {view === "notes" ? (
          <select
            value={projFilter}
            onChange={(e) => setProjFilter(e.target.value)}
            className="v2-tight h-10 rounded-xl border-[1.5px] border-[var(--v2-ink-200)] bg-white px-3 text-[14px]"
          >
            <option value="all">Все проекты</option>
            <option value="__none">Без проекта</option>
            {projectNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {error ? <p className="v2-tight mb-3 text-[13px] text-red-600">{error}</p> : null}
      {loading ? (
        <p className="text-[14px] text-[var(--v2-ink-400)]">Загрузка…</p>
      ) : view === "notes" ? (
        groupsForNotes.some((g) => g.items.length) ? (
          <div className="space-y-6">
            <p className="text-[14.5px] text-[var(--v2-ink-500)]">
              Здесь лежит то, что интересно, но ничего не требует. Приоритет — только порядок возвращения.
            </p>
            {groupsForNotes.map((g) =>
              g.items.length ? (
                <section key={g.project || "__none"}>
                  <div className="mb-3 flex items-center gap-2">
                    <h3 className="v2-tight text-[16px] font-semibold text-[var(--v2-ink-900)]">
                      {g.project || "Без проекта"}
                    </h3>
                    <span className="v2-tnum text-[13px] text-[var(--v2-ink-400)]">{g.items.length}</span>
                    <hr className="ml-2 flex-1 border-[var(--v2-ink-100)]" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {g.items.map((idea) => (
                      <NoteCard key={idea.id} idea={idea} />
                    ))}
                  </div>
                </section>
              ) : null
            )}
          </div>
        ) : (
          <div className="rounded-2xl border-[1.5px] border-dashed border-[var(--v2-ink-200)] px-6 py-10 text-center text-[15px] text-[var(--v2-ink-400)]">
            Ничего не нашлось. Сохрани первую идею — она не обязательство.
          </div>
        )
      ) : kanbanCols.some((c) => c.items.length) || projectNames.length ? (
        <div className="-mx-2 flex gap-3 overflow-x-auto pb-4">
          {kanbanCols.map((col) => {
            const [bg, accent] = tintForProject(col.project, board?.tags ?? []);
            return (
              <div
                key={col.project || "__none"}
                className="w-[min(100%,280px)] shrink-0 rounded-2xl bg-[var(--v2-ink-50)] p-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain") || dragId;
                  if (id) void moveIdeaToProject(id, col.project);
                  setDragId(null);
                }}
              >
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className="v2-tight text-[14px] font-semibold" style={{ color: accent }}>
                    {col.project || "Без проекта"}
                  </span>
                  <span className="v2-tnum text-[12px] text-[var(--v2-ink-400)]">{col.items.length}</span>
                </div>
                <div className="space-y-2">
                  {col.items.map((idea) => (
                    <div
                      key={idea.id}
                      draggable
                      onDragStart={() => setDragId(idea.id)}
                      className="cursor-grab rounded-xl border border-[var(--v2-ink-100)] p-3 active:cursor-grabbing"
                      style={{ background: bg }}
                      onClick={() => setEditIdea(idea)}
                    >
                      <div className="v2-tight text-[14px] font-semibold text-[var(--v2-ink-900)]">{idea.title}</div>
                      {idea.body ? (
                        <p className="v2-tight mt-1 line-clamp-2 text-[12.5px] text-[var(--v2-ink-600)]">{idea.body}</p>
                      ) : null}
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${PRIO_CLASS[idea.idea_priority]}`}>
                          {PRIO_LABEL[idea.idea_priority]}
                        </span>
                        <span className="v2-tnum ml-auto text-[11px] text-[var(--v2-ink-400)]">
                          {formatIdeaDate(idea.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAddProject(col.project);
                    setShowAdd(true);
                  }}
                  className="v2-tight mt-2 w-full rounded-lg py-2 text-[13px] font-medium text-[var(--v2-ink-500)] hover:bg-white/60"
                >
                  + идея
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border-[1.5px] border-dashed border-[var(--v2-ink-200)] px-6 py-10 text-center text-[15px] text-[var(--v2-ink-400)]">
          Ничего не нашлось. Сохрани первую идею — она не обязательство.
        </div>
      )}

      {editIdea && board ? (
        <IdeaEditor idea={editIdea} tags={board.tags} onClose={() => setEditIdea(null)} onSaved={() => void load()} />
      ) : null}
    </div>
  );
}
