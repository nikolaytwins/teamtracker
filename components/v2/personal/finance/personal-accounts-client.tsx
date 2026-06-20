"use client";

import { PersonalAmt, PersonalMaskProvider } from "./personal-finance-mask";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type {
  PersonalAccountRow,
  PersonalAccountType,
  PersonalCapitalRow,
  PersonalFinanceDashboard,
} from "@/lib/v2/personal/types";
import { V2Icons } from "@/components/v2/ui/icons";
import { appPath } from "@/lib/api-url";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const ACCOUNT_TYPES: { value: PersonalAccountType; label: string }[] = [
  { value: "card", label: "Карта" },
  { value: "cash", label: "Наличные" },
  { value: "bank", label: "Банк" },
  { value: "cushion", label: "Подушка" },
  { value: "goal", label: "Цель" },
  { value: "other", label: "Другое" },
];

const ICON_KEYS = ["wallet", "bank", "cash", "shield", "target", "coin", "tv", "key"] as const;

const PfEyeIcons = {
  eye: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  eyeOff: (p: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M4 4l16 16M9.5 9.7A2.7 2.7 0 0 0 12 14.7c.7 0 1.3-.25 1.8-.66M6.3 6.7C3.9 8.2 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.6 0 3-.46 4.2-1.15M10.5 5.7c.48-.13 1-.2 1.5-.2 6 0 9.5 6.5 9.5 6.5s-.8 1.5-2.3 3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

const ACCENT_PRESETS = ["#3B6FF7", "#10B981", "#F59E0B", "#FF335F", "#9A8CFF", "#0A0A0B"];

function emptyAccount(): Partial<PersonalAccountRow> {
  return {
    name: "",
    account_type: "card",
    icon_key: "wallet",
    accent: ACCENT_PRESETS[0],
    balance_rub: 0,
    note: "",
    disposable: true,
    goal_amount_rub: null,
  };
}

function emptyCapital(): Partial<PersonalCapitalRow> {
  return {
    name: "",
    icon_key: "coin",
    amount_rub: 0,
    meta: "",
    unit_label: "",
    tint: ACCENT_PRESETS[0],
  };
}

export function PersonalAccountsClient() {
  const [data, setData] = useState<PersonalFinanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [masked, setMasked] = useState(false);
  const [accountDraft, setAccountDraft] = useState<Partial<PersonalAccountRow> | null>(null);
  const [capitalDraft, setCapitalDraft] = useState<Partial<PersonalCapitalRow> | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchJson<PersonalFinanceDashboard>("/api/v2/personal/finance/dashboard");
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveAccount = async () => {
    if (!accountDraft?.name?.trim()) {
      setError("Укажите название счёта");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: accountDraft.name,
        account_type: accountDraft.account_type,
        icon_key: accountDraft.icon_key,
        accent: accountDraft.accent,
        note: accountDraft.note,
        disposable: accountDraft.disposable,
        goal_amount_rub: accountDraft.goal_amount_rub,
      };
      if (accountDraft.id) {
        await fetchJson(`/api/v2/personal/finance/accounts/${accountDraft.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetchJson("/api/v2/personal/finance/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, balance_rub: accountDraft.balance_rub ?? 0 }),
        });
      }
      setAccountDraft(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить счёт");
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async (id: string) => {
    if (!confirm("Удалить счёт?")) return;
    setError(null);
    try {
      await fetchJson(`/api/v2/personal/finance/accounts/${id}`, { method: "DELETE" });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить");
    }
  };

  const saveCapital = async () => {
    if (!capitalDraft?.name?.trim()) {
      setError("Укажите название актива");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: capitalDraft.name,
        icon_key: capitalDraft.icon_key,
        amount_rub: capitalDraft.amount_rub,
        meta: capitalDraft.meta,
        unit_label: capitalDraft.unit_label,
        tint: capitalDraft.tint,
      };
      if (capitalDraft.id) {
        await fetchJson(`/api/v2/personal/finance/capital/${capitalDraft.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetchJson("/api/v2/personal/finance/capital", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setCapitalDraft(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить актив");
    } finally {
      setSaving(false);
    }
  };

  const deleteCapital = async (id: string) => {
    if (!confirm("Удалить актив?")) return;
    setError(null);
    try {
      await fetchJson(`/api/v2/personal/finance/capital/${id}`, { method: "DELETE" });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить");
    }
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>
    );
  }

  const accounts = data?.accounts ?? [];
  const capital = data?.capital ?? [];

  return (
    <PersonalMaskProvider masked={masked}>
      <div className="flex min-h-0 flex-1 flex-col bg-[var(--v2-ink-25)]">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--v2-ink-100)] bg-white/90 px-6 backdrop-blur-md">
          <nav className="flex items-center gap-1.5 text-[13px] text-[var(--v2-ink-500)]">
            <Link href={appPath("/v2/personal/finance")} className="transition hover:text-[var(--v2-ink-800)]">
              Личное
            </Link>
            <V2Icons.chevR className="h-3.5 w-3.5 text-[var(--v2-ink-300)]" />
            <span className="font-medium text-[var(--v2-ink-900)]">Счета и активы</span>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMasked((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--v2-ink-500)] transition hover:bg-[var(--v2-ink-50)]"
              title={masked ? "Показать суммы" : "Скрыть суммы"}
            >
              {masked ? <PfEyeIcons.eyeOff className="h-[18px] w-[18px]" /> : <PfEyeIcons.eye className="h-[18px] w-[18px]" />}
            </button>
            <Link
              href={appPath("/v2/personal/finance")}
              className="inline-flex h-9 items-center rounded-lg bg-[var(--v2-brand-600)] px-4 text-[13px] font-medium text-white transition hover:bg-[var(--v2-brand-700)]"
            >
              К финансам
            </Link>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[960px] flex-1 px-6 py-8">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {error}
            </div>
          ) : null}

          <section className="mb-10">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h1 className="v2-tight text-2xl font-semibold text-[var(--v2-ink-900)]">Счета</h1>
                <p className="mt-1 text-[13px] text-[var(--v2-ink-500)]">
                  Карты, наличные, подушки и цели — балансы обновляются через операции
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAccountDraft(emptyAccount())}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--v2-ink-200)] bg-white px-3 text-[13px] font-medium text-[var(--v2-ink-800)] transition hover:bg-[var(--v2-ink-50)]"
              >
                <V2Icons.plus className="h-4 w-4" />
                Добавить счёт
              </button>
            </div>

            {accounts.length === 0 && !accountDraft ? (
              <div className="rounded-2xl border border-dashed border-[var(--v2-ink-200)] bg-white px-6 py-10 text-center">
                <p className="text-[14px] text-[var(--v2-ink-600)]">Пока нет счетов</p>
                <button
                  type="button"
                  onClick={() => setAccountDraft(emptyAccount())}
                  className="mt-3 text-[13px] font-medium text-[var(--v2-brand-600)] hover:underline"
                >
                  Создать первый счёт
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {accounts.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-4 rounded-2xl bg-white px-4 py-3 shadow-[var(--v2-shadow-soft)]"
                  >
                    <span
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ background: a.accent }}
                    >
                      <V2Icons.ruble className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="v2-tight font-medium text-[var(--v2-ink-900)]">{a.name}</div>
                      <div className="text-[12px] text-[var(--v2-ink-500)]">
                        {ACCOUNT_TYPES.find((t) => t.value === a.account_type)?.label ?? a.account_type}
                        {a.disposable ? " · в обороте" : " · резерв"}
                        {a.note ? ` · ${a.note}` : ""}
                      </div>
                    </div>
                    <div className="v2-tnum text-right text-[15px] font-semibold text-[var(--v2-ink-900)]">
                      <PersonalAmt v={a.balance_rub} />
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => setAccountDraft({ ...a })}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-50)]"
                      >
                        <V2Icons.edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteAccount(a.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                      >
                        <V2Icons.trash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="v2-tight text-xl font-semibold text-[var(--v2-ink-900)]">Капитал</h2>
                <p className="mt-1 text-[13px] text-[var(--v2-ink-500)]">Недвижимость, вклады, техника и прочие активы</p>
              </div>
              <button
                type="button"
                onClick={() => setCapitalDraft(emptyCapital())}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--v2-ink-200)] bg-white px-3 text-[13px] font-medium text-[var(--v2-ink-800)] transition hover:bg-[var(--v2-ink-50)]"
              >
                <V2Icons.plus className="h-4 w-4" />
                Добавить актив
              </button>
            </div>

            {capital.length === 0 && !capitalDraft ? (
              <div className="rounded-2xl border border-dashed border-[var(--v2-ink-200)] bg-white px-6 py-10 text-center">
                <p className="text-[14px] text-[var(--v2-ink-600)]">Пока нет активов</p>
              </div>
            ) : (
              <div className="space-y-2">
                {capital.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-4 rounded-2xl bg-white px-4 py-3 shadow-[var(--v2-shadow-soft)]"
                  >
                    <span
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: c.tint ?? "#EEEEF1" }}
                    >
                      <V2Icons.folder className="h-5 w-5 text-[var(--v2-ink-700)]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="v2-tight font-medium text-[var(--v2-ink-900)]">{c.name}</div>
                      {c.meta ? <div className="text-[12px] text-[var(--v2-ink-500)]">{c.meta}</div> : null}
                    </div>
                    <div className="v2-tnum text-right text-[15px] font-semibold text-[var(--v2-ink-900)]">
                      <PersonalAmt v={c.amount_rub} />
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => setCapitalDraft({ ...c })}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-50)]"
                      >
                        <V2Icons.edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteCapital(c.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                      >
                        <V2Icons.trash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {accountDraft ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[var(--v2-shadow-pop)]">
              <h3 className="v2-tight text-lg font-semibold text-[var(--v2-ink-900)]">
                {accountDraft.id ? "Редактировать счёт" : "Новый счёт"}
              </h3>
              <div className="mt-4 space-y-3">
                <label className="block text-[12px] font-medium text-[var(--v2-ink-600)]">
                  Название
                  <input
                    className="mt-1 w-full rounded-lg border border-[var(--v2-ink-200)] px-3 py-2 text-[14px]"
                    value={accountDraft.name ?? ""}
                    onChange={(e) => setAccountDraft({ ...accountDraft, name: e.target.value })}
                  />
                </label>
                <label className="block text-[12px] font-medium text-[var(--v2-ink-600)]">
                  Тип
                  <select
                    className="mt-1 w-full rounded-lg border border-[var(--v2-ink-200)] px-3 py-2 text-[14px]"
                    value={accountDraft.account_type ?? "card"}
                    onChange={(e) =>
                      setAccountDraft({ ...accountDraft, account_type: e.target.value as PersonalAccountType })
                    }
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                {!accountDraft.id ? (
                  <label className="block text-[12px] font-medium text-[var(--v2-ink-600)]">
                    Начальный баланс, ₽
                    <input
                      type="number"
                      className="mt-1 w-full rounded-lg border border-[var(--v2-ink-200)] px-3 py-2 text-[14px]"
                      value={accountDraft.balance_rub ?? 0}
                      onChange={(e) =>
                        setAccountDraft({ ...accountDraft, balance_rub: Number(e.target.value) || 0 })
                      }
                    />
                  </label>
                ) : null}
                <label className="flex items-center gap-2 text-[13px] text-[var(--v2-ink-700)]">
                  <input
                    type="checkbox"
                    checked={accountDraft.disposable ?? true}
                    onChange={(e) => setAccountDraft({ ...accountDraft, disposable: e.target.checked })}
                  />
                  Учитывать в «свободных деньгах»
                </label>
                <label className="block text-[12px] font-medium text-[var(--v2-ink-600)]">
                  Заметка
                  <input
                    className="mt-1 w-full rounded-lg border border-[var(--v2-ink-200)] px-3 py-2 text-[14px]"
                    value={accountDraft.note ?? ""}
                    onChange={(e) => setAccountDraft({ ...accountDraft, note: e.target.value })}
                  />
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAccountDraft(null)}
                  className="h-9 rounded-lg px-4 text-[13px] text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)]"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveAccount()}
                  className="h-9 rounded-lg bg-[var(--v2-brand-600)] px-4 text-[13px] font-medium text-white hover:bg-[var(--v2-brand-700)] disabled:opacity-50"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {capitalDraft ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[var(--v2-shadow-pop)]">
              <h3 className="v2-tight text-lg font-semibold text-[var(--v2-ink-900)]">
                {capitalDraft.id ? "Редактировать актив" : "Новый актив"}
              </h3>
              <div className="mt-4 space-y-3">
                <label className="block text-[12px] font-medium text-[var(--v2-ink-600)]">
                  Название
                  <input
                    className="mt-1 w-full rounded-lg border border-[var(--v2-ink-200)] px-3 py-2 text-[14px]"
                    value={capitalDraft.name ?? ""}
                    onChange={(e) => setCapitalDraft({ ...capitalDraft, name: e.target.value })}
                  />
                </label>
                <label className="block text-[12px] font-medium text-[var(--v2-ink-600)]">
                  Стоимость, ₽
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-[var(--v2-ink-200)] px-3 py-2 text-[14px]"
                    value={capitalDraft.amount_rub ?? 0}
                    onChange={(e) =>
                      setCapitalDraft({ ...capitalDraft, amount_rub: Number(e.target.value) || 0 })
                    }
                  />
                </label>
                <label className="block text-[12px] font-medium text-[var(--v2-ink-600)]">
                  Описание
                  <input
                    className="mt-1 w-full rounded-lg border border-[var(--v2-ink-200)] px-3 py-2 text-[14px]"
                    value={capitalDraft.meta ?? ""}
                    onChange={(e) => setCapitalDraft({ ...capitalDraft, meta: e.target.value })}
                  />
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCapitalDraft(null)}
                  className="h-9 rounded-lg px-4 text-[13px] text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)]"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveCapital()}
                  className="h-9 rounded-lg bg-[var(--v2-brand-600)] px-4 text-[13px] font-medium text-white hover:bg-[var(--v2-brand-700)] disabled:opacity-50"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PersonalMaskProvider>
  );
}
