"use client";

import { useEffect, useState, useRef } from "react";
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
  if (d === null) return "bg-slate-100 text-slate-600 border border-slate-200";
  if (d <= 1) return "bg-red-500/90 text-white border-0";
  if (d <= 3) return "bg-amber-500/90 text-white border-0";
  return "bg-slate-100 text-slate-600 border border-slate-200";
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
  const [viewMode, setViewMode] = useState<"detailed" | "simple">("detailed");
  const [newName, setNewName] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [adding, setAdding] = useState(false);
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

  async function load() {
    setLoading(true);
    setError(null);
    const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_BASE_PATH || "") : "";
    try {
      const r = await fetch(`${base}/api/cards`);
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

  async function addProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_BASE_PATH || "") : "";
    try {
      const r = await fetch(`${base}/api/cards`, {
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
    const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_BASE_PATH || "") : "";
    try {
      const r = await fetch(`${base}/api/cards/${cardId}`, {
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
    const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_BASE_PATH || "") : "";
    try {
      const r = await fetch(`${base}/api/cards/${cardId}`, { method: "DELETE" });
      if (r.ok) setCards((prev) => prev.filter((c) => c.id !== cardId));
      if (modalCard?.id === cardId) setModalCard(null);
    } catch (err) {
      console.error(err);
    }
  }

  async function saveModalExtra() {
    if (!modalCard) return;
    setSavingExtra(true);
    const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_BASE_PATH || "") : "";
    const stageDeadline = modalExtra.stageDetails?.[modalCard.status]?.deadline ?? modalCard.deadline;
    try {
      const r = await fetch(`${base}/api/cards/${modalCard.id}`, {
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

  if (loading) return <div className="p-6">Загрузка…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  const byStatus = (status: PmStatusKey) => cards.filter((c) => c.status === status);
  const importanceOrder = (c: PmCard) => {
    const ex = parseExtra(c.extra);
    const o: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return o[ex.importance ?? ""] ?? 3;
  };
  const bySimpleGroup = (groupKey: (typeof SIMPLE_VIEW_GROUPS)[number]["key"]) => {
    let list: PmCard[];
    if (groupKey === "not_started") list = cards.filter((c) => c.status === "not_started");
    else if (groupKey === "done") list = cards.filter((c) => c.status === "done");
    else if (groupKey === "pause") list = cards.filter((c) => c.status === "pause");
    else list = cards.filter((c) => (WORK_STAGE_KEYS as readonly string[]).includes(c.status));
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
        className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm cursor-pointer group hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {importanceOpt && (
              <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mb-2 ${importanceOpt.className}`}>
                {importanceOpt.label}
              </span>
            )}
            <div className="font-semibold text-slate-800 text-sm leading-tight">{card.name}</div>
            {showStageLabel && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-xs font-medium">
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
            {assignees.length > 0 && (
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                {assignees.slice(0, 4).map((name, i) => {
                  const member = teamList.find((t) => t.name === name);
                  return (
                    <span
                      key={i}
                      className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-medium overflow-hidden flex-shrink-0"
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
                {assignees.length > 4 && <span className="text-[10px] text-slate-400">+{assignees.length - 4}</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openModal(card); }}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              title="Открыть карточку"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </button>
            <button
              type="button"
              onClick={(e) => deleteCardOnly(card.id, e)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
              title="Удалить из канбана"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V7m1 14h4" /></svg>
            </button>
          </div>
        </div>
        <select
          className="mt-2 w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50"
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
    <div className="min-h-screen bg-slate-50/80 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Канбан проектов</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Вид:</span>
          <button
            type="button"
            onClick={() => setViewMode("detailed")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${viewMode === "detailed" ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            Подробный
          </button>
          <button
            type="button"
            onClick={() => setViewMode("simple")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${viewMode === "simple" ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            Простой
          </button>
        </div>
      </div>

      <form onSubmit={addProject} className="mb-6 flex flex-wrap items-end gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Новый проект</label>
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Название проекта или клиента" className="w-64 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Дедлайн</label>
          <input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
        </div>
        <button type="submit" disabled={adding || !newName.trim()} className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50">
          {adding ? "Создание…" : "+ Добавить проект"}
        </button>
      </form>

      {viewMode === "detailed" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PM_STATUSES.map(({ key }) => (
            <div key={key} className="flex-shrink-0 w-72 rounded-xl bg-white/90 border border-slate-200 shadow-sm overflow-hidden" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, key)}>
              <div className="px-4 py-3 bg-slate-100/80 border-b border-slate-200 text-sm font-semibold text-slate-700 min-h-[3.5rem] flex items-center flex-wrap gap-2">
                {statusLabel(key)}
                <span className="text-slate-400 font-normal">({byStatus(key).length})</span>
              </div>
              <div className="p-3 min-h-[120px] space-y-3">
                {byStatus(key).map((card) => renderCard(card, false))}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === "simple" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {SIMPLE_VIEW_GROUPS.map(({ key, label }) => {
            const groupCards = bySimpleGroup(key);
            const isInProgress = key === "in_progress";
            return (
              <div
                key={key}
                className={`flex-shrink-0 w-72 rounded-xl overflow-hidden border shadow-sm ${isInProgress ? "bg-emerald-50/80 border-emerald-200" : "bg-white/90 border-slate-200"}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleSimpleDrop(e, key)}
              >
                <div className={`px-4 py-3 border-b text-sm font-semibold min-h-[3.5rem] flex items-center flex-wrap gap-2 ${isInProgress ? "bg-emerald-100/80 text-emerald-900 border-emerald-200" : "bg-slate-100/80 text-slate-700 border-slate-200"}`}>
                  {label}
                  {isInProgress && <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-800">любой рабочий этап</span>}
                  <span className="text-slate-400 font-normal">({groupCards.length})</span>
                </div>
                <div className="p-3 min-h-[120px] space-y-3">
                  {groupCards.map((card) => renderCard(card, isInProgress))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalCard(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2">
              <input type="text" value={modalName} onChange={(e) => setModalName(e.target.value)} className="flex-1 text-lg font-semibold text-slate-800 border border-transparent hover:border-slate-300 rounded-lg px-3 py-2 focus:border-slate-500 focus:outline-none" placeholder="Название проекта или клиента" />
              <button type="button" onClick={() => setModalCard(null)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
              <div className="p-4 space-y-4 md:w-1/2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Тип проекта</label>
                  <select value={modalExtra.projectType ?? ""} onChange={(e) => setModalExtra((x) => ({ ...x, projectType: (e.target.value || undefined) as CardExtra["projectType"] }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="">—</option>
                    <option value="site">сайт</option>
                    <option value="presentation">презентация</option>
                    <option value="other">другое</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Объём (блоки/страницы или слайды)</label>
                  <input type="text" value={modalExtra.volume ?? ""} onChange={(e) => setModalExtra((x) => ({ ...x, volume: e.target.value || undefined }))} placeholder="Например: 5 блоков, 12 слайдов" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Тексты от копирайтера</label>
                  <select value={modalExtra.copywriterNeeded === true ? "yes" : modalExtra.copywriterNeeded === false ? "no" : ""} onChange={(e) => setModalExtra((x) => ({ ...x, copywriterNeeded: e.target.value === "yes" ? true : e.target.value === "no" ? false : undefined }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="">—</option>
                    <option value="yes">да</option>
                    <option value="no">нет</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Важность</label>
                  <select value={modalExtra.importance ?? ""} onChange={(e) => setModalExtra((x) => ({ ...x, importance: (e.target.value || undefined) as ImportanceKey }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="">—</option>
                    {IMPORTANCE_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ответственные</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(modalExtra.assignees ?? (modalExtra.assignee ? [modalExtra.assignee] : [])).map((name, i) => {
                      const member = teamList.find((t) => t.name === name);
                      return (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-800 text-sm">
                          <span className="w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center text-[10px] font-medium overflow-hidden flex-shrink-0">
                            {member?.avatar ? <img src={member.avatar} alt="" className="w-full h-full object-cover" /> : (name.trim() ? name.trim().charAt(0).toUpperCase() : "?")}
                          </span>
                          {name}
                          <button type="button" onClick={() => setModalExtra((x) => ({ ...x, assignees: (x.assignees ?? (x.assignee ? [x.assignee] : [])).filter((_, j) => j !== i) }))} className="text-slate-400 hover:text-red-600">×</button>
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newAssigneeInput} onChange={(e) => setNewAssigneeInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToTeamAndAssign(newAssigneeInput))} placeholder="Имя ответственного" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                    <button type="button" onClick={() => addToTeamAndAssign(newAssigneeInput)} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200">+ Добавить</button>
                  </div>
                  <input type="file" ref={avatarInputRef} accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f && editingAvatarForId) { const r = new FileReader(); r.onload = () => setTeamMemberAvatar(editingAvatarForId, r.result as string); r.readAsDataURL(f); } e.target.value = ""; }} />
                  {teamList.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-slate-500 block mb-1">Список ответственных (нажмите на аватар, чтобы загрузить фото):</span>
                      <div className="flex flex-wrap gap-2">
                        {teamList.map((t) => (
                          <div key={t.id} className="flex items-center gap-1.5">
                            <button type="button" onClick={() => { setEditingAvatarForId(t.id); setTimeout(() => avatarInputRef.current?.click(), 0); }} className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50 hover:border-slate-500 transition-colors" title="Загрузить аватар">
                              {t.avatar ? <img src={t.avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-slate-400 text-xs">+</span>}
                            </button>
                            <span className="text-xs text-slate-600">{t.name}</span>
                            {!(modalExtra.assignees ?? (modalExtra.assignee ? [modalExtra.assignee] : [])).includes(t.name) && (
                              <button type="button" onClick={() => setModalExtra((x) => ({ ...x, assignees: [...(x.assignees ?? (x.assignee ? [x.assignee] : [])), t.name] }))} className="text-xs text-sky-600 hover:underline">+ в карточку</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Общий дедлайн проекта</label>
                  <input type="date" value={modalExtra.projectDeadline ? modalExtra.projectDeadline.slice(0, 10) : ""} onChange={(e) => setModalExtra((x) => ({ ...x, projectDeadline: e.target.value || undefined }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Дедлайны и оценки по этапам</label>
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
                    className="mb-2 text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600"
                  >
                    Подставить часы по шаблону
                  </button>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {STAGES_FOR_ESTIMATES.map((key) => {
                      const label = PM_STATUSES.find((s) => s.key === key)?.label ?? key;
                      const sd = (modalExtra.stageDetails ?? {})[key] ?? {};
                      return (
                        <div key={key} className="grid grid-cols-[1fr_80px_70px] gap-2 items-center text-sm">
                          <span className="text-slate-600 truncate">{label}</span>
                          <input
                            type="date"
                            value={sd.deadline ? sd.deadline.slice(0, 10) : ""}
                            onChange={(e) => setModalExtra((x) => ({
                              ...x,
                              stageDetails: { ...(x.stageDetails ?? {}), [key]: { ...(x.stageDetails?.[key] ?? {}), deadline: e.target.value || undefined } },
                            }))}
                            className="px-2 py-1 border border-slate-200 rounded text-xs"
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
                            className="px-2 py-1 border border-slate-200 rounded text-xs"
                          />
                        </div>
                      );
                    })}
                  </div>
                  {(() => {
                    const total = STAGES_FOR_ESTIMATES.reduce((sum, key) => sum + ((modalExtra.stageDetails ?? {})[key]?.estimatedHours ?? 0), 0);
                    return total > 0 ? <div className="mt-2 pt-2 border-t border-slate-200 text-sm font-medium text-slate-700">Всего: {total} ч</div> : null;
                  })()}
                </div>
              </div>
              <div className="p-4 space-y-4 md:w-1/2 border-t md:border-t-0 md:border-l border-slate-200">
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Ссылка на Figma</label><input type="url" value={modalExtra.figmaLink ?? ""} onChange={(e) => setModalExtra((x) => ({ ...x, figmaLink: e.target.value || undefined }))} placeholder="https://..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Ссылка на ТЗ</label><input type="url" value={modalExtra.tzLink ?? ""} onChange={(e) => setModalExtra((x) => ({ ...x, tzLink: e.target.value || undefined }))} placeholder="https://..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Доступы к Tilda</label><input type="text" value={modalExtra.tildaAccess ?? ""} onChange={(e) => setModalExtra((x) => ({ ...x, tildaAccess: e.target.value || undefined }))} placeholder="Логин, пароль..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Пожелания</label><textarea value={modalExtra.wishes ?? ""} onChange={(e) => setModalExtra((x) => ({ ...x, wishes: e.target.value || undefined }))} placeholder="Пожелания клиента" rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Пояснения</label><textarea value={modalExtra.explanations ?? ""} onChange={(e) => setModalExtra((x) => ({ ...x, explanations: e.target.value || undefined }))} placeholder="Пояснения по проекту" rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Другие ссылки</label><textarea value={modalExtra.otherLinks ?? ""} onChange={(e) => setModalExtra((x) => ({ ...x, otherLinks: e.target.value || undefined }))} placeholder="По одной на строку" rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setModalCard(null)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Закрыть</button>
              <button type="button" onClick={saveModalExtra} disabled={savingExtra} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50">{savingExtra ? "Сохранение…" : "Сохранить"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
