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
];

/** Колонку «Новые» не показываем — такие лиды видны в первой колонке. */
const STATUS_COLUMNS = [
  "contact_established",
  "commercial_proposal",
  "thinking",
  "paid",
  "pause",
];

export default function SalesLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const [newSource, setNewSource] = useState("");
  const [showCustomSource, setShowCustomSource] = useState(false);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/agency/leads"));
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
  }, []);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  const handleAddLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact,
          source: finalSource,
          taskDescription: taskDescription || null,
          status: "new",
          isRecurring: formData.get("isRecurring") === "on",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setShowAddForm(false);
          e.currentTarget.reset();
          setNewSource("");
          setShowCustomSource(false);
          await fetchLeads();
        } else {
          alert(data.error || "Ошибка при создании лида");
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || "Ошибка при создании лида");
      }
    } catch {
      alert("Ошибка при создании лида");
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

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm("Удалить лида?")) return;
    try {
      const res = await fetch(apiUrl(`/api/agency/leads/${leadId}`), { method: "DELETE" });
      if (res.ok) await fetchLeads();
    } catch (error) {
      console.error("Error deleting lead:", error);
    }
  };

  const handleConvertToProject = async (leadId: string) => {
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
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--muted-foreground)]">Загрузка...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Лиды</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Канбан по статусам. Аналитика — вкладка «Аналитика».</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-md hover:brightness-110"
        >
          + Новый лид
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)] shadow-[var(--shadow-card)]">
          <form onSubmit={handleAddLead}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Описание задачи *</label>
                <input
                  type="text"
                  name="taskDescription"
                  required
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm"
                  placeholder="Краткое описание задачи..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Контакт *</label>
                <input
                  type="text"
                  name="contact"
                  required
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm"
                  placeholder="Имя, телефон, email..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Источник *</label>
                {!showCustomSource ? (
                  <select
                    name="source"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm"
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
                      className="flex-1 px-3 py-2 border border-[var(--border)] rounded-md text-sm"
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
              <label className="inline-flex items-center gap-2 text-sm text-[var(--text)] cursor-pointer">
                <input type="checkbox" name="isRecurring" className="rounded border-[var(--border)]" />
                Постоянник (повторное обращение)
              </label>
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-md hover:brightness-110"
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
                className="px-4 py-2 border border-[var(--border)] text-[var(--text)] text-sm font-medium rounded-md hover:bg-[var(--surface-2)]"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-max">
          {STATUS_COLUMNS.map((status) => {
            const statusLabel = STATUS_OPTIONS.find((o) => o.value === status)?.label || status;
            const columnLeads = leadsByStatus[status] || [];
            const titleExtra =
              status === "contact_established" ? (
                <span className="block text-xs font-normal text-[var(--muted-foreground)] mt-0.5">
                  Включая лиды со статусом «Новые»
                </span>
              ) : null;

            return (
              <div
                key={status}
                className="flex-shrink-0 w-80 bg-[var(--surface-2)]/80 rounded-xl p-4 border border-[var(--border)]"
              >
                <h3 className="font-semibold text-[var(--text)] mb-3 text-sm">
                  <span className="block">
                    {statusLabel}{" "}
                    <span className="text-[var(--muted-foreground)] font-normal">({columnLeads.length})</span>
                  </span>
                  {titleExtra}
                </h3>
                <div className="space-y-3 min-h-[120px]">
                  {columnLeads.map((lead) => (
                    <div
                      key={lead.id}
                      id={`lead-${lead.id}`}
                      className="bg-[var(--surface)] rounded-lg p-3 shadow-[var(--shadow-card)] border border-[var(--border)] hover:shadow-md transition-shadow"
                    >
                      <div className="text-sm font-semibold text-[var(--text)] mb-2 flex flex-wrap items-center gap-2">
                        <span>{lead.taskDescription || "Без описания"}</span>
                        {lead.status === "new" ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            Новый
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-[var(--text)] mb-1">
                        <span className="font-medium">Контакт:</span> {lead.contact}
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)] mb-2">
                        <span className="font-medium">Источник:</span> {lead.source}
                      </div>
                      <label className="flex items-center gap-2 text-xs text-[var(--text)] mb-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(lead.isRecurring)}
                          onChange={() => void handleToggleRecurring(lead)}
                          className="rounded border-[var(--border)]"
                        />
                        Постоянник
                      </label>
                      {lead.linkedProjectId ? (
                        <div className="mb-3 rounded-md border border-[var(--primary)]/15 bg-[var(--primary-soft)] p-2 text-xs">
                          <div className="text-[var(--text)] font-medium mb-1">Связанный проект</div>
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
                          onClick={() => void handleConvertToProject(lead.id)}
                          className="mb-3 w-full rounded-md border border-[var(--primary)]/25 bg-[var(--primary-soft)] px-2 py-1.5 text-xs font-medium text-[var(--primary)] hover:brightness-95 dark:hover:brightness-110"
                        >
                          Создать проект из лида
                        </button>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                        <InlineSelect
                          value={lead.status}
                          options={STATUS_OPTIONS}
                          onChange={(value) => handleUpdateStatus(lead.id, value)}
                          className="text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteLead(lead.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                  {columnLeads.length === 0 && (
                    <div className="text-sm text-[var(--muted-foreground)] text-center py-6">Нет лидов</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
