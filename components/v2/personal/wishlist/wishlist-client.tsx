"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HomePersonalFinanceProvider, useHomePersonalFinance } from "@/components/v2/home/personal/home-personal-finance-context";
import { allocateGoals, cushionPool } from "@/components/v2/personal/finance/personal-finance-system";
import { appPath } from "@/lib/api-url";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  WISH_STATUS_LABEL,
  WISH_STATUSES,
  WISH_TIERS,
  shortRub,
  wishDateLong,
  wishDateShort,
  wishPlacesLeft,
  wishSeatLimit,
  wishTier,
  type WishItem,
  type WishStatus,
  type WishTier,
} from "@/lib/v2/personal/wishlist-meta";

function rub(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(Math.round(value || 0))} ₽`;
}

function moneyText(value: number) {
  if (!value) return "";
  return new Intl.NumberFormat("ru-RU").format(Math.round(value));
}

function parseMoney(value: string) {
  return Math.max(0, Number(value.replace(/\D/g, "")) || 0);
}

function replaceWish(items: WishItem[], next: WishItem) {
  return items.map((item) => (item.id === next.id ? next : item));
}

export function WishlistClient() {
  const [wishes, setWishes] = useState<WishItem[]>([]);
  const [tierId, setTierId] = useState("all");
  const [status, setStatus] = useState<"all" | WishStatus>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; undo: () => void } | null>(null);
  const toastTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchJson<{ wishes: WishItem[] }>("/api/v2/personal/wishlist");
      setWishes(data.wishes);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить хотелки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const showToast = (message: string, undo: () => void) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ message, undo });
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  };

  const patchWish = async (id: string, patch: Record<string, unknown>) => {
    const { wish } = await fetchJson<{ wish: WishItem }>(`/api/v2/personal/wishlist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setWishes((prev) => replaceWish(prev, wish));
    return wish;
  };

  const toggleDone = async (item: WishItem) => {
    const wasDone = item.status === "done";
    const nextStatus: WishStatus = wasDone ? (item.prev_status === "saving" ? "saving" : "want") : "done";
    try {
      await patchWish(item.id, { status: nextStatus });
      showToast(wasDone ? "Отметка снята" : `«${item.title || "Хотелка"}» — исполнено`, () => {
        void patchWish(item.id, { status: item.status === "done" ? "done" : item.status });
      });
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Не удалось отметить хотелку");
    }
  };

  const createWish = async (price: number) => {
    const { wish } = await fetchJson<{ wish: WishItem }>("/api/v2/personal/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "", priceRub: price, status: "want" }),
    });
    setWishes((prev) => [...prev, wish]);
    setOpenId(wish.id);
    const tier = wishTier(price);
    if (tierId !== "all" && tierId !== tier.id) setTierId(tier.id);
  };

  const removeWish = async (id: string) => {
    await fetchJson(`/api/v2/personal/wishlist/${id}`, { method: "DELETE" });
    setWishes((prev) => prev.filter((item) => item.id !== id));
    setOpenId(null);
  };

  const open = wishes.find((item) => item.id === openId) ?? null;
  const done = wishes.filter((item) => item.status === "done").length;
  const saving = wishes.filter((item) => item.status === "saving").length;
  const tiers = tierId === "all" ? WISH_TIERS : WISH_TIERS.filter((tier) => tier.id === tierId);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-[1720px] flex-col gap-7 px-9 pb-24 pt-7">
        {error ? <div className="v2-tight rounded-xl bg-rose-50 px-4 py-2.5 text-[13px] text-rose-800">{error}</div> : null}

        <section className="v2-card grid overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(360px,1fr)]">
          <div className="flex min-h-[420px] flex-col justify-center gap-[22px] px-[34px] py-[34px]">
            <div>
              <h1 className="v2-tight text-[40px] font-semibold leading-[1.1] tracking-[-0.036em]">Цели</h1>
              <p className="v2-tight mt-2.5 max-w-[58ch] text-[15.5px] text-[var(--v2-ink-500)]">
                Хотелки по ценовым уровням. У каждого уровня свой лимит мест: 50 до 100 тр, 30 до 300 тр, 20 до 500 тр, 10 до 1 млн, 5 до 3 млн, 3 до 50 млн.
              </p>
            </div>
            <div className="grid max-w-[820px] grid-cols-1 gap-3 sm:grid-cols-[1.3fr_1fr_1fr]">
              <div className="rounded-2xl bg-[#2d5eef] px-[18px] py-4 text-white shadow-[0_16px_40px_-18px_rgba(45,94,239,0.85)]">
                <div className="text-[11.5px] font-semibold tracking-[0.13em] text-white/65 uppercase">Исполнено</div>
                <b className="v2-tnum mt-2 block text-[28px] font-semibold tracking-[-0.03em]">
                  {done}
                  <small className="text-[16px] font-medium text-white/60"> из {wishes.length}</small>
                </b>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
                  <span className="block h-full rounded-full bg-white" style={{ width: `${wishes.length ? (done / wishes.length) * 100 : 0}%` }} />
                </div>
              </div>
              <Stat kicker="Коплю сейчас" value={String(saving)} />
              <Stat kicker="Заполнено мест" value={String(wishes.length)} extra={` / ${wishSeatLimit()}`} />
            </div>
            <div>
              <button
                type="button"
                onClick={() => void createWish(0)}
                className="inline-flex h-11 items-center rounded-[13px] bg-[#2d5eef] px-[18px] text-[14.5px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(45,94,239,0.8)] hover:bg-[var(--v2-brand-700)]"
              >
                + Хотелка
              </button>
            </div>
          </div>
          <div className="relative hidden min-h-[420px] overflow-hidden lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={appPath("/home/goals-hero.png")}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[80%_40%]"
              style={{
                maskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,.5) 12%, #000 30%)",
                WebkitMaskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,.5) 12%, #000 30%)",
              }}
            />
          </div>
        </section>

        <Foundation />

        <div className="sticky top-0 z-20 -mx-9 flex flex-wrap items-center gap-2.5 bg-gradient-to-b from-[#f2f5fb] from-70% to-transparent px-9 py-3.5">
          <TierChip active={tierId === "all"} label="Все уровни" meta={`${wishes.length} хотелок`} onClick={() => setTierId("all")} />
          {WISH_TIERS.map((tier) => {
            const count = wishes.filter((item) => wishTier(item.price_rub).id === tier.id).length;
            return (
              <TierChip
                key={tier.id}
                active={tierId === tier.id}
                label={tier.name}
                count={count}
                limit={tier.limit}
                onClick={() => setTierId(tier.id)}
              />
            );
          })}
          <div className="ml-auto inline-flex gap-0.5 rounded-[14px] bg-white p-1 shadow-[var(--v2-shadow-card)]">
            {(["all", ...WISH_STATUSES] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatus(key)}
                className={`rounded-[10px] px-3.5 py-2 text-[14px] font-semibold ${
                  status === key ? "bg-[#2d5eef] text-white" : "text-[var(--v2-ink-500)]"
                }`}
              >
                {key === "all" ? "Все" : WISH_STATUS_LABEL[key]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-64 animate-pulse rounded-[22px] bg-white/70" />
        ) : (
          <div className="flex flex-col gap-10">
            {tiers.map((tier) => (
              <TierSection
                key={tier.id}
                tier={tier}
                wishes={wishes}
                status={status}
                onOpen={setOpenId}
                onToggle={(item) => void toggleDone(item)}
                onAdd={() => void createWish(tier.max)}
              />
            ))}
          </div>
        )}
      </div>

      {toast ? (
        <div className="fixed bottom-7 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3.5 rounded-[14px] bg-[var(--v2-ink-900)] px-4 py-3 text-[14.5px] font-semibold text-white shadow-[0_18px_40px_-16px_rgba(0,0,0,0.5)]">
          <span>{toast.message}</span>
          <button
            type="button"
            className="rounded-[9px] bg-white/15 px-2.5 py-1.5 text-[13.5px]"
            onClick={() => {
              toast.undo();
              setToast(null);
            }}
          >
            Отменить
          </button>
        </div>
      ) : null}

      {open ? (
        <WishDrawer
          item={open}
          wishes={wishes}
          onClose={() => setOpenId(null)}
          onPatch={patchWish}
          onToggle={() => void toggleDone(open)}
          onDelete={removeWish}
        />
      ) : null}
    </div>
  );
}

function Stat({ kicker, value, extra }: { kicker: string; value: string; extra?: string }) {
  return (
    <div className="rounded-2xl bg-[var(--v2-ink-50)] px-[18px] py-4">
      <div className="text-[11.5px] font-semibold tracking-[0.13em] text-[var(--v2-ink-400)] uppercase">{kicker}</div>
      <b className="v2-tnum mt-2 block text-[28px] font-semibold tracking-[-0.03em] whitespace-nowrap">
        {value}
        {extra ? <small className="text-[16px] font-medium text-[var(--v2-ink-400)]">{extra}</small> : null}
      </b>
    </div>
  );
}

function TierChip({
  active,
  label,
  meta,
  count,
  limit,
  onClick,
}: {
  active: boolean;
  label: string;
  meta?: string;
  count?: number;
  limit?: number;
  onClick: () => void;
}) {
  const pct = limit ? Math.min(100, ((count ?? 0) / limit) * 100) : 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[132px] flex-col gap-1.5 rounded-[14px] px-3.5 py-2.5 text-left ${
        active ? "bg-[var(--v2-ink-900)] text-white" : "bg-white/70 hover:bg-white"
      }`}
    >
      <span className="text-[14.5px] font-semibold tracking-[-0.01em] whitespace-nowrap">{label}</span>
      <span className={`v2-tnum flex items-center gap-2 text-[12px] font-semibold ${active ? "text-white/55" : "text-[var(--v2-ink-400)]"}`}>
        {meta ?? (
          <>
            {count} / {limit}
            <i className={`block h-1 min-w-10 flex-1 overflow-hidden rounded-full ${active ? "bg-white/20" : "bg-[var(--v2-ink-200)]"}`}>
              <span className={`block h-full rounded-full ${active ? "bg-white" : "bg-[#2d5eef]"}`} style={{ width: `${pct}%` }} />
            </i>
          </>
        )}
      </span>
    </button>
  );
}

function TierSection({
  tier,
  wishes,
  status,
  onOpen,
  onToggle,
  onAdd,
}: {
  tier: WishTier;
  wishes: WishItem[];
  status: "all" | WishStatus;
  onOpen: (id: string) => void;
  onToggle: (item: WishItem) => void;
  onAdd: () => void;
}) {
  const all = wishes.filter((item) => wishTier(item.price_rub).id === tier.id);
  const visible = all.filter((item) => status === "all" || item.status === status);
  const left = tier.limit - all.length;
  const sum = all.reduce((total, item) => total + (item.price_rub || 0), 0);
  return (
    <section id={tier.id} className="scroll-mt-24">
      <div className="mb-[18px] flex flex-wrap items-end gap-[18px]">
        <div>
          <div className="v2-tnum text-[13px] font-semibold text-[var(--v2-ink-400)]">{tier.limit} хотелок</div>
          <h2 className="v2-tight mt-1 text-[30px] font-semibold tracking-[-0.034em]">{tier.title}</h2>
        </div>
        <div className="flex min-w-[260px] items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white">
            <span className="block h-full rounded-full bg-[#2d5eef]" style={{ width: `${Math.min(100, (all.length / tier.limit) * 100)}%` }} />
          </div>
          <em className="v2-tnum text-[14px] font-semibold text-[var(--v2-ink-600)] not-italic whitespace-nowrap">
            {all.length} из {tier.limit}
          </em>
        </div>
        <span className="v2-tnum ml-auto text-[14px] text-[var(--v2-ink-500)]">
          на сумму <b className="font-semibold text-[var(--v2-ink-900)]">{shortRub(sum)}</b>
        </span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] items-stretch gap-4">
        {visible.map((item) => (
          <WishCard key={item.id} item={item} onOpen={() => onOpen(item.id)} onToggle={() => onToggle(item)} />
        ))}
        {left > 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex min-h-[340px] flex-col items-center justify-center gap-1.5 rounded-[20px] bg-white/55 text-[15px] font-semibold text-[var(--v2-ink-500)] hover:bg-white hover:text-[#2d5eef]"
          >
            <b className="text-[30px] leading-none font-normal">+</b>
            Добавить хотелку
            <small className="v2-tnum text-[13px] font-medium text-[var(--v2-ink-400)]">
              ещё {left} {wishPlacesLeft(left)}
            </small>
          </button>
        ) : (
          <div className="col-span-full rounded-[14px] bg-white/60 px-4 py-3 text-[14px] text-[var(--v2-ink-500)]">
            Уровень заполнен. Чтобы добавить новую — исполни или убери одну из этих.
          </div>
        )}
      </div>
    </section>
  );
}

function WishCard({ item, onOpen, onToggle }: { item: WishItem; onOpen: () => void; onToggle: () => void }) {
  const saving = item.status === "saving";
  const pct = saving && item.price_rub ? Math.min(100, Math.round((item.saved_rub / item.price_rub) * 100)) : 0;
  const done = item.status === "done";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen();
      }}
      className="flex cursor-pointer flex-col overflow-hidden rounded-[20px] bg-white text-left shadow-[var(--v2-shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--v2-shadow-soft)]"
    >
      <div className="relative h-[248px] p-2 pb-0">
        {done ? (
          <span className="pointer-events-none absolute top-[18px] left-[18px] z-10 inline-flex items-center gap-1.5 rounded-[10px] bg-[#047857] px-2.5 py-1.5 text-[12.5px] font-semibold text-white">
            ✓ Исполнено{item.done_at ? ` · ${wishDateShort(item.done_at)}` : ""}
          </span>
        ) : null}
        <button
          type="button"
          title={done ? "Снять отметку" : "Отметить исполненной"}
          aria-label="Исполнено"
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          className={`absolute top-[18px] right-[18px] z-10 flex h-[38px] w-[38px] items-center justify-center rounded-xl text-[17px] font-bold shadow-[0_4px_14px_-4px_rgba(16,24,40,0.25)] ${
            done ? "bg-[#047857] text-white" : "bg-white/95 text-[var(--v2-ink-300)] hover:text-[#047857]"
          }`}
        >
          ✓
        </button>
        <div className={`flex h-full items-end rounded-[14px] bg-[#eef1f6] px-4 py-4 text-[14px] text-[var(--v2-ink-400)] ${done ? "opacity-85" : ""}`}>
          {item.title || "Фото хотелки"}
        </div>
      </div>
      <div className="flex flex-1 flex-col px-4 pt-3.5 pb-4">
        <div className={`flex-1 text-[16px] leading-snug font-semibold tracking-[-0.018em] ${done ? "text-[var(--v2-ink-500)]" : ""}`}>
          {item.title || "Без названия"}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="v2-tnum text-[15px] font-semibold text-[var(--v2-ink-700)]">{rub(item.price_rub)}</span>
          <span
            className={`ml-auto rounded-lg px-2 py-1 text-[12px] font-semibold ${
              item.status === "saving"
                ? "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]"
                : item.status === "done"
                  ? "bg-[#e7f6f0] text-[#047857]"
                  : "bg-[var(--v2-ink-100)] text-[var(--v2-ink-500)]"
            }`}
          >
            {saving ? `Коплю · ${pct}%` : WISH_STATUS_LABEL[item.status]}
          </span>
        </div>
        {saving ? (
          <div className="mt-2.5 h-[5px] overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
            <span className="block h-full rounded-full bg-[#2d5eef]" style={{ width: `${pct}%` }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function WishDrawer({
  item,
  wishes,
  onClose,
  onPatch,
  onToggle,
  onDelete,
}: {
  item: WishItem;
  wishes: WishItem[];
  onClose: () => void;
  onPatch: (id: string, patch: Record<string, unknown>) => Promise<WishItem>;
  onToggle: () => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(item.title);
  const [price, setPrice] = useState(moneyText(item.price_rub));
  const [saved, setSaved] = useState(moneyText(item.saved_rub));
  const [note, setNote] = useState(item.note);
  const draft = useRef({ title, price, saved, note });
  const timer = useRef<number | null>(null);
  draft.current = { title, price, saved, note };

  useEffect(() => {
    setTitle(item.title);
    setPrice(moneyText(item.price_rub));
    setSaved(moneyText(item.saved_rub));
    setNote(item.note);
  }, [item.id]);

  const flush = async () => {
    if (timer.current) window.clearTimeout(timer.current);
    const current = draft.current;
    await onPatch(item.id, {
      title: current.title,
      priceRub: parseMoney(current.price),
      savedRub: parseMoney(current.saved),
      note: current.note,
    });
  };

  const schedule = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), 350);
  };

  const close = async () => {
    if (!draft.current.title.trim()) {
      await onDelete(item.id);
      return;
    }
    await flush();
    onClose();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") void close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const priceValue = parseMoney(price);
  const savedValue = parseMoney(saved);
  const tier = wishTier(priceValue);
  const count = useMemo(
    () => wishes.filter((wish) => wishTier(wish.id === item.id ? priceValue : wish.price_rub).id === tier.id).length,
    [wishes, item.id, priceValue, tier.id],
  );
  const overflow = count > tier.limit;
  const pct = item.status === "saving" && priceValue ? Math.min(100, Math.round((savedValue / priceValue) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Закрыть" className="absolute inset-0 bg-[rgba(10,12,20,0.28)]" onClick={() => void close()} />
      <aside className="absolute top-1/2 left-1/2 flex max-h-[calc(100vh-48px)] w-[min(600px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_40px_100px_-30px_rgba(16,24,40,0.45)]">
        <button type="button" aria-label="Закрыть" onClick={() => void close()} className="absolute top-5 right-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[22px] text-[var(--v2-ink-700)] shadow-[0_4px_14px_-4px_rgba(16,24,40,0.25)]">
          ×
        </button>
        <div className="flex-1 overflow-y-auto">
          <div className="h-[280px] px-2.5 pt-2.5">
            <div className="flex h-full items-end rounded-[18px] bg-[#eef1f6] px-5 py-4 text-[15px] text-[var(--v2-ink-400)]">
              {title || "Перетащи фото хотелки"}
            </div>
          </div>
          <div className="flex flex-col gap-5 px-7 pt-[22px] pb-2">
            <div className="flex items-center gap-2">
              <span className="v2-tnum rounded-lg bg-[var(--v2-brand-50)] px-2.5 py-1 text-[12.5px] font-semibold text-[var(--v2-brand-700)]">
                {tier.name} · {count} из {tier.limit} мест
              </span>
              <StatusPill status={item.status} />
            </div>
            <input
              value={title}
              autoFocus={!title}
              onChange={(event) => {
                setTitle(event.target.value);
                schedule();
              }}
              placeholder="Что хочу?"
              aria-label="Название"
              className="w-full bg-transparent text-[28px] font-semibold tracking-[-0.032em] outline-none placeholder:text-[var(--v2-ink-300)]"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MoneyField
                label="Цена"
                value={price}
                onChange={(value) => {
                  setPrice(value);
                  schedule();
                }}
              />
              {item.status === "saving" ? (
                <MoneyField
                  label="Накоплено"
                  value={saved}
                  onChange={(value) => {
                    setSaved(value);
                    schedule();
                  }}
                />
              ) : null}
            </div>
            {item.status === "saving" ? (
              <div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
                  <span className="block h-full rounded-full bg-gradient-to-r from-[var(--v2-brand-500)] to-[var(--v2-brand-700)]" style={{ width: `${pct}%` }} />
                </div>
                <div className="v2-tnum mt-2 flex justify-between text-[13.5px] text-[var(--v2-ink-500)]">
                  <b className="text-[var(--v2-ink-900)]">{pct}%</b>
                  <span>осталось {rub(Math.max(0, priceValue - savedValue))}</span>
                </div>
              </div>
            ) : null}
            {item.status === "done" ? (
              <div className="flex items-center gap-3.5 rounded-2xl bg-[#047857] px-[18px] py-3.5 text-white">
                <i className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-white/20 font-bold not-italic">✓</i>
                <div>
                  <b className="block text-[16px] font-semibold">Исполнено</b>
                  <small className="text-[13px] opacity-80">{item.done_at ? wishDateLong(item.done_at) : "дата не отмечена"}</small>
                </div>
                <button type="button" onClick={onToggle} className="ml-auto rounded-[10px] bg-white/20 px-3 py-2 text-[13.5px] font-semibold">
                  Вернуть
                </button>
              </div>
            ) : (
              <button type="button" onClick={onToggle} className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded-2xl bg-[#e7f6f0] text-[16px] font-semibold text-[#047857] hover:bg-[#047857] hover:text-white">
                ✓ Отметить исполненной
              </button>
            )}
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold tracking-[0.11em] text-[var(--v2-ink-400)] uppercase">Статус</span>
              <div className="grid grid-cols-3 gap-0.5 rounded-[14px] bg-[var(--v2-ink-100)] p-1">
                {WISH_STATUSES.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (key === "done") {
                        if (item.status !== "done") onToggle();
                        return;
                      }
                      void onPatch(item.id, { status: key });
                    }}
                    className={`rounded-[11px] px-2 py-[11px] text-[14.5px] font-semibold ${
                      item.status === key
                        ? `bg-white shadow-sm ${key === "saving" ? "text-[var(--v2-brand-700)]" : key === "done" ? "text-[#047857]" : "text-[var(--v2-ink-900)]"}`
                        : "text-[var(--v2-ink-500)]"
                    }`}
                  >
                    {key === "done" ? "✓ " : ""}
                    {WISH_STATUS_LABEL[key]}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold tracking-[0.11em] text-[var(--v2-ink-400)] uppercase">Заметка</span>
              <textarea
                value={note}
                rows={3}
                onChange={(event) => {
                  setNote(event.target.value);
                  schedule();
                }}
                placeholder="Зачем, с кем, какое ощущение"
                className="w-full resize-y rounded-xl bg-[var(--v2-ink-50)] px-3 py-2.5 text-[15px] leading-relaxed outline-none focus:bg-white focus:ring-2 focus:ring-[var(--v2-brand-500)]"
              />
            </label>
            {overflow ? (
              <div className="rounded-[11px] bg-[#fef0c7] px-3 py-2.5 text-[13.5px] text-[#b54708]">
                Уровень «{tier.name}» переполнен: {count} из {tier.limit}. Исполни или убери одну из хотелок этого уровня.
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex flex-row-reverse items-center justify-between gap-2.5 px-7 pt-4 pb-6">
          <button type="button" onClick={() => void close()} className="inline-flex h-11 items-center rounded-[13px] bg-[#2d5eef] px-[18px] text-[14.5px] font-semibold text-white">
            Готово
          </button>
          <button type="button" onClick={() => void onDelete(item.id)} className="rounded-xl px-3 text-[14px] font-semibold text-[#b42318] hover:bg-[#fee4e2]">
            Удалить
          </button>
        </div>
      </aside>
    </div>
  );
}

function StatusPill({ status }: { status: WishStatus }) {
  return (
    <span
      className={`rounded-lg px-2 py-1 text-[12px] font-semibold ${
        status === "saving" ? "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]" : status === "done" ? "bg-[#e7f6f0] text-[#047857]" : "bg-[var(--v2-ink-100)] text-[var(--v2-ink-500)]"
      }`}
    >
      {WISH_STATUS_LABEL[status]}
    </span>
  );
}

function MoneyField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5 rounded-[18px] bg-[var(--v2-ink-50)] px-[18px] py-3.5 focus-within:bg-white focus-within:shadow-[inset_0_0_0_1.5px_var(--v2-brand-500)]">
      <span className="text-[11.5px] font-semibold tracking-[0.13em] text-[var(--v2-ink-400)] uppercase">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <input
          inputMode="numeric"
          value={value}
          placeholder="0"
          onChange={(event) => onChange(moneyText(parseMoney(event.target.value)))}
          className="v2-tnum w-full bg-transparent text-[28px] font-semibold tracking-[-0.03em] outline-none"
        />
        <em className="text-[20px] font-semibold text-[var(--v2-ink-300)] not-italic">₽</em>
      </span>
    </label>
  );
}

function Foundation() {
  return (
    <HomePersonalFinanceProvider>
      <FoundationBody />
    </HomePersonalFinanceProvider>
  );
}

function goalPhoto(title: string) {
  const name = title.toLowerCase();
  if (name.includes("подуш")) return "/home/goal-cushion.png";
  if (name.includes("машин")) return "/home/goal-car.png";
  return null;
}

function FoundationBody() {
  const { dashboard } = useHomePersonalFinance();
  const allocated = allocateGoals(dashboard?.goals ?? [], cushionPool(dashboard?.funds ?? []));
  const cards =
    allocated.length > 0
      ? allocated.map((goal) => ({
          id: goal.id,
          title: goal.title,
          current: goal.filled,
          target: goal.target_rub,
          photo: goalPhoto(goal.title),
        }))
      : [
          { id: "cushion", title: "Подушка безопасности", current: 0, target: 510_000, photo: "/home/goal-cushion.png" },
          { id: "car", title: "Машина", current: 0, target: 0, photo: "/home/goal-car.png" },
        ];
  return (
    <section>
      <div className="mb-4 flex items-baseline gap-3.5">
        <h2 className="v2-tight text-[26px] font-semibold tracking-[-0.03em]">Фундамент</h2>
        <span className="text-[14.5px] text-[var(--v2-ink-500)]">сначала это, потом всё остальное</span>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {cards.map((goal) => {
          const pct = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
          const left = Math.max(goal.target - goal.current, 0);
          return (
            <article key={goal.id} className="v2-card grid overflow-hidden md:grid-cols-[minmax(150px,220px)_minmax(0,1fr)]">
              <div className="min-h-[190px] p-2.5">
                {goal.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={appPath(goal.photo)} alt="" className="h-full w-full rounded-[14px] object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-[14px] bg-[#eef1f6] px-3 text-center text-[13px] text-[var(--v2-ink-400)]">
                    {goal.title}
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center px-6 py-[22px] md:pr-6 md:pl-3.5">
                <h3 className="text-[18px] font-semibold tracking-[-0.02em]">{goal.title}</h3>
                <div className="mt-3 flex flex-wrap items-baseline gap-2">
                  <span className="v2-tnum text-[32px] font-semibold tracking-[-0.035em]">{rub(goal.current)}</span>
                  <span className="v2-tnum text-[14px] text-[var(--v2-ink-400)]">
                    {goal.target > 0 ? `из ${rub(goal.target)}` : "сумма цели не задана"}
                  </span>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
                  <span className="block h-full rounded-full bg-gradient-to-r from-[var(--v2-brand-500)] to-[var(--v2-brand-700)]" style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <div className="v2-tnum mt-2.5 flex justify-between text-[13.5px] text-[var(--v2-ink-500)]">
                  <b className="text-[15px] text-[var(--v2-ink-900)]">{pct}%</b>
                  <span>{goal.target > 0 ? `осталось ${rub(left)}` : ""}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
