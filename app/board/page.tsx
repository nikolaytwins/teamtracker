"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { apiUrl, appPath } from "@/lib/api-url";
import Link from "next/link";
import {
  PM_STATUSES,
  SIMPLE_VIEW_GROUPS,
  APPROVAL_WAITING_STATUSES,
  APPROVAL_WAITING_STATUS_SET,
  ACTIVE_WORK_STAGE_KEYS,
  ACTIVE_WORK_STAGE_SET,
  statusLabel,
  IMPORTANCE_OPTIONS,
  defaultStatusForSimpleViewGroup,
  statusToSimpleViewGroup,
  type PmStatusKey,
  type ImportanceKey,
  type SimpleViewGroupKey,
} from "@/lib/statuses";
import { computeSubtaskProgressStats } from "@/lib/subtask-progress";
import type { PmSubtaskWithCard } from "@/lib/pm-subtasks";
import { VIRTUAL_OTHER_CARD_ID } from "@/lib/pm-constants";
import { ProjectSubtasksPanel } from "@/components/board/ProjectSubtasksPanel";

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

/** Левая полоска на карточке: согласование — оранж., в работе — зелёная. */
function cardStatusLeftAccent(card: PmCard): string {
  const g = statusToSimpleViewGroup(card.status);
  if (g === "awaiting_approval") return "border-l-4 border-l-orange-500";
  if (g === "in_progress") return "border-l-4 border-l-emerald-500";
  if (g === "done") return "border-l-4 border-l-slate-400";
  if (g === "pause") return "border-l-4 border-l-amber-500";
  return "border-l-4 border-l-[var(--border)]";
}

const BOARD_VIEW_LS = "pm-board-view-v1";

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
  const [boardDisplay, setBoardDisplay] = useState<"list" | "projects" | "tasks" | "stages">(() => {
    if (typeof window === "undefined") return "list";
    try {
      const v = localStorage.getItem(BOARD_VIEW_LS);
      if (v === "tasks" || v === "stages" || v === "projects" || v === "list") return v;
    } catch {
      /* ignore */
    }
    return "list";
  });
  const [projectScopeTab, setProjectScopeTab] = useState<"active" | "full">(() => {
    if (typeof window === "undefined") return "active";
    return localStorage.getItem("pm-board-project-scope") === "full" ? "full" : "active";
  });
  const [expandedProjectIds, setExpandedProjectIds] = useState<Record<string, boolean>>({});
  const [filterQuery, setFilterQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newProjectStatus, setNewProjectStatus] = useState<PmStatusKey>("not_started");
  const [adding, setAdding] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [boardSubtasks, setBoardSubtasks] = useState<PmSubtaskWithCard[]>([]);
  const [quickCardTitle, setQuickCardTitle] = useState<Record<string, string>>({});
  const [quickCardBusy, setQuickCardBusy] = useState<string | null>(null);
  const [quickSubtaskTitle, setQuickSubtaskTitle] = useState<Record<string, string>>({});
  const [quickSubtaskCardId, setQuickSubtaskCardId] = useState<Record<string, string>>({});
  const [quickSubBusy, setQuickSubBusy] = useState<string | null>(null);
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
  const [modalSubtasks, setModalSubtasks] = useState<PmSubtaskRow[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [modalPhaseInsight, setModalPhaseInsight] = useState<{
    projectTotalSeconds: number;
    phases: { title: string }[];
    topMatrixRows: { phaseTitle: string; phaseHours: number }[];
    economics: { paidAmount: number; effectiveHourlyPaidRub: number | null } | null;
  } | null>(null);
  const [modalPhaseInsightLoading, setModalPhaseInsightLoading] = useState(false);

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
      projectScopeTab === "full"
        ? cardsMinusVirtual
        : cardsMinusVirtual.filter((c) => {
            const g = statusToSimpleViewGroup(c.status);
            return g === "in_progress" || g === "awaiting_approval";
          });
    return [...base].sort((a, b) => importanceOrderInner(a) - importanceOrderInner(b));
  }, [cardsMinusVirtual, projectScopeTab]);

  const activeCardIdSet = useMemo(() => {
    if (projectScopeTab !== "active") return null;
    return new Set(cardsForSimpleBoard.map((c) => c.id));
  }, [projectScopeTab, cardsForSimpleBoard]);

  useEffect(() => {
    try {
      localStorage.setItem(BOARD_VIEW_LS, boardDisplay);
    } catch {
      /* ignore */
    }
  }, [boardDisplay]);

  useEffect(() => {
    try {
      localStorage.setItem("pm-board-project-scope", projectScopeTab);
    } catch {
      /* ignore */
    }
  }, [projectScopeTab]);

  const loadBoardSubtasks = useCallback(async () => {
    const r = await fetch(apiUrl("/api/board/open-subtasks"));
    if (!r.ok) return;
    const d = (await r.json()) as { subtasks?: PmSubtaskWithCard[] };
    setBoardSubtasks(Array.isArray(d.subtasks) ? d.subtasks : []);
  }, []);

  useEffect(() => {
    if (boardDisplay === "tasks") void loadBoardSubtasks();
  }, [boardDisplay, cards, loadBoardSubtasks]);

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
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof data.error === "string" ? data.error : "Не удалось создать");
      const card = data as PmCard;
      setCards((prev) => [card, ...prev]);
      setNewName("");
      setNewDeadline("");
      setNewProjectStatus("not_started");
      setAddProjectOpen(false);
      if (boardDisplay === "tasks") await loadBoardSubtasks();
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
      if (boardDisplay === "tasks") void loadBoardSubtasks();
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
    setNewSubtaskTitle("");
  }

  async function deleteCardOnly(cardId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Удалить карточку из канбана? В Agency проект останется.")) return;
    try {
      const r = await fetch(apiUrl(`/api/cards/${cardId}`), { method: "DELETE" });
      if (r.ok) {
        setCards((prev) => prev.filter((c) => c.id !== cardId));
        if (boardDisplay === "tasks") void loadBoardSubtasks();
      }
      if (modalCard?.id === cardId) {
        modalOpenIdRef.current = null;
        setModalCard(null);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function addModalSubtask(e?: React.FormEvent) {
    e?.preventDefault();
    if (!modalCard || !newSubtaskTitle.trim()) return;
    try {
      const r = await fetch(apiUrl(`/api/cards/${modalCard.id}/subtasks`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newSubtaskTitle.trim(),
          estimatedHours: null,
          leadUserId: null,
          assigneeUserId: null,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Ошибка");
      setNewSubtaskTitle("");
      const list = await fetch(apiUrl(`/api/cards/${modalCard.id}/subtasks`)).then((x) => x.json());
      setModalSubtasks(Array.isArray(list.subtasks) ? list.subtasks : []);
      await refreshBoardCard(modalCard.id);
      if (boardDisplay === "tasks") void loadBoardSubtasks();
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
      await refreshBoardCard(modalCard.id);
      if (boardDisplay === "tasks") void loadBoardSubtasks();
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
      await refreshBoardCard(modalCard.id);
      if (boardDisplay === "tasks") void loadBoardSubtasks();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading)
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 text-sm text-[var(--muted-foreground)]">Загрузка…</div>
    );
  if (error) return <div className="p-6 text-sm font-medium text-[var(--danger)]">{error}</div>;

  const byStatus = (status: PmStatusKey) => cardsMinusVirtual.filter((c) => c.status === status);
  const importanceOrder = (c: PmCard) => {
    const ex = parseExtra(c.extra);
    const o: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return o[ex.importance ?? ""] ?? 3;
  };
  const bySimpleGroup = (groupKey: (typeof SIMPLE_VIEW_GROUPS)[number]["key"]) => {
    const src = cardsForSimpleBoard;
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

  function subtasksForSimpleColumn(col: SimpleViewGroupKey): PmSubtaskWithCard[] {
    const q = filterQuery.trim().toLowerCase();
    return boardSubtasks.filter((s) => {
      if (activeCardIdSet && !activeCardIdSet.has(s.card_id)) return false;
      if (statusToSimpleViewGroup(s.card_status) !== col) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.card_name.toLowerCase().includes(q)
      );
    });
  }

  async function quickAddCardInColumn(columnKey: string, status: PmStatusKey) {
    const title = (quickCardTitle[columnKey] || "").trim();
    if (!title) return;
    setQuickCardBusy(columnKey);
    setError(null);
    try {
      const r = await fetch(apiUrl("/api/cards"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: title, deadline: null, status }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof data.error === "string" ? data.error : "Не удалось создать");
      const card = data as PmCard;
      setCards((prev) => [card, ...prev]);
      setQuickCardTitle((prev) => ({ ...prev, [columnKey]: "" }));
      if (boardDisplay === "tasks") await loadBoardSubtasks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setQuickCardBusy(null);
    }
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
      await loadBoardSubtasks();
      await refreshBoardCard(cardId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setQuickSubBusy(null);
    }
  }

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
            {showStageLabel && (
              <span className="mt-1.5 inline-block rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)]">
                {statusLabel(card.status)}
              </span>
            )}
            {stageDeadline || projectDeadline ? (
              <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
                {[
                  stageDeadline ? `Этап · ${formatDate(stageDeadline)}` : null,
                  projectDeadline ? `Проект · ${formatDate(projectDeadline)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
            {extra.derivedSubtaskProgress && extra.derivedSubtaskProgress.total > 0 ? (
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
                  <span>
                    Подзадачи {extra.derivedSubtaskProgress.completed}/{extra.derivedSubtaskProgress.total}
                    {extra.derivedSubtaskProgress.byHours ? " · по часам" : ""}
                  </span>
                  <span className="font-semibold tabular-nums text-[var(--primary)]">{extra.derivedSubtaskProgress.percent}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
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

  function simpleScopeLabel(card: PmCard): string {
    const g = statusToSimpleViewGroup(card.status);
    if (g === "in_progress") return "В работе";
    if (g === "awaiting_approval") return "На согласовании";
    if (g === "done") return "Завершён";
    if (g === "not_started") return "Не начат";
    if (g === "pause") return "Пауза";
    return g;
  }

  function renderBoardSubtaskRow(s: PmSubtaskWithCard) {
    const parent = cards.find((c) => c.id === s.card_id);
    return (
      <div
        key={s.id}
        role="button"
        tabIndex={0}
        onClick={() => {
          if (parent) openModal(parent);
        }}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && parent) {
            e.preventDefault();
            openModal(parent);
          }
        }}
        className="cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-left shadow-sm transition-colors hover:border-[var(--primary)]/35 hover:bg-[var(--surface-2)]/50"
      >
        <div className="text-sm font-medium leading-snug text-[var(--text)]">{s.title}</div>
        <div className="mt-1 truncate text-xs text-[var(--muted-foreground)]">{s.card_name}</div>
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
              {boardDisplay === "list"
                ? "Список крупных карточек: этапы и подзадачи внутри. По умолчанию — только активные и на согласовании."
                : boardDisplay === "tasks"
                  ? "Подзадачи по колонкам статуса проекта. Клик — карточка проекта."
                  : boardDisplay === "projects"
                    ? "Канбан по сводным колонкам. Перетаскивайте карточки."
                    : "Все этапы отдельными колонками. Перетаскивайте карточки."}{" "}
              Показано{" "}
              <span className="font-semibold text-[var(--text)]">
                {boardDisplay === "tasks"
                  ? boardSubtasks.length
                  : boardDisplay === "list" || boardDisplay === "projects"
                    ? cardsForSimpleBoard.length
                    : cardsMinusVirtual.length}
              </span>
              {boardDisplay !== "tasks" && filterQuery.trim() ? (
                <span className="text-[var(--muted-foreground)]"> из {cards.length}</span>
              ) : null}
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
              placeholder={boardDisplay === "tasks" ? "Поиск задачи или проекта…" : "Поиск по названию…"}
              className="tt-input w-full text-sm sm:w-56"
            />
            <span className="hidden text-sm text-[var(--muted-foreground)] sm:inline">Вид:</span>
            <button
              type="button"
              onClick={() => setBoardDisplay("list")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                boardDisplay === "list"
                  ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25"
                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
              }`}
              title="Список проектов с раскрытием"
            >
              Список
            </button>
            <button
              type="button"
              onClick={() => setBoardDisplay("projects")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                boardDisplay === "projects"
                  ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25"
                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
              }`}
              title="Карточки проектов по сводным колонкам канбана"
            >
              Канбан
            </button>
            <button
              type="button"
              onClick={() => setBoardDisplay("tasks")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                boardDisplay === "tasks"
                  ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25"
                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
              }`}
              title="Открытые подзадачи по колонкам статуса родительского проекта"
            >
              Задачи
            </button>
            <button
              type="button"
              onClick={() => setBoardDisplay("stages")}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                boardDisplay === "stages"
                  ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25"
                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
              }`}
              title="Все этапы отдельными колонками"
            >
              Этапы
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
                <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">Стартовая колонка</label>
                <select
                  className="tt-select w-full text-sm"
                  value={newProjectStatus}
                  onChange={(e) => setNewProjectStatus(e.target.value as PmStatusKey)}
                >
                  {boardDisplay === "stages"
                    ? PM_STATUSES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))
                    : SIMPLE_VIEW_GROUPS.map((g) => (
                        <option key={g.key} value={defaultStatusForSimpleViewGroup(g.key)}>
                          {g.label}
                        </option>
                      ))}
                </select>
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  {boardDisplay === "stages"
                    ? "Точный этап канбана."
                    : "Колонка «Проекты» / «Задачи»: выберите сводную колонку — карточка получит подходящий статус."}
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

      {(boardDisplay === "list" || boardDisplay === "projects") && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Фильтр:</span>
          <button
            type="button"
            onClick={() => setProjectScopeTab("active")}
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
            onClick={() => setProjectScopeTab("full")}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
              projectScopeTab === "full"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
            }`}
          >
            Все проекты
          </button>
        </div>
      )}

      {boardDisplay === "list" && (
        <div className="mx-auto w-full max-w-none space-y-4 pb-10">
          {cardsForSimpleBoard.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">Нет проектов в этом фильтре.</p>
          ) : (
            cardsForSimpleBoard.map((card) => {
              const ex = parseExtra(card.extra);
              const open = Boolean(expandedProjectIds[card.id]);
              const prog = ex.derivedSubtaskProgress;
              return (
                <div
                  key={card.id}
                  className={`overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] pl-0 shadow-[var(--shadow-kanban-card)] ${cardStatusLeftAccent(card)}`}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex w-full cursor-pointer items-start gap-3 p-4 text-left transition-colors hover:bg-[var(--surface-2)]/40"
                    onClick={() =>
                      setExpandedProjectIds((prev) => ({
                        ...prev,
                        [card.id]: !prev[card.id],
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpandedProjectIds((prev) => ({
                          ...prev,
                          [card.id]: !prev[card.id],
                        }));
                      }
                    }}
                  >
                    <span className="mt-1 shrink-0 text-[var(--muted-foreground)]" aria-hidden>
                      {open ? "▼" : "▶"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-semibold leading-snug text-[var(--text)]">{card.name}</span>
                        <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]">
                          {simpleScopeLabel(card)}
                        </span>
                        <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text)] ring-1 ring-[var(--border)]">
                          {simpleScopeLabel(card)}
                        </span>
                      </div>
                      {prog && prog.total > 0 ? (
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
                            <span>
                              Подзадачи {prog.completed}/{prog.total}
                              {prog.byHours ? " · по часам" : ""}
                            </span>
                            <span className="font-semibold tabular-nums text-[var(--primary)]">{prog.percent}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                            <div
                              className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300"
                              style={{ width: `${prog.percent}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-[var(--muted-foreground)]">Добавьте подзадачи — появится прогресс.</p>
                      )}
                    </div>
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      <select
                        className="tt-select max-w-[11rem] py-2 text-xs"
                        value={statusToSimpleViewGroup(card.status)}
                        onChange={(e) =>
                          void updateStatus(card.id, defaultStatusForSimpleViewGroup(e.target.value as SimpleViewGroupKey))
                        }
                      >
                        {SIMPLE_VIEW_GROUPS.map((g) => (
                          <option key={g.key} value={g.key}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div
                    className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border)]/60 bg-[var(--bg)]/25 px-4 py-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link
                      href={appPath(`/board/${card.id}`)}
                      className="text-xs font-semibold text-[var(--primary)] hover:underline"
                    >
                      Страница проекта →
                    </Link>
                    <button
                      type="button"
                      onClick={() => openModal(card)}
                      className="text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--text)] hover:underline"
                    >
                      Описание и подзадачи
                    </button>
                  </div>
                  {open ? (
                    <div className="border-t border-[var(--border)] px-4 py-4">
                      <ProjectSubtasksPanel cardId={card.id} onChanged={() => void refreshBoardCard(card.id)} />
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      )}

      {boardDisplay === "stages" && (
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-6">
          {PM_STATUSES.map(({ key }) => (
            <div
              key={key}
              className="w-[min(100vw-2rem,20rem)] shrink-0 snap-start overflow-hidden rounded-2xl bg-[var(--surface)]/90 shadow-[var(--shadow-kanban-column)] ring-1 ring-[var(--border)]/20 dark:bg-[var(--surface)]/55 dark:ring-0"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, key)}
            >
              <div className="sticky top-0 z-10 flex min-h-[3.25rem] flex-wrap items-center gap-2 border-b border-[var(--border)]/45 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] dark:border-white/[0.06]">
                <span className="text-[var(--text)] normal-case tracking-normal">{statusLabel(key)}</span>
                <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--muted-foreground)] normal-case tracking-normal dark:bg-white/[0.06]">
                  {byStatus(key).length}
                </span>
              </div>
              <div className="min-h-[min(70vh,560px)] space-y-3 bg-[var(--bg)]/35 p-3 dark:bg-black/10">
                {byStatus(key).map((card) => renderCard(card, false))}
                <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 p-2 dark:bg-[var(--surface)]/30">
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                    Быстро в колонку
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={quickCardTitle[key] ?? ""}
                      onChange={(e) => setQuickCardTitle((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder="Название карточки"
                      className="tt-input min-w-0 flex-1 py-1.5 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void quickAddCardInColumn(key, key);
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={!!quickCardBusy || !(quickCardTitle[key] || "").trim()}
                      onClick={() => void quickAddCardInColumn(key, key)}
                      className="shrink-0 rounded-lg bg-[var(--primary)] px-2 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-40"
                    >
                      {quickCardBusy === key ? "…" : "+"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(boardDisplay === "projects" || boardDisplay === "tasks") && (
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-6">
          {SIMPLE_VIEW_GROUPS.map(({ key, label }) => {
            const groupCards = bySimpleGroup(key);
            const subtasksCol = subtasksForSimpleColumn(key);
            const showStageLabel = key === "in_progress" || key === "awaiting_approval";
            const colTint =
              key === "in_progress"
                ? "bg-[var(--primary-soft)]/12 dark:bg-[var(--primary-soft)]/8"
                : "bg-[var(--surface)]/90 dark:bg-[var(--surface)]/50";
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
                  {key === "in_progress" ? (
                    <span className="rounded-full bg-[var(--primary)]/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--primary)]">
                      работа
                    </span>
                  ) : null}
                  {key === "awaiting_approval" ? (
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)] ring-1 ring-[var(--border)]">
                      клиент
                    </span>
                  ) : null}
                  <span className="ml-auto rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--muted-foreground)] normal-case tracking-normal dark:bg-white/[0.06]">
                    {boardDisplay === "tasks" ? subtasksCol.length : groupCards.length}
                  </span>
                </div>
                <div
                  className={`flex min-h-[min(70vh,560px)] flex-col gap-3 p-3 ${
                    key === "in_progress" ? "bg-[var(--primary-soft)]/6 dark:bg-transparent" : "bg-[var(--bg)]/30 dark:bg-black/10"
                  }`}
                >
                  <div className="min-h-0 flex-1 space-y-3">
                    {boardDisplay === "tasks" ? (
                      subtasksCol.length === 0 ? (
                        <p className="px-1 text-xs text-[var(--muted-foreground)]">Нет открытых подзадач</p>
                      ) : (
                        subtasksCol.map((s) => renderBoardSubtaskRow(s))
                      )
                    ) : (
                      groupCards.map((card) => renderCard(card, showStageLabel))
                    )}
                  </div>
                  <div className="mt-auto shrink-0 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]/60 p-2 dark:bg-[var(--surface)]/35">
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                      {boardDisplay === "tasks" ? "Подзадача" : "Новая карточка"}
                    </div>
                    {boardDisplay === "tasks" ? (
                      groupCards.length === 0 ? (
                        <p className="text-[11px] leading-snug text-[var(--muted-foreground)]">
                          Добавьте проект в эту колонку или через «Добавить проект», затем можно вешать подзадачи.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <select
                            className="tt-select w-full py-1.5 text-xs"
                            value={quickSubtaskCardId[key] || groupCards[0]?.id || ""}
                            onChange={(e) =>
                              setQuickSubtaskCardId((prev) => ({ ...prev, [key]: e.target.value }))
                            }
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
                              onChange={(e) =>
                                setQuickSubtaskTitle((prev) => ({ ...prev, [key]: e.target.value }))
                              }
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
                      )
                    ) : (
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
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] mb-2">
                  Время и этапы
                </div>
                {modalPhaseInsightLoading ? (
                  <p className="text-sm text-[var(--muted-foreground)]">Загрузка…</p>
                ) : modalPhaseInsight ? (
                  <div className="space-y-2 text-sm">
                    <p className="text-[var(--text)]">
                      <span className="tabular-nums font-semibold">
                        {formatPhaseDuration(modalPhaseInsight.projectTotalSeconds)}
                      </span>
                      {" · "}
                      этапов: {modalPhaseInsight.phases.length}
                    </p>
                    {modalPhaseInsight.phases.length > 0 ? (
                      <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                        {modalPhaseInsight.phases
                          .slice(0, 4)
                          .map((p) => p.title)
                          .join(" · ")}
                        {modalPhaseInsight.phases.length > 4 ? "…" : ""}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-800">
                        Этапов пока нет — добавьте на странице учёта времени.
                      </p>
                    )}
                    {modalPhaseInsight.topMatrixRows.length > 0 ? (
                      <ul className="mt-2 space-y-1 border-t border-[var(--border)] pt-2 text-xs">
                        {modalPhaseInsight.topMatrixRows.map((row) => (
                          <li key={row.phaseTitle} className="flex justify-between gap-2 tabular-nums">
                            <span className="truncate text-[var(--muted-foreground)]">{row.phaseTitle}</span>
                            <span className="shrink-0 text-[var(--text)]">{row.phaseHours} ч</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {modalPhaseInsight.economics ? (
                      <div className="mt-2 space-y-0.5 border-t border-[var(--border)] pt-2 text-xs">
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
                      Полный учёт времени и окупаемость →
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
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Подзадачи</div>
                <div className="space-y-2">
                  {modalSubtasks.length === 0 ? (
                    <p className="text-sm text-[var(--muted-foreground)]">Пока нет подзадач</p>
                  ) : null}
                  {modalSubtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/35 px-3 py-2.5 transition-colors hover:border-[var(--primary)]/25 hover:bg-[var(--surface-2)]/60"
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={Boolean(sub.completed_at)}
                        onClick={() => void toggleModalSubtask(sub)}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] font-bold transition-colors ${
                          sub.completed_at
                            ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                            : "border-[var(--border)] bg-[var(--surface)] text-transparent hover:border-[var(--primary)]/50"
                        }`}
                      >
                        ✓
                      </button>
                      <span
                        className={`min-w-0 flex-1 text-sm leading-snug ${
                          sub.completed_at ? "text-[var(--muted-foreground)] line-through" : "text-[var(--text)]"
                        }`}
                      >
                        {sub.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => void removeModalSubtask(sub.id)}
                        className="shrink-0 rounded p-1 text-[var(--muted-foreground)] opacity-0 transition-opacity hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] group-hover:opacity-100"
                        aria-label="Удалить подзадачу"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void addModalSubtask();
                      }
                    }}
                    placeholder="Новая подзадача…"
                    className="tt-input min-w-0 flex-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void addModalSubtask()}
                    className="shrink-0 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[var(--primary)]/25 hover:brightness-110"
                  >
                    Добавить
                  </button>
                </div>
              </div>
              <div className="mt-8 border-t border-[var(--border)] pt-5">
                <Link
                  href={appPath(`/board/${modalCard.id}`)}
                  className="text-sm font-medium text-[var(--primary)] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Время и этапы →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
