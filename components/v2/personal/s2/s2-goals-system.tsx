"use client";

import { useS2 } from "@/components/v2/personal/s2/s2-context";
import { S2Btn, S2Chip, S2Field, S2Overlay, S2Section, s2Area, s2Input } from "@/components/v2/personal/s2/s2-ui";
import {
  S2_ENGINE_MODE,
  S2_GOAL_STATUS,
  type S2Engine,
  type S2EngineMode,
  type S2Goal,
  type S2GoalStatus,
} from "@/lib/v2/s2/types";
import { useState } from "react";

export function S2GoalsPage() {
  const { board, mutate } = useS2();
  const [open, setOpen] = useState<S2Goal | "new" | null>(null);
  if (!board) return <Empty />;

  return (
    <PageWrap>
      <S2Section
        title="Цели"
        hint="Устойчивые состояния, не SMART-кнут"
        action={<S2Btn kind="solid" onClick={() => setOpen("new")}>Цель</S2Btn>}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {board.goals.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setOpen(g)}
              className="rounded-3xl border border-[var(--v2-ink-100)] bg-white p-4 text-left shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="v2-tight text-[16px] font-bold">{g.title}</h3>
                <S2Chip tone="brand">{S2_GOAL_STATUS[g.status]}</S2Chip>
              </div>
              <p className="v2-tight mt-2 line-clamp-3 text-[13px] leading-relaxed text-[var(--v2-ink-600)]">
                {g.essence}
              </p>
            </button>
          ))}
        </div>
      </S2Section>
      {open ? (
        <GoalForm
          goal={open === "new" ? null : open}
          onClose={() => setOpen(null)}
          onSave={async (data, id) => {
            if (id) await mutate({ entity: "goal", action: "update", id, data });
            else await mutate({ entity: "goal", action: "create", data: { ...data, sort_order: board.goals.length } });
            setOpen(null);
          }}
          onDelete={
            open !== "new"
              ? async () => {
                  await mutate({ entity: "goal", action: "delete", id: open.id });
                  setOpen(null);
                }
              : undefined
          }
        />
      ) : null}
    </PageWrap>
  );
}

function GoalForm({
  goal,
  onClose,
  onSave,
  onDelete,
}: {
  goal: S2Goal | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>, id?: string) => Promise<void>;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(goal?.title ?? "");
  const [essence, setEssence] = useState(goal?.essence ?? "");
  const [why, setWhy] = useState(goal?.why_important ?? "");
  const [examples, setExamples] = useState(goal?.examples ?? "");
  const [anti, setAnti] = useState(goal?.anti_distortion ?? "");
  const [status, setStatus] = useState<S2GoalStatus>(goal?.status ?? "building");
  const [whyOpen, setWhyOpen] = useState(Boolean(goal));
  return (
    <S2Overlay title={goal ? goal.title : "Новая цель"} onClose={onClose} wide>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void onSave(
            { title, essence, why_important: why, examples, anti_distortion: anti, status, spotlight: goal?.spotlight ?? false },
            goal?.id
          );
        }}
      >
        <S2Field label="Название">
          <input className={s2Input} value={title} onChange={(e) => setTitle(e.target.value)} />
        </S2Field>
        <S2Field label="Суть">
          <textarea className={s2Area} value={essence} onChange={(e) => setEssence(e.target.value)} />
        </S2Field>
        <S2Field label="Статус">
          <select className={s2Input} value={status} onChange={(e) => setStatus(e.target.value as S2GoalStatus)}>
            {(Object.keys(S2_GOAL_STATUS) as S2GoalStatus[]).map((k) => (
              <option key={k} value={k}>{S2_GOAL_STATUS[k]}</option>
            ))}
          </select>
        </S2Field>
        <button type="button" className="text-[13px] font-semibold text-[var(--v2-brand-600)]" onClick={() => setWhyOpen((v) => !v)}>
          Почему это важно? / Что не превращать в условие счастья
        </button>
        {whyOpen ? (
          <>
            <S2Field label="Почему важно">
              <textarea className={s2Area} value={why} onChange={(e) => setWhy(e.target.value)} />
            </S2Field>
            <S2Field label="Примеры формы">
              <textarea className={s2Area} value={examples} onChange={(e) => setExamples(e.target.value)} />
            </S2Field>
            <S2Field label="Анти-искажение">
              <textarea className={s2Area} value={anti} onChange={(e) => setAnti(e.target.value)} />
            </S2Field>
          </>
        ) : null}
        <div className="flex justify-between pt-1">
          {onDelete ? <S2Btn kind="danger" onClick={() => void onDelete()}>Удалить</S2Btn> : <span />}
          <div className="flex gap-2">
            <S2Btn onClick={onClose}>Отмена</S2Btn>
            <S2Btn kind="solid" type="submit" disabled={!title.trim()}>Сохранить</S2Btn>
          </div>
        </div>
      </form>
    </S2Overlay>
  );
}

export function S2SystemPage() {
  const { board, mutate } = useS2();
  const [open, setOpen] = useState<S2Engine | "new" | null>(null);
  if (!board) return <Empty />;
  const byTitle = (t: string) => board.engines.find((e) => e.title.toLowerCase().includes(t.toLowerCase()));
  const map = [
    { slot: "media", engine: byTitle("Медийность"), className: "lg:col-start-2" },
    { slot: "agency", engine: byTitle("Агентство"), className: "lg:col-start-1 lg:row-start-2" },
    { slot: "core", engine: null, className: "lg:col-start-2 lg:row-start-2" },
    { slot: "saas", engine: byTitle("SaaS"), className: "lg:col-start-3 lg:row-start-2" },
    { slot: "hire", engine: byTitle("Найм"), className: "lg:col-start-1 lg:row-start-3" },
    { slot: "ark", engine: byTitle("Аркалиум"), className: "lg:col-start-3 lg:row-start-3" },
    { slot: "life", engine: byTitle("Отношения"), className: "lg:col-start-2 lg:row-start-4" },
  ];

  return (
    <PageWrap>
      <S2Section title="Система" hint="Функция каждого контура — и что он НЕ обязан делать" action={
        <S2Btn kind="solid" onClick={() => setOpen("new")}>Контур</S2Btn>
      }>
        <div className="grid gap-3 lg:grid-cols-3">
          {map.map((cell) =>
            cell.slot === "core" ? (
              <div key="core" className={`rounded-3xl bg-gradient-to-br from-[var(--v2-ink-900)] to-[var(--v2-brand-800)] p-5 text-white ${cell.className}`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Создатель</p>
                <h3 className="v2-tight mt-1 text-[20px] font-bold">Авторство / субъектность</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/75">
                  Один контур не обязан выполнять все функции сразу.
                </p>
              </div>
            ) : cell.engine ? (
              <button
                key={cell.engine.id}
                type="button"
                onClick={() => setOpen(cell.engine!)}
                className={`rounded-3xl border border-[var(--v2-ink-100)] bg-white p-4 text-left shadow-[var(--v2-shadow-card)] ${cell.className}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="v2-tight text-[15px] font-bold">{cell.engine.title}</h3>
                  <S2Chip>{S2_ENGINE_MODE[cell.engine.mode]}</S2Chip>
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--v2-ink-600)]">{cell.engine.function_text}</p>
                <p className="mt-2 text-[12px] text-[var(--v2-ink-400)]">Не обязан: {cell.engine.not_for}</p>
              </button>
            ) : null
          )}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {board.engines.filter((e) => !map.some((m) => m.engine?.id === e.id)).map((e) => (
            <button key={e.id} type="button" onClick={() => setOpen(e)} className="rounded-2xl bg-white p-4 text-left shadow-[var(--v2-shadow-card)]">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{e.title}</h3>
                <S2Chip>{S2_ENGINE_MODE[e.mode]}</S2Chip>
              </div>
              <p className="mt-1 text-[13px] text-[var(--v2-ink-600)]">{e.function_text}</p>
            </button>
          ))}
        </div>
      </S2Section>
      {open ? (
        <EngineForm
          engine={open === "new" ? null : open}
          bets={board.bets.filter((b) => (open === "new" ? false : b.engine_id === open.id))}
          onClose={() => setOpen(null)}
          onSave={async (data, id) => {
            if (id) await mutate({ entity: "engine", action: "update", id, data });
            else await mutate({ entity: "engine", action: "create", data: { ...data, sort_order: board.engines.length } });
            setOpen(null);
          }}
        />
      ) : null}
    </PageWrap>
  );
}

function EngineForm({
  engine,
  bets,
  onClose,
  onSave,
}: {
  engine: S2Engine | null;
  bets: { id: string; title: string }[];
  onClose: () => void;
  onSave: (data: Record<string, unknown>, id?: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(engine?.title ?? "");
  const [fn, setFn] = useState(engine?.function_text ?? "");
  const [notFor, setNotFor] = useState(engine?.not_for ?? "");
  const [good, setGood] = useState(engine?.good_scenario ?? "");
  const [red, setRed] = useState(engine?.red_line ?? "");
  const [mode, setMode] = useState<S2EngineMode>(engine?.mode ?? "active");
  const [metrics, setMetrics] = useState(engine?.metrics ?? "");
  return (
    <S2Overlay title={engine ? engine.title : "Новый контур"} onClose={onClose} wide>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void onSave(
            { title, function_text: fn, not_for: notFor, good_scenario: good, red_line: red, mode, metrics },
            engine?.id
          );
        }}
      >
        <S2Field label="Название"><input className={s2Input} value={title} onChange={(e) => setTitle(e.target.value)} /></S2Field>
        <S2Field label="Функция"><textarea className={s2Area} value={fn} onChange={(e) => setFn(e.target.value)} /></S2Field>
        <S2Field label="Не обязан"><textarea className={s2Area} value={notFor} onChange={(e) => setNotFor(e.target.value)} /></S2Field>
        <S2Field label="Хороший сценарий"><textarea className={s2Area} value={good} onChange={(e) => setGood(e.target.value)} /></S2Field>
        <S2Field label="Красная линия"><textarea className={s2Area} value={red} onChange={(e) => setRed(e.target.value)} /></S2Field>
        <S2Field label="Режим">
          <select className={s2Input} value={mode} onChange={(e) => setMode(e.target.value as S2EngineMode)}>
            {(Object.keys(S2_ENGINE_MODE) as S2EngineMode[]).map((k) => (
              <option key={k} value={k}>{S2_ENGINE_MODE[k]}</option>
            ))}
          </select>
        </S2Field>
        <S2Field label="Метрики"><textarea className={s2Area} value={metrics} onChange={(e) => setMetrics(e.target.value)} /></S2Field>
        {bets.length ? (
          <div>
            <p className="text-[12px] font-medium text-[var(--v2-ink-600)]">Связанные ставки</p>
            <ul className="mt-1 text-[13px] text-[var(--v2-ink-800)]">
              {bets.map((b) => <li key={b.id}>{b.title}</li>)}
            </ul>
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <S2Btn onClick={onClose}>Отмена</S2Btn>
          <S2Btn kind="solid" type="submit">Сохранить</S2Btn>
        </div>
      </form>
    </S2Overlay>
  );
}

function PageWrap({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1180px] px-5 py-7 lg:px-8">{children}</div>;
}
function Empty() {
  return <p className="px-6 py-10 text-[13px] text-[var(--v2-ink-400)]">Загрузка…</p>;
}
