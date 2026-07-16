"use client";

import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  V2_LEAD_STATUSES,
  V2_LEAD_TYPES,
  type V2LeadRow,
  type V2LeadStatus,
  type V2LeadType,
} from "@/lib/v2/leads/lead-types";
import { V2Icons } from "@/components/v2/ui/icons";
import { useCallback, useEffect, useMemo, useState } from "react";

function todayYmd() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function formatRubShort(n: number) {
  return `${Math.round(n).toLocaleString("ru-RU")} ₽`;
}

type ReminderState = "none" | "today" | "overdue";

function reminderState(ymd: string | null): ReminderState {
  if (!ymd) return "none";
  const today = todayYmd();
  if (ymd === today) return "today";
  if (ymd < today) return "overdue";
  return "none";
}

function formatReminder(ymd: string | null): { label: string; state: ReminderState } | null {
  if (!ymd) return null;
  const state = reminderState(ymd);
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return { label: ymd, state };
  const label = new Date(y, m - 1, d).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
  return { label, state };
}

function parseAmountInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function TypeBadge({ type }: { type: V2LeadType }) {
  const meta = V2_LEAD_TYPES.find((t) => t.key === type) ?? V2_LEAD_TYPES[0]!;
  return (
    <span
      className="v2-tight inline-flex items-center rounded-md px-1.5 py-[2px] text-[11px] font-medium"
      style={{ background: meta.soft, color: meta.ink }}
    >
      {meta.label}
    </span>
  );
}

function LeadCard({
  lead,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  lead: V2LeadRow;
  dragging: boolean;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const reminder = formatReminder(lead.reminder_at);
  const hot = reminder?.state === "today" || reminder?.state === "overdue";
  const overdue = reminder?.state === "overdue";

  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", lead.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={`relative w-full overflow-hidden rounded-xl p-3 text-left transition ${
        dragging ? "opacity-40" : ""
      } ${
        overdue
          ? "bg-red-50 shadow-[0_0_0_2px_rgba(239,68,68,0.55),0_10px_24px_rgba(239,68,68,0.18)]"
          : reminder?.state === "today"
            ? "bg-amber-50 shadow-[0_0_0_2px_rgba(245,158,11,0.55),0_10px_24px_rgba(245,158,11,0.18)]"
            : "bg-white shadow-[var(--v2-shadow-card)] hover:shadow-[var(--v2-shadow-cardHv)]"
      }`}
    >
      {hot ? (
        <span
          className={`absolute inset-y-0 left-0 w-1.5 ${overdue ? "bg-red-500" : "bg-amber-500"}`}
          aria-hidden
        />
      ) : null}

      <div className="mb-2 flex items-start justify-between gap-2">
        <TypeBadge type={lead.lead_type} />
        {reminder ? (
          <span
            className={`v2-tnum inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
              overdue
                ? "bg-red-500 text-white"
                : reminder.state === "today"
                  ? "bg-amber-500 text-white"
                  : "text-[var(--v2-ink-500)]"
            }`}
          >
            <V2Icons.cal className="h-3 w-3 opacity-90" />
            {reminder.label}
          </span>
        ) : null}
      </div>

      {hot ? (
        <div
          className={`mb-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px] font-semibold ${
            overdue ? "bg-red-500 text-white" : "bg-amber-500 text-white"
          }`}
        >
          <V2Icons.bell className="h-3.5 w-3.5" />
          {overdue ? "Просрочено — напиши" : "Сегодня — напиши"}
        </div>
      ) : null}

      <div className="v2-tight text-[13.5px] font-semibold leading-snug text-[var(--v2-ink-900)]">{lead.name}</div>
      {lead.contact ? (
        <div className="v2-tight mt-1 truncate text-[12px] text-[var(--v2-ink-600)]">{lead.contact}</div>
      ) : null}
      {lead.estimated_amount != null ? (
        <div className="v2-tnum mt-2 text-[13px] font-semibold text-[var(--v2-ink-900)]">
          ~ {formatRubShort(lead.estimated_amount)}
        </div>
      ) : null}
      {lead.comment ? (
        <div className="v2-tight mt-2 line-clamp-2 text-[12px] leading-snug text-[var(--v2-ink-500)]">{lead.comment}</div>
      ) : null}
    </button>
  );
}

type LeadFormState = {
  name: string;
  contact: string;
  comment: string;
  leadType: V2LeadType;
  status: V2LeadStatus;
  reminderAt: string;
  estimatedAmount: string;
};

const EMPTY_FORM: LeadFormState = {
  name: "",
  contact: "",
  comment: "",
  leadType: "agency",
  status: "correspondence",
  reminderAt: "",
  estimatedAmount: "",
};

function LeadModal({
  open,
  title,
  initial,
  saving,
  error,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  title: string;
  initial: LeadFormState;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (form: LeadFormState) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState(initial);

  useEffect(() => {
    if (open) setForm(initial);
  }, [open, initial]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button type="button" className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" onClick={onClose} aria-label="Закрыть" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-[var(--v2-shadow-pop)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--v2-ink-100)] px-6 py-4">
          <h2 className="v2-tight text-[17px] font-semibold text-[var(--v2-ink-900)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-100)]"
          >
            ✕
          </button>
        </div>

        <form
          className="space-y-4 px-6 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(form);
          }}
        >
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">
              Имя
            </span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="v2-input w-full"
              placeholder="Имя лида"
              autoFocus
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">
              Контакт
            </span>
            <input
              value={form.contact}
              onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
              className="v2-input w-full"
              placeholder="Telegram, телефон, email…"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">
              Комментарий
            </span>
            <textarea
              value={form.comment}
              onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
              className="v2-input min-h-[88px] w-full resize-y"
              placeholder="Коротко о запросе или договорённостях"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">
                Тип
              </span>
              <div className="grid grid-cols-2 gap-2">
                {V2_LEAD_TYPES.map((t) => {
                  const active = form.leadType === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, leadType: t.key }))}
                      className={`v2-tight rounded-xl border px-2.5 py-2 text-[12.5px] font-medium transition ${
                        active
                          ? "border-[var(--v2-brand-400)] bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]"
                          : "border-[var(--v2-ink-200)] text-[var(--v2-ink-700)] hover:border-[var(--v2-ink-300)]"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">
                Ориентировочная сумма, ₽
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={form.estimatedAmount}
                onChange={(e) => setForm((f) => ({ ...f, estimatedAmount: e.target.value }))}
                className="v2-tnum v2-input w-full"
                placeholder="например 150000"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">
                Напоминание
              </span>
              <input
                type="date"
                value={form.reminderAt}
                onChange={(e) => setForm((f) => ({ ...f, reminderAt: e.target.value }))}
                className="v2-input w-full"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">
                Статус
              </span>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as V2LeadStatus }))}
                className="v2-input w-full"
              >
                {V2_LEAD_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">{error}</div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {onDelete ? (
              <button
                type="button"
                disabled={saving}
                onClick={onDelete}
                className="v2-tight text-[13px] font-medium text-red-600 hover:text-red-700 disabled:opacity-40"
              >
                Удалить
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-[13px] font-medium text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)]"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving || !form.name.trim()}
                className="rounded-xl bg-[var(--v2-ink-900)] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[var(--v2-ink-800)] disabled:opacity-40"
              >
                {saving ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function reminderRank(lead: V2LeadRow) {
  const state = reminderState(lead.reminder_at);
  if (state === "overdue") return 0;
  if (state === "today") return 1;
  return 2;
}

export function V2AdminLeadsClient() {
  const [leads, setLeads] = useState<V2LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropStatus, setDropStatus] = useState<V2LeadStatus | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editLead, setEditLead] = useState<V2LeadRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createDefaults, setCreateDefaults] = useState<LeadFormState>(EMPTY_FORM);

  const load = useCallback(async () => {
    const data = await fetchJson<{ leads: V2LeadRow[] }>("/api/v2/admin/leads");
    setLeads(data.leads);
  }, []);

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [load]);

  const dueNow = useMemo(
    () =>
      leads.filter((l) => {
        const s = reminderState(l.reminder_at);
        return s === "today" || s === "overdue";
      }),
    [leads]
  );

  const grouped = useMemo(() => {
    const g: Record<V2LeadStatus, V2LeadRow[]> = {
      correspondence: [],
      thinking: [],
      awaiting_start: [],
      pause: [],
      lost: [],
    };
    for (const lead of leads) g[lead.status].push(lead);
    for (const key of Object.keys(g) as V2LeadStatus[]) {
      g[key].sort((a, b) => {
        const rr = reminderRank(a) - reminderRank(b);
        if (rr !== 0) return rr;
        return (b.estimated_amount ?? 0) - (a.estimated_amount ?? 0);
      });
    }
    return g;
  }, [leads]);

  async function moveLead(id: string, status: V2LeadStatus) {
    const current = leads.find((l) => l.id === id);
    if (!current || current.status === status) return;
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    try {
      await fetchJson(`/api/v2/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось переместить");
      await load().catch(() => null);
    }
  }

  async function saveCreate(form: LeadFormState) {
    setSaving(true);
    setFormError(null);
    try {
      await fetchJson("/api/v2/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          contact: form.contact,
          comment: form.comment || null,
          leadType: form.leadType,
          status: form.status,
          reminderAt: form.reminderAt || null,
          estimatedAmount: parseAmountInput(form.estimatedAmount),
        }),
      });
      setCreateOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Не удалось создать");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(form: LeadFormState) {
    if (!editLead) return;
    setSaving(true);
    setFormError(null);
    try {
      await fetchJson(`/api/v2/admin/leads/${editLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          contact: form.contact,
          comment: form.comment || null,
          leadType: form.leadType,
          status: form.status,
          reminderAt: form.reminderAt || null,
          estimatedAmount: parseAmountInput(form.estimatedAmount),
        }),
      });
      setEditLead(null);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLead() {
    if (!editLead) return;
    if (!window.confirm(`Удалить лид «${editLead.name}»?`)) return;
    setSaving(true);
    setFormError(null);
    try {
      await fetchJson(`/api/v2/admin/leads/${editLead.id}`, { method: "DELETE" });
      setEditLead(null);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Не удалось удалить");
    } finally {
      setSaving(false);
    }
  }

  const editForm: LeadFormState = editLead
    ? {
        name: editLead.name,
        contact: editLead.contact,
        comment: editLead.comment ?? "",
        leadType: editLead.lead_type,
        status: editLead.status,
        reminderAt: editLead.reminder_at ?? "",
        estimatedAmount: editLead.estimated_amount != null ? String(editLead.estimated_amount) : "",
      }
    : EMPTY_FORM;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-[var(--v2-ink-100)] bg-white px-6 py-5">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="v2-tight text-[22px] font-semibold text-[var(--v2-ink-900)]">Лиды</h1>
            <p className="v2-tight mt-1 text-[13.5px] text-[var(--v2-ink-500)]">
              Канбан продаж — перетаскивайте карточки между статусами
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCreateDefaults(EMPTY_FORM);
              setFormError(null);
              setCreateOpen(true);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-medium text-white transition hover:bg-[var(--v2-ink-800)]"
          >
            <V2Icons.plus className="h-4 w-4" />
            Добавить лид
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
        <div className="mx-auto max-w-[1600px]">
          {dueNow.length > 0 ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-950">
              <V2Icons.bell className="h-4 w-4 shrink-0 text-amber-600" />
              <span className="font-semibold">Написать сегодня: {dueNow.length}</span>
              <span className="text-amber-800/80">
                {dueNow
                  .slice(0, 4)
                  .map((l) => l.name)
                  .join(", ")}
                {dueNow.length > 4 ? ` и ещё ${dueNow.length - 4}` : ""}
              </span>
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-800">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="py-24 text-center text-[13.5px] text-[var(--v2-ink-500)]">Загрузка…</div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <div className="flex min-w-max gap-4">
                {V2_LEAD_STATUSES.map(({ key, label, dot }) => (
                  <div
                    key={key}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDropStatus(key);
                    }}
                    onDragLeave={() => setDropStatus((s) => (s === key ? null : s))}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = dragId || e.dataTransfer.getData("text/plain");
                      if (id) void moveLead(id, key);
                      setDragId(null);
                      setDropStatus(null);
                    }}
                    className={`v2-kcol flex w-[280px] shrink-0 flex-col rounded-2xl bg-white/40 backdrop-blur-sm transition-all ${
                      dropStatus === key
                        ? "bg-[var(--v2-brand-50)]/60 ring-2 ring-[var(--v2-brand-400)] ring-offset-2 ring-offset-transparent"
                        : ""
                    }`}
                  >
                    <div className="v2-kcol-head sticky top-0 z-10 flex items-center gap-2 rounded-t-2xl border-b border-[var(--v2-ink-100)]/70 bg-white/70 px-3.5 py-3 backdrop-blur">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
                      <h3 className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)]">{label}</h3>
                      <span className="v2-tnum text-[11.5px] text-[var(--v2-ink-500)]">{grouped[key].length}</span>
                      <button
                        type="button"
                        title={`Добавить в «${label}»`}
                        onClick={() => {
                          setCreateDefaults({ ...EMPTY_FORM, status: key });
                          setFormError(null);
                          setCreateOpen(true);
                        }}
                        className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--v2-ink-400)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
                      >
                        <V2Icons.plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex min-h-[140px] flex-col gap-2.5 p-2.5">
                      {grouped[key].length === 0 ? (
                        <div className="v2-tight py-8 text-center text-[12px] italic text-[var(--v2-ink-400)]">
                          Пока пусто
                        </div>
                      ) : (
                        grouped[key].map((lead, i) => (
                          <div key={lead.id} className="v2-card-in" style={{ animationDelay: `${i * 40}ms` }}>
                            <LeadCard
                              lead={lead}
                              dragging={dragId === lead.id}
                              onOpen={() => {
                                setFormError(null);
                                setEditLead(lead);
                              }}
                              onDragStart={() => setDragId(lead.id)}
                              onDragEnd={() => {
                                setDragId(null);
                                setDropStatus(null);
                              }}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <LeadModal
        open={createOpen}
        title="Новый лид"
        initial={createDefaults}
        saving={saving}
        error={formError}
        onClose={() => !saving && setCreateOpen(false)}
        onSave={(form) => void saveCreate(form)}
      />

      <LeadModal
        open={!!editLead}
        title="Лид"
        initial={editForm}
        saving={saving}
        error={formError}
        onClose={() => !saving && setEditLead(null)}
        onSave={(form) => void saveEdit(form)}
        onDelete={() => void deleteLead()}
      />
    </div>
  );
}
