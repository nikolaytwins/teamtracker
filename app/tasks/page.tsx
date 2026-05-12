"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiUrl, appPath } from "@/lib/api-url";
import {
  SIMPLE_VIEW_GROUPS,
  ACTIVE_WORK_STAGE_SET,
  APPROVAL_WAITING_STATUS_SET,
  statusToSimpleViewGroup,
  type PmStatusKey,
  type SimpleViewGroupKey,
} from "@/lib/statuses";
import type { PmSubtaskWithCard } from "@/lib/pm-subtasks";
import { VIRTUAL_OTHER_CARD_ID } from "@/lib/pm-constants";
import { canAccessPmBoard, normalizeTtUserRole } from "@/lib/roles";
import { expandSubtaskToDayKeys } from "@/lib/tasks-calendar";
import { TasksCalendarView } from "@/components/tasks/TasksCalendarView";
import { TaskEditorModal } from "@/components/tasks/TaskEditorModal";

type PmCard = {
  id: string;
  name: string;
  status: PmStatusKey;
  extra?: string | null;
};

type TeamUser = { id: string; displayName: string; avatarUrl?: string | null };

function importanceOrder(card: PmCard): number {
  if (!card.extra) return 3;
  try {
    const ex = JSON.parse(card.extra) as { importance?: string };
    const o: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return o[ex.importance ?? ""] ?? 3;
  } catch {
    return 3;
  }
}

export default function TasksPage() {
  const [meRole, setMeRole] = useState<ReturnType<typeof normalizeTtUserRole> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<PmSubtaskWithCard[]>([]);
  const [cards, setCards] = useState<PmCard[]>([]);
  const [filterQuery, setFilterQuery] = useState("");
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [quickSubtaskTitle, setQuickSubtaskTitle] = useState<Record<string, string>>({});
  const [quickSubtaskCardId, setQuickSubtaskCardId] = useState<Record<string, string>>({});
  const [quickSubBusy, setQuickSubBusy] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "calendar">("kanban");
  const [editor, setEditor] = useState<{ mode: "create" } | { mode: "edit"; sub: PmSubtaskWithCard } | null>(null);

  const canPm = meRole != null && canAccessPmBoard(meRole);

  const loadSubtasks = useCallback(async () => {
    const r = await fetch(apiUrl("/api/tasks/open-subtasks"));
    if (!r.ok) return;
    const d = (await r.json()) as { subtasks?: PmSubtaskWithCard[] };
    setSubtasks(Array.isArray(d.subtasks) ? d.subtasks : []);
  }, []);

  const loadCards = useCallback(async () => {
    const r = await fetch(apiUrl("/api/cards"));
    if (!r.ok) return;
    const data = (await r.json()) as PmCard[];
    setCards(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const meR = await fetch(apiUrl("/api/auth/me"));
        const meD = (await meR.json()) as { user?: { role?: string } };
        const role = normalizeTtUserRole(meD.user?.role);
        setMeRole(role);
        await loadSubtasks();
        if (canAccessPmBoard(role)) {
          await loadCards();
        } else {
          setCards([]);
        }
        const tu = await fetch(apiUrl("/api/team/users"));
        if (tu.ok) {
          const tuD = (await tu.json()) as { users?: TeamUser[] };
          setTeamUsers(
            Array.isArray(tuD.users)
              ? tuD.users.map((u) => ({
                  id: String(u.id ?? ""),
                  displayName: String((u as { displayName?: string }).displayName ?? ""),
                  avatarUrl: (u as { avatarUrl?: string | null }).avatarUrl ?? null,
                }))
              : []
          );
        } else {
          setTeamUsers([]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadSubtasks, loadCards]);

  const filteredSubtasks = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return subtasks;
    return subtasks.filter((s) => s.title.toLowerCase().includes(q) || s.card_name.toLowerCase().includes(q));
  }, [subtasks, filterQuery]);

  const cardsMinusVirtual = useMemo(
    () => cards.filter((c) => c.id !== VIRTUAL_OTHER_CARD_ID),
    [cards]
  );

  const bySimpleGroup = useCallback(
    (groupKey: SimpleViewGroupKey) => {
      const src = cardsMinusVirtual;
      let list: PmCard[];
      if (groupKey === "not_started") list = src.filter((c) => c.status === "not_started");
      else if (groupKey === "done") list = src.filter((c) => c.status === "done");
      else if (groupKey === "pause") list = src.filter((c) => c.status === "pause");
      else if (groupKey === "awaiting_approval") {
        list = src.filter((c) => APPROVAL_WAITING_STATUS_SET.has(c.status));
      } else {
        list = src.filter((c) => ACTIVE_WORK_STAGE_SET.has(c.status));
      }
      return [...list].sort((a, b) => importanceOrder(a) - importanceOrder(b));
    },
    [cardsMinusVirtual]
  );

  function subtasksForColumn(col: SimpleViewGroupKey): PmSubtaskWithCard[] {
    return filteredSubtasks.filter((s) => statusToSimpleViewGroup(s.card_status) === col);
  }

  async function quickAddSubtaskInColumn(columnKey: SimpleViewGroupKey, groupCards: PmCard[]) {
    const title = (quickSubtaskTitle[columnKey] || "").trim();
    const cardId = quickSubtaskCardId[columnKey] || groupCards[0]?.id;
    if (!title || !cardId) return;
    setQuickSubBusy(columnKey);
    setError(null);
    try {
      const r = await fetch(apiUrl(`/api/cards/${cardId}/subtasks`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          estimatedHours: null,
          leadUserId: null,
          assigneeUserId: null,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof data.error === "string" ? data.error : "Не удалось добавить подзадачу");
      setQuickSubtaskTitle((prev) => ({ ...prev, [columnKey]: "" }));
      await loadSubtasks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setQuickSubBusy(null);
    }
  }

  function openSubtaskEditor(s: PmSubtaskWithCard) {
    setEditor({ mode: "edit", sub: s });
  }

  function renderSubtaskRow(s: PmSubtaskWithCard) {
    return (
      <div
        key={s.id}
        role="button"
        tabIndex={0}
        onClick={() => openSubtaskEditor(s)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openSubtaskEditor(s);
          }
        }}
        className="cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-left shadow-sm transition-colors hover:border-[var(--primary)]/35 hover:bg-[var(--surface-2)]/50"
      >
        <div className="text-sm font-medium leading-snug text-[var(--text)]">{s.title}</div>
        <div className="mt-1 truncate text-xs text-[var(--muted-foreground)]">{s.card_name}</div>
        <div className="mt-2 flex items-center gap-1">
          {s.assignee_user_id ? (
            (() => {
              const u = teamUsers.find((x) => x.id === s.assignee_user_id);
              return u?.avatarUrl ? (
                <img
                  src={u.avatarUrl}
                  alt=""
                  title={`Исполнитель: ${u.displayName}`}
                  className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-[var(--border)]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span
                  title={u ? `Исполнитель: ${u.displayName}` : "Исполнитель"}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[10px] font-semibold text-[var(--text)] ring-1 ring-[var(--border)]"
                >
                  {(u?.displayName || "?").trim().charAt(0).toUpperCase() || "?"}
                </span>
              );
            })()
          ) : null}
          {s.lead_user_id && s.lead_user_id !== s.assignee_user_id ? (
            (() => {
              const u = teamUsers.find((x) => x.id === s.lead_user_id);
              return u?.avatarUrl ? (
                <img
                  src={u.avatarUrl}
                  alt=""
                  title={`Лид: ${u.displayName}`}
                  className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-amber-400/60"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span
                  title={u ? `Лид: ${u.displayName}` : "Лид"}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[10px] font-semibold text-amber-900 dark:text-amber-200 ring-1 ring-amber-400/40"
                >
                  {(u?.displayName || "?").trim().charAt(0).toUpperCase() || "?"}
                </span>
              );
            })()
          ) : null}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 text-sm text-[var(--muted-foreground)]">Загрузка…</div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-[var(--border)]/60 bg-[var(--bg)]/85 px-4 py-4 backdrop-blur-xl dark:border-white/[0.06] md:-mx-6 md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">Задачи</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {canPm
                ? "Все открытые подзадачи команды по статусу родительского проекта. Клик по задаче — карточка в окне."
                : "Ваши открытые подзадачи (исполнитель или лид) по статусу проекта. Клик — просмотр карточки задачи."}{" "}
              <span className="font-semibold text-[var(--text)]">{filteredSubtasks.length}</span> в списке
              {view === "calendar" ? ` · в календаре — ${filteredSubtasks.filter((s) => expandSubtaskToDayKeys(s).length > 0).length} с датами` : null}.
            </p>
            {canPm ? (
              <Link
                href={appPath("/board")}
                className="mt-2 inline-flex text-sm font-semibold text-[var(--primary)] hover:underline"
              >
                Канбан проектов →
              </Link>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canPm ? (
              <button
                type="button"
                onClick={() => setEditor({ mode: "create" })}
                className="shrink-0 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-110"
              >
                Создать задачу
              </button>
            ) : null}
            <div className="flex shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0.5 text-xs font-semibold shadow-sm dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setView("kanban")}
                className={`rounded-lg px-3 py-2 transition-colors ${
                  view === "kanban"
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--text)]"
                }`}
              >
                Канбан
              </button>
              <button
                type="button"
                onClick={() => setView("calendar")}
                className={`rounded-lg px-3 py-2 transition-colors ${
                  view === "calendar"
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--text)]"
                }`}
              >
                Календарь
              </button>
            </div>
            <input
              type="search"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Поиск задачи или проекта…"
              className="tt-input w-full text-sm sm:w-56"
            />
          </div>
        </div>
      </div>

      {error ? <p className="mb-4 text-sm font-medium text-[var(--danger)]">{error}</p> : null}

      {view === "calendar" ? (
        <TasksCalendarView
          subtasks={filteredSubtasks}
          cards={cardsMinusVirtual}
          teamUsers={teamUsers}
          canPm={canPm}
          onEditSubtask={(s) => setEditor({ mode: "edit", sub: s })}
        />
      ) : (
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-6">
          {SIMPLE_VIEW_GROUPS.map(({ key, label }) => {
            const groupCards = bySimpleGroup(key);
            const subtasksCol = subtasksForColumn(key);
            const colTint = "bg-[var(--surface)]/90 dark:bg-[var(--surface)]/50";
            return (
              <div
                key={key}
                className={`w-[min(100vw-2rem,20rem)] shrink-0 snap-start overflow-hidden rounded-2xl shadow-[var(--shadow-kanban-column)] ring-1 ring-[var(--border)]/20 dark:ring-0 sm:w-72 ${colTint}`}
              >
                <div className="sticky top-0 z-10 flex min-h-[3.25rem] flex-wrap items-center gap-2 border-b border-[var(--border)]/45 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] dark:border-white/[0.06]">
                  <span className="text-[var(--text)] normal-case tracking-normal">{label}</span>
                  {key === "awaiting_approval" ? (
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)] ring-1 ring-[var(--border)]">
                      клиент
                    </span>
                  ) : null}
                  <span className="ml-auto rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--muted-foreground)] normal-case tracking-normal dark:bg-white/[0.06]">
                    {subtasksCol.length}
                  </span>
                </div>
                <div className="flex min-h-[min(70vh,560px)] flex-col gap-3 bg-[var(--bg)]/30 p-3 dark:bg-black/10">
                  <div className="min-h-0 flex-1 space-y-3">
                    {subtasksCol.length === 0 ? (
                      <p className="px-1 text-xs text-[var(--muted-foreground)]">Нет открытых подзадач</p>
                    ) : (
                      subtasksCol.map((s) => renderSubtaskRow(s))
                    )}
                  </div>
                  {canPm ? (
                    <div className="mt-auto shrink-0 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]/60 p-2 dark:bg-[var(--surface)]/35">
                      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                        Подзадача
                      </div>
                      {groupCards.length === 0 ? (
                        <p className="text-[11px] leading-snug text-[var(--muted-foreground)]">
                          Нет проектов в этой колонке — добавьте проект на доске «Проекты», затем можно создавать подзадачи.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <select
                            className="tt-select w-full py-1.5 text-xs"
                            value={quickSubtaskCardId[key] || groupCards[0]?.id || ""}
                            onChange={(e) => setQuickSubtaskCardId((prev) => ({ ...prev, [key]: e.target.value }))}
                          >
                            {groupCards.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={quickSubtaskTitle[key] ?? ""}
                              onChange={(e) => setQuickSubtaskTitle((prev) => ({ ...prev, [key]: e.target.value }))}
                              placeholder="Текст подзадачи"
                              className="tt-input min-w-0 flex-1 py-1.5 text-xs"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void quickAddSubtaskInColumn(key, groupCards);
                                }
                              }}
                            />
                            <button
                              type="button"
                              disabled={!!quickSubBusy || !(quickSubtaskTitle[key] || "").trim()}
                              onClick={() => void quickAddSubtaskInColumn(key, groupCards)}
                              className="shrink-0 rounded-lg bg-[var(--primary)] px-2 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-40"
                            >
                              {quickSubBusy === key ? "…" : "+"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editor ? (
        <TaskEditorModal
          mode={editor.mode}
          subtask={editor.mode === "edit" ? editor.sub : null}
          cards={cardsMinusVirtual}
          teamUsers={teamUsers}
          canSave={canPm}
          onClose={() => setEditor(null)}
          onSaved={() => void loadSubtasks()}
        />
      ) : null}
    </div>
  );
}
