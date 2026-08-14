"use client";

import { apiUrl } from "@/lib/api-url";
import { formatDate } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

type ProfiItem = {
  id: string;
  createdAt: string;
  cost: number;
  refundAmount: number;
  status: string;
  projectAmount: number | null;
  notes: string | null;
  updatedAt: string;
};

const STATUS_OPTIONS = [
  { value: "response", label: "Отклик" },
  { value: "viewed", label: "Просмотрено" },
  { value: "conversation", label: "Переписка" },
  { value: "proposal", label: "КП" },
  { value: "paid", label: "Оплачено" },
  { value: "refunded", label: "Возврат" },
  { value: "drain", label: "Слив" },
] as const;

const API = "/api/v2/agency/profi-responses";

function rowAccent(status: string): string {
  switch (status) {
    case "response":
      return "border-l-amber-400 bg-amber-50/70";
    case "viewed":
      return "border-l-emerald-400 bg-emerald-50/50";
    case "conversation":
      return "border-l-emerald-500 bg-emerald-50/80";
    case "proposal":
      return "border-l-sky-400 bg-sky-50/70";
    case "paid":
      return "border-l-emerald-500 bg-emerald-50/90";
    case "refunded":
      return "border-l-[var(--v2-ink-300)] bg-[var(--v2-ink-50)]";
    case "drain":
      return "border-l-red-300 bg-red-50/50";
    default:
      return "border-l-transparent";
  }
}

export function ProfiResponsesPanel() {
  const [items, setItems] = useState<ProfiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickCost, setQuickCost] = useState("");
  const [quickNotes, setQuickNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editProjectAmount, setEditProjectAmount] = useState("");
  const [editRefundAmount, setEditRefundAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(API), { credentials: "include" });
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
      else if (Array.isArray(data.items)) setItems(data.items);
      else setItems([]);
      setError(null);
    } catch (e) {
      console.error(e);
      setError("Не удалось загрузить отклики");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    const cost = parseFloat(quickCost.replace(",", "."));
    if (isNaN(cost) || cost < 0) return;
    setAdding(true);
    try {
      const res = await fetch(apiUrl(API), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cost, notes: quickNotes || undefined }),
      });
      const json = await res.json();
      if (json.success && json.item) {
        setItems((prev) => [json.item, ...prev]);
        setQuickCost("");
        setQuickNotes("");
        void fetchItems();
      } else {
        setError(json.error || "Не удалось добавить");
      }
    } catch (err) {
      console.error(err);
      setError("Не удалось добавить");
    } finally {
      setAdding(false);
    }
  }

  async function handleStatusChange(
    id: string,
    status: string,
    payload?: { refundAmount?: number; projectAmount?: number }
  ) {
    try {
      const res = await fetch(apiUrl(`${API}/${id}`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(payload?.refundAmount != null && { refundAmount: payload.refundAmount }),
          ...(payload?.projectAmount != null && { projectAmount: payload.projectAmount }),
        }),
      });
      const json = await res.json();
      if (json.success && json.item) {
        setItems((prev) => prev.map((r) => (r.id === id ? json.item : r)));
        void fetchItems();
      }
    } catch (err) {
      console.error(err);
    }
  }

  function openEdit(item: ProfiItem) {
    setEditingId(item.id);
    setEditRefundAmount(
      item.refundAmount ? String(item.refundAmount) : item.status === "refunded" ? String(item.cost) : ""
    );
    setEditProjectAmount(item.projectAmount != null ? String(item.projectAmount) : "");
  }

  async function saveEdit() {
    if (!editingId) return;
    const item = items.find((r) => r.id === editingId);
    if (!item) return;
    const refundNum = editRefundAmount ? parseFloat(editRefundAmount.replace(",", ".")) : 0;
    const projectNum = editProjectAmount ? parseFloat(editProjectAmount.replace(",", ".")) : undefined;
    await handleStatusChange(item.id, item.status, {
      refundAmount: item.status === "refunded" ? refundNum : undefined,
      projectAmount: item.status === "paid" ? (projectNum ?? 0) : undefined,
    });
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить этот отклик?")) return;
    try {
      const res = await fetch(apiUrl(`${API}/${id}`), { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert(data.error || "Ошибка удаления");
      }
    } catch (err) {
      console.error(err);
      alert("Ошибка удаления");
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-[13.5px] text-[var(--v2-ink-500)]">Загрузка…</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="v2-tight text-[17px] font-semibold text-[var(--v2-ink-900)]">Profi.ru — отклики</h2>
        <p className="v2-tight mt-1 text-[13px] text-[var(--v2-ink-500)]">
          Быстрый ввод откликов. Конверсии и экономика — во вкладке «Profi · аналитика».
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">{error}</div>
      ) : null}

      <div className="rounded-2xl border border-[var(--v2-ink-100)] bg-white p-4 shadow-[var(--v2-shadow-card)]">
        <h3 className="v2-tight mb-3 text-[14px] font-semibold text-[var(--v2-ink-900)]">Добавить отклик</h3>
        <form onSubmit={handleQuickAdd} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--v2-ink-500)]">
              Стоимость ₽
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={quickCost}
              onChange={(e) => setQuickCost(e.target.value)}
              placeholder="0"
              className="v2-tnum h-10 w-28 rounded-xl border border-[var(--v2-ink-100)] bg-white px-3 text-[13.5px] text-[var(--v2-ink-900)] outline-none focus:ring-2 focus:ring-[var(--v2-brand-500)]/30"
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--v2-ink-500)]">
              Заметка
            </label>
            <input
              type="text"
              value={quickNotes}
              onChange={(e) => setQuickNotes(e.target.value)}
              placeholder="Кратко о заявке"
              className="h-10 w-full rounded-xl border border-[var(--v2-ink-100)] bg-white px-3 text-[13.5px] text-[var(--v2-ink-900)] outline-none focus:ring-2 focus:ring-[var(--v2-brand-500)]/30"
            />
          </div>
          <button
            type="submit"
            disabled={adding || !quickCost.trim()}
            className="inline-flex h-10 items-center rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-medium text-white transition hover:bg-[var(--v2-ink-800)] disabled:opacity-50"
          >
            {adding ? "…" : "Добавить"}
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--v2-ink-100)] bg-white shadow-[var(--v2-shadow-card)]">
        <div className="border-b border-[var(--v2-ink-100)] px-4 py-3">
          <h3 className="v2-tight text-[14px] font-semibold text-[var(--v2-ink-900)]">
            Отклики <span className="v2-tnum font-medium text-[var(--v2-ink-400)]">{items.length}</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--v2-ink-100)] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--v2-ink-400)]">
                <th className="px-4 py-3">Дата</th>
                <th className="px-4 py-3">Стоимость</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Возврат</th>
                <th className="px-4 py-3">Сумма проекта</th>
                <th className="px-4 py-3">Заметка</th>
                <th className="w-24 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[var(--v2-ink-500)]">
                    Нет откликов. Добавьте первый выше.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className={`border-b border-[var(--v2-ink-100)] border-l-4 ${rowAccent(item.status)}`}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[var(--v2-ink-800)]">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="v2-tnum whitespace-nowrap px-4 py-2.5 font-medium text-[var(--v2-ink-900)]">
                      {item.cost.toLocaleString("ru-RU")} ₽
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={item.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          if (newStatus === "refunded") {
                            await handleStatusChange(item.id, newStatus, { refundAmount: item.cost });
                          } else if (newStatus === "paid" && item.projectAmount == null) {
                            openEdit(item);
                            await handleStatusChange(item.id, newStatus);
                          } else {
                            await handleStatusChange(item.id, newStatus);
                          }
                        }}
                        className="h-8 min-w-[120px] rounded-lg border border-[var(--v2-ink-100)] bg-white px-2 text-[12.5px] text-[var(--v2-ink-800)] outline-none focus:ring-2 focus:ring-[var(--v2-brand-500)]/30"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      {editingId === item.id && item.status === "refunded" ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editRefundAmount}
                          onChange={(e) => setEditRefundAmount(e.target.value)}
                          onBlur={() => void saveEdit()}
                          className="v2-tnum h-8 w-24 rounded-lg border border-[var(--v2-ink-100)] px-2 text-[12.5px]"
                        />
                      ) : item.status === "refunded" ? (
                        <span className="v2-tnum text-emerald-700">{item.refundAmount.toLocaleString("ru-RU")} ₽</span>
                      ) : (
                        <span className="text-[var(--v2-ink-400)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {editingId === item.id && item.status === "paid" ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editProjectAmount}
                          onChange={(e) => setEditProjectAmount(e.target.value)}
                          onBlur={() => void saveEdit()}
                          className="v2-tnum h-8 w-28 rounded-lg border border-[var(--v2-ink-100)] px-2 text-[12.5px]"
                        />
                      ) : item.status === "paid" && item.projectAmount != null ? (
                        <span className="v2-tnum font-medium text-[var(--v2-brand-700)]">
                          {item.projectAmount.toLocaleString("ru-RU")} ₽
                        </span>
                      ) : item.status === "paid" ? (
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="text-[12px] font-medium text-[var(--v2-brand-600)]"
                        >
                          Указать сумму
                        </button>
                      ) : (
                        <span className="text-[var(--v2-ink-400)]">—</span>
                      )}
                    </td>
                    <td
                      className="max-w-[180px] truncate px-4 py-2.5 text-[var(--v2-ink-500)]"
                      title={item.notes || ""}
                    >
                      {item.notes || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        {item.status === "refunded" || item.status === "paid" ? (
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="text-[12px] font-medium text-[var(--v2-ink-500)] hover:text-[var(--v2-ink-800)]"
                          >
                            Изменить
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void handleDelete(item.id)}
                          className="text-[12px] font-medium text-red-600 hover:text-red-800"
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
