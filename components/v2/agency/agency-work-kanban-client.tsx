"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  AGENCY_WORK_STATUSES,
  type AgencyKanbanCard,
  type AgencyWorkStatus,
} from "@/lib/v2/agency/work-kanban-types";
import { FINANCE_BUSINESS_LINE_META, FINANCE_STATUS_META } from "@/lib/v2/finance/meta";
import { formatPersonalRub } from "@/lib/v2/personal/formatters";
import { V2Icons } from "@/components/v2/ui/icons";
import { appPath } from "@/lib/api-url";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

function KanbanCard({
  card,
  dragging,
  onDragStart,
  onDragEnd,
  onDelete,
}: {
  card: AgencyKanbanCard;
  dragging: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDelete?: () => void;
}) {
  const payment =
    card.payment_status && card.kind === "finance"
      ? FINANCE_STATUS_META[card.payment_status]
      : null;
  const line =
    card.business_line && card.kind === "finance"
      ? FINANCE_BUSINESS_LINE_META[card.business_line]
      : null;

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="v2-tight text-[13.5px] font-semibold leading-snug text-[var(--v2-ink-900)]">
          {card.title}
        </p>
        {card.kind === "internal" ? (
          <span className="shrink-0 rounded-md bg-[var(--v2-ink-100)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--v2-ink-500)]">
            внутр.
          </span>
        ) : null}
      </div>

      {card.kind === "finance" ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {line ? (
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ background: line.bg, color: line.tint }}
            >
              {line.label}
            </span>
          ) : null}
          {payment ? (
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ background: `${payment.tint}18`, color: payment.tint }}
            >
              {payment.label}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2.5 flex items-end justify-between gap-2">
        <div className="min-w-0">
          {card.kind === "finance" && card.total_amount != null ? (
            <p className="v2-tnum text-[13px] font-semibold text-[var(--v2-ink-800)]">
              {formatPersonalRub(card.total_amount)}
            </p>
          ) : card.note ? (
            <p className="v2-tight line-clamp-2 text-[11.5px] text-[var(--v2-ink-500)]">{card.note}</p>
          ) : (
            <p className="text-[11px] text-[var(--v2-ink-400)]">Без финансов</p>
          )}
        </div>
        {card.kind === "internal" && onDelete ? (
          <button
            type="button"
            title="Удалить"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--v2-ink-300)] opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
          >
            <V2Icons.trash className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </>
  );

  const className = `group block w-full rounded-xl border border-[var(--v2-ink-100)] bg-white p-3 text-left shadow-[var(--v2-shadow-card)] transition hover:border-[var(--v2-brand-200)] hover:shadow-[var(--v2-shadow-cardHv)] ${
    dragging ? "opacity-40" : ""
  }`;

  if (card.kind === "finance" && card.finance_project_id) {
    return (
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", card.id);
          onDragStart(card.id);
        }}
        onDragEnd={onDragEnd}
      >
        <Link href={appPath(`/v2/agency/projects/${card.finance_project_id}`)} className={className}>
          {inner}
        </Link>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", card.id);
        onDragStart(card.id);
      }}
      onDragEnd={onDragEnd}
      className={className}
    >
      {inner}
    </div>
  );
}

export function AgencyWorkKanbanClient() {
  const [cards, setCards] = useState<AgencyKanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropStatus, setDropStatus] = useState<AgencyWorkStatus | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addStatus, setAddStatus] = useState<AgencyWorkStatus>("not_started");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [includeInFinance, setIncludeInFinance] = useState(true);
  const [businessLine, setBusinessLine] = useState<"agency" | "impulse" | "qmagic">("agency");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<{ cards: AgencyKanbanCard[] }>("/api/v2/agency/kanban");
      setCards(data.cards);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить канбан");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(
      AGENCY_WORK_STATUSES.map((s) => [s.key, [] as AgencyKanbanCard[]])
    ) as Record<AgencyWorkStatus, AgencyKanbanCard[]>;
    for (const card of cards) {
      map[card.work_status]?.push(card);
    }
    for (const key of Object.keys(map) as AgencyWorkStatus[]) {
      map[key].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, "ru"));
    }
    return map;
  }, [cards]);

  async function moveCard(id: string, status: AgencyWorkStatus) {
    const current = cards.find((c) => c.id === id);
    if (!current || current.work_status === status) return;

    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, work_status: status } : c))
    );
    try {
      await fetchJson(`/api/v2/agency/kanban/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workStatus: status, move: true }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось переместить");
      await load();
    }
  }

  function openAdd(status: AgencyWorkStatus) {
    setAddStatus(status);
    setTitle("");
    setNote("");
    setTotalAmount("");
    setIncludeInFinance(true);
    setBusinessLine("agency");
    setAddOpen(true);
  }

  async function submitAdd() {
    const t = title.trim();
    if (!t || saving) return;
    setSaving(true);
    setError(null);
    try {
      const { card } = await fetchJson<{ card: AgencyKanbanCard }>("/api/v2/agency/kanban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          workStatus: addStatus,
          note: note.trim() || null,
          includeInFinance,
          totalAmount: includeInFinance ? Number(totalAmount) || 0 : 0,
          businessLine,
        }),
      });
      setCards((prev) => [...prev, card]);
      setAddOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить");
    } finally {
      setSaving(false);
    }
  }

  async function deleteInternal(id: string) {
    if (!confirm("Удалить внутреннюю карточку?")) return;
    try {
      await fetchJson(`/api/v2/agency/kanban/${encodeURIComponent(id)}`, { method: "DELETE" });
      setCards((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить");
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-3 border-b border-[var(--v2-ink-100)] bg-white px-6 py-4">
        <div>
          <h1 className="v2-tighter text-[22px] font-bold text-[var(--v2-ink-900)]">Канбан проектов</h1>
          <p className="mt-0.5 text-[13px] text-[var(--v2-ink-500)]">
            Проекты из «Проекты и финансы» + внутренние задачи · перетаскивай между колонками
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAdd("not_started")}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-3.5 text-[13px] font-semibold text-white transition hover:bg-[var(--v2-ink-800)]"
        >
          <V2Icons.plus className="h-4 w-4" />
          Добавить
        </button>
      </header>

      {error ? (
        <div className="mx-6 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto px-6 py-4">
        {loading && !cards.length ? (
          <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--v2-ink-400)]">
            Загрузка…
          </div>
        ) : (
          AGENCY_WORK_STATUSES.map((col) => {
            const list = byStatus[col.key] ?? [];
            const isDrop = dropStatus === col.key;
            return (
              <section
                key={col.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDropStatus(col.key);
                }}
                onDragLeave={() => setDropStatus((s) => (s === col.key ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = dragId || e.dataTransfer.getData("text/plain");
                  if (id) void moveCard(id, col.key);
                  setDragId(null);
                  setDropStatus(null);
                }}
                className={`v2-kcol flex w-[280px] shrink-0 flex-col rounded-2xl bg-white/40 backdrop-blur-sm transition-all ${
                  isDrop ? "ring-2 ring-[var(--v2-brand-400)]" : ""
                }`}
              >
                <div className="v2-kcol-head sticky top-0 z-10 flex items-center gap-2 rounded-t-2xl border-b border-[var(--v2-ink-100)]/70 bg-white/70 px-3.5 py-3 backdrop-blur">
                  <span className="h-2 w-2 rounded-full" style={{ background: col.dot }} />
                  <h2 className="v2-tight min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--v2-ink-800)]">
                    {col.label}
                  </h2>
                  <span className="v2-tnum text-[11px] font-semibold text-[var(--v2-ink-400)]">
                    {list.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => openAdd(col.key)}
                    aria-label="Добавить в колонку"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--v2-ink-400)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-700)]"
                  >
                    <V2Icons.plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2.5">
                  {list.map((card) => (
                    <KanbanCard
                      key={card.id}
                      card={card}
                      dragging={dragId === card.id}
                      onDragStart={setDragId}
                      onDragEnd={() => {
                        setDragId(null);
                        setDropStatus(null);
                      }}
                      onDelete={
                        card.kind === "internal" ? () => void deleteInternal(card.id) : undefined
                      }
                    />
                  ))}
                  {!list.length ? (
                    <p className="rounded-xl border border-dashed border-[var(--v2-ink-200)] px-3 py-6 text-center text-[12px] text-[var(--v2-ink-400)]">
                      Пусто
                    </p>
                  ) : null}
                </div>
              </section>
            );
          })
        )}
      </div>

      {addOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setAddOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="v2-tight text-[17px] font-bold text-[var(--v2-ink-900)]">
                  Новый проект
                </h3>
                <p className="mt-0.5 text-[12px] text-[var(--v2-ink-500)]">
                  Колонка:{" "}
                  {AGENCY_WORK_STATUSES.find((s) => s.key === addStatus)?.label ?? addStatus}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                aria-label="Закрыть"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-[18px] leading-none text-[var(--v2-ink-400)] hover:bg-[var(--v2-ink-100)]"
              >
                ×
              </button>
            </div>

            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submitAdd();
              }}
            >
              <label className="block text-[12px] font-medium text-[var(--v2-ink-600)]">
                Название
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Сайт для клиента…"
                  className="v2-input mt-1 h-10 w-full text-[14px]"
                />
              </label>

              <label className="flex items-start gap-2.5 rounded-xl border border-[var(--v2-ink-100)] bg-[var(--v2-ink-50)]/60 px-3 py-2.5 text-[13px] text-[var(--v2-ink-700)]">
                <input
                  type="checkbox"
                  checked={!includeInFinance}
                  onChange={(e) => setIncludeInFinance(!e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[var(--v2-ink-300)]"
                />
                <span>
                  <span className="font-semibold text-[var(--v2-ink-900)]">
                    Не добавлять в «Проекты и финансы»
                  </span>
                  <span className="mt-0.5 block text-[12px] text-[var(--v2-ink-500)]">
                    Для внутренних подзадач — только карточка на канбане
                  </span>
                </span>
              </label>

              {includeInFinance ? (
                <>
                  <label className="block text-[12px] font-medium text-[var(--v2-ink-600)]">
                    Сумма, ₽
                    <input
                      type="number"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      placeholder="0"
                      className="v2-input mt-1 h-10 w-full text-[14px]"
                    />
                  </label>
                  <div>
                    <span className="mb-1 block text-[12px] font-medium text-[var(--v2-ink-600)]">
                      Направление
                    </span>
                    <div className="flex flex-wrap gap-3">
                      {(
                        [
                          { value: "agency" as const, label: "Агентство" },
                          { value: "impulse" as const, label: "Импульс" },
                          { value: "qmagic" as const, label: "Qmagic" },
                        ]
                      ).map((opt) => (
                        <label
                          key={opt.value}
                          className="inline-flex items-center gap-2 text-[13px] text-[var(--v2-ink-700)]"
                        >
                          <input
                            type="radio"
                            name="businessLine"
                            checked={businessLine === opt.value}
                            onChange={() => setBusinessLine(opt.value)}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <label className="block text-[12px] font-medium text-[var(--v2-ink-600)]">
                  Заметка
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Опционально"
                    className="v2-input mt-1 h-10 w-full text-[14px]"
                  />
                </label>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="h-10 rounded-xl border border-[var(--v2-ink-200)] px-4 text-[13px] font-semibold text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="h-10 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--v2-ink-800)] disabled:opacity-40"
                >
                  {saving ? "Сохраняю…" : "Добавить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
