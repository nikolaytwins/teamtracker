"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { apiUrl, appPath } from "@/lib/api-url";
import Link from "next/link";
import {
  PM_STATUSES,
  SIMPLE_VIEW_GROUPS,
  WORK_STAGE_KEYS,
  STAGES_FOR_ESTIMATES,
  statusLabel,
  IMPORTANCE_OPTIONS,
  type PmStatusKey,
  type ImportanceKey,
} from "@/lib/statuses";
import { computeSubtaskProgressStats } from "@/lib/subtask-progress";

type TeamMember = { id: string; name: string; avatar?: string };

type PmCard = {
  id: string;
  source_project_id: string | null;
  source_detail_id?: string | null;
  name: string;
  deadline: string | null;
  status: PmStatusKey;
  extra?: string | null;
  created_at: string;
  updated_at: string;
};

type PmSubtaskRow = {
  id: string;
  title: string;
  estimated_hours: number | null;
  completed_at: string | null;
  assignee_user_id: string | null;
  lead_user_id: string | null;
};

type TtTeamUser = {
  id: string;
  displayName: string;
  login: string;
  jobTitle: string;
  avatarUrl: string | null;
  role: string;
};

type CardExtra = {
  figmaLink?: string;
  tzLink?: string;
  tildaAccess?: string;
  wishes?: string;
  explanations?: string;
  otherLinks?: string;
  projectType?: "site" | "presentation" | "other";
  volume?: string;
  copywriterNeeded?: boolean;
  importance?: ImportanceKey;
  assignee?: string;
  assignees?: string[];
  projectDeadline?: string;
  estimatedHours?: number;
  stageDetails?: Record<string, { deadline?: string; estimatedHours?: number }>;
  /** Кэш из подзадач, обновляется при CRUD pm_subtasks */
  derivedSubtaskProgress?: {
    percent: number;
    completed: number;
    total: number;
    byHours: boolean;
    updatedAt?: string;
  };
};

function parseExtra(s: string | null | undefined): CardExtra {
  if (!s) return {};
  try {
    const o = JSON.parse(s);
    return typeof o === "object" && o !== null ? o : {};
  } catch {
    return {};
  }
}

function formatDate(s: string | null) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return s;
  }
}

function daysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  return diff;
}

function deadlineBadgeClass(dateStr: string | null): string {
  const d = daysLeft(dateStr);
  if (d === null) return "bg-[var(--surface-2)] text-[var(--muted-foreground)] ring-1 ring-[var(--border)]";
  if (d <= 1) return "bg-[var(--danger)] text-white ring-0";
  if (d <= 3) return "bg-amber-500 text-white ring-0";
  return "bg-[var(--surface-2)] text-[var(--muted-foreground)] ring-1 ring-[var(--border)]";
}

function parseVolume(volume: string | undefined): { blocks: number; slides: number } {
  if (!volume) return { blocks: 0, slides: 0 };
  const blockMatch = volume.match(/(\d+)\s*(?:блок|страниц)/i);
  const slideMatch = volume.match(/(\d+)\s*слайд/i);
  return {
    blocks: blockMatch ? parseInt(blockMatch[1], 10) : 0,
    slides: slideMatch ? parseInt(slideMatch[1], 10) : 0,
  };
}

export default function BoardPage() {
  const [cards, setCards] = useState<PmCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"detailed" | "simple">("simple");
  const [filterQuery, setFilterQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [adding, setAdding] = useState(false);
  const [syncingFromAgency, setSyncingFromAgency] = useState(false);
  const [modalCard, setModalCard] = useState<PmCard | null>(null);
  const [modalName, setModalName] = useState("");
  const [modalExtra, setModalExtra] = useState<CardExtra>({});
  const [savingExtra, setSavingExtra] = useState(false);
  const [teamList, setTeamList] = useState<TeamMember[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("pm-board-team");
      const parsed = JSON.parse(raw || "[]");
      if (!Array.isArray(parsed)) return [];
      if (parsed.length > 0 && typeof parsed[0] === "string") {
        return (parsed as string[]).map((name, i) => ({ id: `t${i}`, name, avatar: undefined }));
      }
      return parsed as TeamMember[];
    } catch {
      return [];
    }
  });
  const [newAssigneeInput, setNewAssigneeInput] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [editingAvatarForId, setEditingAvatarForId] = useState<string | null>(null);
  const [canSyncAgency, setCanSyncAgency] = useState(false);
  const [modalSubtasks, setModalSubtasks] = useState<PmSubtaskRow[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskHours, setNewSubtaskHours] = useState("");
  const [newSubtaskLeadId, setNewSubtaskLeadId] = useState("");
  const [newSubtaskAssigneeId, setNewSubtaskAssigneeId] = useState("");
  const [teamDirectory, setTeamDirectory] = useState<TtTeamUser[]>([]);

  useEffect(() => {
    void fetch(apiUrl("/api/auth/me"))
      .then((r) => r.json())
      .then((d: { user?: { role?: string } }) => {
        setCanSyncAgency(d.user?.role === "admin");
      })
      .catch(() => setCanSyncAgency(false));
  }, []);

  useEffect(() => {
    void fetch(apiUrl("/api/team/users"))
      .then((r) => r.json())
      .then((d: { users?: TtTeamUser[] }) => {
        setTeamDirectory(Array.isArray(d.users) ? d.users : []);
      })
      .catch(() => setTeamDirectory([]));
  }, []);

  useEffect(() => {
    if (!modalCard?.id) {
      setModalSubtasks([]);
      return;
    }
    void fetch(apiUrl(`/api/cards/${modalCard.id}/subtasks`))
      .then((r) => r.json())
      .then((d: { subtasks?: PmSubtaskRow[] }) => {
        setModalSubtasks(Array.isArray(d.subtasks) ? d.subtasks : []);
      })
      .catch(() => setModalSubtasks([]));
  }, [modalCard?.id]);

  async function refreshBoardCard(cardId: string, syncModalExtra: boolean) {
    try {
      const r = await fetch(apiUrl(`/api/cards/${cardId}`));
      if (!r.ok) return;
      const updated = (await r.json()) as PmCard;
      setCards((prev) => prev.map((c) => (c.id === cardId ? updated : c)));
      const prog = parseExtra(updated.extra).derivedSubtaskProgress;
      if (syncModalExtra) {
        setModalExtra((prev) => ({ ...prev, derivedSubtaskProgress: prog }));
      }
    } catch {
      /* ignore */
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(apiUrl("/api/cards"));
      if (!r.ok) throw new Error("Не удалось загрузить карточки");
      const data = await r.json();
      setCards(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredCards = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) => c.name.toLowerCase().includes(q));
  }, [cards, filterQuery]);

  async function syncFromAgency() {
    setSyncingFromAgency(true);
    setError(null);
    try {
      const r = await fetch(apiUrl("/api/cards/sync-from-agency"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Не удалось подтянуть проекты");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка синхронизации");
    } finally {
      setSyncingFromAgency(false);
    }
  }

  async function addProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const r = await fetch(apiUrl("/api/cards"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          deadline: newDeadline || null,
          status: "not_started",
        }),
      });
      if (r.ok) {
        const card = await r.json();
        setCards((prev) => [card, ...prev]);
        setNewName("");
        setNewDeadline("");
      } else {
        const err = await r.json().catch(() => ({}));
        setError(err.error || "Не удалось создать");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setAdding(false);
    }
  }

  async function updateStatus(cardId: string, newStatus: PmStatusKey) {
    try {
      const r = await fetch(apiUrl(`/api/cards/${cardId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!r.ok) throw new Error("Не удалось обновить");
      const updated = await r.json();
      setCards((prev) => prev.map((c) => (c.id === cardId ? updated : c)));
      if (modalCard?.id === cardId) setModalCard(updated);
    } catch (e) {
      console.error(e);
    }
  }

  function handleDragStart(e: React.DragEvent, cardId: string) {
    e.dataTransfer.setData("application/json", JSON.stringify({ cardId }));
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, newStatus: PmStatusKey) {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      const { cardId } = JSON.parse(raw);
      const card = cards.find((c) => c.id === cardId);
      if (card && card.status !== newStatus) updateStatus(cardId, newStatus);
    } catch (_) {}
  }

  function handleSimpleDrop(e: React.DragEvent, groupKey: (typeof SIMPLE_VIEW_GROUPS)[number]["key"]) {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      const { cardId } = JSON.parse(raw);
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;
      let newStatus: PmStatusKey;
      if (groupKey === "not_started") newStatus = "not_started";
      else if (groupKey === "done") newStatus = "done";
      else if (groupKey === "pause") newStatus = "pause";
      else newStatus = (WORK_STAGE_KEYS as readonly PmStatusKey[]).includes(card.status) ? card.status : (WORK_STAGE_KEYS[0] as PmStatusKey);
      if (card.status !== newStatus) updateStatus(cardId, newStatus);
    } catch (_) {}
  }

  function openModal(card: PmCard) {
    setModalCard(card);
    setModalName(card.name);
    setNewSubtaskTitle("");
    setNewSubtaskHours("");
    setNewSubtaskLeadId("");
    setNewSubtaskAssigneeId("");
    const ex = parseExtra(card.extra);
    if (!ex.stageDetails) ex.stageDetails = {};
    if (card.deadline && !ex.stageDetails[card.status]?.deadline) {
      ex.stageDetails[card.status] = { ...ex.stageDetails[card.status], deadline: card.deadline };
    }
    setModalExtra(ex);
  }

  function addToTeamAndAssign(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setTeamList((prev) => {
      const exists = prev.find((t) => t.name === trimmed);
      if (exists) return prev;
      const next = [...prev, { id: `t${Date.now()}`, name: trimmed }];
      if (typeof window !== "undefined") localStorage.setItem("pm-board-team", JSON.stringify(next));
      return next;
    });
    setModalExtra((x) => ({
      ...x,
      assignees: [...(x.assignees ?? (x.assignee ? [x.assignee] : [])).filter((v): v is string => Boolean(v)), trimmed].filter((v, i, a) => a.indexOf(v) === i),
    }));
    setNewAssigneeInput("");
  }

  function setTeamMemberAvatar(id: string, dataUrl: string) {
    setTeamList((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, avatar: dataUrl } : t));
      if (typeof window !== "undefined") localStorage.setItem("pm-board-team", JSON.stringify(next));
      return next;
    });
    setEditingAvatarForId(null);
  }

  async function deleteCardOnly(cardId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Удалить карточку из канбана? В Agency проект останется.")) return;
    try {
      const r = await fetch(apiUrl(`/api/cards/${cardId}`), { method: "DELETE" });
      if (r.ok) setCards((prev) => prev.filter((c) => c.id !== cardId));
      if (modalCard?.id === cardId) setModalCard(null);
    } catch (err) {
      console.error(err);
    }
  }

  async function addModalSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!modalCard || !newSubtaskTitle.trim()) return;
    try {
      const r = await fetch(apiUrl(`/api/cards/${modalCard.id}/subtasks`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newSubtaskTitle.trim(),
          estimatedHours: newSubtaskHours.trim() ? parseFloat(newSubtaskHours) : null,
          leadUserId: newSubtaskLeadId.trim() || null,
          assigneeUserId: newSubtaskAssigneeId.trim() || null,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Ошибка");
      setNewSubtaskTitle("");
      setNewSubtaskHours("");
      const list = await fetch(apiUrl(`/api/cards/${modalCard.id}/subtasks`)).then((x) => x.json());
      setModalSubtasks(Array.isArray(list.subtasks) ? list.subtasks : []);
      await refreshBoardCard(modalCard.id, true);
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleModalSubtask(sub: PmSubtaskRow) {
    if (!modalCard) return;
    try {
      const r = await fetch(apiUrl(`/api/cards/${modalCard.id}/subtasks/${sub.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !sub.completed_at }),
      });
      if (!r.ok) return;
      const list = await fetch(apiUrl(`/api/cards/${modalCard.id}/subtasks`)).then((x) => x.json());
      setModalSubtasks(Array.isArray(list.subtasks) ? list.subtasks : []);
      await refreshBoardCard(modalCard.id, true);
    } catch (err) {
      console.error(err);
    }
  }

  async function removeModalSubtask(subId: string) {
    if (!modalCard || !confirm("Удалить подзадачу?")) return;
    try {
      const r = await fetch(apiUrl(`/api/cards/${modalCard.id}/subtasks/${subId}`), { method: "DELETE" });
      if (!r.ok) return;
      setModalSubtasks((prev) => prev.filter((s) => s.id !== subId));
      await refreshBoardCard(modalCard.id, true);
    } catch (err) {
      console.error(err);
    }
  }

  async function patchModalSubtask(
    subId: string,
    patch: { leadUserId?: string | null; assigneeUserId?: string | null }
  ) {
    if (!modalCard) return;
    try {
      const r = await fetch(apiUrl(`/api/cards/${modalCard.id}/subtasks/${subId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!r.ok) return;
      const list = await fetch(apiUrl(`/api/cards/${modalCard.id}/subtasks`)).then((x) => x.json());
      setModalSubtasks(Array.isArray(list.subtasks) ? list.subtasks : []);
      await refreshBoardCard(modalCard.id, true);
    } catch (err) {
      console.error(err);
    }
  }

  async function saveModalExtra() {
    if (!modalCard) return;
    setSavingExtra(true);
    const stageDeadline = modalExtra.stageDetails?.[modalCard.status]?.deadline ?? modalCard.deadline;
    try {
      const r = await fetch(apiUrl(`/api/cards/${modalCard.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: modalName.trim() || modalCard.name,
          deadline: stageDeadline || null,
          extra: JSON.stringify(modalExtra),
        }),
      });
      if (r.ok) {
        const updated = await r.json();
        setCards((prev) => prev.map((c) => (c.id === modalCard.id ? updated : c)));
        setModalCard(updated);
        setModalName(updated.name);
        setModalExtra(parseExtra(updated.extra));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingExtra(false);
    }
  }

  if (loading)
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 text-sm text-[var(--muted-foreground)]">Загрузка…</div>
    );
  if (error) return <div className="p-6 text-sm font-medium text-[var(--danger)]">{error}</div>;

  const byStatus = (status: PmStatusKey) => filteredCards.filter((c) => c.status === status);
  const importanceOrder = (c: PmCard) => {
    const ex = parseExtra(c.extra);
    const o: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return o[ex.importance ?? ""] ?? 3;
  };
  const bySimpleGroup = (groupKey: (typeof SIMPLE_VIEW_GROUPS)[number]["key"]) => {
    let list: PmCard[];
    if (groupKey === "not_started") list = filteredCards.filter((c) => c.status === "not_started");
    else if (groupKey === "done") list = filteredCards.filter((c) => c.status === "done");
    else if (groupKey === "pause") list = filteredCards.filter((c) => c.status === "pause");
    else list = filteredCards.filter((c) => (WORK_STAGE_KEYS as readonly string[]).includes(c.status));
    return [...list].sort((a, b) => importanceOrder(a) - importanceOrder(b));
  };

  function renderCard(card: PmCard, showStageLabel: boolean) {
    const extra = parseExtra(card.extra);
    const importanceOpt = IMPORTANCE_OPTIONS.find((o) => o.key === extra.importance);
    const assignees: string[] = extra.assignees ?? (extra.assignee ? [extra.assignee] : []);
    const stageDeadline = (extra.stageDetails && extra.stageDetails[card.status]?.deadline) || card.deadline;
    const projectDeadline = extra.projectDeadline || null;
    return (
      <div
        key={card.id}
        draggable
        onDragStart={(e) => handleDragStart(e, card.id)}
        onClick={() => openModal(card)}
        className="group cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-[var(--shadow-card)] transition-all hover:border-[var(--primary)]/25 hover:shadow-[var(--shadow-elevated)] active:scale-[0.99]"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {importanceOpt && (
              <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mb-2 ${importanceOpt.className}`}>
                {importanceOpt.label}
              </span>
            )}
            <div className="text-sm font-semibold leading-tight text-[var(--text)]">{card.name}</div>
            {showStageLabel && (
              <span className="mt-1 inline-block rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)] ring-1 ring-[var(--border)]">
                {statusLabel(card.status)}
              </span>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className={`inline-block text-[10px] font-medium px-2 py-1 rounded-md ${deadlineBadgeClass(stageDeadline)}`}>
                Этап: {formatDate(stageDeadline)}
              </span>
              <span className={`inline-block text-[10px] font-medium px-2 py-1 rounded-md ${deadlineBadgeClass(projectDeadline)}`}>
                Проект: {formatDate(projectDeadline)}
              </span>
            </div>
            {extra.derivedSubtaskProgress && extra.derivedSubtaskProgress.total > 0 ? (
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
                  <span>
                    Подзадачи {extra.derivedSubtaskProgress.completed}/{extra.derivedSubtaskProgress.total}
                    {extra.derivedSubtaskProgress.byHours ? " · по часам" : ""}
                  </span>
                  <span className="font-semibold tabular-nums text-[var(--primary)]">{extra.derivedSubtaskProgress.percent}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)] ring-1 ring-[var(--border)]">
                  <div
                    className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300"
                    style={{ width: `${extra.derivedSubtaskProgress.percent}%` }}
                  />
                </div>
              </div>
            ) : null}
            <Link
              href={appPath(`/board/${card.id}`)}
              onClick={(e) => e.stopPropagation()}
              className="mt-2 inline-flex text-xs font-semibold text-[var(--primary)] hover:underline"
            >
              Учёт времени и этапы
            </Link>
            {assignees.length > 0 && (
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                {assignees.slice(0, 4).map((name, i) => {
                  const member = teamList.find((t) => t.name === name);
                  return (
                    <span
                      key={i}
                      className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-2)] text-[10px] font-medium text-[var(--text)] ring-1 ring-[var(--border)]"
                      title={name}
                    >
                      {member?.avatar ? (
                        <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        name.trim() ? name.trim().charAt(0).toUpperCase() : "?"
                      )}
                    </span>
                  );
                })}
                {assignees.length > 4 && <span className="text-[10px] text-[var(--muted-foreground)]">+{assignees.length - 4}</span>}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openModal(card); }}
              className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              title="Открыть карточку"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </button>
            <button
              type="button"
              onClick={(e) => deleteCardOnly(card.id, e)}
              className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
              title="Удалить из канбана"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V7m1 14h4" /></svg>
            </button>
          </div>
        </div>
        <select
          className="tt-select mt-2 w-full py-1.5 text-xs"
          value={card.status}
          onChange={(e) => updateStatus(card.id, e.target.value as PmStatusKey)}
          onClick={(e) => e.stopPropagation()}
        >
          {PM_STATUSES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-[var(--border)] bg-[var(--bg)]/80 px-4 py-4 backdrop-blur-xl md:-mx-6 md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">Канбан</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Перетаскивайте карточки. Клик — детали. Показано{" "}
              <span className="font-semibold text-[var(--text)]">{filteredCards.length}</span>
              {filterQuery.trim() ? <span className="text-[var(--muted-foreground)]"> из {cards.length}</span> : null}
            </p>
            <Link
              href={appPath("/board/time-analytics")}
              className="mt-2 inline-flex text-sm font-semibold text-[var(--primary)] hover:underline"
            >
              Отчёты по времени →
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Поиск по названию…"
              className="tt-input w-full text-sm sm:w-56"
            />
            <span className="hidden text-sm text-[var(--muted-foreground)] sm:inline">Вид:</span>
            <button
              type="button"
              onClick={() => setViewMode("simple")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                viewMode === "simple"
                  ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25"
                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
              }`}
              title="Несколько колонок: не начато, в работе, пауза, готово"
            >
              Простой
            </button>
            <button
              type="button"
              onClick={() => setViewMode("detailed")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                viewMode === "detailed"
                  ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25"
                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
              }`}
              title="Все этапы отдельными колонками"
            >
              Все этапы
            </button>
            {canSyncAgency ? (
              <button
                type="button"
                onClick={() => void syncFromAgency()}
                disabled={syncingFromAgency}
                className="rounded-xl bg-[var(--success)] px-3 py-2 text-sm font-semibold text-white shadow-md shadow-[var(--success)]/20 hover:brightness-110 disabled:opacity-50"
                title="Добавить на канбан проекты из «Проекты и финансы», для которых ещё нет карточки"
              >
                {syncingFromAgency ? "Синхронизация…" : "Подтянуть из финансов"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {canSyncAgency ? (
        <form
          onSubmit={addProject}
          className="mb-8 flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]"
        >
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">Новый проект</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Название проекта или клиента"
              className="tt-input w-64 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">Дедлайн</label>
            <input
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="tt-input text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[var(--primary)]/25 hover:brightness-110 disabled:opacity-50"
          >
            {adding ? "Создание…" : "+ Добавить проект"}
          </button>
        </form>
      ) : null}

      {viewMode === "detailed" && (
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-6">
          {PM_STATUSES.map(({ key }) => (
            <div
              key={key}
              className="w-[min(100vw-2rem,20rem)] shrink-0 snap-start overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, key)}
            >
              <div className="sticky top-0 z-10 flex min-h-[3.5rem] flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-[var(--text)]">
                {statusLabel(key)}
                <span className="font-normal text-[var(--muted-foreground)]">({byStatus(key).length})</span>
              </div>
              <div className="min-h-[min(70vh,560px)] space-y-3 bg-[var(--bg)]/50 p-3">
                {byStatus(key).map((card) => renderCard(card, false))}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === "simple" && (
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-6">
          {SIMPLE_VIEW_GROUPS.map(({ key, label }) => {
            const groupCards = bySimpleGroup(key);
            const isInProgress = key === "in_progress";
            return (
              <div
                key={key}
                className={`w-[min(100vw-2rem,20rem)] shrink-0 snap-start overflow-hidden rounded-2xl border shadow-[var(--shadow-card)] sm:w-72 ${
                  isInProgress
                    ? "border-[var(--primary)]/35 bg-[var(--primary-soft)]/25"
                    : "border-[var(--border)] bg-[var(--surface)]"
                }`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleSimpleDrop(e, key)}
              >
                <div
                  className={`sticky top-0 z-10 flex min-h-[3.5rem] flex-wrap items-center gap-2 border-b px-4 py-3 text-sm font-semibold ${
                    isInProgress
                      ? "border-[var(--primary)]/25 bg-[var(--primary-soft)]/50 text-[var(--text)]"
                      : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
                  }`}
                >
                  {label}
                  {isInProgress ? (
                    <span className="rounded-full bg-[var(--primary)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--primary)]">
                      в работе
                    </span>
                  ) : null}
                  <span className="font-normal text-[var(--muted-foreground)]">({groupCards.length})</span>
                </div>
                <div
                  className={`min-h-[min(70vh,560px)] space-y-3 p-3 ${
                    isInProgress ? "bg-[var(--primary-soft)]/15" : "bg-[var(--bg)]/50"
                  }`}
                >
                  {groupCards.map((card) => renderCard(card, isInProgress))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setModalCard(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-elevated)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] p-4">
              <input
                type="text"
                value={modalName}
                onChange={(e) => setModalName(e.target.value)}
                className="flex-1 rounded-xl border border-transparent bg-transparent px-3 py-2 text-lg font-semibold text-[var(--text)] hover:border-[var(--border)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)]"
                placeholder="Название проекта или клиента"
              />
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={appPath(`/board/${modalCard.id}`)}
                  className="whitespace-nowrap text-sm font-semibold text-[var(--primary)] hover:underline"
                >
                  Этапы и время
                </Link>
                <button
                  type="button"
                  onClick={() => setModalCard(null)}
                  className="rounded-xl p-2 text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
              <div className="p-4 space-y-4 md:w-1/2">
                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Тип проекта</label>
                  <select value={modalExtra.projectType ?? ""} onChange={(e) => setModalExtra((x) => ({ ...x, projectType: (e.target.value || undefined) as CardExtra["projectType"] }))} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm">
                    <option value="">—</option>
                    <option value="site">сайт</option>
                    <option value="presentation">презентация</option>
                    <option value="other">другое</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Объём (блоки/страницы или слайды)</label>
                  <input type="text" value={modalExtra.volume ?? ""} onChange={(e) => setModalExtra((x) => ({ ...x, volume: e.target.value || undefined }))} placeholder="Например: 5 блоков, 12 слайдов" className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Тексты от копирайтера</label>
                  <select value={modalExtra.copywriterNeeded === true ? "yes" : modalExtra.copywriterNeeded === false ? "no" : ""} onChange={(e) => setModalExtra((x) => ({ ...x, copywriterNeeded: e.target.value === "yes" ? true : e.target.value === "no" ? false : undefined }))} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm">
                    <option value="">—</option>
                    <option value="yes">да</option>
                    <option value="no">нет</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Важность</label>
                  <select value={modalExtra.importance ?? ""} onChange={(e) => setModalExtra((x) => ({ ...x, importance: (e.target.value || undefined) as ImportanceKey }))} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm">
                    <option value="">—</option>
                    {IMPORTANCE_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-[var(--text)]">Подзадачи</div>
                    {modalSubtasks.length > 0 ? (
                      <span className="text-[10px] font-medium text-[var(--primary)] tabular-nums">
                        {(() => {
                          const p = computeSubtaskProgressStats(modalSubtasks);
                          return `${p.percent}% (${p.completed}/${p.total}${p.byHours ? ", часы" : ""})`;
                        })()}
                      </span>
                    ) : null}
                  </div>
                  {modalSubtasks.length > 0 ? (
                    <div className="h-1 rounded-full bg-[var(--border)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--primary)] transition-[width]"
                        style={{
                          width: `${computeSubtaskProgressStats(modalSubtasks).percent}%`,
                        }}
                      />
                    </div>
                  ) : null}
                  <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {modalSubtasks.length === 0 ? (
                      <li className="text-xs text-[var(--muted-foreground)]">Пока нет — добавьте ниже</li>
                    ) : (
                      modalSubtasks.map((sub) => (
                        <li
                          key={sub.id}
                          className="text-sm bg-[var(--surface)] rounded-lg border border-[var(--border)] px-2 py-2 space-y-1.5"
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={Boolean(sub.completed_at)}
                              onChange={() => void toggleModalSubtask(sub)}
                              className="mt-1"
                              aria-label="Выполнено"
                            />
                            <div className="flex-1 min-w-0">
                              <span className={sub.completed_at ? "line-through text-[var(--muted-foreground)]" : "text-[var(--text)]"}>
                                {sub.title}
                              </span>
                              {sub.estimated_hours != null && !Number.isNaN(sub.estimated_hours) ? (
                                <span className="text-xs text-[var(--muted-foreground)] ml-2 tabular-nums">
                                  ~{sub.estimated_hours} ч
                                </span>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => void removeModalSubtask(sub.id)}
                              className="text-[var(--muted-foreground)] hover:text-red-600 text-xs shrink-0"
                              aria-label="Удалить"
                            >
                              ×
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-6">
                            <label className="block">
                              <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide">Ведущий</span>
                              <select
                                value={sub.lead_user_id ?? ""}
                                onChange={(e) =>
                                  void patchModalSubtask(sub.id, {
                                    leadUserId: e.target.value.trim() || null,
                                  })
                                }
                                className="mt-0.5 w-full px-2 py-1 border border-[var(--border)] rounded text-xs bg-[var(--surface)]"
                              >
                                <option value="">—</option>
                                {teamDirectory.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.displayName}
                                    {u.jobTitle ? ` · ${u.jobTitle}` : ""}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="block">
                              <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide">Исполнитель</span>
                              <select
                                value={sub.assignee_user_id ?? ""}
                                onChange={(e) =>
                                  void patchModalSubtask(sub.id, {
                                    assigneeUserId: e.target.value.trim() || null,
                                  })
                                }
                                className="mt-0.5 w-full px-2 py-1 border border-[var(--border)] rounded text-xs bg-[var(--surface)]"
                              >
                                <option value="">—</option>
                                {teamDirectory.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.displayName}
                                    {u.jobTitle ? ` · ${u.jobTitle}` : ""}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                  <form onSubmit={addModalSubtask} className="space-y-2">
                    <div className="flex flex-wrap gap-2 items-end">
                      <input
                        type="text"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        placeholder="Название подзадачи"
                        className="flex-1 min-w-[8rem] px-2 py-1.5 border border-[var(--border)] rounded-lg text-sm"
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={newSubtaskHours}
                        onChange={(e) => setNewSubtaskHours(e.target.value)}
                        placeholder="ч"
                        className="w-16 px-2 py-1.5 border border-[var(--border)] rounded-lg text-sm"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)]"
                      >
                        +
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="block text-[10px] text-[var(--muted-foreground)]">
                        Ведущий (при создании)
                        <select
                          value={newSubtaskLeadId}
                          onChange={(e) => setNewSubtaskLeadId(e.target.value)}
                          className="mt-0.5 w-full px-2 py-1.5 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)]"
                        >
                          <option value="">—</option>
                          {teamDirectory.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.displayName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-[10px] text-[var(--muted-foreground)]">
                        Исполнитель (при создании)
                        <select
                          value={newSubtaskAssigneeId}
                          onChange={(e) => setNewSubtaskAssigneeId(e.target.value)}
                          className="mt-0.5 w-full px-2 py-1.5 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)]"
                        >
                          <option value="">—</option>
                          {teamDirectory.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.displayName}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </form>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Ответственные</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(modalExtra.assignees ?? (modalExtra.assignee ? [modalExtra.assignee] : [])).map((name, i) => {
                      const member = teamList.find((t) => t.name === name);
                      return (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--surface-2)] text-[var(--text)] text-sm">
                          <span className="w-5 h-5 rounded-full bg-[var(--border)] flex items-center justify-center text-[10px] font-medium overflow-hidden flex-shrink-0">
                            {member?.avatar ? <img src={member.avatar} alt="" className="w-full h-full object-cover" /> : (name.trim() ? name.trim().charAt(0).toUpperCase() : "?")}
                          </span>
                          {name}
                          <button type="button" onClick={() => setModalExtra((x) => ({ ...x, assignees: (x.assignees ?? (x.assignee ? [x.assignee] : [])).filter((_, j) => j !== i) }))} className="text-[var(--muted-foreground)] hover:text-red-600">×</button>
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newAssigneeInput} onChange={(e) => setNewAssigneeInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToTeamAndAssign(newAssigneeInput))} placeholder="Имя ответственного" className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg text-sm" />
                    <button type="button" onClick={() => addToTeamAndAssign(newAssigneeInput)} className="px-3 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg text-sm font-medium hover:bg-[var(--border)]">+ Добавить</button>
                  </div>
                  <input type="file" ref={avatarInputRef} accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f && editingAvatarForId) { const r = new FileReader(); r.onload = () => setTeamMemberAvatar(editingAvatarForId, r.result as string); r.readAsDataURL(f); } e.target.value = ""; }} />
                  {teamList.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-[var(--muted-foreground)] block mb-1">Список ответственных (нажмите на аватар, чтобы загрузить фото):</span>
                      <div className="flex flex-wrap gap-2">
                        {teamList.map((t) => (
                          <div key={t.id} className="flex items-center gap-1.5">
                            <button type="button" onClick={() => { setEditingAvatarForId(t.id); setTimeout(() => avatarInputRef.current?.click(), 0); }} className="w-8 h-8 rounded-full border-2 border-dashed border-[var(--border)] flex items-center justify-center overflow-hidden bg-[var(--surface-2)] hover:border-[var(--primary)] transition-colors" title="Загрузить аватар">
                              {t.avatar ? <img src={t.avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-[var(--muted-foreground)] text-xs">+</span>}
                            </button>
                            <span className="text-xs text-[var(--muted-foreground)]">{t.name}</span>
                            {!(modalExtra.assignees ?? (modalExtra.assignee ? [modalExtra.assignee] : [])).includes(t.name) && (
                              <button type="button" onClick={() => setModalExtra((x) => ({ ...x, assignees: [...(x.assignees ?? (x.assignee ? [x.assignee] : [])), t.name] }))} className="text-xs text-[var(--primary)] hover:underline">+ в карточку</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">Общий дедлайн проекта</label>
                  <input type="date" value={modalExtra.projectDeadline ? modalExtra.projectDeadline.slice(0, 10) : ""} onChange={(e) => setModalExtra((x) => ({ ...x, projectDeadline: e.target.value || undefined }))} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">Дедлайны и оценки по этапам</label>
                  <button
                    type="button"
                    onClick={() => {
                      const { blocks, slides } = parseVolume(modalExtra.volume);
                      const type = modalExtra.projectType;
                      const defaults: Record<string, number> = {
                        copywriting: 18,
                        design_first_screen: 2,
                        design: type === "site" ? 2 * blocks : type === "presentation" ? Math.max(0, slides / 10) : 0,
                        layout: type === "site" ? 1 * blocks : 0,
                      };
                      setModalExtra((x) => {
                        const sd = { ...(x.stageDetails ?? {}) };
                        for (const key of STAGES_FOR_ESTIMATES) {
                          const val = defaults[key] ?? (sd[key]?.estimatedHours ?? 0);
                          if (val > 0) sd[key] = { ...sd[key], estimatedHours: val };
                        }
                        return { ...x, stageDetails: sd };
                      });
                    }}
                    className="mb-2 text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--muted-foreground)]"
                  >
                    Подставить часы по шаблону
                  </button>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {STAGES_FOR_ESTIMATES.map((key) => {
                      const label = PM_STATUSES.find((s) => s.key === key)?.label ?? key;
                      const sd = (modalExtra.stageDetails ?? {})[key] ?? {};
                      return (
                        <div key={key} className="grid grid-cols-[1fr_80px_70px] gap-2 items-center text-sm">
                          <span className="text-[var(--muted-foreground)] truncate">{label}</span>
                          <input
                            type="date"
                            value={sd.deadline ? sd.deadline.slice(0, 10) : ""}
                            onChange={(e) => setModalExtra((x) => ({
                              ...x,
                              stageDetails: { ...(x.stageDetails ?? {}), [key]: { ...(x.stageDetails?.[key] ?? {}), deadline: e.target.value || undefined } },
                            }))}
                            className="px-2 py-1 border border-[var(--border)] rounded text-xs"
                          />
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            placeholder="ч"
                            value={sd.estimatedHours ?? ""}
                            onChange={(e) => setModalExtra((x) => ({
                              ...x,
                              stageDetails: { ...(x.stageDetails ?? {}), [key]: { ...(x.stageDetails?.[key] ?? {}), estimatedHours: e.target.value ? parseFloat(e.target.value) : undefined } },
                            }))}
                            className="px-2 py-1 border border-[var(--border)] rounded text-xs"
                          />
                        </div>
                      );
                    })}
                  </div>
                  {(() => {
                    const total = STAGES_FOR_ESTIMATES.reduce((sum, key) => sum + ((modalExtra.stageDetails ?? {})[key]?.estimatedHours ?? 0), 0);
                    return total > 0 ? <div className="mt-2 pt-2 border-t border-[var(--border)] text-sm font-medium text-[var(--text)]">Всего: {total} ч</div> : null;
                  })()}
                </div>
              </div>
              <div className="p-4 space-y-4 md:w-1/2 border-t md:border-t-0 md:border-l border-[var(--border)]">
                <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Ссылка на Figma</label><input type="url" value={modalExtra.figmaLink ?? ""} onChange={(e) => setModalExtra((x) => ({ ...x, figmaLink: e.target.value || undefined }))} placeholder="https://..." className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Ссылка на ТЗ</label><input type="url" value={modalExtra.tzLink ?? ""} onChange={(e) => setModalExtra((x) => ({ ...x, tzLink: e.target.value || undefined }))} placeholder="https://..." className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Доступы к Tilda</label><input type="text" value={modalExtra.tildaAccess ?? ""} onChange={(e) => setModalExtra((x) => ({ ...x, tildaAccess: e.target.value || undefined }))} placeholder="Логин, пароль..." className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Пожелания</label><textarea value={modalExtra.wishes ?? ""} onChange={(e) => setModalExtra((x) => ({ ...x, wishes: e.target.value || undefined }))} placeholder="Пожелания клиента" rows={2} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Пояснения</label><textarea value={modalExtra.explanations ?? ""} onChange={(e) => setModalExtra((x) => ({ ...x, explanations: e.target.value || undefined }))} placeholder="Пояснения по проекту" rows={2} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Другие ссылки</label><textarea value={modalExtra.otherLinks ?? ""} onChange={(e) => setModalExtra((x) => ({ ...x, otherLinks: e.target.value || undefined }))} placeholder="По одной на строку" rows={2} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm" /></div>
              </div>
            </div>
            <div className="p-4 border-t border-[var(--border)] flex justify-end gap-2">
              <button type="button" onClick={() => setModalCard(null)} className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-2)]">Закрыть</button>
              <button type="button" onClick={saveModalExtra} disabled={savingExtra} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50">{savingExtra ? "Сохранение…" : "Сохранить"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
