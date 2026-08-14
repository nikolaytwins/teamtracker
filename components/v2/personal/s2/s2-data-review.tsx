"use client";

import { useS2 } from "@/components/v2/personal/s2/s2-context";
import { S2Btn, S2Chip, S2Field, S2Overlay, S2Section, s2Area, s2Input } from "@/components/v2/personal/s2/s2-ui";
import {
  S2_BET_STATUS,
  S2_EVIDENCE_TYPE,
  S2_EVIDENCE_WEIGHT,
  S2_SIGNAL_TYPE,
  type S2BetStatus,
  type S2EvidenceType,
  type S2EvidenceWeight,
} from "@/lib/v2/s2/types";
import { useMemo, useState } from "react";

export function S2DataPage() {
  const { board, mutate } = useS2();
  const [open, setOpen] = useState(false);
  const [betFilter, setBetFilter] = useState("all");
  const [strongOnly, setStrongOnly] = useState(false);
  const [returnsOnly, setReturnsOnly] = useState(false);
  if (!board) return <p className="px-6 py-10 text-[13px] text-[var(--v2-ink-400)]">Загрузка…</p>;

  const evidence = board.evidence.filter((e) => {
    if (betFilter !== "all" && e.bet_id !== betFilter) return false;
    if (strongOnly && e.weight !== "strong") return false;
    return true;
  });
  const signals = board.signals.filter((s) => (returnsOnly ? s.type === "returns" : true));

  return (
    <div className="mx-auto max-w-[1180px] px-5 py-7 lg:px-8">
      <S2Section title="Данные" hint="Что реально произошло — отдельно от интерпретации" action={
        <S2Btn kind="solid" onClick={() => setOpen(true)}>+ Evidence</S2Btn>
      }>
        <div className="mb-4 flex flex-wrap gap-2">
          <select className="v2-input h-8 text-[12.5px]" value={betFilter} onChange={(e) => setBetFilter(e.target.value)}>
            <option value="all">Все ставки</option>
            {board.bets.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
          <S2Btn onClick={() => setStrongOnly((v) => !v)}>{strongOnly ? "Все веса" : "Только сильные"}</S2Btn>
          <S2Btn onClick={() => setReturnsOnly((v) => !v)}>{returnsOnly ? "Все сигналы" : "Само вернулось"}</S2Btn>
        </div>

        {!evidence.length ? (
          <p className="rounded-3xl border border-dashed border-[var(--v2-ink-200)] bg-white px-6 py-12 text-center text-[13px] text-[var(--v2-ink-500)]">
            Реальность еще не ответила — добавляй только значимые факты, не нужно вести дневник.
          </p>
        ) : (
          <div className="space-y-3">
            {evidence.map((e) => (
              <article key={e.id} className="rounded-3xl border border-[var(--v2-ink-100)] bg-white p-4 shadow-[var(--v2-shadow-card)]">
                <div className="flex flex-wrap items-center gap-2">
                  <S2Chip>{S2_EVIDENCE_TYPE[e.type]}</S2Chip>
                  <S2Chip tone={e.weight === "strong" ? "green" : e.weight === "weak" ? "ink" : "brand"}>
                    {S2_EVIDENCE_WEIGHT[e.weight]}
                  </S2Chip>
                  <span className="text-[12px] text-[var(--v2-ink-400)]">{e.happened_on}</span>
                </div>
                <p className="v2-tight mt-2 text-[15px] font-semibold leading-snug text-[var(--v2-ink-900)]">{e.fact}</p>
                {e.interpretation ? (
                  <p className="mt-2 border-l-2 border-[var(--v2-ink-200)] pl-3 text-[13px] italic text-[var(--v2-ink-500)]">
                    Интерпретация: {e.interpretation}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </S2Section>

      <S2Section title="Само возвращается" hint="Повторяемость важнее силы одного импульса">
        {!signals.length ? (
          <p className="text-[13px] text-[var(--v2-ink-500)]">Если ничего не возвращается — ничего записывать не нужно.</p>
        ) : (
          <ul className="space-y-2">
            {signals.map((s) => (
              <li key={s.id} className="rounded-2xl bg-white px-4 py-3 shadow-[var(--v2-shadow-card)]">
                <S2Chip tone="amber">{S2_SIGNAL_TYPE[s.type]}</S2Chip>
                <p className="mt-1 text-[14px]">{s.text}</p>
              </li>
            ))}
          </ul>
        )}
      </S2Section>

      {open ? (
        <EvidenceForm
          bets={board.bets}
          onClose={() => setOpen(false)}
          onSave={async (data) => {
            await mutate({ entity: "evidence", action: "create", data });
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function EvidenceForm({
  bets,
  onClose,
  onSave,
}: {
  bets: { id: string; title: string }[];
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [fact, setFact] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [type, setType] = useState<S2EvidenceType>("neutral");
  const [weight, setWeight] = useState<S2EvidenceWeight>("medium");
  const [betId, setBetId] = useState("");
  const [next, setNext] = useState("");
  return (
    <S2Overlay title="Evidence" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void onSave({ fact, interpretation, type, weight, bet_id: betId || null, next_action: next }); }}>
        <S2Field label="Факт (только наблюдаемое)">
          <textarea className={s2Area} autoFocus value={fact} onChange={(e) => setFact(e.target.value)} />
        </S2Field>
        <S2Field label="Интерпретация (отдельно, необязательно)">
          <textarea className={s2Area} value={interpretation} onChange={(e) => setInterpretation(e.target.value)} />
        </S2Field>
        <div className="grid grid-cols-2 gap-3">
          <S2Field label="Тип">
            <select className={s2Input} value={type} onChange={(e) => setType(e.target.value as S2EvidenceType)}>
              {(Object.keys(S2_EVIDENCE_TYPE) as S2EvidenceType[]).map((k) => <option key={k} value={k}>{S2_EVIDENCE_TYPE[k]}</option>)}
            </select>
          </S2Field>
          <S2Field label="Вес">
            <select className={s2Input} value={weight} onChange={(e) => setWeight(e.target.value as S2EvidenceWeight)}>
              {(Object.keys(S2_EVIDENCE_WEIGHT) as S2EvidenceWeight[]).map((k) => <option key={k} value={k}>{S2_EVIDENCE_WEIGHT[k]}</option>)}
            </select>
          </S2Field>
        </div>
        <S2Field label="Связанная ставка">
          <select className={s2Input} value={betId} onChange={(e) => setBetId(e.target.value)}>
            <option value="">—</option>
            {bets.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
        </S2Field>
        <S2Field label="Следующее действие"><input className={s2Input} value={next} onChange={(e) => setNext(e.target.value)} /></S2Field>
        <div className="flex justify-end gap-2">
          <S2Btn onClick={onClose}>Отмена</S2Btn>
          <S2Btn kind="solid" type="submit" disabled={!fact.trim()}>Сохранить</S2Btn>
        </div>
      </form>
    </S2Overlay>
  );
}

const REVIEW_QUESTIONS = [
  "Подходит ли мне конкретный тип найма?",
  "Способен ли Qmagic давать живой рыночный сигнал?",
  "Сколько агентство реально приносит в пассивной конфигурации на час моего внимания?",
  "Какой контент действительно притягивает правильных людей?",
  "Что из моих интересов возвращалось спустя время, а что оказалось эмоциональным всплеском?",
  "Что произошло с энергией, когда я перестал постоянно форсировать результат?",
  "Какие новые люди / возможности появились из внешней среды?",
  "Какие вопросы теперь можно решить, а какие по-прежнему честно остаются «не знаю»?",
];

export function S2ReviewPage() {
  const { board, mutate } = useS2();
  const [summary, setSummary] = useState("");
  const [nextArch, setNextArch] = useState("");
  if (!board) return <p className="px-6 py-10 text-[13px] text-[var(--v2-ink-400)]">Загрузка…</p>;
  const sprint = board.sprint;
  const strong = board.evidence.filter((e) => e.weight === "strong");
  const returns = board.signals.filter((s) => s.type === "returns");
  const dueDecisions = board.decisions.filter((d) => d.revisit_date && d.revisit_date <= new Date().toISOString().slice(0, 10));

  const groupedReturns = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of returns) {
      const key = s.text.slice(0, 48);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [returns]);

  return (
    <div className="mx-auto max-w-[1180px] px-5 py-7 lg:px-8">
      <div className="rounded-3xl bg-white p-5 shadow-[var(--v2-shadow-card)]">
        <h1 className="v2-tight text-[26px] font-bold">Review</h1>
        <p className="mt-1 text-[13px] text-[var(--v2-ink-500)]">{sprint?.title} · {sprint?.core_question}</p>
      </div>

      <S2Section title="Ставки">
        <div className="space-y-3">
          {board.bets.map((b) => (
            <div key={b.id} className="rounded-2xl bg-white p-4 shadow-[var(--v2-shadow-card)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">{b.title}</h3>
                <select
                  className="v2-input h-8 w-[160px] text-[12.5px]"
                  value={b.status}
                  onChange={(e) => void mutate({ entity: "bet", action: "update", id: b.id, data: { status: e.target.value } })}
                >
                  {(Object.keys(S2_BET_STATUS) as S2BetStatus[]).map((k) => (
                    <option key={k} value={k}>{S2_BET_STATUS[k]}</option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-[13px] text-[var(--v2-ink-600)]">{b.hypothesis}</p>
              <p className="mt-2 text-[12px] text-[var(--v2-ink-400)]">
                Evidence: {board.evidence.filter((e) => e.bet_id === b.id).length}
              </p>
            </div>
          ))}
        </div>
      </S2Section>

      <S2Section title="Сильные факты">
        {strong.length ? strong.map((e) => (
          <p key={e.id} className="mb-2 rounded-xl bg-white px-3 py-2 text-[13.5px]">{e.fact}</p>
        )) : <p className="text-[13px] text-[var(--v2-ink-500)]">Пока нет сильных сигналов — это нормально.</p>}
      </S2Section>

      <S2Section title="Что возвращалось само">
        {groupedReturns.length ? groupedReturns.map(([t, n]) => (
          <p key={t} className="text-[13.5px]">{t} · {n}×</p>
        )) : <p className="text-[13px] text-[var(--v2-ink-500)]">Пока пусто.</p>}
      </S2Section>

      <S2Section title="Решения, срок которых наступил">
        {dueDecisions.length ? dueDecisions.map((d) => (
          <p key={d.id} className="text-[13.5px]">{d.question} — {d.position}</p>
        )) : <p className="text-[13px] text-[var(--v2-ink-500)]">Нет вопросов с наступившей датой.</p>}
      </S2Section>

      <S2Section title="Обязательные вопросы">
        <ul className="space-y-2">
          {REVIEW_QUESTIONS.map((q) => (
            <li key={q} className="v2-tight text-[14px] text-[var(--v2-ink-800)]">{q}</li>
          ))}
        </ul>
      </S2Section>

      <S2Section title="Закрыть цикл">
        <S2Field label="Что стало очевидным">
          <textarea className={s2Area} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </S2Field>
        <div className="mt-3">
          <S2Field label="Следующая архитектура">
            <textarea className={s2Area} value={nextArch} onChange={(e) => setNextArch(e.target.value)} />
          </S2Field>
        </div>
        <div className="mt-3">
          <S2Btn
            kind="solid"
            onClick={() =>
              void mutate({
                entity: "review",
                action: "create",
                data: { sprint_id: sprint?.id ?? null, summary, next_architecture: nextArch },
              }).then(() => {
                setSummary("");
                setNextArch("");
              })
            }
          >
            Сохранить review
          </S2Btn>
        </div>
        {board.reviews.length ? (
          <div className="mt-6 space-y-2">
            {board.reviews.map((r) => (
              <div key={r.id} className="rounded-2xl bg-[var(--v2-ink-50)] p-3 text-[13px]">
                <p className="text-[11px] text-[var(--v2-ink-400)]">{r.created_at.slice(0, 10)}</p>
                <p className="mt-1">{r.summary}</p>
              </div>
            ))}
          </div>
        ) : null}
      </S2Section>
    </div>
  );
}
