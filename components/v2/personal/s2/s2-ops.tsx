"use client";

import { useS2 } from "@/components/v2/personal/s2/s2-context";
import { S2Btn, S2Chip, S2Field, S2Overlay, S2Section, s2Area, s2Input } from "@/components/v2/personal/s2/s2-ui";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  S2_BACKLOG_CATEGORY,
  S2_DECISION_STATUS,
  type S2BacklogCategory,
  type S2BacklogItem,
  type S2Decision,
  type S2DecisionStatus,
  type S2Rule,
} from "@/lib/v2/s2/types";
import { useState } from "react";

export function S2RulesPage() {
  const { board } = useS2();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<S2Rule | null>(null);
  if (!board) return <Empty />;
  const filtered = board.rules.filter((r) =>
    `${r.trigger} ${r.instruction} ${r.old_pattern}`.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <Wrap>
      <S2Section title="Правила" hint="Если возникает X — делаю Y">
        <input className={`${s2Input} mb-4`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="срочный проект, граница, энергия…" />
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((r) => (
            <button key={r.id} type="button" onClick={() => setOpen(r)} className="rounded-3xl bg-white p-4 text-left shadow-[var(--v2-shadow-card)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]">Триггер</p>
              <h3 className="v2-tight mt-1 text-[15px] font-bold">{r.trigger}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--v2-ink-700)]">{r.instruction}</p>
            </button>
          ))}
        </div>
      </S2Section>
      <S2Section title="Антипаттерны" hint="8 корневых механизмов">
        <div className="grid gap-3 sm:grid-cols-2">
          {board.antipatterns.map((a) => (
            <div key={a.id} className="rounded-2xl border border-[var(--v2-ink-100)] bg-white p-4">
              <h3 className="font-bold">{a.title}</h3>
              <p className="mt-1 text-[13px] text-[var(--v2-ink-600)]">{a.manifestation}</p>
              <p className="mt-2 text-[13px] font-medium text-[var(--v2-brand-700)]">{a.antidote}</p>
            </div>
          ))}
        </div>
      </S2Section>
      {open ? (
        <S2Overlay title={open.trigger} onClose={() => setOpen(null)} wide>
          <p className="text-[12px] font-semibold uppercase text-[var(--v2-ink-400)]">Раньше</p>
          <p className="mt-1 text-[14px] text-[var(--v2-ink-700)]">{open.old_pattern}</p>
          <p className="mt-4 text-[12px] font-semibold uppercase text-[var(--v2-ink-400)]">Теперь</p>
          <p className="mt-1 text-[15px] font-semibold leading-relaxed">{open.instruction}</p>
          <details className="mt-4">
            <summary className="cursor-pointer text-[13px] font-semibold text-[var(--v2-brand-600)]">Почему?</summary>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--v2-ink-700)]">{open.why}</p>
            <p className="mt-2 text-[13px] text-[var(--v2-ink-500)]">{open.examples}</p>
          </details>
          <div className="mt-5 flex flex-wrap gap-2">
            <S2Btn onClick={() => void fetchJson("/api/v2/personal/todos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: `Правило: ${open.trigger}` }) })}>
              Создать задачу
            </S2Btn>
            <S2Btn onClick={() => setOpen(null)}>Закрыть</S2Btn>
          </div>
        </S2Overlay>
      ) : null}
    </Wrap>
  );
}

export function S2DecisionsPage() {
  const { board, mutate } = useS2();
  const [open, setOpen] = useState<S2Decision | "new" | null>(null);
  if (!board) return <Empty />;
  const cols: S2DecisionStatus[] = ["resolved", "deferred", "need_data"];
  return (
    <Wrap>
      <S2Section title="Решения" hint="Вопрос не обязан быть закрыт, но обязан иметь статус" action={
        <S2Btn kind="solid" onClick={() => setOpen("new")}>Вопрос</S2Btn>
      }>
        <div className="grid gap-4 lg:grid-cols-3">
          {cols.map((st) => (
            <div key={st} className="rounded-3xl bg-[var(--v2-ink-50)]/80 p-3">
              <h3 className="px-1 pb-2 text-[13px] font-bold">{S2_DECISION_STATUS[st]}</h3>
              <div className="space-y-2">
                {board.decisions.filter((d) => d.status === st).map((d) => (
                  <button key={d.id} type="button" onClick={() => setOpen(d)} className="w-full rounded-2xl bg-white p-3 text-left shadow-[var(--v2-shadow-card)]">
                    <p className="text-[13.5px] font-semibold">{d.question}</p>
                    <p className="mt-1 line-clamp-3 text-[12.5px] text-[var(--v2-ink-600)]">{d.position}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </S2Section>
      {open ? (
        <DecisionForm
          item={open === "new" ? null : open}
          onClose={() => setOpen(null)}
          onSave={async (data, id) => {
            if (id) await mutate({ entity: "decision", action: "update", id, data });
            else await mutate({ entity: "decision", action: "create", data });
            setOpen(null);
          }}
        />
      ) : null}
    </Wrap>
  );
}

function DecisionForm({
  item,
  onClose,
  onSave,
}: {
  item: S2Decision | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>, id?: string) => Promise<void>;
}) {
  const [question, setQuestion] = useState(item?.question ?? "");
  const [status, setStatus] = useState<S2DecisionStatus>(item?.status ?? "need_data");
  const [position, setPosition] = useState(item?.position ?? "");
  const [why, setWhy] = useState(item?.why ?? "");
  const [needed, setNeeded] = useState(item?.needed_data ?? "");
  const [revisit, setRevisit] = useState(item?.revisit_date ?? "");
  return (
    <S2Overlay title={item ? "Решение" : "Новый вопрос"} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void onSave({ question, status, position, why, needed_data: needed, revisit_date: revisit || null }, item?.id); }}>
        <S2Field label="Вопрос"><input className={s2Input} value={question} onChange={(e) => setQuestion(e.target.value)} /></S2Field>
        <S2Field label="Статус">
          <select className={s2Input} value={status} onChange={(e) => setStatus(e.target.value as S2DecisionStatus)}>
            {(Object.keys(S2_DECISION_STATUS) as S2DecisionStatus[]).map((k) => <option key={k} value={k}>{S2_DECISION_STATUS[k]}</option>)}
          </select>
        </S2Field>
        <S2Field label="Позиция"><textarea className={s2Area} value={position} onChange={(e) => setPosition(e.target.value)} /></S2Field>
        <S2Field label="Почему"><textarea className={s2Area} value={why} onChange={(e) => setWhy(e.target.value)} /></S2Field>
        <S2Field label="Какие данные изменят решение"><textarea className={s2Area} value={needed} onChange={(e) => setNeeded(e.target.value)} /></S2Field>
        <S2Field label="Дата возвращения"><input className={s2Input} type="date" value={revisit} onChange={(e) => setRevisit(e.target.value)} /></S2Field>
        <div className="flex justify-end gap-2">
          <S2Btn onClick={onClose}>Отмена</S2Btn>
          <S2Btn kind="solid" type="submit">Сохранить</S2Btn>
        </div>
      </form>
    </S2Overlay>
  );
}

export function S2BacklogPage() {
  const { board, mutate } = useS2();
  const [open, setOpen] = useState<S2BacklogItem | "new" | null>(null);
  const [promote, setPromote] = useState<S2BacklogItem | null>(null);
  if (!board) return <Empty />;
  const cats = Object.keys(S2_BACKLOG_CATEGORY) as S2BacklogCategory[];
  return (
    <Wrap>
      <S2Section title="Backlog" hint="Сохранить возможность, не делая её обязательством" action={
        <S2Btn kind="solid" onClick={() => setOpen("new")}>Идея</S2Btn>
      }>
        {!board.backlog.length ? (
          <p className="rounded-3xl border border-dashed border-[var(--v2-ink-200)] bg-white px-6 py-12 text-center text-[13px] text-[var(--v2-ink-500)]">
            Хорошо, если здесь пусто. Не нужно специально придумывать идеи.
          </p>
        ) : (
          <div className="space-y-6">
            {cats.map((cat) => {
              const items = board.backlog.filter((b) => b.category === cat);
              if (!items.length) return null;
              return (
                <div key={cat}>
                  <h3 className="mb-2 text-[13px] font-bold text-[var(--v2-ink-500)]">{S2_BACKLOG_CATEGORY[cat]}</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {items.map((b) => (
                      <div key={b.id} className="rounded-2xl bg-white p-4 shadow-[var(--v2-shadow-card)]">
                        <button type="button" className="w-full text-left" onClick={() => setOpen(b)}>
                          <h4 className="font-bold">{b.title}</h4>
                          <p className="mt-1 line-clamp-3 text-[13px] text-[var(--v2-ink-600)]">{b.why_interesting}</p>
                        </button>
                        <S2Btn onClick={() => setPromote(b)}>Сделать активным</S2Btn>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </S2Section>
      {open ? (
        <BacklogForm
          item={open === "new" ? null : open}
          onClose={() => setOpen(null)}
          onSave={async (data, id) => {
            if (id) await mutate({ entity: "backlog", action: "update", id, data });
            else await mutate({ entity: "backlog", action: "create", data });
            setOpen(null);
          }}
        />
      ) : null}
      {promote ? (
        <PromoteModal
          item={promote}
          bets={board.bets}
          onClose={() => setPromote(null)}
          onPromote={async (data) => {
            if (data.replaceId) {
              await mutate({ entity: "bet", action: "update", id: String(data.replaceId), data: { status: "stop" } });
            }
            const { replaceId: _r, ...betData } = data;
            await mutate({ entity: "bet", action: "create", data: { ...betData, status: "testing" } });
            await mutate({ entity: "backlog", action: "delete", id: promote.id });
            setPromote(null);
          }}
        />
      ) : null}
    </Wrap>
  );
}

function BacklogForm({
  item,
  onClose,
  onSave,
}: {
  item: S2BacklogItem | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>, id?: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [category, setCategory] = useState<S2BacklogCategory>(item?.category ?? "product");
  const [why, setWhy] = useState(item?.why_interesting ?? "");
  const [trigger, setTrigger] = useState(item?.activation_trigger ?? "");
  const [source, setSource] = useState(item?.source ?? "");
  return (
    <S2Overlay title={item ? item.title : "В backlog"} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void onSave({ title, category, why_interesting: why, activation_trigger: trigger, source }, item?.id); }}>
        <S2Field label="Название"><input className={s2Input} value={title} onChange={(e) => setTitle(e.target.value)} /></S2Field>
        <S2Field label="Категория">
          <select className={s2Input} value={category} onChange={(e) => setCategory(e.target.value as S2BacklogCategory)}>
            {(Object.keys(S2_BACKLOG_CATEGORY) as S2BacklogCategory[]).map((k) => <option key={k} value={k}>{S2_BACKLOG_CATEGORY[k]}</option>)}
          </select>
        </S2Field>
        <S2Field label="Почему интересно"><textarea className={s2Area} value={why} onChange={(e) => setWhy(e.target.value)} /></S2Field>
        <S2Field label="Что должно случиться, чтобы активировать"><textarea className={s2Area} value={trigger} onChange={(e) => setTrigger(e.target.value)} /></S2Field>
        <S2Field label="Источник"><input className={s2Input} value={source} onChange={(e) => setSource(e.target.value)} /></S2Field>
        <div className="flex justify-end gap-2">
          <S2Btn onClick={onClose}>Отмена</S2Btn>
          <S2Btn kind="solid" type="submit">Сохранить</S2Btn>
        </div>
      </form>
    </S2Overlay>
  );
}

function PromoteModal({
  item,
  bets,
  onClose,
  onPromote,
}: {
  item: S2BacklogItem;
  bets: { id: string; title: string; status: string }[];
  onClose: () => void;
  onPromote: (data: Record<string, unknown>) => Promise<void>;
}) {
  const active = bets.filter((b) => ["testing", "continue", "scale"].includes(b.status));
  const [replaceId, setReplaceId] = useState("");
  const [minimal, setMinimal] = useState("");
  const [review, setReview] = useState("");
  return (
    <S2Overlay title={`Активировать: ${item.title}`} onClose={onClose}>
      <p className="text-[13px] text-[var(--v2-ink-600)]">Не просто меняем статус. Нужно место среди ставок.</p>
      <S2Field label="Какую гипотезу заменяет?">
        <select className={`${s2Input} mt-1`} value={replaceId} onChange={(e) => setReplaceId(e.target.value)}>
          <option value="">Оставить все / объяснить лимит при сохранении</option>
          {active.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
        </select>
      </S2Field>
      <S2Field label="Минимальный validation">
        <textarea className={`${s2Area} mt-1`} value={minimal} onChange={(e) => setMinimal(e.target.value)} />
      </S2Field>
      <S2Field label="Дата review">
        <input className={`${s2Input} mt-1`} type="date" value={review} onChange={(e) => setReview(e.target.value)} />
      </S2Field>
      <div className="mt-4 flex justify-end gap-2">
        <S2Btn onClick={onClose}>Оставить в backlog</S2Btn>
        <S2Btn kind="solid" onClick={() => void onPromote({
          title: item.title,
          hypothesis: item.why_interesting,
          why: item.why_interesting,
          minimal_test: minimal,
          next_action: minimal,
          review_date: review || null,
          front: item.category === "product" ? "saas" : item.category === "content" ? "media" : "other",
          replaceId,
        })}>Активировать</S2Btn>
      </div>
    </S2Overlay>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1180px] px-5 py-7 lg:px-8">{children}</div>;
}
function Empty() {
  return <p className="px-6 py-10 text-[13px] text-[var(--v2-ink-400)]">Загрузка…</p>;
}
