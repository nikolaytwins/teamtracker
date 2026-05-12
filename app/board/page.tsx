"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { apiUrl, appPath } from "@/lib/api-url";
import Link from "next/link";
import {
  SIMPLE_VIEW_GROUPS,
  APPROVAL_WAITING_STATUSES,
  APPROVAL_WAITING_STATUS_SET,
  ACTIVE_WORK_STAGE_KEYS,
  ACTIVE_WORK_STAGE_SET,
  IMPORTANCE_OPTIONS,
  defaultStatusForSimpleViewGroup,
  statusToSimpleViewGroup,
  type PmStatusKey,
  type ImportanceKey,
  type SimpleViewGroupKey,
} from "@/lib/statuses";
import type { PmSubtaskWithCard } from "@/lib/pm-subtasks";
import { VIRTUAL_OTHER_CARD_ID } from "@/lib/pm-constants";
import { ProjectSetupModal } from "@/components/board/ProjectSetupModal";

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

type CardExtra = {
  /** Основной текст карточки (как в Notion) */
  description?: string;
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
  /** user ids — ответственные на уровне проекта */
  ownerUserIds?: string[];
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

/** Левая полоска на карточке: согласование — оранж.; остальные — нейтральные акценты. */
function cardStatusLeftAccent(card: PmCard): string {
  const g = statusToSimpleViewGroup(card.status);
  if (g === "awaiting_approval") return "border-l-4 border-l-orange-500";
  if (g === "in_progress") return "border-l-4 border-l-[var(--border)]";
  if (g === "done") return "border-l-4 border-l-slate-400";
  if (g === "pause") return "border-l-4 border-l-amber-500";
  return "border-l-4 border-l-[var(--border)]";
}

function formatPhaseDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} ч ${m} м`;
  if (m > 0) return `${m} м`;
  return s > 0 ? `${s} с` : "0";
}

export default function BoardPage() {
  const [cards, setCards] = useState<PmCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectScopeTab, setProjectScopeTab] = useState<"active" | "pause" | "done">(() => {
    if (typeof window === "undefined") return "active";
    try {
      const v = localStorage.getItem("pm-board-project-scope");
      if (v === "pause" || v === "done") return v;
      return "active";
    } catch {
      return "active";
    }
  });
  const [filterQuery, setFilterQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newProjectStatus, setNewProjectStatus] = useState<PmStatusKey>("not_started");
  const [adding, setAdding] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [boardSubtasks, setBoardSubtasks] = useState<PmSubtaskWithCard[]>([]);
  const [quickCardTitle, setQuickCardTitle] = useState<Record<string, string>>({});
  const [quickCardBusy, setQuickCardBusy] = useState<string | null>(null);
  const [modalCard, setModalCard] = useState<PmCard | null>(null);
  const [modalName, setModalName] = useState("");
  const [modalDescription, setModalDescription] = useState("");
  const [savingDoc, setSavingDoc] = useState(false);
  const skipPersistEffect = useRef(true);
  const draftRef = useRef({ name: "", description: "", cardId: "" });
  const extraRef = useRef<string | null>(null);
  const modalOpenIdRef = useRef<string | null>(null);
  const modalNameBaselineRef = useRef("");
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
  const [modalPhaseInsight, setModalPhaseInsight] = useState<{
    projectTotalSeconds: number;
    phases: { title: string }[];
    topMatrixRows: { phaseTitle: string; phaseHours: number }[];
    economics: { paidAmount: number; effectiveHourlyPaidRub: number | null } | null;
  } | null>(null);
  const [modalPhaseInsightLoading, setModalPhaseInsightLoading] = useState(false);
  const [setupProject, setSetupProject] = useState<{ id: string; name: string; extra: string | null } | null>(null);
  const [filterResponsibleUserId, setFilterResponsibleUserId] = useState("");
  const [boardTeamUsers, setBoardTeamUsers] = useState<{ id: string; displayName: string; avatarUrl?: string | null }[]>(
    []
  );
  const [projectTemplates, setProjectTemplates] = useState<{ id: string; name: string; itemCount: number }[]>([]);
  const [newProjectTemplateId, setNewProjectTemplateId] = useState("");
  const [templatesManagerOpen, setTemplatesManagerOpen] = useState(false);
  const [tplDraftName, setTplDraftName] = useState("");
  const [tplDraftLines, setTplDraftLines] = useState("");

  const loadBoardSubtasks = useCallback(async () => {
    const r = await fetch(apiUrl("/api/board/open-subtasks"));
    if (!r.ok) return;
    const d = (await r.json()) as { subtasks?: PmSubtaskWithCard[] };
    setBoardSubtasks(Array.isArray(d.subtasks) ? d.subtasks : []);
  }, []);

  useEffect(() => {
    if (!modalCard?.id) {
      setModalPhaseInsight(null);
      return;
    }
    let cancelled = false;
    setModalPhaseInsightLoading(true);
    void (async () => {
      try {
        const r = await fetch(apiUrl(`/api/cards/${modalCard.id}/phases`));
        const data = (await r.json()) as {
          projectTotalSeconds?: number;
          phases?: { title: string }[];
          timeMatrix?: { phaseTitle: string; phaseHours: number }[];
          economics?: { paidAmount: number; effectiveHourlyPaidRub: number | null } | null;
        };
        if (cancelled) return;
        if (!r.ok) {
          setModalPhaseInsight(null);
          return;
        }
        const tm = Array.isArray(data.timeMatrix) ? data.timeMatrix : [];
        const topMatrixRows = tm
          .filter((row) => row.phaseHours > 0)
          .sort((a, b) => b.phaseHours - a.phaseHours)
          .slice(0, 4);
        setModalPhaseInsight({
          projectTotalSeconds: data.projectTotalSeconds ?? 0,
          phases: Array.isArray(data.phases) ? data.phases.map((p) => ({ title: p.title })) : [],
          topMatrixRows,
          economics: data.economics ?? null,
        });
      } catch {
        if (!cancelled) setModalPhaseInsight(null);
      } finally {
        if (!cancelled) setModalPhaseInsightLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modalCard?.id]);

  async function refreshBoardCard(cardId: string) {
    try {
      const r = await fetch(apiUrl(`/api/cards/${cardId}`));
      if (!r.ok) return;
      const updated = (await r.json()) as PmCard;
      setCards((prev) => prev.map((c) => (c.id === cardId ? updated : c)));
      setSetupProject((prev) => {
        if (!prev || prev.id !== cardId) return prev;
        return { ...prev, extra: updated.extra ?? null, name: updated.name };
      });
      setModalCard((prev) => {
        if (prev?.id !== cardId) return prev;
        extraRef.current = updated.extra ?? null;
        return updated;
      });
    } catch {
      /* ignore */
    }
  }

  const saveCardDocument = useCallback(async (opts?: { evenIfClosed?: boolean }) => {
    const cardId = draftRef.current.cardId;
    if (!cardId) return;
    if (!opts?.evenIfClosed && modalOpenIdRef.current !== cardId) return;
    const name = draftRef.current.name.trim() || modalNameBaselineRef.current;
    const desc = draftRef.current.description;
    setSavingDoc(true);
    try {
      const prev = parseExtra(extraRef.current);
      const nextExtra: CardExtra = {
        ...prev,
        description: desc.trim() || undefined,
      };
      const r = await fetch(apiUrl(`/api/cards/${cardId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          extra: JSON.stringify(nextExtra),
        }),
      });
      if (r.ok) {
        const updated = (await r.json()) as PmCard;
        skipPersistEffect.current = true;
        extraRef.current = updated.extra ?? null;
        modalNameBaselineRef.current = updated.name;
        setCards((prev) => prev.map((c) => (c.id === cardId ? updated : c)));
        setModalCard((prev) => (prev?.id === cardId ? updated : prev));
        setModalName(updated.name);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingDoc(false);
    }
  }, []);

  useEffect(() => {
    if (!modalCard?.id) return;
    draftRef.current = {
      name: modalName,
      description: modalDescription,
      cardId: modalCard.id,
    };
    if (skipPersistEffect.current) {
      skipPersistEffect.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      void saveCardDocument();
    }, 550);
    return () => window.clearTimeout(t);
  }, [modalName, modalDescription, modalCard?.id, saveCardDocument]);

  function closeCardModal() {
    void saveCardDocument({ evenIfClosed: true });
    modalOpenIdRef.current = null;
    setModalCard(null);
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
      void loadBoardSubtasks();
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

  const cardsMinusVirtual = useMemo(
    () => filteredCards.filter((c) => c.id !== VIRTUAL_OTHER_CARD_ID),
    [filteredCards]
  );

  const cardsForSimpleBoard = useMemo(() => {
    const importanceOrderInner = (c: PmCard) => {
      const ex = parseExtra(c.extra);
      const o: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return o[ex.importance ?? ""] ?? 3;
    };
    const base =
      projectScopeTab === "active"
        ? cardsMinusVirtual.filter((c) => {
            const g = statusToSimpleViewGroup(c.status);
            return g === "in_progress" || g === "awaiting_approval" || g === "not_started";
          })
        : projectScopeTab === "pause"
          ? cardsMinusVirtual.filter((c) => c.status === "pause")
          : cardsMinusVirtual.filter((c) => c.status === "done");
    return [...base].sort((a, b) => importanceOrderInner(a) - importanceOrderInner(b));
  }, [cardsMinusVirtual, projectScopeTab]);

  const cardMatchesResponsibleFilter = useCallback(
    (cardId: string) => {
      const uid = filterResponsibleUserId.trim();
      if (!uid) return true;
      const card = cards.find((c) => c.id === cardId);
      const owners = parseExtra(card?.extra).ownerUserIds;
      if (Array.isArray(owners) && owners.includes(uid)) return true;
      return boardSubtasks.some(
        (s) => s.card_id === cardId && (s.assignee_user_id === uid || s.lead_user_id === uid)
      );
    },
    [filterResponsibleUserId, cards, boardSubtasks]
  );

  const cardsForBoardView = useMemo(
    () => cardsForSimpleBoard.filter((c) => cardMatchesResponsibleFilter(c.id)),
    [cardsForSimpleBoard, cardMatchesResponsibleFilter]
  );

  useEffect(() => {
    try {
      localStorage.setItem("pm-board-project-scope", projectScopeTab);
    } catch {
      /* ignore */
    }
  }, [projectScopeTab]);

  useEffect(() => {
    void fetch(apiUrl("/api/team/users"))
      .then((r) => r.json())
      .then((d: { users?: { id?: string; displayName?: string; avatarUrl?: string | null }[] }) => {
        if (!Array.isArray(d.users)) return;
        setBoardTeamUsers(
          d.users.map((u) => ({
            id: String(u.id ?? ""),
            displayName: String(u.displayName ?? ""),
            avatarUrl: u.avatarUrl ?? null,
          }))
        );
      })
      .catch(() => setBoardTeamUsers([]));
  }, []);

  useEffect(() => {
    if (!addProjectOpen && !templatesManagerOpen) return;
    void fetch(apiUrl("/api/board/project-templates"))
      .then((r) => r.json())
      .then((d: { templates?: { id: string; name: string; itemCount: number }[] }) => {
        setProjectTemplates(Array.isArray(d.templates) ? d.templates : []);
      })
      .catch(() => setProjectTemplates([]));
  }, [addProjectOpen, templatesManagerOpen]);

  useEffect(() => {
    if (loading) return;
    void loadBoardSubtasks();
  }, [loading, cards.length, loadBoardSubtasks]);

  async function submitNewProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const r = await fetch(apiUrl("/api/cards"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          deadline: newDeadline || null,
          status: newProjectStatus,
          templateId: newProjectTemplateId.trim() || undefined,
          createFinancialProject: true,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof data.error === "string" ? data.error : "Не удалось создать");
      const card = data as PmCard;
      setCards((prev) => [card, ...prev]);
      setNewName("");
      setNewDeadline("");
      setNewProjectStatus("not_started");
      setNewProjectTemplateId("");
      setAddProjectOpen(false);
      await loadBoardSubtasks();
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
      void loadBoardSubtasks();
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
      else if (groupKey === "awaiting_approval") {
        newStatus = APPROVAL_WAITING_STATUS_SET.has(card.status)
          ? card.status
          : (APPROVAL_WAITING_STATUSES[0] as PmStatusKey);
      } else {
        newStatus = ACTIVE_WORK_STAGE_SET.has(card.status)
          ? card.status
          : (ACTIVE_WORK_STAGE_KEYS[0] as PmStatusKey);
      }
      if (card.status !== newStatus) updateStatus(cardId, newStatus);
    } catch (_) {}
  }

  function openModal(card: PmCard) {
    skipPersistEffect.current = true;
    modalOpenIdRef.current = card.id;
    modalNameBaselineRef.current = card.name;
    extraRef.current = card.extra ?? null;
    setModalCard(card);
    setModalName(card.name);
    const ex = parseExtra(card.extra);
    const desc =
      (typeof ex.description === "string" && ex.description) ||
      [ex.explanations, ex.wishes].filter(Boolean).join("\n\n") ||
      "";
    setModalDescription(desc);
  }

  async function deleteCardOnly(cardId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Удалить карточку из канбана? В Agency проект останется.")) return;
    try {
      const r = await fetch(apiUrl(`/api/cards/${cardId}`), { method: "DELETE" });
      if (r.ok) {
        setCards((prev) => prev.filter((c) => c.id !== cardId));
        void loadBoardSubtasks();
      }
      if (modalCard?.id === cardId) {
        modalOpenIdRef.current = null;
        setModalCard(null);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function createProjectTemplateFromDraft() {
    const name = tplDraftName.trim();
    if (!name) {
      setError("Введите название шаблона");
      return;
    }
    setError(null);
    const items = tplDraftLines
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((title) => ({ title }));
    try {
      const r = await fetch(apiUrl("/api/board/project-templates"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, items }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.error === "string" ? d.error : "Не удалось сохранить шаблон");
      setTplDraftName("");
      setTplDraftLines("");
      const tr = await fetch(apiUrl("/api/board/project-templates")).then((x) => x.json());
      setProjectTemplates(Array.isArray(tr.templates) ? tr.templates : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  }

  async function deleteProjectTemplateById(id: string) {
    if (!confirm("Удалить шаблон?")) return;
    try {
      const r = await fetch(apiUrl(`/api/board/project-templates/${encodeURIComponent(id)}`), { method: "DELETE" });
      if (!r.ok) return;
      const tr = await fetch(apiUrl("/api/board/project-templates")).then((x) => x.json());
      setProjectTemplates(Array.isArray(tr.templates) ? tr.templates : []);
      setNewProjectTemplateId((cur) => (cur === id ? "" : cur));
    } catch (err) {
      console.error(err);
    }
  }

  if (loading)
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 text-sm text-[var(--muted-foreground)]">Загрузка…</div>
    );
  if (error) return <div className="p-6 text-sm font-medium text-[var(--danger)]">{error}</div>;

  const setupCardExtra = setupProject
    ? (cards.find((c) => c.id === setupProject.id)?.extra ?? setupProject.extra)
    : null;

  const importanceOrder = (c: PmCard) => {
    const ex = parseExtra(c.extra);
    const o: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return o[ex.importance ?? ""] ?? 3;
  };
  const bySimpleGroup = (groupKey: (typeof SIMPLE_VIEW_GROUPS)[number]["key"]) => {
    const src = cardsForBoardView;
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
  };

  async function quickAddCardInColumn(columnKey: string, status: PmStatusKey) {
    const title = (quickCardTitle[columnKey] || "").trim();
    if (!title) return;
    setQuickCardBusy(columnKey);
    setError(null);
    try {
      const r = await fetch(apiUrl("/api/cards"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: title, deadline: null, status, createFinancialProject: true }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof data.error === "string" ? data.error : "Не удалось создать");
      const card = data as PmCard;
      setCards((prev) => [card, ...prev]);
      setQuickCardTitle((prev) => ({ ...prev, [columnKey]: "" }));
      await loadBoardSubtasks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setQuickCardBusy(null);
    }
  }

  function renderCard(card: PmCard) {
    const extra = parseExtra(card.extra);
    const importanceOpt = IMPORTANCE_OPTIONS.find((o) => o.key === extra.importance);
    const assignees: string[] = extra.assignees ?? (extra.assignee ? [extra.assignee] : []);
    const ownerIds = Array.isArray(extra.ownerUserIds) ? extra.ownerUserIds : [];
    const projectDeadline = extra.projectDeadline || null;
    return (
      <div
        key={card.id}
        draggable
        onDragStart={(e) => handleDragStart(e, card.id)}
        onClick={() => openModal(card)}
        className={`group cursor-pointer rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 pl-3 shadow-[var(--shadow-kanban-card)] transition-[box-shadow,transform] hover:shadow-[var(--shadow-kanban-card-hover)] active:scale-[0.99] dark:ring-0 ${cardStatusLeftAccent(card)}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {importanceOpt && (
              <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mb-2 ${importanceOpt.className}`}>
                {importanceOpt.label}
              </span>
            )}
            <div className="text-sm font-semibold leading-tight text-[var(--text)]">{card.name}</div>
            {projectDeadline ? (
              <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">Срок · {formatDate(projectDeadline)}</p>
            ) : null}
            <Link
              href={appPath(`/board/${card.id}`)}
              onClick={(e) => e.stopPropagation()}
              className="mt-2 inline-flex text-xs font-semibold text-[var(--primary)] hover:underline"
            >
              Страница проекта →
            </Link>
            {ownerIds.length > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-1" title="Ответственные за проект">
                {ownerIds.slice(0, 8).map((uid) => {
                  const u = boardTeamUsers.find((t) => t.id === uid);
                  const initial = (u?.displayName || "?").trim().charAt(0).toUpperCase() || "?";
                  return (
                    <span
                      key={uid}
                      className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-2)] text-[10px] font-semibold text-[var(--text)] ring-1 ring-[var(--border)]"
                      title={u?.displayName ?? uid}
                    >
                      {u?.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        initial
                      )}
                    </span>
                  );
                })}
              </div>
            ) : null}
            {assignees.length > 0 && (
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                {assignees.slice(0, 4).map((name, i) => {
                  const member = teamList.find((t) => t.name === name);
                  return (
                    <span
                      key={i}
                      className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-2)] text-[10px] font-medium text-[var(--text)]"
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
              onClick={(e) => {
                e.stopPropagation();
                setSetupProject({ id: card.id, name: card.name, extra: card.extra ?? null });
              }}
              className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              title="Настройка этапов и подзадач"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
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
          className="tt-select mt-3 w-full !border-transparent bg-[var(--surface-2)]/55 py-2 text-xs dark:bg-[var(--surface-2)]/35"
          value={statusToSimpleViewGroup(card.status)}
          onChange={(e) =>
            void updateStatus(card.id, defaultStatusForSimpleViewGroup(e.target.value as SimpleViewGroupKey))
          }
          onClick={(e) => e.stopPropagation()}
        >
          {SIMPLE_VIEW_GROUPS.map((g) => (
            <option key={g.key} value={g.key}>
              {g.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-[var(--border)]/60 bg-[var(--bg)]/85 px-4 py-4 backdrop-blur-xl dark:border-white/[0.06] md:-mx-6 md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">Проекты</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Канбан по сводным колонкам: перетаскивайте карточки или меняйте колонку внизу карточки. Подзадачи и календарь — в
              разделе «Задачи». Показано{" "}
              <span className="font-semibold text-[var(--text)]">{cardsForBoardView.length}</span>
              {filterQuery.trim() ? (
                <span className="text-[var(--muted-foreground)]"> из {cards.length}</span>
              ) : null}
              .
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <Link
                href={appPath("/tasks")}
                className="inline-flex text-sm font-semibold text-[var(--primary)] hover:underline"
              >
                Задачи →
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Поиск по названию…"
              className="tt-input w-full text-sm sm:w-56"
            />
            <button
              type="button"
              onClick={() => setTemplatesManagerOpen(true)}
              className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
            >
              Шаблоны
            </button>
            <button
              type="button"
              onClick={() => {
                setAddProjectOpen(true);
                setError(null);
              }}
              className="rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white shadow-md shadow-[var(--primary)]/25 hover:brightness-110"
            >
              + Добавить проект
            </button>
          </div>
        </div>
      </div>

      {addProjectOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-3 py-6"
          onClick={() => setAddProjectOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-elevated)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold text-[var(--text)]">Новый проект</h2>
              <button
                type="button"
                className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
                onClick={() => setAddProjectOpen(false)}
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>
            <form onSubmit={(e) => void submitNewProject(e)} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">Название</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Проект или клиент"
                  className="tt-input w-full text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">Дедлайн</label>
                <input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="tt-input w-full text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">
                  Шаблон подзадач (необязательно)
                </label>
                <select
                  className="tt-select w-full text-sm"
                  value={newProjectTemplateId}
                  onChange={(e) => setNewProjectTemplateId(e.target.value)}
                >
                  <option value="">Без шаблона</option>
                  {projectTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.itemCount > 0 ? ` (${t.itemCount})` : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-[var(--primary)] hover:underline"
                  onClick={() => {
                    setTemplatesManagerOpen(true);
                  }}
                >
                  Управление шаблонами…
                </button>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">Стартовая колонка</label>
                <select
                  className="tt-select w-full text-sm"
                  value={newProjectStatus}
                  onChange={(e) => setNewProjectStatus(e.target.value as PmStatusKey)}
                >
                  {SIMPLE_VIEW_GROUPS.map((g) => (
                    <option key={g.key} value={defaultStatusForSimpleViewGroup(g.key)}>
                      {g.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  Сводная колонка канбана «Проекты» — карточка получит подходящий внутренний статус.
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
                  onClick={() => setAddProjectOpen(false)}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={adding || !newName.trim()}
                  className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[var(--primary)]/25 hover:brightness-110 disabled:opacity-50"
                >
                  {adding ? "Создание…" : "Создать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Фильтр:</span>
          <button
            type="button"
            onClick={() => setProjectScopeTab("active")}
            title="Включает проекты «Не начат», «В работе» и «На согласовании»"
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
              projectScopeTab === "active"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
            }`}
          >
            В работе и на согласовании
          </button>
          <button
            type="button"
            onClick={() => setProjectScopeTab("pause")}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
              projectScopeTab === "pause"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
            }`}
          >
            На паузе
          </button>
          <button
            type="button"
            onClick={() => setProjectScopeTab("done")}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
              projectScopeTab === "done"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
            }`}
          >
            Завершённые
          </button>
          <span className="mx-1 hidden h-4 w-px bg-[var(--border)] sm:inline" aria-hidden />
          <span className="w-full text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] sm:w-auto">
            Ответственный
          </span>
          <select
            className="tt-select max-w-full py-1.5 text-xs sm:max-w-[14rem]"
            value={filterResponsibleUserId}
            onChange={(e) => setFilterResponsibleUserId(e.target.value)}
          >
            <option value="">Все</option>
            {boardTeamUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.displayName}
              </option>
            ))}
          </select>
        </div>

      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-6">
          {SIMPLE_VIEW_GROUPS.map(({ key, label }) => {
            const groupCards = bySimpleGroup(key);
            const colTint = "bg-[var(--surface)]/90 dark:bg-[var(--surface)]/50";
            const defaultStatus = defaultStatusForSimpleViewGroup(key);
            return (
              <div
                key={key}
                className={`w-[min(100vw-2rem,20rem)] shrink-0 snap-start overflow-hidden rounded-2xl shadow-[var(--shadow-kanban-column)] ring-1 ring-[var(--border)]/20 dark:ring-0 sm:w-72 ${colTint}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleSimpleDrop(e, key)}
              >
                <div className="sticky top-0 z-10 flex min-h-[3.25rem] flex-wrap items-center gap-2 border-b border-[var(--border)]/45 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] dark:border-white/[0.06]">
                  <span className="text-[var(--text)] normal-case tracking-normal">{label}</span>
                  {key === "awaiting_approval" ? (
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)] ring-1 ring-[var(--border)]">
                      клиент
                    </span>
                  ) : null}
                  <span className="ml-auto rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--muted-foreground)] normal-case tracking-normal dark:bg-white/[0.06]">
                    {groupCards.length}
                  </span>
                </div>
                <div className="flex min-h-[min(70vh,560px)] flex-col gap-3 bg-[var(--bg)]/30 p-3 dark:bg-black/10">
                  <div className="min-h-0 flex-1 space-y-3">{groupCards.map((card) => renderCard(card))}</div>
                  <div className="mt-auto shrink-0 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]/60 p-2 dark:bg-[var(--surface)]/35">
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                      Новая карточка
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={quickCardTitle[key] ?? ""}
                        onChange={(e) => setQuickCardTitle((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder="Название"
                        className="tt-input min-w-0 flex-1 py-1.5 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void quickAddCardInColumn(key, defaultStatus);
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={!!quickCardBusy || !(quickCardTitle[key] || "").trim()}
                        onClick={() => void quickAddCardInColumn(key, defaultStatus)}
                        className="shrink-0 rounded-lg bg-[var(--primary)] px-2 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-40"
                      >
                        {quickCardBusy === key ? "…" : "+"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      {modalCard && (
        <div
          className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-black/45 px-3 py-6 sm:px-6 sm:py-10"
          onClick={closeCardModal}
          role="presentation"
        >
          <div
            className="relative my-auto w-full max-w-2xl min-h-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-elevated)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeCardModal}
              className="absolute right-3 top-3 z-10 rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
              aria-label="Закрыть"
            >
              ✕
            </button>
            <div className="max-h-[min(85vh,880px)] overflow-y-auto px-6 pb-8 pt-14 sm:px-10 sm:pt-12">
              <input
                type="text"
                value={modalName}
                onChange={(e) => setModalName(e.target.value)}
                className="w-full min-w-0 border-0 bg-transparent text-2xl font-semibold tracking-tight text-[var(--text)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-0"
                placeholder="Без названия"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <span className="font-medium text-[var(--text)]">Статус проекта</span>
                <select
                  value={statusToSimpleViewGroup(modalCard.status)}
                  onChange={(e) =>
                    void updateStatus(modalCard.id, defaultStatusForSimpleViewGroup(e.target.value as SimpleViewGroupKey))
                  }
                  className="tt-select py-1.5 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  {SIMPLE_VIEW_GROUPS.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.label}
                    </option>
                  ))}
                </select>
                {savingDoc ? <span className="text-[var(--muted-foreground)]">Сохранение…</span> : null}
              </div>
              <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  Учёт времени
                </div>
                {modalPhaseInsightLoading ? (
                  <p className="text-sm text-[var(--muted-foreground)]">Загрузка…</p>
                ) : modalPhaseInsight ? (
                  <div className="space-y-2 text-sm">
                    <p className="text-[var(--text)]">
                      <span className="font-semibold tabular-nums">
                        {formatPhaseDuration(modalPhaseInsight.projectTotalSeconds)}
                      </span>{" "}
                      учтённого времени по проекту
                    </p>
                    {modalPhaseInsight.economics ? (
                      <div className="space-y-0.5 border-t border-[var(--border)] pt-2 text-xs">
                        <div className="flex justify-between gap-2 tabular-nums">
                          <span className="text-[var(--muted-foreground)]">Оплачено</span>
                          <span className="font-medium text-emerald-700">
                            {modalPhaseInsight.economics.paidAmount.toLocaleString("ru-RU")} ₽
                          </span>
                        </div>
                        {modalPhaseInsight.economics.effectiveHourlyPaidRub != null ? (
                          <div className="flex justify-between gap-2 tabular-nums">
                            <span className="text-[var(--muted-foreground)]">₽/ч по оплате</span>
                            <span className="text-[var(--text)]">
                              {modalPhaseInsight.economics.effectiveHourlyPaidRub.toLocaleString("ru-RU")} ₽
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <Link
                      href={appPath(`/board/${modalCard.id}`)}
                      className="inline-block pt-2 text-xs font-semibold text-[var(--primary)] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Страница проекта и таймер →
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)]">Не удалось загрузить сводку.</p>
                )}
              </div>
              <textarea
                value={modalDescription}
                onChange={(e) => setModalDescription(e.target.value)}
                placeholder="Добавьте описание…"
                rows={10}
                className="mt-6 w-full min-w-0 resize-y border-0 bg-transparent text-sm leading-relaxed text-[var(--text)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-0"
              />
              <div className="mt-10 border-t border-[var(--border)] pt-6">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  Задачи по проекту
                </div>
                <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                  Список подзадач и календарь загрузки — в разделе «Задачи». Шаблон старта, ответственные и карточка проекта — в
                  настройке.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={appPath("/tasks")}
                    className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Задачи →
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      modalCard &&
                      setSetupProject({
                        id: modalCard.id,
                        name: modalCard.name,
                        extra: modalCard.extra ?? null,
                      })
                    }
                    className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[var(--primary)]/25 hover:brightness-110"
                  >
                    Настройка проекта
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {setupProject ? (
        <ProjectSetupModal
          open
          cardId={setupProject.id}
          cardName={setupProject.name}
          cardExtra={setupCardExtra}
          onClose={() => setSetupProject(null)}
          onChanged={() => {
            void refreshBoardCard(setupProject.id);
            void loadBoardSubtasks();
          }}
        />
      ) : null}

      {templatesManagerOpen ? (
        <div
          className="fixed inset-0 z-[56] flex items-center justify-center bg-black/45 px-3 py-8"
          role="presentation"
          onClick={() => setTemplatesManagerOpen(false)}
        >
          <div
            className="max-h-[min(90vh,640px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-elevated)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold text-[var(--text)]">Шаблоны проектов</h2>
              <button
                type="button"
                className="rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
                onClick={() => setTemplatesManagerOpen(false)}
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              При создании проекта можно выбрать шаблон — подзадачи появятся автоматически.
            </p>
            <ul className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">
              {projectTemplates.length === 0 ? (
                <li className="text-sm text-[var(--muted-foreground)]">Пока нет шаблонов.</li>
              ) : (
                projectTemplates.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-[var(--text)]">
                      {t.name}
                      <span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">
                        {t.itemCount} подзадач{t.itemCount === 1 ? "а" : ""}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => void deleteProjectTemplateById(t.id)}
                      className="shrink-0 text-xs font-semibold text-[var(--danger)] hover:underline"
                    >
                      Удалить
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="mt-6 space-y-3 border-t border-[var(--border)] pt-5">
              <h3 className="text-sm font-semibold text-[var(--text)]">Новый шаблон</h3>
              <label className="block text-xs font-medium text-[var(--muted-foreground)]">
                Название шаблона
                <input
                  type="text"
                  value={tplDraftName}
                  onChange={(e) => setTplDraftName(e.target.value)}
                  className="tt-input mt-1 w-full text-sm"
                  placeholder="Например: Сайт под ключ"
                />
              </label>
              <label className="block text-xs font-medium text-[var(--muted-foreground)]">
                Подзадачи (по одной строке)
                <textarea
                  value={tplDraftLines}
                  onChange={(e) => setTplDraftLines(e.target.value)}
                  rows={6}
                  className="tt-input mt-1 w-full resize-y text-sm"
                  placeholder={"Макет главной\nВёрстка\nПодключение форм"}
                />
              </label>
              <button
                type="button"
                onClick={() => void createProjectTemplateFromDraft()}
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-110"
              >
                Сохранить шаблон
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
