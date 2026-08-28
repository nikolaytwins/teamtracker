"use client";

import { IdeasTasksDrawer, IdeasTasksToast } from "@/components/v2/personal/ideas-tasks/ideas-tasks-overlay";
import { IDEA_PRIO_CLASS, IDEA_PRIO_LABEL, tintForProject } from "@/components/v2/personal/ideas-tasks/ideas-tasks-utils";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type {
  IdeaPriority,
  PersonalIdea,
  PersonalIdeasBoard,
} from "@/lib/v2/personal/personal-ideas-repo";
import { useCallback, useEffect, useMemo, useState } from "react";

type IdeaView = "notes" | "kb";

const PRIO_RANK: Record<IdeaPriority, number> = { high: 0, normal: 1, low: 2 };

function ideaProject(idea: PersonalIdea) {
  return idea.tags[0]?.name ?? "";
}

function formatIdeaDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function IdeasV3Panel({ onCountChange }: { onCountChange?: (n: number) => void }) {
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
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editProject, setEditProject] = useState("");
  const [editPrio, setEditPrio] = useState<IdeaPriority>("normal");
  const [toast, setToast] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchJson<PersonalIdeasBoard>("/api/v2/personal/ideas");
      setBoard(data);
      setError(null);
      onCountChange?.(data.ideas.filter((i) => !i.archived_at).length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить идеи");
    }
  }, [onCountChange]);

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
      if (view === "notes" && projFilter !== "all") {
        const p = ideaProject(idea);
        if (projFilter === "__none" && p) return false;
        if (projFilter !== "__none" && p !== projFilter) return false;
      }
      return true;
    },
    [search, prioFilter, projFilter, view]
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

  async function saveIdea() {
    if (!editIdea) return;
    try {
      await fetchJson(`/api/v2/personal/ideas/${editIdea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          body: editBody,
          idea_priority: editPrio,
          tagNames: editProject ? [editProject] : [],
        }),
      });
      setEditIdea(null);
      await load();
      flash("Идея сохранена");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
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

  function openIdea(idea: PersonalIdea) {
    setEditIdea(idea);
    setEditTitle(idea.title);
    setEditBody(idea.body);
    setEditProject(ideaProject(idea));
    setEditPrio(idea.idea_priority);
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
    const [bg, accent] = tintForProject(p);
    return (
      <div
        className="note"
        style={{ background: bg, color: accent }}
        onClick={() => openIdea(idea)}
      >
        <span className="note-hi" />
        <div className="note-acts">
          <button
            type="button"
            className="note-act tip"
            data-tip="Превратить в задачу"
            onClick={(e) => {
              e.stopPropagation();
              void toTask(idea);
            }}
          >
            →
          </button>
          <button
            type="button"
            className="note-act tip"
            data-tip="В архив"
            onClick={(e) => {
              e.stopPropagation();
              void archiveIdea(idea);
            }}
          >
            ▢
          </button>
        </div>
        <div className="note-t" style={{ color: "var(--ink-900)" }}>
          {idea.title}
        </div>
        {idea.body ? <div className="note-n">{idea.body}</div> : null}
        <div className="note-f">
          <span className={`pr pr--${IDEA_PRIO_CLASS[idea.idea_priority]}`}>{IDEA_PRIO_LABEL[idea.idea_priority]}</span>
          <span className={`tag ${p ? "tag--proj" : "tag--none"}`}>{p || "без проекта"}</span>
          <span className="note-d tnum">{formatIdeaDate(idea.created_at)}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <section data-section="ideas">
        <div className="bar">
          <div className="seg">
            <button type="button" className={view === "notes" ? "on" : ""} onClick={() => setView("notes")}>
              Заметки
            </button>
            <button type="button" className={view === "kb" ? "on" : ""} onClick={() => setView("kb")}>
              Канбан
            </button>
          </div>
          <input
            type="text"
            className="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по идеям"
          />
          <select className="sortsel" value={prioFilter} onChange={(e) => setPrioFilter(e.target.value as "all" | IdeaPriority)}>
            <option value="all">Все приоритеты</option>
            <option value="high">Высокий</option>
            <option value="normal">Обычный</option>
            <option value="low">Низкий</option>
          </select>
          {view === "notes" ? (
            <select className="sortsel" value={projFilter} onChange={(e) => setProjFilter(e.target.value)}>
              <option value="all">Все проекты</option>
              <option value="__none">Без проекта</option>
              {projectNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            className="qa-add"
            style={{ marginLeft: "auto" }}
            onClick={() => setShowAdd((v) => !v)}
          >
            + Идея
          </button>
        </div>

        {showAdd ? (
          <div className="card pad" style={{ marginBottom: 20 }}>
            <form className="qa" onSubmit={(e) => void addIdea(e)}>
              <input
                type="text"
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                placeholder="Идея, которую хочется сохранить…"
                aria-label="Новая идея"
              />
              <select value={addProject} onChange={(e) => setAddProject(e.target.value)} aria-label="Проект">
                <option value="">без проекта</option>
                {projectNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <select value={addPrio} onChange={(e) => setAddPrio(e.target.value as IdeaPriority)} aria-label="Приоритет">
                <option value="normal">обычный</option>
                <option value="high">высокий</option>
                <option value="low">низкий</option>
              </select>
              <button type="submit">Сохранить</button>
            </form>
            <p className="hint">Идея не обязательство. Приоритет — только про то, к чему хочется вернуться раньше.</p>
          </div>
        ) : null}

        {error ? <p style={{ fontSize: 13, color: "#b42318", marginBottom: 12 }}>{error}</p> : null}

        {loading ? (
          <div className="empty">Загрузка…</div>
        ) : view === "notes" ? (
          groupsForNotes.some((g) => g.items.length) ? (
            <>
              <p className="ideas-lead">
                Здесь лежит то, что интересно, но ничего не требует. Приоритет — только порядок возвращения.
              </p>
              {groupsForNotes.map((g) =>
                g.items.length ? (
                  <div key={g.project || "__none"} className="grp">
                    <div className="grp-h">
                      <span className="grp-n">{g.project || "Без проекта"}</span>
                      <span className="grp-c tnum">{g.items.length}</span>
                      <hr />
                    </div>
                    <div className="notes">
                      {g.items.map((idea) => (
                        <NoteCard key={idea.id} idea={idea} />
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </>
          ) : (
            <div className="empty">Ничего не нашлось. Сохрани первую идею — она не обязательство.</div>
          )
        ) : (
          <div className="kb">
            {kanbanCols.map((col) => {
              const [bg, accent] = tintForProject(col.project);
              return (
                <div
                  key={col.project || "__none"}
                  className="col"
                  data-col={col.project}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain") || dragId;
                    if (id) void moveIdeaToProject(id, col.project);
                    setDragId(null);
                  }}
                >
                  <div className="col-h">
                    <span className="col-n">{col.project || "Без проекта"}</span>
                    <span className="col-c tnum">{col.items.length}</span>
                  </div>
                  {col.items.map((idea) => (
                    <div
                      key={idea.id}
                      className={`idea${dragId === idea.id ? " dragging" : ""}`}
                      draggable
                      onDragStart={() => setDragId(idea.id)}
                      onClick={() => openIdea(idea)}
                      style={{ background: bg, color: accent }}
                    >
                      <div className="idea-t" style={{ color: "var(--ink-900)" }}>
                        {idea.title}
                      </div>
                      {idea.body ? <div className="idea-n">{idea.body}</div> : null}
                      <div className="idea-f">
                        <span className={`pr pr--${IDEA_PRIO_CLASS[idea.idea_priority]}`}>
                          {IDEA_PRIO_LABEL[idea.idea_priority]}
                        </span>
                        <span className="idea-d tnum">{formatIdeaDate(idea.created_at)}</span>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="col-add"
                    onClick={() => {
                      setAddProject(col.project);
                      setShowAdd(true);
                    }}
                  >
                    + идея
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <IdeasTasksDrawer
        open={Boolean(editIdea)}
        title="Идея"
        onClose={() => setEditIdea(null)}
        footer={
          <>
            <button type="button" className="btn btn--pri" onClick={() => void saveIdea()}>
              Сохранить
            </button>
            <button type="button" className="btn btn--gh" onClick={() => setEditIdea(null)}>
              Закрыть
            </button>
          </>
        }
      >
        <div className="fld">
          <label>Заголовок</label>
          <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
        </div>
        <div className="fld">
          <label>Заметка</label>
          <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} />
        </div>
        <div className="fld2">
          <div className="fld">
            <label>Проект</label>
            <select value={editProject} onChange={(e) => setEditProject(e.target.value)}>
              <option value="">без проекта</option>
              {projectNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="fld">
            <label>Приоритет</label>
            <select value={editPrio} onChange={(e) => setEditPrio(e.target.value as IdeaPriority)}>
              <option value="normal">обычный</option>
              <option value="high">высокий</option>
              <option value="low">низкий</option>
            </select>
          </div>
        </div>
        <div className="fld">
          <label>Действия</label>
          <div className="dr-acts">
            <button type="button" className="dr-act" onClick={() => editIdea && void toTask(editIdea).then(() => setEditIdea(null))}>
              → Превратить в задачу
            </button>
            <button type="button" className="dr-act" onClick={() => editIdea && void archiveIdea(editIdea).then(() => setEditIdea(null))}>
              ▢ В архив
            </button>
            <button
              type="button"
              className="dr-act dr-act--dan"
              onClick={() => editIdea && fetchJson(`/api/v2/personal/ideas/${editIdea.id}`, { method: "DELETE" }).then(() => { setEditIdea(null); return load(); })}
            >
              ✕ Удалить
            </button>
          </div>
        </div>
      </IdeasTasksDrawer>

      <IdeasTasksToast message={toast} />
    </>
  );
}
