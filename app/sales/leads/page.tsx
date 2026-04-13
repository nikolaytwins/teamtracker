"use client";

import { apiUrl } from "@/lib/api-url";
import { useCallback, useEffect, useState } from "react";
import InlineSelect from "@/components/InlineSelect";
import Link from "next/link";

interface Lead {
  id: string;
  contact: string;
  source: string;
  taskDescription: string | null;
  status: string;
  isRecurring?: number | boolean;
  archived?: number | boolean;
  nextContactDate?: string | null;
  manualDateSet?: number | boolean;
  linkedProjectId?: string | null;
  linkedProjectName?: string | null;
  linkedCardId?: string | null;
}

const STATUS_OPTIONS = [
  { value: "new", label: "Новые" },
  { value: "contact_established", label: "Контакт установлен" },
  { value: "commercial_proposal", label: "Коммерческое предложение" },
  { value: "thinking", label: "Думает / изучает" },
  { value: "paid", label: "Оплачен" },
  { value: "pause", label: "Пауза" },
  { value: "lost", label: "Слив" },
];

/** Колонку «Новые» не показываем — такие лиды видны в первой колонке. */
const STATUS_COLUMNS = [
  "contact_established",
  "commercial_proposal",
  "thinking",
  "paid",
  "pause",
  "lost",
];

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isReminderToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

export default function SalesLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const [newSource, setNewSource] = useState("");
  const [showCustomSource, setShowCustomSource] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [editContact, setEditContact] = useState("");
  const [editSource, setEditSource] = useState("");
  const [editTask, setEditTask] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editNextDate, setEditNextDate] = useState("");
  const [editRecurring, setEditRecurring] = useState(false);
  const [editOnBoard, setEditOnBoard] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchLeads = useCallback(async () => {
    try {
      const q = showArchived ? "?includeArchived=1" : "";
      const res = await fetch(apiUrl(`/api/agency/leads${q}`));
      if (!res.ok) {
        setLeads([]);
        setSources([]);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setLeads(data);
        const uniqueSources = Array.from(
          new Set(data.map((l: Lead) => l.source).filter(Boolean))
        ) as string[];
        setSources(uniqueSources.sort());
      } else {
        setLeads([]);
        setSources([]);
      }
    } catch {
      setLeads([]);
      setSources([]);
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    if (!editing) return;
    setEditContact(editing.contact);
    setEditSource(editing.source);
    setEditTask(editing.taskDescription ?? "");
    setEditStatus(editing.status);
    setEditNextDate(toDateInputValue(editing.nextContactDate ?? undefined));
    setEditRecurring(Boolean(editing.isRecurring));
    setEditOnBoard(!Boolean(Number(editing.archived ?? 0)));
  }, [editing]);

  const handleAddLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const contact = formData.get("contact") as string;
    const taskDescription = formData.get("taskDescription") as string;
    const finalSource = showCustomSource ? newSource : (formData.get("source") as string);

    if (!contact || !finalSource) {
      alert("Пожалуйста, заполните обязательные поля (Контакт и Источник)");
      return;
    }

    try {
      const res = await fetch(apiUrl("/api/agency/leads"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact,
          source: finalSource.trim(),
          taskDescription: taskDescription || null,
          status: "new",
          isRecurring: formData.get("isRecurring") === "on",
        }),
      });

      const raw = await res.text();
      let data: { success?: boolean; lead?: unknown; error?: string; code?: string } = {};
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        alert(
          res.ok
            ? "Сервер вернул не JSON. Обновите страницу и попробуйте снова."
            : `Ошибка ${res.status}: ${raw.slice(0, 200)}`
        );
        return;
      }

      const created = res.ok && (data.success === true || data.lead != null);
      if (created) {
        try {
          form.reset();
        } catch {
          /* после await currentTarget формы может быть невалиден в части окружений */
        }
        setNewSource("");
        setShowCustomSource(false);
        setShowAddForm(false);
        await fetchLeads();
        return;
      }

      const hint =
        res.status === 401
          ? "Сессия истекла — войдите снова."
          : res.status === 403
            ? "Нет доступа (нужна роль администратора для API агентства)."
            : "";
      alert(
        [data.error || `Запрос не удался (${res.status})`, data.code ? `код: ${data.code}` : "", hint]
          .filter(Boolean)
          .join("\n")
      );
    } catch (err) {
      console.error("handleAddLead", err);
      alert(
        "Запрос прервался на стороне браузера (часто это сбой после успешного сохранения). Обновите страницу: лид мог уже создаться."
      );
    }
  };

  const handleToggleRecurring = async (lead: Lead) => {
    const next = !lead.isRecurring;
    try {
      const res = await fetch(apiUrl(`/api/agency/leads/${lead.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRecurring: next }),
      });
      if (res.ok) await fetchLeads();
    } catch (error) {
      console.error("Error updating recurring flag:", error);
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    try {
      const res = await fetch(apiUrl(`/api/agency/leads/${leadId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) await fetchLeads();
    } catch (error) {
      console.error("Error updating lead status:", error);
    }
  };

  const handleDeleteLead = async (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Удалить лида?")) return;
    try {
      const res = await fetch(apiUrl(`/api/agency/leads/${leadId}`), { method: "DELETE" });
      if (res.ok) await fetchLeads();
    } catch (error) {
      console.error("Error deleting lead:", error);
    }
  };

  const handleConvertToProject = async (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(apiUrl(`/api/agency/leads/${leadId}/convert`), {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Не удалось создать проект");
        return;
      }
      await fetchLeads();
    } catch {
      alert("Не удалось создать проект");
    }
  };

  async function saveEditModal() {
    if (!editing) return;
    setSavingEdit(true);
    try {
      const nextContactDate = editNextDate.trim()
        ? new Date(`${editNextDate.trim()}T12:00:00`).toISOString()
        : null;
      const res = await fetch(apiUrl(`/api/agency/leads/${editing.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: editContact.trim(),
          source: editSource.trim(),
          taskDescription: editTask.trim() || null,
          status: editStatus,
          nextContactDate,
          isRecurring: editRecurring,
          archived: !editOnBoard,
        }),
      });
      if (res.ok) {
        setEditing(null);
        await fetchLeads();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Не удалось сохранить");
      }
    } catch {
      alert("Не удалось сохранить");
    } finally {
      setSavingEdit(false);
    }
  }

  const leadsByStatus = STATUS_COLUMNS.reduce(
    (acc, status) => {
      if (status === "contact_established") {
        acc[status] = leads
          .filter((l) => l.status === "new" || l.status === "contact_established")
          .sort((a, b) => {
            if (a.status === "new" && b.status !== "new") return -1;
            if (a.status !== "new" && b.status === "new") return 1;
            return 0;
          });
      } else {
        acc[status] = leads.filter((l) => l.status === status);
      }
      return acc;
    },
    {} as Record<string, Lead[]>
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-[var(--muted-foreground)]">Загрузка...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Лиды</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Новые лиды на канбане. Старые записи скрыты в архиве — включите «Архив», чтобы найти и вернуть на доску.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => {
                setLoading(true);
                setShowArchived(e.target.checked);
              }}
              className="rounded border-[var(--border)]"
            />
            Показать архив
          </label>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:brightness-110"
          >
            + Новый лид
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="mb-6 rounded-2xl bg-[var(--surface)] p-4 shadow-[var(--shadow-kanban-card)] dark:ring-0">
          <form onSubmit={handleAddLead}>
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text)]">Описание задачи *</label>
                <input
                  type="text"
                  name="taskDescription"
                  required
                  className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  placeholder="Краткое описание задачи..."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text)]">Контакт *</label>
                <input
                  type="text"
                  name="contact"
                  required
                  className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                  placeholder="Имя, телефон, email..."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text)]">Источник *</label>
                {!showCustomSource ? (
                  <select
                    name="source"
                    className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setShowCustomSource(true);
                        setNewSource("");
                      }
                    }}
                    required
                  >
                    <option value="">Выберите...</option>
                    {sources.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value="__custom__">+ Добавить свой</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSource}
                      onChange={(e) => setNewSource(e.target.value)}
                      placeholder="Новый источник"
                      className="flex-1 rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomSource(false);
                        setNewSource("");
                      }}
                      className="px-3 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--text)]"
                    >
                      Отмена
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="mb-4">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--text)]">
                <input type="checkbox" name="isRecurring" className="rounded border-[var(--border)]" />
                Постоянник (повторное обращение)
              </label>
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:brightness-110"
              >
                Создать
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewSource("");
                  setShowCustomSource(false);
                }}
                className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4">
          {STATUS_COLUMNS.map((status) => {
            const statusLabel = STATUS_OPTIONS.find((o) => o.value === status)?.label || status;
            const columnLeads = leadsByStatus[status] || [];
            const titleExtra =
              status === "contact_established" ? (
                <span className="mt-0.5 block text-xs font-normal text-[var(--muted-foreground)]">
                  Включая лиды со статусом «Новые»
                </span>
              ) : null;

            return (
              <div
                key={status}
                className="w-80 shrink-0 rounded-2xl bg-[var(--surface)]/90 p-3 shadow-[var(--shadow-kanban-column)] ring-1 ring-[var(--border)]/20 dark:bg-[var(--surface)]/55 dark:ring-0"
              >
                <h3 className="mb-3 border-b border-[var(--border)]/45 pb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] dark:border-white/[0.06]">
                  <span className="flex items-center gap-2 normal-case tracking-normal">
                    <span className="text-sm font-semibold text-[var(--text)]">{statusLabel}</span>
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold tabular-nums dark:bg-white/[0.06]">
                      {columnLeads.length}
                    </span>
                  </span>
                  {titleExtra}
                </h3>
                <div className="min-h-[120px] space-y-3">
                  {columnLeads.map((lead) => {
                    const todayReminder = isReminderToday(lead.nextContactDate ?? undefined);
                    const archivedLead = Boolean(Number(lead.archived ?? 0));
                    return (
                      <div
                        key={lead.id}
                        id={`lead-${lead.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setEditing(lead)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setEditing(lead);
                          }
                        }}
                        className={`cursor-pointer rounded-2xl bg-[var(--surface)] p-3.5 shadow-[var(--shadow-kanban-card)] transition-[box-shadow] hover:shadow-[var(--shadow-kanban-card-hover)] dark:bg-[var(--surface)] ${
                          todayReminder
                            ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-[var(--bg)] dark:ring-amber-400 dark:ring-offset-0 dark:shadow-[0_0_0_1px_rgb(251_191_36/0.5),0_0_28px_rgb(245_158_11/0.35)]"
                            : ""
                        } ${archivedLead ? "opacity-75" : ""}`}
                      >
                        {todayReminder ? (
                          <div className="mb-2 rounded-lg bg-amber-500 px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
                            Напоминание сегодня
                          </div>
                        ) : null}
                        {archivedLead ? (
                          <div className="mb-2 rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-center text-[10px] font-semibold text-[var(--muted-foreground)]">
                            В архиве
                          </div>
                        ) : null}
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--text)]">
                          <span>{lead.taskDescription || "Без описания"}</span>
                          {lead.status === "new" ? (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
                              Новый
                            </span>
                          ) : null}
                        </div>
                        <div className="mb-1 text-xs text-[var(--text)]">
                          <span className="font-medium">Контакт:</span> {lead.contact}
                        </div>
                        <div className="mb-2 text-xs text-[var(--muted-foreground)]">
                          <span className="font-medium">Источник:</span> {lead.source}
                        </div>
                        {lead.nextContactDate ? (
                          <div className="mb-2 text-xs text-[var(--muted-foreground)]">
                            <span className="font-medium text-[var(--text)]">Напоминание:</span>{" "}
                            {new Date(lead.nextContactDate).toLocaleDateString("ru-RU")}
                          </div>
                        ) : null}
                        <label
                          className="mb-3 flex cursor-pointer items-center gap-2 text-xs text-[var(--text)]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(lead.isRecurring)}
                            onChange={(e) => {
                              e.stopPropagation();
                              void handleToggleRecurring(lead);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-[var(--border)]"
                          />
                          Постоянник
                        </label>
                        {lead.linkedProjectId ? (
                          <div
                            className="mb-3 rounded-xl bg-[var(--primary-soft)]/80 p-2.5 text-xs dark:bg-[var(--primary-soft)]/25"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="mb-1 font-medium text-[var(--text)]">Связанный проект</div>
                            <div className="flex flex-wrap gap-2">
                              <Link
                                href={`/agency/projects/${lead.linkedProjectId}`}
                                className="text-[var(--primary)] hover:underline"
                              >
                                Проект
                              </Link>
                              {lead.linkedCardId ? (
                                <Link href={`/board/${lead.linkedCardId}`} className="text-[var(--primary)] hover:underline">
                                  Карточка
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => void handleConvertToProject(lead.id, e)}
                            className="mb-3 w-full rounded-xl bg-[var(--primary-soft)] px-2 py-2 text-xs font-medium text-[var(--primary)] hover:brightness-95 dark:hover:brightness-110"
                          >
                            Создать проект из лида
                          </button>
                        )}
                        <div
                          className="flex items-center justify-between border-t border-[var(--border)]/45 pt-3 dark:border-white/[0.06]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <InlineSelect
                            value={lead.status}
                            options={STATUS_OPTIONS}
                            onChange={(value) => handleUpdateStatus(lead.id, value)}
                            className="text-xs"
                          />
                          <button
                            type="button"
                            onClick={(e) => handleDeleteLead(lead.id, e)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {columnLeads.length === 0 && (
                    <div className="py-6 text-center text-sm text-[var(--muted-foreground)]">Нет лидов</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editing ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="presentation"
          onClick={() => setEditing(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-elevated)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold text-[var(--text)]">Редактирование лида</h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">Контакт</label>
                <input
                  type="text"
                  value={editContact}
                  onChange={(e) => setEditContact(e.target.value)}
                  className="tt-input w-full text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">Источник</label>
                <input
                  type="text"
                  value={editSource}
                  onChange={(e) => setEditSource(e.target.value)}
                  className="tt-input w-full text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">Описание задачи</label>
                <input
                  type="text"
                  value={editTask}
                  onChange={(e) => setEditTask(e.target.value)}
                  className="tt-input w-full text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">Статус</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="tt-select w-full text-sm"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">
                  Дата следующего напоминания
                </label>
                <input
                  type="date"
                  value={editNextDate}
                  onChange={(e) => setEditNextDate(e.target.value)}
                  className="tt-input w-full text-sm"
                />
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  Если дата — сегодня, карточка на канбане подсвечивается.
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={editRecurring}
                  onChange={(e) => setEditRecurring(e.target.checked)}
                  className="rounded border-[var(--border)]"
                />
                Постоянник
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={editOnBoard}
                  onChange={(e) => setEditOnBoard(e.target.checked)}
                  className="rounded border-[var(--border)]"
                />
                Показывать на канбане (снять флажок — в архив)
              </label>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={savingEdit || !editContact.trim() || !editSource.trim()}
                onClick={() => void saveEditModal()}
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[var(--primary)]/25 hover:brightness-110 disabled:opacity-50"
              >
                {savingEdit ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
