"use client";

import { useS2 } from "@/components/v2/personal/s2/s2-context";
import { S2Btn, S2Chip, S2Overlay, S2Section, s2Input } from "@/components/v2/personal/s2/s2-ui";
import { appPath } from "@/lib/api-url";
import {
  S2_BET_STATUS,
  S2_CONSTITUTION,
  S2_GOAL_STATUS,
  S2_SPOTLIGHT,
  type S2SpotlightKey,
} from "@/lib/v2/s2/types";
import { S2_ACTIVE_BET_STATUSES } from "@/lib/v2/s2/types";
import Link from "next/link";
import { useMemo, useState } from "react";

const MONTHS = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
}

export function S2Overview() {
  const { board, loading, mutate } = useS2();
  const [whyOpen, setWhyOpen] = useState(false);
  const [constOpen, setConstOpen] = useState(false);
  const [outcomeTitle, setOutcomeTitle] = useState("");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const activeBets = useMemo(
    () => (board?.bets ?? []).filter((b) => S2_ACTIVE_BET_STATUSES.includes(b.status)).slice(0, 6),
    [board]
  );
  const spotlightGoals = (board?.goals ?? []).filter((g) => g.spotlight).slice(0, 6);
  const monthOutcomes = (board?.monthOutcomes ?? []).filter((o) => o.year === year && o.month === month);
  const strongSignals = (board?.evidence ?? []).filter((e) => e.weight === "strong").length;
  const enginesByKey = new Map(
    (board?.engines ?? [])
      .filter((e) => e.spotlight_key)
      .map((e) => [e.spotlight_key as S2SpotlightKey, e])
  );

  if (loading && !board) {
    return <p className="px-6 py-10 text-[13px] text-[var(--v2-ink-400)]">Загрузка…</p>;
  }
  if (!board) return null;
  const sprint = board.sprint;
  const prana = board.prana;

  return (
    <div className="mx-auto max-w-[1180px] px-5 py-7 lg:px-8">
      <div className="overflow-hidden rounded-[28px] border border-[var(--v2-ink-100)] bg-white shadow-[var(--v2-shadow-card)]">
        <div className="bg-gradient-to-br from-[var(--v2-brand-600)] via-[var(--v2-brand-500)] to-[#1F3AAF] px-6 py-7 text-white lg:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
            Strategy 2.0 · {sprint?.title ?? "Нет спринта"}
            {sprint ? `  ·  ${fmtDate(sprint.start_date)} — ${fmtDate(sprint.end_date)}` : ""}
          </p>
          <h1 className="v2-tighter mt-2 text-[32px] font-bold leading-[1.1] sm:text-[40px]">
            {sprint?.main_task || "Создать опору и дать реальности ответить"}
          </h1>
          <p className="mt-3 max-w-[62ch] text-[14px] leading-relaxed text-white/85">
            Критерий: {sprint?.success_criterion || "Что стало очевидным?"}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-[12.5px]">
            <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">
              Активных гипотез {activeBets.length}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">
              Сильных сигналов {strongSignals}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">
              Review {fmtDate(sprint?.next_review_date ?? null)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3">
          <button
            type="button"
            onClick={() => setWhyOpen((v) => !v)}
            className="text-[13px] font-semibold text-[var(--v2-brand-600)]"
          >
            {whyOpen ? "Скрыть «Почему?»" : "Почему?"}
          </button>
          <button
            type="button"
            onClick={() => setConstOpen(true)}
            className="text-[13px] font-medium text-[var(--v2-ink-500)]"
          >
            Конституция сезона
          </button>
        </div>
        {whyOpen && sprint?.meta_principle ? (
          <p className="v2-tight border-t border-[var(--v2-ink-100)] px-6 py-4 text-[14px] leading-relaxed text-[var(--v2-ink-700)]">
            {sprint.meta_principle}
          </p>
        ) : null}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(S2_SPOTLIGHT) as S2SpotlightKey[]).map((key) => {
          const meta = S2_SPOTLIGHT[key];
          const engine = enginesByKey.get(key);
          return (
            <Link
              key={key}
              href={appPath("/v2/personal/strategy2/system")}
              className="rounded-3xl border border-[var(--v2-ink-100)] bg-white p-4 shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-ink-400)]">
                {meta.label}
              </p>
              <h3 className="v2-tight mt-1 text-[16px] font-bold text-[var(--v2-ink-900)]">
                {engine?.title ?? meta.label}
              </h3>
              <p className="v2-tight mt-2 line-clamp-4 text-[12.5px] leading-relaxed text-[var(--v2-ink-600)]">
                {meta.now}
              </p>
            </Link>
          );
        })}
      </div>

      <S2Section title="Что я строю" hint="Состояния, не проценты" action={
        <Link href={appPath("/v2/personal/strategy2/goals")} className="text-[12px] font-semibold text-[var(--v2-brand-600)]">
          Все цели →
        </Link>
      }>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {spotlightGoals.map((g) => (
            <div key={g.id} className="rounded-2xl border border-[var(--v2-ink-100)] bg-white px-4 py-3.5 shadow-[var(--v2-shadow-card)]">
              <div className="flex items-start justify-between gap-2">
                <h3 className="v2-tight text-[14px] font-bold text-[var(--v2-ink-900)]">{g.title}</h3>
                <S2Chip tone="brand">{S2_GOAL_STATUS[g.status]}</S2Chip>
              </div>
              <p className="v2-tight mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-[var(--v2-ink-600)]">
                {g.essence}
              </p>
            </div>
          ))}
        </div>
      </S2Section>

      <S2Section title="Активные ставки" hint="Только то, что сейчас получает ресурс" action={
        <Link href={appPath("/v2/personal/strategy2/sprint")} className="text-[12px] font-semibold text-[var(--v2-brand-600)]">
          Спринт →
        </Link>
      }>
        <div className="grid gap-3 lg:grid-cols-2">
          {activeBets.map((b) => (
            <article key={b.id} className="rounded-3xl border border-[var(--v2-ink-100)] bg-white p-4 shadow-[var(--v2-shadow-card)]">
              <div className="flex items-center justify-between gap-2">
                <h3 className="v2-tight text-[15px] font-bold text-[var(--v2-ink-900)]">{b.title}</h3>
                <S2Chip>{S2_BET_STATUS[b.status]}</S2Chip>
              </div>
              <p className="v2-tight mt-2 line-clamp-3 text-[13px] leading-relaxed text-[var(--v2-ink-700)]">
                {b.hypothesis}
              </p>
              <p className="mt-3 text-[12.5px] text-[var(--v2-ink-500)]">
                Дальше: {b.next_action || "—"}
              </p>
              <p className="mt-1 text-[12px] text-[var(--v2-ink-400)]">
                Сигналов {board.evidence.filter((e) => e.bet_id === b.id).length}
                {b.review_date ? ` · review ${fmtDate(b.review_date)}` : ""}
              </p>
            </article>
          ))}
        </div>
      </S2Section>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <S2Section title="Не в этом сезоне">
          <ul className="space-y-2 rounded-3xl border border-red-100 bg-red-50/60 p-4">
            {board.constraints.map((c) => (
              <li key={c.id} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                <p className="v2-tight text-[13.5px] leading-snug text-red-950/90">{c.title}</p>
              </li>
            ))}
          </ul>
        </S2Section>

        <S2Section title="Этот месяц" hint={MONTHS[month - 1]}>
          <ul className="space-y-2">
            {monthOutcomes.map((o) => (
              <li key={o.id} className="flex items-start gap-2 rounded-2xl bg-white px-3 py-2.5 shadow-[var(--v2-shadow-card)]">
                <input
                  type="checkbox"
                  checked={o.done}
                  onChange={() => void mutate({ entity: "month_outcome", action: "update", id: o.id, data: { done: !o.done } })}
                  className="mt-1"
                />
                <p className={`v2-tight text-[13.5px] ${o.done ? "text-[var(--v2-ink-400)] line-through" : "text-[var(--v2-ink-800)]"}`}>
                  {o.title}
                </p>
              </li>
            ))}
          </ul>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!outcomeTitle.trim()) return;
              void mutate({
                entity: "month_outcome",
                action: "create",
                data: { title: outcomeTitle.trim(), year, month },
              }).then(() => setOutcomeTitle(""));
            }}
          >
            <input className={s2Input} value={outcomeTitle} onChange={(e) => setOutcomeTitle(e.target.value)} placeholder="Исход месяца…" />
            <S2Btn kind="solid" type="submit">+</S2Btn>
          </form>
        </S2Section>
      </div>

      <S2Section title="Prana floor" hint="Эта неделя имеет достаточно жизни? Без streak и вины">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <PranaCard
            label="Тренировки"
            hint="3 за неделю"
            value={`${prana?.training_count ?? 0}/3`}
            onClick={() =>
              void mutate({
                entity: "prana",
                action: "update",
                data: {
                  id: prana?.id,
                  training_count: Math.min(7, (prana?.training_count ?? 0) + 1),
                  walk: prana?.walk,
                  white_window: prana?.white_window,
                  social: prana?.social,
                  creative: prana?.creative,
                },
              })
            }
          />
          <PranaToggle label="Прогулка" on={Boolean(prana?.walk)} field="walk" prana={prana} mutate={mutate} />
          <PranaToggle label="Белое окно" on={Boolean(prana?.white_window)} field="white_window" prana={prana} mutate={mutate} />
          <PranaToggle label="Соц. событие" on={Boolean(prana?.social)} field="social" prana={prana} mutate={mutate} />
          <PranaToggle label="Творчество" on={Boolean(prana?.creative)} field="creative" prana={prana} mutate={mutate} />
        </div>
      </S2Section>

      {constOpen ? (
        <S2Overlay title="Конституция сезона" onClose={() => setConstOpen(false)} wide>
          <ul className="space-y-2.5">
            {S2_CONSTITUTION.map((line) => (
              <li key={line} className="v2-tight text-[14px] leading-relaxed text-[var(--v2-ink-800)]">
                {line}
              </li>
            ))}
          </ul>
        </S2Overlay>
      ) : null}
    </div>
  );
}

function PranaCard({ label, hint, value, onClick }: { label: string; hint: string; value: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-2xl border border-[var(--v2-ink-100)] bg-white p-4 text-left shadow-[var(--v2-shadow-card)]">
      <p className="text-[12px] font-semibold text-[var(--v2-ink-500)]">{label}</p>
      <p className="v2-tnum mt-1 text-[22px] font-bold text-[var(--v2-ink-900)]">{value}</p>
      <p className="mt-1 text-[11px] text-[var(--v2-ink-400)]">{hint}</p>
    </button>
  );
}

function PranaToggle({
  label,
  on,
  field,
  prana,
  mutate,
}: {
  label: string;
  on: boolean;
  field: "walk" | "white_window" | "social" | "creative";
  prana: { id?: string; training_count?: number; walk?: boolean; white_window?: boolean; social?: boolean; creative?: boolean } | null;
  mutate: ReturnType<typeof useS2>["mutate"];
}) {
  return (
    <button
      type="button"
      onClick={() =>
        void mutate({
          entity: "prana",
          action: "update",
          data: {
            id: prana?.id,
            training_count: prana?.training_count ?? 0,
            walk: field === "walk" ? !on : Boolean(prana?.walk),
            white_window: field === "white_window" ? !on : Boolean(prana?.white_window),
            social: field === "social" ? !on : Boolean(prana?.social),
            creative: field === "creative" ? !on : Boolean(prana?.creative),
          },
        })
      }
      className={`rounded-2xl border p-4 text-left shadow-[var(--v2-shadow-card)] ${
        on ? "border-emerald-200 bg-emerald-50" : "border-[var(--v2-ink-100)] bg-white"
      }`}
    >
      <p className="text-[12px] font-semibold text-[var(--v2-ink-500)]">{label}</p>
      <p className="mt-1 text-[18px] font-bold text-[var(--v2-ink-900)]">{on ? "Есть" : "Нет"}</p>
    </button>
  );
}
