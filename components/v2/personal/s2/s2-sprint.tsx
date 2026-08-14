"use client";

import { useS2 } from "@/components/v2/personal/s2/s2-context";
import { S2Btn, S2Chip, S2Field, S2Overlay, S2Section, s2Area, s2Input } from "@/components/v2/personal/s2/s2-ui";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  S2_ACTIVE_BET_STATUSES,
  S2_BET_FRONT,
  S2_BET_STATUS,
  type S2Bet,
  type S2BetFront,
  type S2BetStatus,
} from "@/lib/v2/s2/types";
import { useState } from "react";

export function S2SprintPage() {
  const { board, mutate } = useS2();
  const [open, setOpen] = useState<S2Bet | "new" | null>(null);
  const [force, setForce] = useState(false);
  const [limitMsg, setLimitMsg] = useState<string | null>(null);
  if (!board) return <p className="px-6 py-10 text-[13px] text-[var(--v2-ink-400)]">Загрузка…</p>;
  const sprint = board.sprint;

  return (
    <div className="mx-auto max-w-[1180px] px-5 py-7 lg:px-8">
      <div className="rounded-3xl border border-[var(--v2-ink-100)] bg-white p-5 shadow-[var(--v2-shadow-card)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-ink-400)]">Спринт</p>
        <h1 className="v2-tight mt-1 text-[26px] font-bold">{sprint?.title ?? "Нет активного спринта"}</h1>
        {sprint ? (
          <>
            <p className="mt-2 text-[13px] text-[var(--v2-ink-500)]">
              {sprint.start_date} — {sprint.end_date} · review {sprint.next_review_date ?? "—"}
            </p>
            <p className="v2-tight mt-3 text-[15px] font-semibold text-[var(--v2-ink-900)]">{sprint.core_question}</p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--v2-ink-600)]">{sprint.meta_principle}</p>
            <p className="mt-3 text-[12.5px] text-[var(--v2-ink-500)]">
              Лимит: один активный эксперимент на фронте · максимум {6} ставок
            </p>
          </>
        ) : (
          <p className="mt-2 text-[13px] text-[var(--v2-ink-500)]">
            Стратегия может жить без спринта, но гипотезы не получат общий review.
          </p>
        )}
      </div>

      {sprint?.stages?.length ? (
        <S2Section title="Timeline месяцев">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {sprint.stages.map((s) => (
              <div key={s.title} className="rounded-2xl bg-white p-3.5 shadow-[var(--v2-shadow-card)]">
                <h3 className="text-[13px] font-bold">{s.title}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--v2-ink-600)]">{s.role}</p>
                <p className="mt-1 text-[12px] text-[var(--v2-ink-400)]">{s.example}</p>
              </div>
            ))}
          </div>
        </S2Section>
      ) : null}

      <S2Section title="Гипотезы" action={<S2Btn kind="solid" onClick={() => setOpen("new")}>Ставка</S2Btn>}>
        <div className="space-y-3">
          {board.bets.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setOpen(b)}
              className="w-full rounded-3xl border border-[var(--v2-ink-100)] bg-white p-4 text-left shadow-[var(--v2-shadow-card)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="v2-tight text-[16px] font-bold">{b.title}</h3>
                <S2Chip tone={S2_ACTIVE_BET_STATUSES.includes(b.status) ? "brand" : "ink"}>
                  {S2_BET_STATUS[b.status]}
                </S2Chip>
                <S2Chip>{S2_BET_FRONT[b.front]}</S2Chip>
              </div>
              <p className="v2-tight mt-2 line-clamp-2 text-[13.5px] text-[var(--v2-ink-700)]">{b.hypothesis}</p>
              <p className="mt-2 text-[12.5px] text-[var(--v2-ink-500)]">Дальше: {b.next_action || "—"}</p>
            </button>
          ))}
        </div>
      </S2Section>

      {open ? (
        <BetForm
          bet={open === "new" ? null : open}
          engines={board.engines}
          sprintId={sprint?.id ?? null}
          force={force}
          limitMsg={limitMsg}
          onClose={() => { setOpen(null); setLimitMsg(null); setForce(false); }}
          onTask={async (title) => {
            await fetchJson("/api/v2/personal/todos", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title }),
            });
          }}
          onSave={async (data, id) => {
            try {
              const res = await mutate({
                entity: "bet",
                action: id ? "update" : "create",
                id,
                data: { ...data, sprint_id: sprint?.id ?? null },
                force,
              });
              if (res.warning) setLimitMsg(res.warning);
              setOpen(null);
              setForce(false);
              setLimitMsg(null);
            } catch (e) {
              setLimitMsg(e instanceof Error ? e.message : "Лимит");
              setForce(true);
            }
          }}
          onDelete={
            open !== "new"
              ? async () => {
                  await mutate({ entity: "bet", action: "delete", id: open.id });
                  setOpen(null);
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}

function BetForm({
  bet,
  engines,
  sprintId,
  force,
  limitMsg,
  onClose,
  onSave,
  onDelete,
  onTask,
}: {
  bet: S2Bet | null;
  engines: { id: string; title: string }[];
  sprintId: string | null;
  force: boolean;
  limitMsg: string | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>, id?: string) => Promise<void>;
  onDelete?: () => void;
  onTask: (title: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(bet?.title ?? "");
  const [hypothesis, setHypothesis] = useState(bet?.hypothesis ?? "");
  const [why, setWhy] = useState(bet?.why ?? "");
  const [minimal, setMinimal] = useState(bet?.minimal_test ?? "");
  const [sufficient, setSufficient] = useState(bet?.sufficient_action ?? "");
  const [ok, setOk] = useState(bet?.success_signals ?? "");
  const [fail, setFail] = useState(bet?.fail_signals ?? "");
  const [threshold, setThreshold] = useState(bet?.threshold ?? "");
  const [next, setNext] = useState(bet?.next_action ?? "");
  const [front, setFront] = useState<S2BetFront>(bet?.front ?? "other");
  const [status, setStatus] = useState<S2BetStatus>(bet?.status ?? "testing");
  const [engineId, setEngineId] = useState(bet?.engine_id ?? "");
  const [review, setReview] = useState(bet?.review_date ?? "");
  return (
    <S2Overlay title={bet ? bet.title : "Новая ставка"} onClose={onClose} wide>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void onSave(
            {
              title,
              hypothesis,
              why,
              minimal_test: minimal,
              sufficient_action: sufficient,
              success_signals: ok,
              fail_signals: fail,
              threshold,
              next_action: next,
              front,
              status,
              engine_id: engineId || null,
              review_date: review || null,
              sprint_id: sprintId,
            },
            bet?.id
          );
        }}
      >
        {limitMsg ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-950">
            {limitMsg} {force ? "Нажми сохранить ещё раз, чтобы подтвердить превышение." : ""}
          </p>
        ) : null}
        <S2Field label="Название"><input className={s2Input} value={title} onChange={(e) => setTitle(e.target.value)} /></S2Field>
        <S2Field label="Предположение"><textarea className={s2Area} value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} /></S2Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <S2Field label="Фронт">
            <select className={s2Input} value={front} onChange={(e) => setFront(e.target.value as S2BetFront)}>
              {(Object.keys(S2_BET_FRONT) as S2BetFront[]).map((k) => <option key={k} value={k}>{S2_BET_FRONT[k]}</option>)}
            </select>
          </S2Field>
          <S2Field label="Статус">
            <select className={s2Input} value={status} onChange={(e) => setStatus(e.target.value as S2BetStatus)}>
              {(Object.keys(S2_BET_STATUS) as S2BetStatus[]).map((k) => <option key={k} value={k}>{S2_BET_STATUS[k]}</option>)}
            </select>
          </S2Field>
        </div>
        <S2Field label="Контур">
          <select className={s2Input} value={engineId} onChange={(e) => setEngineId(e.target.value)}>
            <option value="">—</option>
            {engines.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </S2Field>
        <S2Field label="Минимальный тест"><textarea className={s2Area} value={minimal} onChange={(e) => setMinimal(e.target.value)} /></S2Field>
        <S2Field label="Достаточное действие"><textarea className={s2Area} value={sufficient} onChange={(e) => setSufficient(e.target.value)} /></S2Field>
        <S2Field label="Сигналы успеха"><textarea className={s2Area} value={ok} onChange={(e) => setOk(e.target.value)} /></S2Field>
        <S2Field label="Сигналы провала"><textarea className={s2Area} value={fail} onChange={(e) => setFail(e.target.value)} /></S2Field>
        <S2Field label="Порог решения"><textarea className={s2Area} value={threshold} onChange={(e) => setThreshold(e.target.value)} /></S2Field>
        <S2Field label="Следующее действие"><input className={s2Input} value={next} onChange={(e) => setNext(e.target.value)} /></S2Field>
        <S2Field label="Дата review"><input className={s2Input} type="date" value={review} onChange={(e) => setReview(e.target.value)} /></S2Field>
        <S2Field label="Зачем"><textarea className={s2Area} value={why} onChange={(e) => setWhy(e.target.value)} /></S2Field>
        <div className="flex flex-wrap justify-between gap-2">
          <div className="flex gap-2">
            {onDelete ? <S2Btn kind="danger" onClick={() => void onDelete()}>Удалить</S2Btn> : null}
            {next.trim() ? (
              <S2Btn onClick={() => void onTask(next.trim())}>Создать задачу</S2Btn>
            ) : null}
          </div>
          <div className="flex gap-2">
            <S2Btn onClick={onClose}>Отмена</S2Btn>
            <S2Btn kind="solid" type="submit">{force ? "Всё равно сохранить" : "Сохранить"}</S2Btn>
          </div>
        </div>
      </form>
    </S2Overlay>
  );
}
