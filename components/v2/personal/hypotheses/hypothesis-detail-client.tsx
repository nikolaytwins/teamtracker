"use client";

import Link from "next/link";
import { Inter } from "next/font/google";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { appPath } from "@/lib/api-url";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  STAGE_LABEL,
  PRIMARY_HYPOTHESIS_TAG,
  projectColors,
  type Hypothesis,
  type HypothesisProject,
  type HypothesisSprint,
} from "@/lib/v2/personal/hypotheses-meta";
import {
  emptyHypothesisWorkspace,
  hypothesisHero,
  hypothesisPage,
  hypothesisRank,
  qmagicPageBrief,
  parseTaskDraft,
  type HypothesisIdea,
  type HypothesisNote,
  type HypothesisNoteTag,
  type HypothesisStage,
  type HypothesisTask,
  type HypothesisEconBlock,
  type HypothesisWorkspace,
} from "@/lib/v2/personal/hypothesis-workspace";
import "./hypothesis-detail.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], display: "swap", variable: "--font-hypd" });

const TAGS: Record<HypothesisNoteTag, [string, string, string]> = {
  win: ["Зашло", "#047857", "#e7f6f0"],
  fail: ["Не зашло", "#b42318", "#fee4e2"],
  obs: ["Наблюдение", "#3f3f46", "#ececf0"],
};

type PagePayload = {
  hypothesis: Hypothesis;
  project: HypothesisProject | null;
  sprint: HypothesisSprint | null;
  workspace: HypothesisWorkspace | null;
  persisted: boolean;
};

function uid() {
  return `x${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function localKey(id: string) {
  return `tt.hypd.${id}`;
}

function readLocal(id: string): HypothesisWorkspace | null {
  try {
    const raw = localStorage.getItem(localKey(id));
    return raw ? (JSON.parse(raw) as HypothesisWorkspace) : null;
  } catch {
    return null;
  }
}

function writeLocal(id: string, workspace: HypothesisWorkspace) {
  try {
    localStorage.setItem(localKey(id), JSON.stringify(workspace));
  } catch {
    /* ignore */
  }
}

function taskDone(task: HypothesisTask) {
  return task.goal != null ? task.n >= task.goal : task.done;
}

function stats(workspace: HypothesisWorkspace) {
  let all = 0;
  let done = 0;
  for (const stage of workspace.stages) {
    for (const task of stage.tasks) {
      all += 1;
      if (taskDone(task)) done += 1;
    }
  }
  return { all, done, pct: all ? Math.round((done / all) * 100) : 0 };
}

function writeEditable(node: HTMLElement, value: string) {
  const lines = value.replace(/\r\n/g, "\n").split("\n");
  node.replaceChildren();
  lines.forEach((line, index) => {
    if (index > 0) node.appendChild(document.createElement("br"));
    if (line) node.appendChild(document.createTextNode(line));
  });
}

function Editable({
  value,
  className,
  placeholder,
  onChange,
  enterBlur,
}: {
  value: string;
  className?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  enterBlur?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || document.activeElement === node) return;
    if (node.innerText.replace(/\n$/, "") !== value) writeEditable(node, value);
  }, [value]);
  return (
    <div
      ref={ref}
      className={className}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={placeholder}
      data-ph={placeholder}
      onInput={(event) => onChange(event.currentTarget.innerText.replace(/\n$/, ""))}
      onKeyDown={(event) => {
        if (enterBlur && event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}

export function HypothesisDetailClient() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [page, setPage] = useState<PagePayload | null>(null);
  const [workspace, setWorkspace] = useState<HypothesisWorkspace>(emptyHypothesisWorkspace());
  const [error, setError] = useState("");
  const [tag, setTag] = useState<HypothesisNoteTag>("win");
  const [ideaTab, setIdeaTab] = useState<"open" | "arch">("open");
  const workspaceRef = useRef(workspace);
  const persisted = useRef(true);
  const saveTimer = useRef<number | null>(null);
  workspaceRef.current = workspace;

  const apply = useCallback((next: HypothesisWorkspace, rerender = true) => {
    workspaceRef.current = next;
    if (rerender) setWorkspace(next);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      writeLocal(id, workspaceRef.current);
      if (!persisted.current) return;
      void fetchJson(`/api/v2/personal/hypotheses/${id}/workspace`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace: workspaceRef.current }),
      }).catch(() => undefined);
    }, 350);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    void fetchJson<PagePayload>(`/api/v2/personal/hypotheses/${id}/workspace`)
      .then((data) => {
        if (cancelled) return;
        persisted.current = data.persisted;
        const local = readLocal(id);
        const remote = data.workspace;
        const seed = hypothesisPage(data.hypothesis.title)?.workspace() ?? emptyHypothesisWorkspace();
        const next = remote ?? local ?? seed;
        workspaceRef.current = next;
        setWorkspace(next);
        setPage(data);
        if (!remote && local && data.persisted) apply(local);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Не удалось открыть гипотезу");
      });
    return () => {
      cancelled = true;
    };
  }, [id, apply]);

  if (error) {
    return (
      <div className={`hypd min-h-0 flex-1 overflow-y-auto ${inter.variable}`}>
        <div className="page">
          <div className="card nf">
            <h1 className="h1">{error}</h1>
          </div>
        </div>
      </div>
    );
  }
  if (!page) {
    return (
      <div className={`hypd min-h-0 flex-1 overflow-y-auto ${inter.variable}`}>
        <div className="page">
          <div className="card nf">
            <h1 className="h1">Открываю гипотезу…</h1>
          </div>
        </div>
      </div>
    );
  }

  const hypothesis = page.hypothesis;
  const profile = hypothesisPage(hypothesis.title);
  const rank = hypothesisRank(hypothesis.title);
  const hero = hypothesisHero(hypothesis.title);
  const brief = qmagicPageBrief(hypothesis.title);
  const colors = projectColors(page.project?.hue ?? 260);
  const shown = workspace;
  const live = stats(shown);
  const description = hypothesis.body.trim() || profile?.body || "";
  const criterion =
    hypothesis.metric && hypothesis.metric !== PRIMARY_HYPOTHESIS_TAG
      ? hypothesis.metric
      : profile?.criterion || hypothesis.metric || "—";
  const sprintName =
    page.sprint && (hypothesis.stage === "active" || hypothesis.stage === "done") ? page.sprint.name : "";

  const update = (recipe: (draft: HypothesisWorkspace) => void, rerender = true) => {
    const next = structuredClone(workspaceRef.current);
    recipe(next);
    apply(next, rerender);
  };

  const openIdeas = shown.ideas.filter((idea) => !idea.archived);
  const archivedIdeas = shown.ideas.filter((idea) => idea.archived);
  const ideaList = (ideaTab === "open" ? openIdeas : archivedIdeas).slice().reverse();

  return (
    <div className={`hypd min-h-0 flex-1 overflow-y-auto ${inter.variable}`}>
      <div className="page">
        <section className="card hero">
          <div className="hero-l">
            <Link className="back" href={appPath("/v2/personal/hypotheses")}>
              ← Все гипотезы
            </Link>
            <div>
              <div className="h-top">
                {page.project ? (
                  <span className="pchip" style={{ ["--c" as string]: colors.c, ["--cs" as string]: colors.s }}>
                    {page.project.name}
                  </span>
                ) : null}
                {rank ? <span className={`stp rank ${rank.tone}`}>{rank.label}</span> : null}
                {profile?.priority ? <span className="stp high">Приоритет · {profile.priority}</span> : null}
                <span className={`stp ${hypothesis.stage}`}>
                  {STAGE_LABEL[hypothesis.stage]}
                  {sprintName ? ` · ${sprintName}` : ""}
                </span>
              </div>
              <h1 className="h1" style={{ marginTop: 16 }}>
                {hypothesis.title}
              </h1>
              {description ? <p className="h-d">{description}</p> : null}
            </div>
            <div className="h-meta">
              <div className="mbox">
                <span className="kick">Критерий проверки</span>
                <b>{criterion}</b>
              </div>
              <div className="mbox main">
                <span className="kick">Прогресс плана</span>
                <div className="pg-n">
                  <b className="tnum">{live.pct}%</b>
                  <small className="tnum">
                    {live.done} из {live.all} задач
                  </small>
                </div>
                <div className="pg-bar">
                  <i style={{ width: `${live.pct}%` }} />
                </div>
              </div>
            </div>
            <div className="h-act">
              <Link className="btn btn-w" href={`${appPath("/v2/personal/hypotheses")}#${hypothesis.id}`}>
                Редактировать гипотезу
              </Link>
            </div>
          </div>
          <div className="hero-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={appPath(hero.src)}
              alt=""
              style={{ objectPosition: hero.pos }}
            />
          </div>
        </section>

        <div className="grid">
          <div className="colm">
            {brief ? (
              <section className="card sec">
                <div className="blocks">
                  {brief.map((block) => (
                    <div key={block.title} className="blk">
                      <h2 className="sec-t">{block.title}</h2>
                      <p className="copy">{block.text}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            {shown.copies.length ? (
              <section className="card sec">
                <div className="blocks">
                  {shown.copies.map((block) => (
                    <div key={block.id} className="blk">
                      <Editable
                        className="sec-t"
                        value={block.title}
                        placeholder="Заголовок"
                        enterBlur
                        onChange={(title) =>
                          update((draft) => {
                            const row = draft.copies.find((item) => item.id === block.id);
                            if (row) row.title = title;
                          }, false)
                        }
                      />
                      <Editable
                        className="copy"
                        value={block.text}
                        placeholder="Текст"
                        onChange={(text) =>
                          update((draft) => {
                            const row = draft.copies.find((item) => item.id === block.id);
                            if (row) row.text = text;
                          }, false)
                        }
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="stg-add"
                  onClick={() =>
                    update((draft) => {
                      draft.copies.push({ id: uid(), title: "", text: "" });
                    })
                  }
                >
                  + Блок
                </button>
              </section>
            ) : null}
            {shown.econ ? <EconCard econ={shown.econ} /> : null}
            <section className="card sec">
              <div className="sec-h">
                <h2 className="sec-t">План</h2>
                <span className="sec-sub">{shown.stages.length} этапов</span>
              </div>
              <div className="stages">
                {shown.stages.map((stage, index) => (
                  <StageCard
                    key={stage.id}
                    stage={stage}
                    index={index}
                    onRename={(title) =>
                      update((draft) => {
                        const row = draft.stages.find((item) => item.id === stage.id);
                        if (row) row.title = title;
                      }, false)
                    }
                    onNote={(note) =>
                      update((draft) => {
                        const row = draft.stages.find((item) => item.id === stage.id);
                        if (row) row.note = note;
                      }, false)
                    }
                    onTask={(taskId, patch) =>
                      update((draft) => {
                        const row = draft.stages.find((item) => item.id === stage.id);
                        const task = row?.tasks.find((item) => item.id === taskId);
                        if (task) Object.assign(task, patch);
                      }, false)
                    }
                    onToggle={(taskId) =>
                      update((draft) => {
                        const task = draft.stages.find((item) => item.id === stage.id)?.tasks.find((item) => item.id === taskId);
                        if (!task) return;
                        if (task.goal != null) task.n = taskDone(task) ? 0 : task.goal;
                        else task.done = !task.done;
                      })
                    }
                    onCount={(taskId, delta) =>
                      update((draft) => {
                        const task = draft.stages.find((item) => item.id === stage.id)?.tasks.find((item) => item.id === taskId);
                        if (!task || task.goal == null) return;
                        task.n = Math.max(0, Math.min(task.goal, task.n + delta));
                      })
                    }
                    onDeleteTask={(taskId) =>
                      update((draft) => {
                        const row = draft.stages.find((item) => item.id === stage.id);
                        if (row) row.tasks = row.tasks.filter((item) => item.id !== taskId);
                      })
                    }
                    onDelete={() => {
                      if (stage.tasks.length && !confirm(`Удалить этап «${stage.title}» вместе с задачами?`)) return;
                      update((draft) => {
                        draft.stages = draft.stages.filter((item) => item.id !== stage.id);
                      });
                    }}
                    onAddTask={(raw) => {
                      const parsed = parseTaskDraft(raw);
                      if (!parsed.title) return;
                      update((draft) => {
                        const row = draft.stages.find((item) => item.id === stage.id);
                        if (!row) return;
                        row.tasks.push({
                          id: uid(),
                          title: parsed.title,
                          detail: "",
                          done: false,
                          goal: parsed.goal,
                          n: 0,
                        });
                      });
                      window.setTimeout(() => {
                        document.querySelector<HTMLInputElement>(`[data-g="${stage.id}"] .addt input`)?.focus();
                      }, 0);
                    }}
                  />
                ))}
                <button
                  type="button"
                  className="stg-add"
                  onClick={() => {
                    update((draft) => {
                      draft.stages.push({ id: uid(), title: "", note: "", tasks: [] });
                    });
                    window.setTimeout(() => {
                      const nodes = document.querySelectorAll<HTMLElement>(".hypd .stg-t");
                      nodes[nodes.length - 1]?.focus();
                    }, 0);
                  }}
                >
                  + Этап
                </button>
              </div>
            </section>
          </div>

          <div className="colm">
            <section className="card sec">
              <div className="sec-h">
                <h2 className="sec-t">Материалы</h2>
                <button
                  type="button"
                  className="lnk sec-r"
                  onClick={() => {
                    const name = prompt("Название файла");
                    if (!name?.trim()) return;
                    const href = prompt("Ссылка на статью", "/v2/personal/articles/");
                    if (!href?.trim()) return;
                    update((draft) => {
                      draft.files.push({ name: name.trim(), href: href.trim() });
                    });
                  }}
                >
                  + Файл
                </button>
              </div>
              <div className="files">
                {shown.files.length ? (
                  shown.files.map((file, index) => (
                    <Link
                      key={`${file.href}-${index}`}
                      className="fi"
                      href={file.href.startsWith("/") ? appPath(file.href) : file.href}
                    >
                      <span className="fi-ic">MD</span>
                      <span className="fi-b">
                        <b>{file.name}</b>
                        <span>Открыть статью</span>
                      </span>
                      <button
                        type="button"
                        className="x"
                        title="Убрать"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          update((draft) => {
                            draft.files = draft.files.filter((_, fileIndex) => fileIndex !== index);
                          });
                        }}
                      >
                        ×
                      </button>
                      <span className="fi-go">→</span>
                    </Link>
                  ))
                ) : (
                  <div className="empty">Файлов пока нет</div>
                )}
              </div>
            </section>

            <section className="card sec">
              <div className="sec-h">
                <h2 className="sec-t">Выводы</h2>
                <span className="sec-sub">что зашло, что нет</span>
              </div>
              <form
                className="cform"
                onSubmit={(event) => {
                  event.preventDefault();
                  const input = event.currentTarget.elements.namedItem("text") as HTMLTextAreaElement;
                  const text = input.value.trim();
                  if (!text) return;
                  update((draft) => {
                    draft.notes.push({
                      id: uid(),
                      tag,
                      text,
                      date: new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" }),
                    });
                  });
                  input.value = "";
                }}
              >
                <div className="tags">
                  {(Object.keys(TAGS) as HypothesisNoteTag[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={`tag${tag === key ? " on" : ""}`}
                      style={{ ["--tc" as string]: TAGS[key][1], ["--tb" as string]: TAGS[key][2] }}
                      onClick={() => setTag(key)}
                    >
                      {TAGS[key][0]}
                    </button>
                  ))}
                </div>
                <textarea className="in" name="text" rows={2} placeholder="Например: реалити-формат собрал в 2 раза больше сохранений" />
                <div className="cf-r">
                  <button type="submit" className="btn btn-b">
                    Записать вывод
                  </button>
                </div>
              </form>
              <div className="cns">
                {shown.notes.length ? (
                  shown.notes
                    .slice()
                    .reverse()
                    .map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onChange={(text) =>
                          update((draft) => {
                            const row = draft.notes.find((item) => item.id === note.id);
                            if (row) row.text = text;
                          }, false)
                        }
                        onDelete={() =>
                          update((draft) => {
                            draft.notes = draft.notes.filter((item) => item.id !== note.id);
                          })
                        }
                      />
                    ))
                ) : (
                  <div className="empty">Пока пусто. Записывай сюда каждый сигнал по ходу проверки.</div>
                )}
              </div>
            </section>

            <section className="card sec">
              <div className="sec-h">
                <h2 className="sec-t">Идеи</h2>
                <div className="seg sec-r">
                  <button
                    type="button"
                    className={ideaTab === "open" ? "on" : undefined}
                    onClick={() => {
                      setWorkspace(workspaceRef.current);
                      setIdeaTab("open");
                    }}
                  >
                    Новые<b className="tnum">{openIdeas.length}</b>
                  </button>
                  <button
                    type="button"
                    className={ideaTab === "arch" ? "on" : undefined}
                    onClick={() => {
                      setWorkspace(workspaceRef.current);
                      setIdeaTab("arch");
                    }}
                  >
                    Архив<b className="tnum">{archivedIdeas.length}</b>
                  </button>
                </div>
              </div>
              {ideaTab === "open" ? (
                <form
                  className="iadd"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const input = event.currentTarget.elements.namedItem("idea") as HTMLInputElement;
                    const text = input.value.trim();
                    if (!text) return;
                    update((draft) => {
                      draft.ideas.push({ id: uid(), text, archived: false });
                    });
                    input.value = "";
                    input.focus();
                  }}
                >
                  <input name="idea" placeholder="Идея ролика, оффера, канала…" aria-label="Новая идея" />
                  <button type="submit" aria-label="Добавить">
                    +
                  </button>
                </form>
              ) : null}
              <div className="ideas">
                {ideaList.length ? (
                  ideaList.map((idea) => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      onChange={(text) =>
                        update((draft) => {
                          const row = draft.ideas.find((item) => item.id === idea.id);
                          if (row) row.text = text;
                        }, false)
                      }
                      onArchive={() =>
                        update((draft) => {
                          const row = draft.ideas.find((item) => item.id === idea.id);
                          if (row) row.archived = !row.archived;
                        })
                      }
                      onDelete={() =>
                        update((draft) => {
                          draft.ideas = draft.ideas.filter((item) => item.id !== idea.id);
                        })
                      }
                    />
                  ))
                ) : (
                  <div className="empty">
                    {ideaTab === "open" ? "Записывай всё, что приходит в голову по этой гипотезе." : "Архив пуст."}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function EconCard({ econ }: { econ: HypothesisEconBlock }) {
  return (
    <section className="card sec">
      <div className="sec-h">
        <h2 className="sec-t">{econ.title}</h2>
      </div>
      {econ.kicker ? <p className="sec-sub econ-k">{econ.kicker}</p> : null}
      <div className="econ-pair">
        {econ.launch.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <b className="tnum">{item.value}</b>
          </div>
        ))}
      </div>
      <div className="econ-rest">
        <div>
          <b>{econ.launchRest.title}</b>
          <div className="econ-note">{econ.launchRest.note}</div>
        </div>
        <b className="tnum econ-sum">{econ.launchRest.value}</b>
      </div>
      <div className="econ-pair">
        {econ.month.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <b className="tnum">{item.value}</b>
          </div>
        ))}
      </div>
      <div className="econ-rest">
        <div>
          <b>{econ.monthRest.title}</b>
          <div className="econ-note">{econ.monthRest.note}</div>
        </div>
        <b className="tnum econ-sum">{econ.monthRest.value}</b>
      </div>
      {econ.footnote ? <p className="econ-foot">{econ.footnote}</p> : null}
    </section>
  );
}

function StageCard({
  stage,
  index,
  onRename,
  onNote,
  onTask,
  onToggle,
  onCount,
  onDeleteTask,
  onDelete,
  onAddTask,
}: {
  stage: HypothesisStage;
  index: number;
  onRename: (title: string) => void;
  onNote: (note: string) => void;
  onTask: (taskId: string, patch: Partial<HypothesisTask>) => void;
  onToggle: (taskId: string) => void;
  onCount: (taskId: string, delta: number) => void;
  onDeleteTask: (taskId: string) => void;
  onDelete: () => void;
  onAddTask: (raw: string) => void;
}) {
  const done = stage.tasks.filter(taskDone).length;
  const allDone = stage.tasks.length > 0 && done === stage.tasks.length;
  return (
    <div className={`stg${allDone ? " done" : ""}`} data-g={stage.id}>
      <div className="stg-h">
        <span className="stg-n">{allDone ? "✓" : index + 1}</span>
        <Editable className="stg-t" value={stage.title} placeholder="Название этапа" enterBlur onChange={onRename} />
        <span className="stg-c tnum">
          {done} / {stage.tasks.length}
        </span>
        <button type="button" className="x" title="Удалить этап" onClick={onDelete}>
          ×
        </button>
      </div>
      <div className="tks">
        {stage.tasks.map((task) => {
          const on = taskDone(task);
          return (
            <div key={task.id} className={`tk${on ? " on" : ""}`}>
              <button type="button" className={`cb${on ? " on" : ""}`} aria-label="Готово" onClick={() => onToggle(task.id)}>
                {on ? "✓" : ""}
              </button>
              <div className="tk-b">
                <Editable
                  className="tk-t"
                  value={task.title}
                  placeholder="Задача"
                  enterBlur
                  onChange={(title) => onTask(task.id, { title })}
                />
                {task.detail ? (
                  <Editable className="tk-d" value={task.detail} onChange={(detail) => onTask(task.id, { detail })} />
                ) : null}
                {task.goal != null ? (
                  <div className="ctr">
                    <button type="button" aria-label="Минус" onClick={() => onCount(task.id, -1)}>
                      −
                    </button>
                    <div className="ctr-bar">
                      <i style={{ width: `${Math.min(100, (task.n / task.goal) * 100)}%` }} />
                    </div>
                    <span className="ctr-n tnum">
                      {task.n} / {task.goal}
                    </span>
                    <button type="button" aria-label="Плюс" onClick={() => onCount(task.id, 1)}>
                      +
                    </button>
                  </div>
                ) : null}
              </div>
              <button type="button" className="x" title="Удалить" onClick={() => onDeleteTask(task.id)}>
                ×
              </button>
            </div>
          );
        })}
      </div>
      {stage.note ? <Editable className="stg-note" value={stage.note} onChange={onNote} /> : null}
      <form
        className="addt"
        onSubmit={(event) => {
          event.preventDefault();
          const input = event.currentTarget.elements.namedItem("task") as HTMLInputElement;
          const value = input.value;
          input.value = "";
          onAddTask(value);
        }}
      >
        <input name="task" placeholder="+ Задача" aria-label="Новая задача" />
      </form>
    </div>
  );
}

function NoteCard({
  note,
  onChange,
  onDelete,
}: {
  note: HypothesisNote;
  onChange: (text: string) => void;
  onDelete: () => void;
}) {
  const meta = TAGS[note.tag];
  return (
    <div className="cn">
      <span className="cn-tg" style={{ ["--tc" as string]: meta[1], ["--tb" as string]: meta[2] }}>
        {meta[0]}
      </span>
      <div className="cn-b">
        <Editable className="cn-t" value={note.text} onChange={onChange} />
        <div className="cn-d tnum">{note.date}</div>
      </div>
      <button type="button" className="x" title="Удалить" onClick={onDelete}>
        ×
      </button>
    </div>
  );
}

function IdeaCard({
  idea,
  onChange,
  onArchive,
  onDelete,
}: {
  idea: HypothesisIdea;
  onChange: (text: string) => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`idea${idea.archived ? " arch" : ""}`}>
      <Editable className="idea-t" value={idea.text} enterBlur onChange={onChange} />
      <button type="button" className="ia" onClick={onArchive}>
        {idea.archived ? "Вернуть" : "В архив"}
      </button>
      <button type="button" className="x" title="Удалить" onClick={onDelete}>
        ×
      </button>
    </div>
  );
}
