"use client";

import { appPath } from "@/lib/api-url";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type {
  ManifestBlock,
  ManifestChapter,
  ManifestDoc,
} from "@/lib/v2/personal/manifest-shared";
import type { MyCodeDoc, MyCodePattern, MyCodeRule } from "@/lib/v2/personal/seeds/mycode-seed";
import { seedMyCodeDoc } from "@/lib/v2/personal/seeds/mycode-seed";
import { useEffect, useState, type ReactNode } from "react";

const HERO_BLUE = "#2d5eef";

/** Инлайн-разметка исходника: **жирный**, *курсив*, `код`. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="v2-tnum rounded-md bg-[var(--v2-ink-100)] px-1.5 py-0.5 text-[0.92em] text-[var(--v2-ink-800)]"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function Kicker({ children, tint }: { children: ReactNode; tint?: string }) {
  return (
    <span
      className="text-[11.5px] font-semibold uppercase tracking-[0.13em]"
      style={{ color: tint ?? "var(--v2-ink-400)" }}
    >
      {children}
    </span>
  );
}

function Quote({ text, dark }: { text: string; dark?: boolean }) {
  if (dark) {
    return (
      <blockquote className="rounded-[20px] bg-white/[0.07] px-7 py-6 ring-1 ring-inset ring-white/10">
        <p className="v2-tight text-[19px] font-medium leading-[1.45] tracking-[-0.02em] text-white">
          <Inline text={text} />
        </p>
      </blockquote>
    );
  }
  return (
    <blockquote
      className="rounded-[20px] bg-[var(--v2-brand-50)] px-7 py-6"
      style={{ boxShadow: "inset 4px 0 0 var(--v2-brand-600)" }}
    >
      <p className="v2-tight text-[19px] font-medium leading-[1.45] tracking-[-0.02em] text-[var(--v2-brand-800)]">
        <Inline text={text} />
      </p>
    </blockquote>
  );
}

function BulletTiles({ items, dark }: { items: string[]; dark?: boolean }) {
  const avg = items.reduce((s, i) => s + i.length, 0) / Math.max(1, items.length);
  const cols = avg < 46 ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2";
  return (
    <ul className={`grid grid-cols-1 gap-2.5 ${cols}`}>
      {items.map((item, i) => (
        <li
          key={i}
          className={`flex items-start gap-3 rounded-[16px] px-4 py-3.5 ${
            dark ? "bg-white/[0.06]" : "bg-[var(--v2-ink-50)]"
          }`}
        >
          <span
            className="mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full"
            style={{ background: dark ? "rgba(255,255,255,.45)" : "var(--v2-brand-500)" }}
          />
          <span
            className={`v2-tight text-[15px] leading-[1.5] ${
              dark ? "text-white/80" : "text-[var(--v2-ink-700)]"
            }`}
          >
            <Inline text={item} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function NumberedRows({ items, dark }: { items: string[]; dark?: boolean }) {
  return (
    <ol className="flex flex-col gap-2.5">
      {items.map((item, i) => (
        <li
          key={i}
          className={`flex items-start gap-4 rounded-2xl px-5 py-[15px] ${
            dark ? "bg-white/[0.06]" : "bg-[var(--v2-ink-50)]"
          }`}
        >
          <span
            className={`v2-tnum pt-0.5 text-[13.5px] font-semibold ${
              dark ? "text-white/40" : "text-[var(--v2-ink-300)]"
            }`}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <p
            className={`v2-tight text-[16px] font-medium leading-snug tracking-[-0.015em] ${
              dark ? "text-white/85" : "text-[var(--v2-ink-800)]"
            }`}
          >
            <Inline text={item} />
          </p>
        </li>
      ))}
    </ol>
  );
}

function TodoTiles({ items }: { items: string[] }) {
  return (
    <ul className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-3.5 rounded-[16px] bg-white px-4 py-4 ring-1 ring-inset ring-[var(--v2-ink-200)]"
        >
          <span className="mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] border-[var(--v2-brand-400)] bg-[var(--v2-brand-50)]" />
          <span className="v2-tight text-[15px] leading-[1.5] text-[var(--v2-ink-700)]">
            <Inline text={item} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function CompareTable({ head, rows }: { head: [string, string]; rows: [string, string][] }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="hidden grid-cols-2 gap-3 px-1 md:grid">
        <Kicker tint="#B42318">{head[0]}</Kicker>
        <Kicker tint="var(--v2-brand-600)">{head[1]}</Kicker>
      </div>
      {rows.map(([oldWay, newWay], i) => (
        <div key={i} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-[16px] bg-[#FEF3F2] px-4 py-3.5">
            <span className="v2-tight text-[14.5px] leading-[1.5] text-[#912018]">
              <Inline text={oldWay} />
            </span>
          </div>
          <div
            className="rounded-[16px] bg-[var(--v2-brand-50)] px-4 py-3.5"
            style={{ boxShadow: "inset 0 0 0 1px rgba(59,111,247,.16)" }}
          >
            <span className="v2-tight text-[14.5px] font-medium leading-[1.5] text-[var(--v2-brand-800)]">
              <Inline text={newWay} />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Blocks({ blocks, dark }: { blocks: ManifestBlock[]; dark?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "h2":
            return (
              <h3
                key={i}
                className={`v2-tight mt-4 border-l-[3px] pl-3.5 text-[19px] font-semibold tracking-[-0.022em] first:mt-0 ${
                  dark ? "border-white/25 text-white" : "border-[var(--v2-brand-500)] text-[var(--v2-ink-900)]"
                }`}
              >
                <Inline text={block.text} />
              </h3>
            );
          case "h3":
            return (
              <h4
                key={i}
                className={`v2-tight mt-2 text-[16px] font-semibold tracking-[-0.018em] ${
                  dark ? "text-white/90" : "text-[var(--v2-ink-800)]"
                }`}
              >
                <Inline text={block.text} />
              </h4>
            );
          case "p":
            return (
              <p
                key={i}
                className={`v2-tight max-w-[86ch] text-[16px] leading-[1.68] ${
                  dark ? "text-white/75" : "text-[var(--v2-ink-600)]"
                }`}
                style={{ textWrap: "pretty" }}
              >
                <Inline text={block.text} />
              </p>
            );
          case "ul":
            return <BulletTiles key={i} items={block.items} dark={dark} />;
          case "ol":
            return <NumberedRows key={i} items={block.items} dark={dark} />;
          case "todo":
            return <TodoTiles key={i} items={block.items} />;
          case "quote":
            return <Quote key={i} text={block.text} dark={dark} />;
          case "table":
            return <CompareTable key={i} head={block.head} rows={block.rows} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

function ChapterCard({ chapter, dark }: { chapter: ManifestChapter; dark?: boolean }) {
  return (
    <section
      id={chapter.id}
      className={`scroll-mt-[76px] rounded-2xl px-8 py-7 ${dark ? "text-white" : "v2-card"}`}
      style={
        dark
          ? {
              background:
                "radial-gradient(circle at 10% 0%, rgba(255,255,255,.10), transparent 45%), linear-gradient(160deg, #111827 0%, #0B1220 58%, #152238 100%)",
              boxShadow: "var(--v2-shadow-card)",
            }
          : undefined
      }
    >
      <div className="mb-6">
        <Kicker tint={dark ? "rgba(147,180,253,.9)" : "var(--v2-brand-600)"}>
          Глава {String(chapter.index).padStart(2, "0")}
        </Kicker>
        <h2
          className={`v2-tight mt-2 text-[26px] font-semibold tracking-[-0.03em] ${
            dark ? "text-white" : "text-[var(--v2-ink-900)]"
          }`}
        >
          {chapter.title}
        </h2>
      </div>
      <Blocks blocks={chapter.blocks} dark={dark} />
    </section>
  );
}

function PatternCard({ p }: { p: MyCodePattern }) {
  return (
    <article className="grid gap-5 rounded-[20px] bg-[var(--v2-ink-50)] p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.9fr)]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--v2-ink-400)]">{p.code}</span>
        </div>
        <h3 className="v2-tight mt-2 text-[22px] font-semibold tracking-[-0.028em] text-[var(--v2-ink-900)]">
          {p.name}
        </h3>
        <p className="v2-tight mt-3 max-w-[62ch] text-[16px] leading-relaxed text-[var(--v2-ink-700)]">
          «{p.core}»
        </p>
        {p.phrase ? (
          <p className="v2-tight mt-2 text-[13.5px] text-[var(--v2-ink-500)]">
            <span className="text-[var(--v2-ink-400)]">Типичная фраза: </span>«{p.phrase}»
          </p>
        ) : null}
        {p.recognize?.length ? (
          <div className="mt-4">
            <Kicker>Как узнаю</Kicker>
            <ul className="mt-2 flex flex-col gap-1.5">
              {p.recognize.map((r) => (
                <li key={r} className="v2-tight flex gap-2 text-[14px] leading-snug text-[var(--v2-ink-600)]">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--v2-ink-300)]" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col rounded-[18px] bg-white px-5 py-5 shadow-[var(--v2-shadow-card)]">
        <Kicker tint="var(--v2-brand-600)">→ Новая реакция</Kicker>
        <p className="v2-tight mt-2 text-[15.5px] font-medium leading-snug text-[var(--v2-ink-900)]">
          «{p.reaction}»
        </p>
        {p.reactionSub ? (
          <p className="v2-tight mt-3 text-[13.5px] leading-relaxed text-[var(--v2-ink-500)]">{p.reactionSub}</p>
        ) : null}
      </div>
    </article>
  );
}

function RuleCard({ r }: { r: MyCodeRule }) {
  return (
    <article className="flex flex-col rounded-[20px] bg-[var(--v2-ink-50)] px-6 py-5">
      <h3 className="v2-tight text-[18px] font-semibold tracking-[-0.02em] text-[var(--v2-ink-900)]">{r.title}</h3>
      <div className="mt-4 flex gap-4">
        <span className="w-9 shrink-0 pt-[3px] font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--v2-ink-400)]">
          если
        </span>
        <p className="v2-tight text-[14.5px] leading-relaxed text-[var(--v2-ink-600)]">{r.ifs}</p>
      </div>
      <div className="mt-3 flex gap-4">
        <span className="w-9 shrink-0 pt-[3px] font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--v2-brand-600)]">
          то
        </span>
        <div>
          <p className="v2-tight text-[15.5px] leading-relaxed text-[var(--v2-ink-900)]">{r.then}</p>
          {r.list?.length ? (
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {r.list.map((x) => (
                <li
                  key={x}
                  className="v2-tight rounded-full bg-white px-2.5 py-[3px] text-[12.5px] text-[var(--v2-ink-600)] shadow-[var(--v2-shadow-card)]"
                >
                  {x}
                </li>
              ))}
            </ul>
          ) : null}
          {r.extra ? (
            <p className="v2-tight mt-3 text-[13.5px] leading-relaxed text-[var(--v2-ink-600)]">
              {r.extraLabel ? <span className="text-[var(--v2-ink-400)]">{r.extraLabel} </span> : null}
              {r.extra}
            </p>
          ) : null}
          {r.notList?.length ? (
            <div className="mt-3">
              {r.notLabel ? (
                <span className="v2-tight text-[12.5px] text-[var(--v2-ink-400)]">{r.notLabel}</span>
              ) : null}
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {r.notList.map((x, i) => (
                  <li
                    key={x}
                    className="v2-tight text-[12.5px] text-[var(--v2-ink-500)] line-through decoration-[var(--v2-ink-300)]"
                  >
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
        <div className="mt-5 border-t border-[var(--v2-ink-200)]/70 pt-4">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-rose-500">
            Запрещённый сценарий
          </span>
          <p className="v2-tight mt-1.5 text-[13.5px] leading-relaxed text-[var(--v2-ink-600)]">«{r.forbid}»</p>
        </div>
      ) : null}
    </article>
  );
}

export function ManifestClient({ doc }: { doc: ManifestDoc }) {
  const [active, setActive] = useState(doc.chapters[0]?.id ?? "");
  const [code, setCode] = useState<MyCodeDoc | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJson<{ doc: MyCodeDoc }>("/api/v2/personal/life-docs/mycode")
      .then((data) => {
        if (!cancelled) setCode(data.doc ?? seedMyCodeDoc());
      })
      .catch(() => {
        if (!cancelled) setCode(seedMyCodeDoc());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const ids = [...doc.chapters.map((c) => c.id), "manifest-patterns", "manifest-rules"];
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((n): n is HTMLElement => Boolean(n));
    if (!nodes.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = visible[0]?.target.id;
        if (id) setActive(id);
      },
      { rootMargin: "-12% 0px -70% 0px", threshold: [0.05, 0.3, 0.6] }
    );
    nodes.forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, [doc.chapters, code]);

  const lastIndex = doc.chapters.length - 1;
  const patterns = code?.patterns ?? [];
  const rules = code?.rules ?? [];
  const groups = code?.groups ?? [];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-[1720px] flex-col gap-7 px-9 pb-24 pt-7">
        <div className="flex flex-col gap-5">
          <section className="v2-card px-8 py-8">
            <Kicker>Еженедельный код · личный план</Kicker>
            <h1 className="v2-tight mt-1 text-[40px] font-semibold leading-[1.08] tracking-[-0.036em] text-[var(--v2-ink-900)]">
              {doc.title}
            </h1>
            {doc.lead ? (
              <div
                className="mt-5 max-w-[920px] rounded-[20px] px-7 py-6 text-white"
                style={{ background: HERO_BLUE, boxShadow: "0 16px 40px -18px rgba(45,94,239,0.85)" }}
              >
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-white/60">
                  Главное обещание себе
                </span>
                <p className="v2-tight mt-3 text-[23px] font-medium leading-[1.32] tracking-[-0.028em]">
                  <Inline text={doc.lead} />
                </p>
              </div>
            ) : null}
          </section>

          <section className="v2-card overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={appPath("/wishes/ai-industry-hero.png")}
              alt="Образ жизни, которую я строю"
              className="block h-auto w-full"
            />
          </section>
        </div>

        <section
          className="rounded-[20px] px-8 py-7 text-white"
          style={{ background: HERO_BLUE, boxShadow: "0 16px 40px -18px rgba(45,94,239,0.85)" }}
        >
          <p className="v2-tight text-[26px] font-semibold leading-[1.3] tracking-[-0.03em] sm:text-[30px]">
            Манифест заканчивается действием. Иначе он не работает.
          </p>
        </section>

        <nav className="v2-card sticky top-0 z-10 flex flex-wrap gap-1.5 px-4 py-3">
          {doc.chapters.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              onClick={() => setActive(c.id)}
              className={`v2-tight rounded-[10px] px-3 py-1.5 text-[13px] font-medium transition ${
                active === c.id
                  ? "bg-[var(--v2-brand-600)] text-white"
                  : "bg-[var(--v2-ink-50)] text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
              }`}
            >
              <span className="v2-tnum mr-1.5 opacity-55">{String(c.index).padStart(2, "0")}</span>
              {c.title}
            </a>
          ))}
          <a
            href="#manifest-patterns"
            onClick={() => setActive("manifest-patterns")}
            className={`v2-tight rounded-[10px] px-3 py-1.5 text-[13px] font-medium transition ${
              active === "manifest-patterns"
                ? "bg-[var(--v2-brand-600)] text-white"
                : "bg-[var(--v2-ink-50)] text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
            }`}
          >
            Паттерны
          </a>
          <a
            href="#manifest-rules"
            onClick={() => setActive("manifest-rules")}
            className={`v2-tight rounded-[10px] px-3 py-1.5 text-[13px] font-medium transition ${
              active === "manifest-rules"
                ? "bg-[var(--v2-brand-600)] text-white"
                : "bg-[var(--v2-ink-50)] text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
            }`}
          >
            Правила
          </a>
        </nav>

        {doc.chapters.map((c, i) => (
          <ChapterCard key={c.id} chapter={c} dark={i === lastIndex} />
        ))}

        <section id="manifest-patterns" className="v2-card scroll-mt-[76px] px-8 py-7">
          <div className="mb-6">
            <Kicker tint="var(--v2-brand-600)">Из моего кода</Kicker>
            <h2 className="v2-tight mt-2 text-[26px] font-semibold tracking-[-0.03em] text-[var(--v2-ink-900)]">
              Паттерны
            </h2>
            <p className="v2-tight mt-2 max-w-[62ch] text-[15px] text-[var(--v2-ink-500)]">
              Старые автоматизмы и новая реакция, которую я тренирую.
            </p>
          </div>
          {!code ? (
            <p className="v2-tight text-[14px] text-[var(--v2-ink-400)]">Загрузка…</p>
          ) : (
            <div className="flex flex-col gap-8">
              {groups.map((g) => {
                const rows = patterns.filter((p) => p.group === g.id);
                if (!rows.length) return null;
                return (
                  <div key={g.id}>
                    <div className="mb-3 flex items-center gap-3">
                      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--v2-ink-400)]">
                        {g.label}
                      </span>
                      <span className="v2-tnum text-[12px] text-[var(--v2-ink-400)]">{rows.length}</span>
                    </div>
                    <div className="flex flex-col gap-3.5">
                      {rows.map((p) => (
                        <PatternCard key={p.id} p={p} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section id="manifest-rules" className="v2-card scroll-mt-[76px] px-8 py-7">
          <div className="mb-6">
            <Kicker tint="var(--v2-brand-600)">Из моего кода</Kicker>
            <h2 className="v2-tight mt-2 text-[26px] font-semibold tracking-[-0.03em] text-[var(--v2-ink-900)]">
              Правила
            </h2>
            <p className="v2-tight mt-2 max-w-[62ch] text-[15px] text-[var(--v2-ink-500)]">
              Если → то. Готовые ответы на повторяющиеся ситуации.
            </p>
          </div>
          {!code ? (
            <p className="v2-tight text-[14px] text-[var(--v2-ink-400)]">Загрузка…</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {rules.map((r) => (
                <RuleCard key={r.id} r={r} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
