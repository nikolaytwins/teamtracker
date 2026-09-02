"use client";

import type { PersonalObservation } from "@/lib/v2/personal/personal-observations-repo";
import { V2Icons } from "@/components/v2/ui/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function preserveSourceLineBreaks(md: string) {
  return md.replace(/([^\n])\n(?!\n)/g, "$1  \n");
}

function conclusionBody(it: PersonalObservation): string {
  const title = it.title.trim();
  let body = it.body.trim();
  if (!body || body === title) return "";
  const firstLine = body.split("\n")[0]?.trim() ?? "";
  if (title && (firstLine === title || body.startsWith(`${title}\n`))) {
    body = body.slice(title.length).replace(/^\n+/, "").trim();
  }
  if (!body || body === title) return "";
  return body;
}

function ConclusionMarkdown({ text }: { text: string }) {
  return (
    <div className="obs-conclusion-md mt-3 max-w-[62ch]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h4 className="v2-tight mb-2 mt-4 text-[17px] font-semibold text-[var(--v2-ink-900)] first:mt-0">
              {children}
            </h4>
          ),
          h2: ({ children }) => (
            <h5 className="v2-tight mb-2 mt-3 text-[16px] font-semibold text-[var(--v2-ink-900)] first:mt-0">
              {children}
            </h5>
          ),
          h3: ({ children }) => (
            <h6 className="v2-tight mb-2 mt-3 text-[15px] font-semibold text-[var(--v2-ink-800)] first:mt-0">
              {children}
            </h6>
          ),
          p: ({ children }) => (
            <p
              className="v2-tight mb-3 whitespace-pre-wrap text-[15px] leading-[1.7] text-[var(--v2-ink-700)] last:mb-0"
              style={{ textWrap: "pretty" }}
            >
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-5 text-[15px] leading-[1.7] text-[var(--v2-ink-700)]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-5 text-[15px] leading-[1.7] text-[var(--v2-ink-700)]">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-[var(--v2-ink-900)]">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-[var(--v2-ink-200)] pl-4 text-[14px] italic leading-[1.65] text-[var(--v2-ink-500)]">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-[var(--v2-ink-100)]" />,
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium text-[var(--v2-brand-600)] underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-[var(--v2-ink-50)] px-1 py-0.5 font-mono text-[13px] text-[var(--v2-ink-800)]">
              {children}
            </code>
          ),
        }}
      >
        {preserveSourceLineBreaks(text)}
      </ReactMarkdown>
    </div>
  );
}

export function obsMonthKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function obsMonthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  const raw = new Date(y, m - 1, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function currentObsMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function monthKeysThroughCurrent(conclusions: PersonalObservation[]): string[] {
  const current = currentObsMonthKey();
  let earliest = current;
  for (const c of conclusions) {
    const k = obsMonthKey(c.observed_at);
    if (k && k < earliest) earliest = k;
  }
  const keys: string[] = [];
  let [y, m] = earliest.split("-").map(Number);
  const [cy, cm] = current.split("-").map(Number);
  while (y < cy || (y === cy && m <= cm)) {
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return keys.reverse();
}

export function isoForObsMonth(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return new Date().toISOString();
  const now = new Date();
  const isCurrent = key === currentObsMonthKey();
  if (isCurrent) return now.toISOString();
  return new Date(y, m - 1, 15, 12, 0, 0).toISOString();
}

function ConclusionComposer({
  monthKey,
  saving,
  onCreate,
}: {
  monthKey: string;
  saving: boolean;
  onCreate: (payload: { title: string; text: string }) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 52), 240)}px`;
  };

  const submit = async () => {
    const body = text.trim();
    if (!body || saving) return;
    const ok = await onCreate({
      title: title.trim() || body.split("\n")[0]!.slice(0, 90),
      text: body,
    });
    if (!ok) return;
    setText("");
    setTitle("");
    setExpanded(false);
    if (ref.current) {
      ref.current.style.height = "52px";
    }
  };

  return (
    <section className="max-w-[62ch] rounded-2xl border border-dashed border-[var(--v2-ink-200)] bg-white px-5 py-4 shadow-[var(--v2-shadow-card)]">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => setExpanded(true)}
        placeholder="Заголовок (необязательно)"
        className="v2-tight mb-2 w-full bg-transparent text-[14px] font-semibold text-[var(--v2-ink-900)] outline-none placeholder:font-normal placeholder:text-[var(--v2-ink-400)]"
      />
      <textarea
        ref={ref}
        value={text}
        rows={2}
        placeholder="Вывод месяца — что стало яснее, что меняет стратегию… (Markdown: **жирный**, списки, ссылки)"
        onChange={(e) => {
          setText(e.target.value);
          grow(e.target);
        }}
        onFocus={() => setExpanded(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void submit();
          }
        }}
        className="v2-tight w-full resize-none bg-transparent text-[15px] leading-[1.6] text-[var(--v2-ink-700)] outline-none placeholder:text-[var(--v2-ink-400)]"
        style={{ minHeight: 52 }}
      />
      {expanded ? (
        <div className="mt-3 flex items-center justify-end gap-2 border-t border-[var(--v2-ink-100)] pt-3">
          <button
            type="button"
            onClick={() => {
              setExpanded(false);
              setText("");
              setTitle("");
            }}
            className="v2-tight h-9 rounded-xl px-3 text-[12.5px] font-medium text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-50)]"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={!text.trim() || saving}
            onClick={() => void submit()}
            className="v2-tight inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--v2-ink-900)] px-4 text-[12.5px] font-medium text-white transition hover:bg-[var(--v2-ink-700)] disabled:opacity-50"
          >
            <V2Icons.plus className="h-3.5 w-3.5" />
            {saving ? "Сохранение…" : "Добавить вывод"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ConclusionCard({
  item,
  saving,
  onUpdate,
  onRemove,
}: {
  item: PersonalObservation;
  saving: boolean;
  onUpdate: (id: string, payload: { title: string; text: string }) => Promise<boolean>;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.body);
  const [title, setTitle] = useState(item.title);

  useEffect(() => {
    if (!editing) {
      setText(item.body);
      setTitle(item.title);
    }
  }, [item, editing]);

  const meta = item.updated_at !== item.created_at;
  const bodyMd = conclusionBody(item);

  return (
    <article className="max-w-[68ch] rounded-2xl bg-white px-6 py-5 shadow-[var(--v2-shadow-soft)]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex h-[26px] items-center rounded-lg bg-[var(--v2-brand-50)] px-2.5 text-[11.5px] font-semibold text-[var(--v2-brand-700)]">
          Вывод
        </span>
        {meta ? (
          <span className="v2-tight text-[11px] text-[var(--v2-ink-400)]">редактировалось</span>
        ) : null}
        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="v2-tight text-[11.5px] text-[var(--v2-ink-400)] hover:text-[var(--v2-ink-900)]"
          >
            {editing ? "Закрыть" : "Редактировать"}
          </button>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="v2-tight text-[11.5px] text-[var(--v2-ink-300)] hover:text-red-600"
          >
            Удалить
          </button>
        </div>
      </div>

      {editing ? (
        <div className="mt-4 flex max-w-[62ch] flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Заголовок"
            className="v2-tight w-full rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)]/50 px-3 py-2 text-[15px] font-semibold text-[var(--v2-ink-900)] outline-none focus:border-[var(--v2-brand-400)]"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Markdown: **жирный**, списки, [ссылки](url)"
            className="v2-tight w-full resize-y rounded-xl border border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)]/50 px-3 py-2 text-[15px] leading-[1.65] text-[var(--v2-ink-700)] outline-none focus:border-[var(--v2-brand-400)]"
          />
          <button
            type="button"
            disabled={!text.trim() || saving}
            onClick={async () => {
              const ok = await onUpdate(item.id, { title: title.trim(), text: text.trim() });
              if (ok) setEditing(false);
            }}
            className="v2-tight self-end rounded-xl bg-[var(--v2-ink-900)] px-4 py-2 text-[12.5px] font-medium text-white hover:bg-[var(--v2-ink-700)] disabled:opacity-50"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      ) : (
        <div className="max-w-[62ch]">
          {item.title.trim() ? (
            <h3 className="v2-tight mt-3 text-[20px] font-semibold leading-snug tracking-[-0.02em] text-[var(--v2-ink-900)]" style={{ textWrap: "pretty" }}>
              {item.title.trim()}
            </h3>
          ) : null}
          {bodyMd ? (
            <ConclusionMarkdown text={bodyMd} />
          ) : item.body.trim() ? (
            <ConclusionMarkdown text={item.body.trim()} />
          ) : null}
        </div>
      )}
    </article>
  );
}

export function ObservationsConclusionsPanel({
  conclusions,
  saving,
  onCreate,
  onUpdate,
  onRemove,
}: {
  conclusions: PersonalObservation[];
  saving: boolean;
  onCreate: (monthKey: string, payload: { title: string; text: string }) => Promise<boolean>;
  onUpdate: (id: string, payload: { title: string; text: string }) => Promise<boolean>;
  onRemove: (id: string) => void;
}) {
  const monthKeys = useMemo(() => monthKeysThroughCurrent(conclusions), [conclusions]);
  const current = currentObsMonthKey();

  const byMonth = useMemo(() => {
    const map = new Map<string, PersonalObservation[]>();
    for (const k of monthKeys) map.set(k, []);
    for (const c of conclusions) {
      const k = obsMonthKey(c.observed_at);
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    }
    for (const [, list] of map) {
      list.sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime());
    }
    return map;
  }, [conclusions, monthKeys]);

  const total = conclusions.length;

  return (
    <div className="flex flex-col gap-10">
      <section className="max-w-[62ch] rounded-2xl bg-[var(--v2-ink-900)] px-6 py-5 text-white shadow-[var(--v2-shadow-soft)]">
        <p className="v2-tight text-[15px] leading-relaxed text-white/90">
          Здесь не события, а <span className="font-semibold text-white">выводы месяца</span> — что стало яснее и что
          меняет стратегию. Новый месяц появляется сам, можно добавить несколько карточек.
        </p>
        <p className="v2-tight v2-tnum mt-3 text-[13px] text-white/55">
          {total ? `${total} выводов за ${monthKeys.length} ${monthKeys.length === 1 ? "месяц" : monthKeys.length < 5 ? "месяца" : "месяцев"}` : "Пока нет выводов — начни с текущего месяца"}
        </p>
      </section>

      {monthKeys.map((key) => {
        const items = byMonth.get(key) ?? [];
        const isCurrent = key === current;
        return (
          <section key={key} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline gap-3 px-0.5">
              <h2 className="v2-tighter text-[26px] font-semibold capitalize text-[var(--v2-ink-900)]">
                {obsMonthLabel(key)}
              </h2>
              {isCurrent ? (
                <span className="inline-flex h-6 items-center rounded-md bg-[var(--v2-brand-50)] px-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--v2-brand-700)]">
                  текущий
                </span>
              ) : null}
              <span className="v2-tight v2-tnum text-[13px] text-[var(--v2-ink-400)]">
                {items.length ? `${items.length} ${items.length === 1 ? "вывод" : items.length < 5 ? "вывода" : "выводов"}` : "пока пусто"}
              </span>
            </div>

            <ConclusionComposer
              monthKey={key}
              saving={saving}
              onCreate={(p) => onCreate(key, p)}
            />

            {items.length ? (
              <div className="flex flex-col gap-3">
                {items.map((it) => (
                  <ConclusionCard
                    key={it.id}
                    item={it}
                    saving={saving}
                    onUpdate={onUpdate}
                    onRemove={onRemove}
                  />
                ))}
              </div>
            ) : (
              <p className="v2-tight px-1 text-[13px] text-[var(--v2-ink-400)]">
                {isCurrent ? "Месяц только начался — можно зафиксировать первый вывод." : "За этот месяц выводов не было."}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
