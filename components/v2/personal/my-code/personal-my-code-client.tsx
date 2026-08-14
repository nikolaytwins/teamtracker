"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode, type SVGProps } from "react";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { V2Icons } from "@/components/v2/ui/icons";
import type {
  MyCodeArchiveItem,
  MyCodeBelief,
  MyCodeDoc,
  MyCodeFocusItem,
  MyCodePattern,
  MyCodeRule,
  MyCodeStateKey,
} from "@/lib/v2/personal/seeds/mycode-seed";
import { seedMyCodeDoc } from "@/lib/v2/personal/seeds/mycode-seed";

type IconProps = SVGProps<SVGSVGElement>;

function IcClose(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="m6.5 6.5 11 11m0-11-11 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IcPin(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M9.5 4h5l-.7 5.2 2.9 3.2h-9l2.9-3.2L9.5 4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 12.4V20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IcEye(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M3 12s3.3-5.5 9-5.5S21 12 21 12s-3.3 5.5-9 5.5S3 12 3 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IcAgain(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9M20 4.5V10h-5.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IcMinus(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M6 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IcChevR(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M9.5 6.5 15 12l-5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StateBadge({ k, states }: { k: MyCodeStateKey; states: MyCodeDoc["states"] }) {
  const s = states[k];
  if (k === "focus") {
    return (
      <span
        className="v2-tight inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold"
        style={{ background: s.bg, color: s.tint }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.tint }} />
        {s.label}
      </span>
    );
  }
  return (
    <span className="v2-tight text-[11px]" style={{ color: s.tint }}>
      {s.label}
    </span>
  );
}

function PatternRow({
  p,
  states,
  onOpen,
}: {
  p: MyCodePattern;
  states: MyCodeDoc["states"];
  onOpen: (id: string) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(p.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(p.id);
        }
      }}
      className="group grid cursor-pointer gap-8 border-t border-[var(--v2-ink-200)]/80 py-7 transition"
      style={{ gridTemplateColumns: "minmax(0,1fr) 340px" }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--v2-ink-400)]">{p.code}</span>
          <StateBadge k={p.state} states={states} />
        </div>
        <h3 className="v2-tighter mt-2 text-[27px] font-light leading-[1.15] text-[var(--v2-ink-900)] transition group-hover:text-[var(--v2-brand-700)]">
          {p.name}
        </h3>
        <p className="v2-tight mt-3 max-w-[62ch] text-[16px] leading-relaxed text-[var(--v2-ink-700)]" style={{ textWrap: "pretty" }}>
          «{p.core}»
        </p>
        {p.phrase ? (
          <p className="v2-tight mt-3 text-[13.5px] text-[var(--v2-ink-500)]">
            <span className="text-[var(--v2-ink-400)]">Моя типичная фраза: </span>«{p.phrase}»
          </p>
        ) : null}
      </div>
      <div className="pt-1">
        <div className="flex h-full flex-col rounded-2xl bg-white p-5 shadow-[var(--v2-shadow-card)]">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-brand-600)]">→ Новая реакция</span>
          <p className="v2-tight mt-2 text-[15px] leading-snug text-[var(--v2-ink-900)]" style={{ textWrap: "pretty" }}>
            «{p.reaction}»
          </p>
          <button
            type="button"
            className="mt-auto inline-flex items-center gap-1 self-start pt-4 text-[12.5px] font-medium text-[var(--v2-ink-600)] transition group-hover:text-[var(--v2-brand-700)]"
          >
            Подробнее <IcChevR className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h4 className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--v2-ink-400)]">{label}</h4>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function PatternDrawer({
  p,
  states,
  pinned,
  onClose,
  onPin,
  onAddExample,
  onSaveFields,
}: {
  p: MyCodePattern;
  states: MyCodeDoc["states"];
  pinned: boolean;
  onClose: () => void;
  onPin: (id: string) => void;
  onAddExample: (id: string, example: string) => void;
  onSaveFields: (id: string, fields: Partial<MyCodePattern>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [core, setCore] = useState(p.core);
  const [reaction, setReaction] = useState(p.reaction);
  const [lead, setLead] = useState(p.lead);
  const [desc, setDesc] = useState(p.desc);
  const [exampleDraft, setExampleDraft] = useState("");
  const [addingEx, setAddingEx] = useState(false);

  useEffect(() => {
    setCore(p.core);
    setReaction(p.reaction);
    setLead(p.lead);
    setDesc(p.desc);
    setEditing(false);
    setAddingEx(false);
    setExampleDraft("");
  }, [p]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const field =
    "v2-tight mt-1.5 w-full rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-3.5 py-2.5 text-[14px] outline-none transition focus:border-[var(--v2-brand-400)] focus:bg-white";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-[var(--v2-ink-900)]/35 backdrop-blur-[2px]" />
      <div
        className="relative h-full w-[620px] max-w-[92vw] overflow-y-auto bg-white shadow-[var(--v2-shadow-pop)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start gap-4 border-b border-[var(--v2-ink-100)] bg-white/92 px-10 pb-4 pt-7 backdrop-blur">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--v2-ink-400)]">{p.code}</span>
              <StateBadge k={p.state} states={states} />
            </div>
            <h2 className="v2-tighter mt-2 text-[30px] font-light leading-[1.12] text-[var(--v2-ink-900)]" style={{ textWrap: "pretty" }}>
              {editing ? (
                <input value={lead} onChange={(e) => setLead(e.target.value)} className={`${field} text-[22px] font-light`} />
              ) : (
                p.lead
              )}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--v2-ink-400)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
          >
            <IcClose className="h-[17px] w-[17px]" />
          </button>
        </div>

        <div className="px-10 pb-32 pt-6">
          {editing ? (
            <div className="flex flex-col gap-4">
              <label>
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]">Суть</span>
                <textarea value={core} onChange={(e) => setCore(e.target.value)} rows={2} className={field} />
              </label>
              <label>
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]">Описание</span>
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} className={field} />
              </label>
              <label>
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]">Новая реакция</span>
                <textarea value={reaction} onChange={(e) => setReaction(e.target.value)} rows={2} className={field} />
              </label>
            </div>
          ) : (
            <p className="v2-tight text-[15.5px] leading-relaxed text-[var(--v2-ink-600)]" style={{ textWrap: "pretty" }}>
              «{p.desc}»
            </p>
          )}

          <DBlock label="Как я его узнаю">
            <ul className="flex flex-col gap-2">
              {p.recognize.map((r, i) => (
                <li key={i} className="v2-tight flex gap-3 text-[14.5px] leading-relaxed text-[var(--v2-ink-700)]">
                  <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[var(--v2-ink-300)]" />
                  {r}
                </li>
              ))}
            </ul>
          </DBlock>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[var(--v2-ink-50)] p-5">
              <h4 className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--v2-ink-400)]">Что он мне даёт</h4>
              <p className="v2-tight mt-2.5 text-[14px] leading-relaxed text-[var(--v2-ink-700)]" style={{ textWrap: "pretty" }}>
                «{p.gives}»
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--v2-ink-50)] p-5">
              <h4 className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--v2-ink-400)]">Какую цену я плачу</h4>
              <p className="v2-tight mt-2.5 text-[14px] leading-relaxed text-[var(--v2-ink-700)]" style={{ textWrap: "pretty" }}>
                «{p.cost}»
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-[20px] bg-[var(--v2-brand-50)] p-7">
            <h4 className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--v2-brand-600)]">Новая реакция</h4>
            <p className="v2-tighter mt-3 text-[24px] font-light leading-[1.25] text-[var(--v2-ink-900)]" style={{ textWrap: "pretty" }}>
              «{editing ? reaction : p.reaction}»
            </p>
            <p className="v2-tight mt-3 text-[14px] leading-relaxed text-[var(--v2-brand-800)]/80">«{p.reactionSub}»</p>
          </div>

          <DBlock label="Если → то">
            <div className="flex flex-col gap-3">
              {p.ifthen.map((r, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-2xl border border-[var(--v2-ink-200)] p-5">
                  <p className="v2-tight text-[14px] leading-snug text-[var(--v2-ink-600)]">
                    <span className="mr-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">если</span>
                    {r[0]},
                  </p>
                  <p className="v2-tight text-[15px] leading-snug text-[var(--v2-ink-900)]">
                    <span className="mr-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--v2-brand-600)]">то</span>
                    {r[1]}.
                  </p>
                </div>
              ))}
            </div>
          </DBlock>

          <DBlock label="Мои примеры">
            {p.examples.length ? (
              <div className="flex flex-col gap-2">
                {p.examples.map((e, i) => (
                  <p key={i} className="v2-tight border-l-2 border-[var(--v2-ink-200)] pl-4 text-[14px] leading-relaxed text-[var(--v2-ink-600)]">
                    {e}
                  </p>
                ))}
              </div>
            ) : (
              <p className="v2-tight text-[13.5px] text-[var(--v2-ink-400)]">Записей пока нет.</p>
            )}
            {addingEx ? (
              <div className="mt-3 flex flex-col gap-2">
                <textarea
                  value={exampleDraft}
                  onChange={(e) => setExampleDraft(e.target.value)}
                  rows={2}
                  placeholder="Пример из жизни…"
                  className={field}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!exampleDraft.trim()) return;
                      onAddExample(p.id, exampleDraft.trim());
                      setExampleDraft("");
                      setAddingEx(false);
                    }}
                    className="h-9 rounded-xl bg-[var(--v2-ink-900)] px-3.5 text-[12.5px] font-medium text-white"
                  >
                    Добавить
                  </button>
                  <button type="button" onClick={() => setAddingEx(false)} className="h-9 rounded-xl px-3.5 text-[12.5px] text-[var(--v2-ink-600)]">
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingEx(true)}
                className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl border border-dashed border-[var(--v2-ink-300)] px-3.5 text-[12.5px] font-medium text-[var(--v2-ink-500)] transition hover:border-[var(--v2-ink-400)] hover:text-[var(--v2-ink-900)]"
              >
                <V2Icons.plus className="h-3.5 w-3.5" /> Добавить пример
              </button>
            )}
          </DBlock>
        </div>

        <div className="sticky bottom-0 flex items-center gap-2 border-t border-[var(--v2-ink-100)] bg-white/92 px-10 py-4 backdrop-blur">
          <button
            type="button"
            onClick={() => onPin(p.id)}
            className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-[13px] font-medium shadow-[var(--v2-shadow-card)] transition ${
              pinned ? "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]" : "bg-[var(--v2-ink-900)] text-white hover:bg-[var(--v2-ink-700)]"
            }`}
          >
            <IcPin className="h-4 w-4" /> {pinned ? "В фокусе" : "Закрепить в фокусе"}
          </button>
          {editing ? (
            <button
              type="button"
              onClick={() => {
                onSaveFields(p.id, { core, reaction, lead, desc });
                setEditing(false);
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-medium text-white"
            >
              Сохранить
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-[13px] font-medium text-[var(--v2-ink-600)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
            >
              <V2Icons.edit className="h-4 w-4" /> Редактировать
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickMode({ items, onClose }: { items: string[]; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[var(--v2-ink-50)]">
      <div className="flex min-h-full flex-col items-center px-8 py-16">
        <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--v2-ink-400)]">Мой код</span>
        <div className="mt-12 flex w-full max-w-[760px] flex-col">
          {items.map((q, i) => (
            <div
              key={i}
              className="v2-card-in flex gap-8 border-t border-[var(--v2-ink-200)]/70 py-6"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="v2-tnum w-6 pt-2 font-mono text-[13px] text-[var(--v2-ink-300)]">{i + 1}.</span>
              <p className="v2-tighter text-[27px] font-light leading-[1.32] text-[var(--v2-ink-900)]" style={{ textWrap: "pretty" }}>
                {q}
              </p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-14 h-11 rounded-xl bg-[var(--v2-ink-900)] px-6 text-[13.5px] font-medium text-white shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)]"
        >
          Вернуться
        </button>
      </div>
    </div>
  );
}

function AgainModal({
  situations,
  patterns,
  onClose,
  onOpenPattern,
}: {
  situations: MyCodeDoc["situations"];
  patterns: MyCodePattern[];
  onClose: () => void;
  onOpenPattern: (id: string) => void;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const s = sel ? situations.find((x) => x.id === sel) : null;
  const pats = s ? s.pats.map((id) => patterns.find((p) => p.id === id)).filter(Boolean) as MyCodePattern[] : [];
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-[var(--v2-ink-900)]/45 p-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="w-full max-w-[600px] overflow-hidden rounded-[24px] bg-white shadow-[var(--v2-shadow-pop)]" onClick={(e) => e.stopPropagation()}>
        <div className="px-8 pb-7 pt-7">
          <div className="flex items-start justify-between gap-4">
            <h2 className="v2-tighter text-[24px] font-light leading-tight text-[var(--v2-ink-900)]">Что сейчас происходит?</h2>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--v2-ink-400)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
            >
              <IcClose className="h-[17px] w-[17px]" />
            </button>
          </div>
          <div className="mt-5 flex flex-col gap-1.5">
            {situations.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setSel(x.id)}
                className={`v2-tight rounded-xl px-4 py-3 text-left text-[14.5px] transition ${
                  sel === x.id ? "bg-[var(--v2-brand-50)] text-[var(--v2-brand-800)]" : "text-[var(--v2-ink-700)] hover:bg-[var(--v2-ink-50)]"
                }`}
              >
                {x.label}
              </button>
            ))}
          </div>
          {s ? (
            <div className="mt-6 border-t border-[var(--v2-ink-100)] pt-6">
              <h4 className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--v2-ink-400)]">Похоже на</h4>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {pats.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenPattern(p.id);
                    }}
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-[var(--v2-ink-100)] px-3.5 text-[13px] font-medium text-[var(--v2-ink-800)] transition hover:bg-[var(--v2-ink-200)]"
                  >
                    <span className="font-mono text-[10.5px] tracking-[0.1em] text-[var(--v2-ink-500)]">{p.code}</span>
                    <IcChevR className="h-3.5 w-3.5 text-[var(--v2-ink-400)]" />
                  </button>
                ))}
              </div>
              <h4 className="mt-6 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--v2-brand-600)]">Напомни себе</h4>
              <div className="mt-2.5 flex flex-col gap-2.5">
                {pats.map((p) => (
                  <p key={p.id} className="v2-tight text-[17px] font-light leading-snug text-[var(--v2-ink-900)]" style={{ textWrap: "pretty" }}>
                    «{p.reaction}»
                  </p>
                ))}
              </div>
              <p className="v2-tight mt-6 border-l-2 border-[var(--v2-ink-200)] pl-4 text-[14.5px] leading-relaxed text-[var(--v2-ink-600)]">
                «{s.q}»
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AddModal({
  archCats,
  sources,
  onClose,
  onSave,
}: {
  archCats: string[];
  sources: string[];
  onClose: () => void;
  onSave: (payload: {
    type: string;
    title: string;
    short: string;
    desc: string;
    cat: string;
    src: string;
    pin: boolean;
  }) => void;
}) {
  const TYPES = ["Паттерн", "Убеждение", "Правило", "Просто вывод"];
  const [type, setType] = useState("Просто вывод");
  const [title, setTitle] = useState("");
  const [short, setShort] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("");
  const [src, setSrc] = useState("");
  const [pin, setPin] = useState(false);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  const field =
    "v2-tight mt-1.5 h-11 w-full rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-3.5 text-[14.5px] text-[var(--v2-ink-900)] outline-none transition placeholder:text-[var(--v2-ink-400)] focus:border-[var(--v2-brand-400)] focus:bg-white";
  const lab = "text-[11.5px] uppercase tracking-[0.1em] font-semibold text-[var(--v2-ink-400)]";
  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-[var(--v2-ink-900)]/45 p-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-[600px] overflow-y-auto rounded-[24px] bg-white shadow-[var(--v2-shadow-pop)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 pb-6 pt-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="v2-tighter text-[24px] font-light leading-tight text-[var(--v2-ink-900)]">Добавить вывод</h2>
              <p className="v2-tight mt-1.5 text-[13px] text-[var(--v2-ink-500)]">
                Одна формулировка достаточна. Подробности можно дописать позже.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--v2-ink-400)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
            >
              <IcClose className="h-[17px] w-[17px]" />
            </button>
          </div>
          <div className="mt-6">
            <span className={lab}>Тип</span>
            <div className="mt-2 inline-flex rounded-xl bg-[var(--v2-ink-100)] p-1">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`v2-tight h-8 rounded-lg px-3.5 text-[12.5px] font-medium transition ${
                    type === t ? "bg-white text-[var(--v2-ink-900)] shadow-[var(--v2-shadow-card)]" : "text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <label className="mt-5 block">
            <span className={lab}>Название</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Максимизатор" className={field} />
          </label>
          <label className="mt-4 block">
            <span className={lab}>Короткая формулировка</span>
            <input
              value={short}
              onChange={(e) => setShort(e.target.value)}
              placeholder="Выполненный минимум = право остановиться."
              className={field}
            />
          </label>
          <label className="mt-4 block">
            <span className={lab}>Подробное описание — необязательно</span>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="Как это проявляется, что даёт, какую цену я плачу"
              className="v2-tight mt-1.5 w-full resize-none rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-3.5 py-2.5 text-[14px] leading-relaxed outline-none transition focus:border-[var(--v2-brand-400)] focus:bg-white"
            />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <label className="block">
              <span className={lab}>Категория</span>
              <select value={cat} onChange={(e) => setCat(e.target.value)} className={`${field} cursor-pointer appearance-none`}>
                <option value="">Выбрать…</option>
                {archCats.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={lab}>Источник — необязательно</span>
              <select value={src} onChange={(e) => setSrc(e.target.value)} className={`${field} cursor-pointer appearance-none`}>
                <option value="">Выбрать…</option>
                {sources.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-6 flex items-center justify-between gap-4 rounded-xl bg-[var(--v2-ink-50)] px-4 py-3.5">
            <span className="v2-tight text-[14px] text-[var(--v2-ink-800)]">Закрепить в текущем фокусе?</span>
            <button
              type="button"
              onClick={() => setPin((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition ${pin ? "bg-[var(--v2-brand-500)]" : "bg-[var(--v2-ink-300)]"}`}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
                style={{ left: pin ? "22px" : "2px" }}
              />
            </button>
          </div>
        </div>
        <div className="sticky bottom-0 flex items-center justify-end gap-2 bg-[var(--v2-ink-50)] px-8 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-[13px] font-medium text-[var(--v2-ink-600)]">
            Отмена
          </button>
          <button
            type="button"
            disabled={!title.trim() && !short.trim()}
            onClick={() =>
              onSave({
                type,
                title: title.trim(),
                short: short.trim(),
                desc: desc.trim(),
                cat,
                src,
                pin,
              })
            }
            className="h-10 rounded-xl bg-[var(--v2-ink-900)] px-5 text-[13px] font-medium text-white shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)] disabled:opacity-40"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { id: "patterns" as const, label: "Паттерны" },
  { id: "beliefs" as const, label: "Убеждения" },
  { id: "rules" as const, label: "Правила" },
  { id: "archive" as const, label: "Все выводы" },
];

export function PersonalMyCodeClient() {
  const [doc, setDoc] = useState<MyCodeDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("patterns");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [quick, setQuick] = useState(false);
  const [adding, setAdding] = useState(false);
  const [again, setAgain] = useState(false);
  const [archCat, setArchCat] = useState("all");
  const [archSrc, setArchSrc] = useState("all");

  const load = useCallback(async () => {
    try {
      const data = await fetchJson<{ doc: MyCodeDoc }>("/api/v2/personal/life-docs/mycode");
      setDoc(data.doc ?? seedMyCodeDoc());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить");
      setDoc(seedMyCodeDoc());
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = async (next: MyCodeDoc) => {
    setDoc(next);
    try {
      await fetchJson("/api/v2/personal/life-docs/mycode", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc: next }),
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    }
  };

  const s = q.trim().toLowerCase();
  const match = (...parts: (string | undefined)[]) => !s || parts.filter(Boolean).join(" ").toLowerCase().includes(s);

  const pats = useMemo(
    () => (doc ? doc.patterns.filter((p) => match(p.code, p.name, p.core, p.phrase, p.reaction, p.lead)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc, s]
  );
  const bels = useMemo(
    () => (doc ? doc.beliefs.filter((b) => match(b.text, b.note)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc, s]
  );
  const rls = useMemo(
    () =>
      doc
        ? doc.rules.filter((r) => match(r.title, r.ifs, r.then, (r.list || []).join(" "), r.extra, r.forbid))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc, s]
  );
  const arch = useMemo(
    () => (doc ? doc.archive.filter((a) => match(a.text, a.cat, a.src, a.tags.join(" "))) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc, s]
  );
  const counts = { patterns: pats.length, beliefs: bels.length, rules: rls.length, archive: arch.length };

  if (!doc) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-16 pt-6">
        <p className="v2-tight text-[14px] text-[var(--v2-ink-500)]">Загрузка…</p>
      </div>
    );
  }

  const current = open ? doc.patterns.find((p) => p.id === open) : null;

  const togglePin = (id: string) => {
    const pattern = doc.patterns.find((p) => p.id === id);
    if (!pattern) return;
    const isPinned = doc.pinned.includes(id);
    let pinned = isPinned ? doc.pinned.filter((x) => x !== id) : [...doc.pinned, id];
    let focus = [...doc.focus];
    if (isPinned) {
      focus = focus.filter((f) => !(f.ref.kind === "pattern" && f.ref.id === id));
    } else if (!focus.some((f) => f.ref.kind === "pattern" && f.ref.id === id)) {
      focus.push({
        id: `f-${id}-${Date.now()}`,
        n: String(focus.length + 1).padStart(2, "0"),
        title: pattern.lead.toUpperCase(),
        line: pattern.reaction,
        ref: { kind: "pattern", id },
      });
    }
    focus = focus.map((f, i) => ({ ...f, n: String(i + 1).padStart(2, "0") }));
    void persist({ ...doc, pinned, focus });
  };

  const removeFocus = (id: string) => {
    const item = doc.focus.find((f) => f.id === id);
    let pinned = doc.pinned;
    if (item?.ref.kind === "pattern") {
      pinned = pinned.filter((x) => x !== item.ref.id);
    }
    const focus = doc.focus.filter((f) => f.id !== id).map((f, i) => ({ ...f, n: String(i + 1).padStart(2, "0") }));
    void persist({ ...doc, focus, pinned });
  };

  const handleAdd = (payload: {
    type: string;
    title: string;
    short: string;
    desc: string;
    cat: string;
    src: string;
    pin: boolean;
  }) => {
    let next = { ...doc };
    const nowLabel = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

    if (payload.type === "Паттерн") {
      const id = `p-${Date.now()}`;
      const pattern: MyCodePattern = {
        id,
        group: "work",
        state: payload.pin ? "focus" : "active",
        code: (payload.title || "NEW").toUpperCase(),
        name: payload.title || "Новый паттерн",
        core: payload.short || payload.title,
        phrase: "",
        reaction: payload.short || payload.title,
        lead: payload.short || payload.title,
        desc: payload.desc || payload.short || "",
        recognize: [],
        gives: "",
        cost: "",
        reactionSub: "",
        ifthen: [],
        examples: [],
      };
      next = { ...next, patterns: [pattern, ...next.patterns] };
      if (payload.pin) {
        next.pinned = [...next.pinned, id];
        const focusItem: MyCodeFocusItem = {
          id: `f-${id}`,
          n: String(next.focus.length + 1).padStart(2, "0"),
          title: pattern.lead.toUpperCase(),
          line: pattern.reaction,
          ref: { kind: "pattern", id },
        };
        next.focus = [...next.focus, focusItem].map((f, i) => ({ ...f, n: String(i + 1).padStart(2, "0") }));
      }
      setTab("patterns");
    } else if (payload.type === "Убеждение") {
      const belief: MyCodeBelief = {
        n: String(next.beliefs.length + 1).padStart(2, "0"),
        text: payload.short || payload.title,
        note: payload.desc || undefined,
      };
      next = { ...next, beliefs: [...next.beliefs, belief] };
      setTab("beliefs");
    } else if (payload.type === "Правило") {
      const rule: MyCodeRule = {
        id: `r-${Date.now()}`,
        title: payload.title || "Новое правило",
        ifs: payload.short || "условие",
        then: payload.desc || payload.short || "действие",
      };
      next = { ...next, rules: [rule, ...next.rules] };
      if (payload.pin) {
        const focusItem: MyCodeFocusItem = {
          id: `f-${rule.id}`,
          n: String(next.focus.length + 1).padStart(2, "0"),
          title: rule.title.toUpperCase(),
          line: rule.then,
          ref: { kind: "rule", id: rule.id },
        };
        next.focus = [...next.focus, focusItem].map((f, i) => ({ ...f, n: String(i + 1).padStart(2, "0") }));
      }
      setTab("rules");
    } else {
      const item: MyCodeArchiveItem = {
        id: `a-${Date.now()}`,
        text: payload.short || payload.title,
        cat: payload.cat || "Жизнь",
        src: payload.src || "Наблюдение",
        date: nowLabel,
        tags: [],
      };
      next = { ...next, archive: [item, ...next.archive] };
      setTab("archive");
    }

    void persist(next);
    setAdding(false);
  };

  const shownArch = arch.filter((a) => (archCat === "all" || a.cat === archCat) && (archSrc === "all" || a.src === archSrc));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-20 pt-6">
      <div className="mb-10 flex flex-wrap items-start justify-between gap-x-10 gap-y-6">
        <div className="min-w-[280px] max-w-[640px] flex-1">
          <h1 className="v2-tighter text-[52px] font-light leading-none text-[var(--v2-ink-900)]">Мой код</h1>
          <p className="v2-tight mt-4 text-[16px] leading-relaxed text-[var(--v2-ink-500)]" style={{ textWrap: "pretty" }}>
            «Как я устроен, где чаще всего ломаю собственную систему и какие правила помогают мне действовать иначе.»
          </p>
        </div>
        <div className="ml-auto flex shrink-0 flex-col items-end gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuick(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3.5 text-[12.5px] font-medium text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] transition hover:text-[var(--v2-ink-900)]"
            >
              <IcEye className="h-4 w-4 text-[var(--v2-ink-400)]" /> Быстрый режим
            </button>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[13px] font-medium text-white shadow-[var(--v2-shadow-card)] transition hover:bg-[var(--v2-ink-700)]"
            >
              <V2Icons.plus className="h-4 w-4" /> Добавить вывод
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAgain(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--v2-ink-300)] px-3.5 text-[12.5px] font-medium text-[var(--v2-ink-600)] transition hover:border-[var(--v2-ink-400)] hover:text-[var(--v2-ink-900)]"
            >
              <IcAgain className="h-4 w-4 text-[var(--v2-ink-400)]" /> Похоже, я снова это делаю
            </button>
            <label className="flex h-9 w-[300px] items-center gap-2 rounded-xl bg-white px-3 shadow-[var(--v2-shadow-card)]">
              <V2Icons.search className="h-[15px] w-[15px] shrink-0 text-[var(--v2-ink-400)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Найти паттерн, правило или убеждение…"
                className="v2-tight min-w-0 flex-1 bg-transparent text-[12.5px] text-[var(--v2-ink-900)] outline-none placeholder:text-[var(--v2-ink-400)]"
              />
              {q ? (
                <button type="button" onClick={() => setQ("")} className="text-[var(--v2-ink-400)] transition hover:text-[var(--v2-ink-700)]">
                  <IcClose className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </label>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
      ) : null}

      <section className="mb-11">
        <div className="mb-4 flex items-center gap-4">
          <h2 className="v2-tight text-[19px] font-medium text-[var(--v2-ink-900)]">Сейчас особенно важно</h2>
          <span className="v2-tnum text-[12px] text-[var(--v2-ink-400)]">{doc.focus.length}</span>
          <span className="h-px flex-1 bg-[var(--v2-ink-200)]/80" />
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px,1fr))" }}>
          {doc.focus.map((f) => (
            <article
              key={f.id}
              className="group relative flex flex-col rounded-[20px] bg-white px-6 pb-4 pt-5 shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]"
            >
              <span className="v2-tnum font-mono text-[11px] text-[var(--v2-brand-500)]">{f.n}</span>
              <h3
                className="mt-2.5 text-[14.5px] font-semibold uppercase leading-[1.35] tracking-[0.01em] text-[var(--v2-ink-900)]"
                style={{ textWrap: "pretty" }}
              >
                {f.title}
              </h3>
              <p className="v2-tight mt-3 text-[14px] leading-relaxed text-[var(--v2-ink-600)]" style={{ textWrap: "pretty" }}>
                «{f.line}»
              </p>
              <button
                type="button"
                onClick={() => {
                  if (f.ref.kind === "pattern") setOpen(f.ref.id);
                  else {
                    setTab("rules");
                    setQ("");
                  }
                }}
                className="mt-auto inline-flex items-center gap-1 self-start pt-4 text-[12.5px] font-medium text-[var(--v2-ink-500)] transition hover:text-[var(--v2-brand-700)]"
              >
                Подробнее <IcChevR className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Убрать из фокуса"
                onClick={() => removeFocus(f.id)}
                className="absolute right-3.5 top-3.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--v2-ink-300)] opacity-0 transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-700)] group-hover:opacity-100"
              >
                <IcMinus className="h-4 w-4" />
              </button>
            </article>
          ))}
        </div>
        <p className="v2-tight mt-3 text-[12px] text-[var(--v2-ink-400)]">
          Эти же элементы показываются на главной Strategy.{" "}
          <Link href="/v2/personal/life-strategy" className="text-[var(--v2-brand-600)] hover:underline">
            Открыть стратегию
          </Link>
        </p>
      </section>

      <div className="sticky top-0 z-20 -mx-8 mb-7 bg-[var(--v2-ink-50)]/90 px-8 py-3 backdrop-blur">
        <div className="inline-flex items-center rounded-full bg-white p-1 shadow-[var(--v2-shadow-card)]">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`v2-tight inline-flex h-8 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-medium transition ${
                tab === t.id ? "bg-[var(--v2-ink-900)] text-white" : "text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
              }`}
            >
              {t.label}
              {s ? <span className="v2-tnum text-[11px] opacity-60">{counts[t.id]}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {tab === "patterns" ? (
        <div className="flex max-w-[1120px] flex-col gap-12">
          {doc.groups.map((g) => {
            const rows = pats.filter((p) => p.group === g.id);
            if (!rows.length) return null;
            return (
              <section key={g.id}>
                <div className="flex items-center gap-4">
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--v2-ink-500)]">{g.label}</h2>
                  <span className="v2-tnum text-[11px] text-[var(--v2-ink-400)]">{rows.length}</span>
                </div>
                <div className="mt-3">
                  {rows.map((p) => (
                    <PatternRow key={p.id} p={p} states={doc.states} onOpen={setOpen} />
                  ))}
                </div>
              </section>
            );
          })}
          {!pats.length ? <p className="v2-tight py-10 text-[14px] text-[var(--v2-ink-500)]">Ничего не нашлось. Попробуйте другой запрос.</p> : null}
        </div>
      ) : null}

      {tab === "beliefs" ? (
        <div className="max-w-[880px]">
          <p className="v2-tighter pb-2 text-[27px] font-light leading-[1.3] text-[var(--v2-ink-900)]" style={{ textWrap: "pretty" }}>
            «Мысли, на которых я хочу строить следующую версию жизни.»
          </p>
          <div className="mt-6">
            {bels.map((b) => (
              <div key={b.n} className="grid gap-7 border-t border-[var(--v2-ink-200)]/80 py-8" style={{ gridTemplateColumns: "46px minmax(0,1fr)" }}>
                <span className="v2-tnum pt-2 font-mono text-[12px] text-[var(--v2-ink-300)]">{b.n}</span>
                <div>
                  <p className="v2-tight text-[23px] font-light leading-[1.4] text-[var(--v2-ink-900)]" style={{ textWrap: "pretty" }}>
                    «{b.text}»
                  </p>
                  {b.note ? <p className="v2-tight mt-3 text-[13.5px] leading-relaxed text-[var(--v2-ink-500)]">{b.note}</p> : null}
                </div>
              </div>
            ))}
          </div>
          {!bels.length ? <p className="v2-tight py-10 text-[14px] text-[var(--v2-ink-500)]">Ничего не нашлось.</p> : null}
        </div>
      ) : null}

      {tab === "rules" ? (
        <div className="grid max-w-[1120px] grid-cols-2 gap-5">
          {rls.map((r) => (
            <article
              key={r.id}
              className="flex flex-col rounded-[20px] bg-white px-7 py-6 shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]"
            >
              <h3 className="v2-tight text-[18px] font-medium text-[var(--v2-ink-900)]">{r.title}</h3>
              <div className="mt-5 flex gap-4">
                <span className="w-9 shrink-0 pt-[3px] font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--v2-ink-400)]">если</span>
                <p className="v2-tight text-[14.5px] leading-relaxed text-[var(--v2-ink-600)]" style={{ textWrap: "pretty" }}>
                  {r.ifs}
                </p>
              </div>
              <div className="mt-3 flex gap-4">
                <span className="w-9 shrink-0 pt-[3px] font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--v2-brand-600)]">то</span>
                <div>
                  <p className="v2-tight text-[15.5px] leading-relaxed text-[var(--v2-ink-900)]" style={{ textWrap: "pretty" }}>
                    {r.then}
                  </p>
                  {r.list ? (
                    <ul className="mt-2.5 flex flex-wrap gap-1.5">
                      {r.list.map((x, i) => (
                        <li key={i} className="v2-tight rounded-full bg-[var(--v2-ink-100)] px-2.5 py-[3px] text-[12.5px] text-[var(--v2-ink-600)]">
                          {x}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {r.extra ? (
                    <p className="v2-tight mt-3 text-[13.5px] leading-relaxed text-[var(--v2-ink-600)]">
                      <span className="text-[var(--v2-ink-400)]">{r.extraLabel} </span>
                      {r.extra}
                    </p>
                  ) : null}
                  {r.notList ? (
                    <div className="mt-3">
                      <span className="v2-tight text-[12.5px] text-[var(--v2-ink-400)]">{r.notLabel}</span>
                      <ul className="mt-1.5 flex flex-wrap gap-1.5">
                        {r.notList.map((x, i) => (
                          <li key={i} className="v2-tight text-[12.5px] text-[var(--v2-ink-500)] line-through decoration-[var(--v2-ink-300)]">
                            {x}
                            {i < r.notList!.length - 1 ? " ·" : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
              {r.forbid ? (
                <div className="mt-5 border-t border-[var(--v2-ink-100)] pt-4">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-rose-500">Запрещённый сценарий</span>
                  <p className="v2-tight mt-1.5 text-[13.5px] leading-relaxed text-[var(--v2-ink-600)]">«{r.forbid}»</p>
                </div>
              ) : null}
            </article>
          ))}
          {!rls.length ? <p className="v2-tight py-10 text-[14px] text-[var(--v2-ink-500)]">Ничего не нашлось.</p> : null}
        </div>
      ) : null}

      {tab === "archive" ? (
        <div className="max-w-[1120px]">
          <div className="flex flex-col gap-3 pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-[68px] font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--v2-ink-400)]">категория</span>
              <button
                type="button"
                onClick={() => setArchCat("all")}
                className={`v2-tight h-8 rounded-full px-3 text-[12.5px] font-medium transition ${
                  archCat === "all" ? "bg-[var(--v2-ink-900)] text-white" : "bg-white text-[var(--v2-ink-600)] shadow-[var(--v2-shadow-card)]"
                }`}
              >
                Все
              </button>
              {doc.archCats.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setArchCat(c)}
                  className={`v2-tight h-8 rounded-full px-3 text-[12.5px] font-medium transition ${
                    archCat === c ? "bg-[var(--v2-ink-900)] text-white" : "bg-white text-[var(--v2-ink-600)] shadow-[var(--v2-shadow-card)]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-[68px] font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--v2-ink-400)]">источник</span>
              <button
                type="button"
                onClick={() => setArchSrc("all")}
                className={`v2-tight h-8 rounded-full px-3 text-[12.5px] font-medium transition ${
                  archSrc === "all" ? "bg-[var(--v2-ink-900)] text-white" : "bg-white text-[var(--v2-ink-600)] shadow-[var(--v2-shadow-card)]"
                }`}
              >
                Все
              </button>
              {doc.sources.map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setArchSrc(src)}
                  className={`v2-tight h-8 rounded-full px-3 text-[12.5px] font-medium transition ${
                    archSrc === src ? "bg-[var(--v2-ink-900)] text-white" : "bg-white text-[var(--v2-ink-600)] shadow-[var(--v2-shadow-card)]"
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-[20px] bg-white shadow-[var(--v2-shadow-card)]">
            {shownArch.map((a, i) => (
              <div
                key={a.id}
                className={`group grid items-center gap-6 px-7 py-5 transition hover:bg-[var(--v2-ink-50)]/70 ${
                  i ? "border-t border-[var(--v2-ink-100)]" : ""
                }`}
                style={{ gridTemplateColumns: "minmax(0,1fr) 150px 130px 64px 96px" }}
              >
                <p className="v2-tight text-[15px] leading-snug text-[var(--v2-ink-900)]" style={{ textWrap: "pretty" }}>
                  «{a.text}»
                </p>
                <span className="v2-tight text-[12.5px] text-[var(--v2-ink-600)]">{a.cat}</span>
                <span className="v2-tight text-[12.5px] text-[var(--v2-ink-500)]">{a.src}</span>
                <span className="v2-tnum text-[12px] text-[var(--v2-ink-400)]">{a.date}</span>
                <span className="justify-self-end text-[12.5px] font-medium text-[var(--v2-ink-400)] group-hover:text-[var(--v2-brand-700)]">
                  Открыть <IcChevR className="inline h-3.5 w-3.5" />
                </span>
              </div>
            ))}
            {!shownArch.length ? <p className="v2-tight px-7 py-10 text-[14px] text-[var(--v2-ink-500)]">Ничего не нашлось.</p> : null}
          </div>
          <p className="v2-tight mt-3 text-[12px] text-[var(--v2-ink-400)]">
            {shownArch.length} из {arch.length} выводов · архив не показывается на главной
          </p>
        </div>
      ) : null}

      {current ? (
        <PatternDrawer
          p={current}
          states={doc.states}
          pinned={doc.pinned.includes(current.id)}
          onClose={() => setOpen(null)}
          onPin={togglePin}
          onAddExample={(id, example) => {
            void persist({
              ...doc,
              patterns: doc.patterns.map((p) => (p.id === id ? { ...p, examples: [...p.examples, example] } : p)),
            });
          }}
          onSaveFields={(id, fields) => {
            void persist({
              ...doc,
              patterns: doc.patterns.map((p) => (p.id === id ? { ...p, ...fields } : p)),
            });
          }}
        />
      ) : null}
      {quick ? <QuickMode items={doc.quick} onClose={() => setQuick(false)} /> : null}
      {adding ? (
        <AddModal archCats={doc.archCats} sources={doc.sources} onClose={() => setAdding(false)} onSave={handleAdd} />
      ) : null}
      {again ? (
        <AgainModal
          situations={doc.situations}
          patterns={doc.patterns}
          onClose={() => setAgain(false)}
          onOpenPattern={setOpen}
        />
      ) : null}
    </div>
  );
}
