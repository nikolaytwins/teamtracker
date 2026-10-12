"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHomePersonalFinance } from "@/components/v2/home/personal/home-personal-finance-context";
import { allocateGoals, cushionPool } from "@/components/v2/personal/finance/personal-finance-system";
import { appPath } from "@/lib/api-url";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  SPRINT_CONTOURS,
  contourProgress,
  sprintDayProgress,
  type ContourItem,
  type SprintChecks,
  type SprintContour,
} from "@/lib/v2/home/sprint-contours";
import { currentSprintId, projectColors, type Hypothesis, type HypothesisProject } from "@/lib/v2/personal/hypotheses-meta";
import type { HypothesesBoard } from "@/lib/v2/personal/personal-hypotheses-repo";

const INCOME_GOAL = 400_000;
const HYP_HREF = "/v2/personal/hypotheses";

const STOPS = [
  "Не начинаю новые Лилы и бесконечные расклады о будущем",
  "Не запускаю новые продукты.",
  "Не занимаюсь бесконечным редизайном TwinLabs вместо продаж.",
  "Не возвращаюсь к ручному фрилансу там, где можно автоматизировать или делегировать.",
  "Не разрабатываю бесконечные сценарии сексуальной жизни с Лерой вместо реальных совместных впечатлений и честного общения.",
  "Не пытаюсь одновременно реализовать все свои идеи.",
  "Не пересматриваю план без новых существенных фактов.",
];

const SCENES = [
  { n: "01", title: "Финансовая свобода", text: "Я работаю над интересными продуктами, управляю процессами, получаю устойчивый доход. Мой день не полностью продан клиентам.", src: "/home/scene-finance.png" },
  { n: "02", title: "Любовь и отношения", text: "Мы с Лерой любим друг друга, смеёмся, путешествуем, испытываем нежность и создаём красивые совместные воспоминания.", src: "/home/scene-love.png" },
  { n: "03", title: "Сексуальность и притяжение", text: "Я уверенный, харизматичный, чувственный мужчина. В моей жизни есть взаимное желание, красота, новые знакомства и пространство для добровольных приключений.", src: "/home/scene-attraction.webp" },
  { n: "04", title: "Социальная и красивая жизнь", text: "Я среди интересных людей, бываю в красивых местах, придумываю события, легко общаюсь, проявляю инициативу.", src: "/home/scene-social.png" },
];

const CONTOUR_PHOTO: Record<string, string> = {
  u: "/home/contour-stability.png",
  l: "/home/contour-life.png",
  f: "/home/contour-future.png",
};

const REWARD_COLLAGE = ["/home/reward-1.jpg", "/home/reward-2.webp", "/home/reward-3.webp", "/home/reward-4.png"];

function rub(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(Math.round(value))} ₽`;
}

function Photo({ src, position = "center", fill = false }: { src: string; position?: string; fill?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={appPath(src)}
      alt=""
      className={fill ? "absolute inset-0 h-full w-full object-cover" : "h-full w-full object-cover"}
      style={{ objectPosition: position }}
    />
  );
}

function goalPhoto(title: string) {
  const name = title.toLowerCase();
  if (name.includes("подуш")) return "/home/goal-cushion.png";
  if (name.includes("машин")) return "/home/goal-car.png";
  return null;
}

export function HomeSprintBody() {
  return (
    <>
      <Manifesto />
      <Contours />
      <SprintHypotheses />
      <Priority />
      <Reward />
      <Goals />
      <Sexuality />
      <StopList />
      <Codex />
      <Visualization />
    </>
  );
}

function Manifesto() {
  const { day, total, pct } = sprintDayProgress();
  return (
    <section className="v2-card grid overflow-hidden lg:grid-cols-[minmax(280px,420px)_minmax(0,1fr)]">
      <div className="relative min-h-[280px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={appPath("/home/manifesto.png")}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
          style={{
            maskImage: "linear-gradient(90deg, #000 70%, transparent)",
            WebkitMaskImage: "linear-gradient(90deg, #000 70%, transparent)",
          }}
        />
      </div>
      <div className="flex flex-col justify-center gap-5 px-8 py-8">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#2d5eef] px-3 py-1 text-[12px] font-semibold tracking-[0.08em] text-white uppercase">Спринт</span>
          <span className="text-[13px] font-semibold tracking-[0.13em] text-[var(--v2-ink-500)] uppercase">13 октября — 30 ноября</span>
        </div>
        <h2 className="v2-tight text-[34px] leading-[1.15] font-semibold tracking-[-0.035em]">
          Я перестаю прогнозировать желаемую жизнь. <span className="text-[#2d5eef]">Я начинаю её создавать.</span>
        </h2>
        <p className="v2-tight max-w-[640px] text-[16px] leading-relaxed text-[var(--v2-ink-600)]">
          Деньги, любовь, сексуальность, творчество, окружение и красивые впечатления — не альтернативы друг другу. Я постепенно выстраиваю жизнь, в которой всё это присутствует
        </p>
        <div className="flex items-center gap-4">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
            <span className="block h-full rounded-full bg-[#2d5eef]" style={{ width: `${pct}%` }} />
          </div>
          <em className="v2-tnum text-[13.5px] font-medium text-[var(--v2-ink-500)] not-italic">
            День {day} из {total} · Review 30 ноября
          </em>
        </div>
      </div>
    </section>
  );
}

function Contours() {
  const [checks, setChecks] = useState<SprintChecks>({});
  const checksRef = useRef(checks);
  const timer = useRef<number | null>(null);
  checksRef.current = checks;

  useEffect(() => {
    let cancelled = false;
    void fetchJson<{ checks: SprintChecks }>("/api/v2/personal/home-sprint")
      .then((data) => {
        if (!cancelled) setChecks(data.checks ?? {});
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: SprintChecks) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void fetchJson("/api/v2/personal/home-sprint", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checks: next }),
      }).catch(() => undefined);
    }, 250);
  }, []);

  const setKey = (key: string, value: boolean | number) => {
    const next = { ...checksRef.current, [key]: value };
    checksRef.current = next;
    setChecks(next);
    persist(next);
  };

  return (
    <section>
      <SectionHead n="01" title="Мои три контура" sub="Конкретные задачи до 30 ноября. Клик — отметить." />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {SPRINT_CONTOURS.map((contour) => (
          <ContourCard key={contour.id} contour={contour} checks={checks} onSet={setKey} />
        ))}
      </div>
    </section>
  );
}

function ContourCard({
  contour,
  checks,
  onSet,
}: {
  contour: SprintContour;
  checks: SprintChecks;
  onSet: (key: string, value: boolean | number) => void;
}) {
  const pct = contourProgress(contour, checks);
  return (
    <article className="v2-card flex flex-col overflow-hidden">
      <div className="h-[210px]">
        <Photo src={CONTOUR_PHOTO[contour.id] ?? ""} position="center 30%" />
      </div>
      <div className="flex flex-1 flex-col gap-3 px-5 py-5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: contour.color }} />
          <span className="text-[13px] font-semibold tracking-[0.08em] uppercase" style={{ color: contour.color }}>
            {contour.name}
          </span>
          <span className="v2-tnum ml-auto text-[13px] font-semibold" style={{ color: contour.color }}>
            {pct}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
          <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: contour.color }} />
        </div>
        <h3 className="v2-tight text-[22px] font-semibold tracking-[-0.03em]">{contour.title}</h3>
        <p className="text-[14px] leading-snug text-[var(--v2-ink-500)]">{contour.with}</p>
        <p className="text-[14.5px] leading-snug font-medium text-[var(--v2-ink-800)]">{contour.goal}</p>
        <div className="mt-1 flex flex-col gap-2">
          {contour.items.map((item) => (
            <ContourTask key={item.key} item={item} checks={checks} onSet={onSet} color={contour.color} />
          ))}
        </div>
      </div>
    </article>
  );
}

function ContourTask({
  item,
  checks,
  onSet,
  color,
}: {
  item: ContourItem;
  checks: SprintChecks;
  onSet: (key: string, value: boolean | number) => void;
  color: string;
}) {
  if (item.kind === "count") {
    const n = Math.min(item.max, Number(checks[item.key]) || 0);
    return (
      <div className="rounded-[14px] bg-[var(--v2-ink-50)] px-3.5 py-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-semibold">{item.title}</div>
            {item.note ? <div className="mt-0.5 text-[12.5px] text-[var(--v2-ink-400)]">{item.note}</div> : null}
            <div className="mt-2 flex flex-wrap gap-1">
              {Array.from({ length: item.max }, (_, index) => (
                <i key={index} className="block h-1.5 w-3 rounded-full" style={{ background: index < n ? color : "var(--v2-ink-200)" }} />
              ))}
            </div>
          </div>
          <span className="v2-tnum text-[15px] font-semibold">
            {n}
            <small className="text-[12px] font-medium text-[var(--v2-ink-400)]"> / {item.max}</small>
          </span>
          <span className="flex gap-1">
            <button type="button" aria-label="минус" onClick={() => onSet(item.key, Math.max(0, n - 1))} className="h-8 w-8 rounded-lg bg-white text-[16px]">
              −
            </button>
            <button type="button" aria-label="плюс" onClick={() => onSet(item.key, Math.min(item.max, n + 1))} className="h-8 w-8 rounded-lg bg-white text-[16px]">
              +
            </button>
          </span>
        </div>
      </div>
    );
  }
  if (item.kind === "group") {
    const done = item.subs.filter((sub) => checks[sub.key]).length;
    return (
      <div className="flex flex-col gap-1.5">
        <CheckRow
          done={Boolean(checks[item.key])}
          title={item.title}
          extra={`${done} / ${item.subs.length}`}
          onClick={() => onSet(item.key, !checks[item.key])}
          color={color}
        />
        <div className="flex flex-col gap-1.5 pl-3">
          {item.subs.map((sub) => (
            <CheckRow
              key={sub.key}
              done={Boolean(checks[sub.key])}
              title={sub.title}
              note={sub.note}
              onClick={() => onSet(sub.key, !checks[sub.key])}
              color={color}
            />
          ))}
        </div>
      </div>
    );
  }
  return (
    <CheckRow
      done={Boolean(checks[item.key])}
      title={item.title}
      note={item.note}
      onClick={() => onSet(item.key, !checks[item.key])}
      color={color}
    />
  );
}

function CheckRow({
  done,
  title,
  note,
  extra,
  onClick,
  color,
}: {
  done: boolean;
  title: string;
  note?: string;
  extra?: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-2.5 rounded-[12px] px-3 py-2.5 text-left ${done ? "bg-white" : "bg-[var(--v2-ink-50)]"}`}
    >
      <span
        className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] text-[12px] text-white"
        style={{ background: done ? color : "transparent", boxShadow: done ? "none" : "inset 0 0 0 1.5px var(--v2-ink-300)" }}
      >
        {done ? "✓" : ""}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[14.5px] font-medium ${done ? "text-[var(--v2-ink-400)] line-through" : ""}`}>{title}</span>
        {note ? <span className="mt-0.5 block text-[12.5px] text-[var(--v2-ink-400)]">{note}</span> : null}
      </span>
      {extra ? <span className="v2-tnum text-[12.5px] font-semibold text-[var(--v2-ink-400)]">{extra}</span> : null}
    </button>
  );
}

function SprintHypotheses() {
  const [board, setBoard] = useState<HypothesesBoard | null>(null);
  useEffect(() => {
    void fetchJson<HypothesesBoard>("/api/v2/personal/hypotheses")
      .then(setBoard)
      .catch(() => undefined);
  }, []);
  const sprintId = board ? currentSprintId(board.sprints) : null;
  const sprint = board?.sprints.find((item) => item.id === sprintId) ?? null;
  const projects = useMemo(() => new Map((board?.projects ?? []).map((project) => [project.id, project])), [board]);
  const active = (board?.hypotheses ?? []).filter((item) => item.stage === "active" && item.sprint_id === sprintId);
  const queue = (board?.hypotheses ?? []).filter((item) => item.stage === "queue");
  const backlog = (board?.hypotheses ?? []).filter((item) => item.stage === "backlog").length;

  return (
    <section className="v2-card px-7 py-6">
      <div className="mb-4 flex flex-wrap items-baseline gap-3.5">
        <span className="text-[12px] font-semibold tracking-[0.14em] text-[var(--v2-ink-400)]">02</span>
        <h2 className="v2-tight text-[26px] font-semibold tracking-[-0.03em]">Гипотезы спринта</h2>
        <span className="v2-tight text-[14.5px] text-[var(--v2-ink-500)]">
          {sprint ? `${sprint.name} · ${sprint.range_label}` : "Текущий спринт"}
        </span>
        <div className="ml-auto flex gap-2">
          <Link href={`${appPath(HYP_HREF)}#backlog`} className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[var(--v2-ink-50)] px-3.5 text-[14px] font-semibold">
            Бэклог <b className="v2-tnum text-[var(--v2-ink-400)]">{backlog}</b>
          </Link>
          <Link href={appPath(HYP_HREF)} className="inline-flex h-10 items-center rounded-[12px] bg-[#2d5eef] px-3.5 text-[14px] font-semibold text-white">
            Все гипотезы →
          </Link>
        </div>
      </div>
      <div className="mb-3 text-[12px] font-semibold tracking-[0.13em] text-[var(--v2-ink-400)] uppercase">В работе · {active.length}</div>
      {active.length ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          {active.map((item) => (
            <HomeHypothesisCard key={item.id} item={item} project={projects.get(item.project_id ?? "")} />
          ))}
        </div>
      ) : (
        <p className="text-[14.5px] text-[var(--v2-ink-500)]">В спринте пока нет гипотез — возьми из очереди.</p>
      )}
      <div className="mt-5 mb-3 text-[12px] font-semibold tracking-[0.13em] text-[var(--v2-ink-400)] uppercase">В очереди · {queue.length}</div>
      {queue.length ? (
        <div className="flex flex-col gap-1.5">
          {queue.slice(0, 6).map((item, index) => {
            const project = projects.get(item.project_id ?? "");
            const colors = projectColors(project?.hue ?? 260);
            return (
              <Link
                key={item.id}
                href={`${appPath(HYP_HREF)}#${item.id}`}
                className="flex items-center gap-3 rounded-[14px] bg-[var(--v2-ink-50)] px-3.5 py-3 hover:bg-[var(--v2-ink-100)]"
              >
                <span className="v2-tnum w-6 text-[14px] font-semibold" style={{ color: colors.c }}>
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">{item.title}</span>
                  <span className="text-[13px] text-[var(--v2-ink-500)]">{project?.name}</span>
                </span>
                <span className="text-[var(--v2-ink-300)]">→</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-[14.5px] text-[var(--v2-ink-500)]">Очередь пуста.</p>
      )}
    </section>
  );
}

function HomeHypothesisCard({ item, project }: { item: Hypothesis; project?: HypothesisProject }) {
  const colors = projectColors(project?.hue ?? 260);
  return (
    <Link
      href={`${appPath(HYP_HREF)}#${item.id}`}
      className="flex flex-col gap-3 rounded-[18px] p-5"
      style={{ background: colors.s }}
    >
      <div className="flex items-center gap-2">
        <span className="text-[12.5px] font-semibold" style={{ color: colors.c }}>
          {project?.name}
        </span>
        <span className="ml-auto text-[11.5px] font-semibold tracking-[0.1em] uppercase" style={{ color: colors.c }}>
          в работе
        </span>
      </div>
      <h3 className="text-[20px] leading-snug font-semibold tracking-[-0.02em]">{item.title}</h3>
      <p className="text-[14.5px] leading-relaxed text-[var(--v2-ink-600)]">{item.body}</p>
      <div className="mt-auto rounded-[12px] bg-white px-3.5 py-3">
        <span className="text-[11px] font-semibold tracking-[0.12em] text-[var(--v2-ink-400)] uppercase">Критерий проверки</span>
        <b className="mt-1 block text-[14.5px]">{item.metric || "—"}</b>
      </div>
    </Link>
  );
}

function Priority() {
  const steps = [
    { n: "1", text: "Оплачиваемые обязательства и продажи TwinLabs Plus", color: "oklch(0.56 0.19 262)", soft: "oklch(0.96 0.025 262)" },
    { n: "2", text: "Качественное время с близкими", color: "oklch(0.56 0.19 10)", soft: "oklch(0.96 0.025 10)" },
    { n: "3", text: "Блог и FoodTech", color: "oklch(0.56 0.19 300)", soft: "oklch(0.96 0.025 300)" },
  ];
  return (
    <section className="v2-card px-7 py-6">
      <div className="mb-3 text-[12px] font-semibold tracking-[0.13em] text-[var(--v2-ink-400)] uppercase">Приоритет при конфликте задач</div>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        {steps.map((step, index) => (
          <div key={step.n} className="flex flex-1 items-center gap-2">
            <span className="flex flex-1 items-center gap-3 rounded-[16px] px-4 py-3.5" style={{ background: step.soft, color: step.color }}>
              <b className="v2-tnum text-[18px]">{step.n}</b>
              <span className="text-[15px] font-semibold text-[var(--v2-ink-900)]">{step.text}</span>
            </span>
            {index < steps.length - 1 ? <span className="hidden text-[var(--v2-ink-300)] lg:block">→</span> : null}
          </div>
        ))}
      </div>
      <p className="mt-4 text-[15px] text-[var(--v2-ink-600)]">Не пытаться выполнить контент-план ценой финансового провала и выгорания.</p>
    </section>
  );
}

function Reward() {
  const { dashboard } = useHomePersonalFinance();
  const now = dashboard?.summary.monthProfit ?? 0;
  const pct = Math.max(0, Math.min(100, Math.round((now / INCOME_GOAL) * 100)));
  const left = Math.max(0, INCOME_GOAL - now);
  return (
    <section className="v2-card grid overflow-hidden lg:grid-cols-[minmax(0,1.3fr)_minmax(240px,380px)]">
      <div className="flex flex-col gap-5 px-7 py-7">
        <h2 className="v2-tight text-[26px] font-semibold tracking-[-0.03em]">Награда за финансовый результат</h2>
        <div>
          <div className="text-[12px] font-semibold tracking-[0.13em] text-[var(--v2-ink-400)] uppercase">Цель · личный доход за месяц</div>
          <div className="v2-tnum mt-1 text-[40px] font-semibold tracking-[-0.04em]">{rub(INCOME_GOAL)}</div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
            <span className="block h-full rounded-full bg-[#2d5eef]" style={{ width: `${pct}%` }} />
          </div>
          <div className="v2-tnum mt-2 flex justify-between text-[14px] text-[var(--v2-ink-500)]">
            <span>
              Сейчас <b className="text-[var(--v2-ink-900)]">{rub(now)}</b> · {pct}%
            </span>
            <span>осталось {rub(left)}</span>
          </div>
        </div>
        <div>
          <div className="text-[12px] font-semibold tracking-[0.13em] uppercase" style={{ color: "oklch(0.56 0.19 10)" }}>
            Особенное свидание с Лерой
          </div>
          <p className="mt-2 text-[15.5px] leading-relaxed text-[var(--v2-ink-700)]">
            <b className="font-semibold">Первый вариант</b> — стриптиз-клуб, чтобы вместе посмотреть шоу, если ей самой интересно.
          </p>
        </div>
        <div>
          <div className="mb-2.5 text-[12px] font-semibold tracking-[0.13em] text-[var(--v2-ink-400)] uppercase">Альтернативы</div>
          <div className="flex flex-wrap gap-2">
            {["Красивый отель", "Кабаре", "Необычное романтическое впечатление", "Другой совместно выбранный формат"].map((chip) => (
              <span key={chip} className="rounded-full bg-[var(--v2-ink-50)] px-3 py-1.5 text-[14px] font-medium">
                {chip}
              </span>
            ))}
          </div>
        </div>
        <p className="text-[14.5px] leading-relaxed text-[var(--v2-ink-500)]">
          Награда должна укладываться в бюджет после обязательных расходов. Сама идея красивой жизни не отменяется, если денежная цель не достигнута.
        </p>
      </div>
      <div className="grid h-full min-h-[520px] grid-cols-2 grid-rows-2">
        {REWARD_COLLAGE.map((src) => (
          <div key={src} className="relative min-h-0 overflow-hidden">
            <Photo src={src} position="center 15%" fill />
          </div>
        ))}
      </div>
    </section>
  );
}

function Goals() {
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
    <section className="v2-card px-7 py-6">
      <div className="mb-4 flex flex-wrap items-baseline gap-3.5">
        <h2 className="v2-tight text-[26px] font-semibold tracking-[-0.03em]">Цели</h2>
        <span className="text-[14.5px] text-[var(--v2-ink-500)]">Общие, без срока</span>
        <Link href={appPath("/v2/personal/finance")} className="ml-auto inline-flex h-10 items-center rounded-[12px] bg-[var(--v2-ink-50)] px-3.5 text-[14px] font-semibold">
          Все цели →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {cards.map((goal) => {
          const pct = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
          const left = Math.max(goal.target - goal.current, 0);
          return (
            <div key={goal.id} className="overflow-hidden rounded-[18px] bg-[var(--v2-ink-50)]">
              <div className="h-[190px]">
                {goal.photo ? <Photo src={goal.photo} position="center 35%" /> : null}
              </div>
              <div className="px-5 py-4">
                <h3 className="text-[18px] font-semibold">{goal.title}</h3>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="v2-tnum text-[22px] font-semibold">{rub(goal.current)}</span>
                  <span className="v2-tnum text-[14px] text-[var(--v2-ink-500)]">
                    {goal.target > 0 ? `из ${rub(goal.target)}` : "сумма цели не задана"}
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                  <span className="block h-full rounded-full bg-[#2d5eef]" style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <div className="v2-tnum mt-2 flex justify-between text-[13px] text-[var(--v2-ink-500)]">
                  <b className="text-[var(--v2-ink-900)]">{pct}%</b>
                  <span>{goal.target > 0 ? `осталось ${rub(left)}` : ""}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Sexuality() {
  const cards = [
    { title: "С Лерой", text: "Забота, внимание, красивые свидания, романтика, новые совместные впечатления. Не превращаю её согласие на сексуальные эксперименты в задачу, которую обязан решить." },
    { title: "С привлекательными девушками", text: "Наслаждаюсь красотой, естественно общаюсь, развиваю харизму и уверенность. Не страдаю от каждой нереализованной возможности. Соблюдаю действующие договорённости в отношениях." },
    { title: "С собственной сексуальностью", text: "Я не подавляю желание новых сексуальных впечатлений и не объявляю его неправильным. Но выбираю честность, взаимность и добровольные договорённости." },
    { title: "С окружением", text: "Хожу на интересные мероприятия, знакомлюсь, общаюсь с людьми и создаю насыщенную социальную жизнь." },
  ];
  return (
    <section className="v2-card grid overflow-hidden lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,320px)]">
      <div className="px-7 py-7">
        <div className="mb-3 text-[12px] font-semibold tracking-[0.13em] text-[var(--v2-ink-400)] uppercase">Сексуальность</div>
        <h2 className="v2-tight mb-5 max-w-[720px] text-[28px] leading-snug font-semibold tracking-[-0.03em]">
          Я становлюсь уверенным, чувственным, любящим мужчиной.
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {cards.map((card) => (
            <div key={card.title} className="rounded-[16px] bg-[var(--v2-ink-50)] px-4 py-4">
              <h3 className="text-[16px] font-semibold">{card.title}</h3>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-[var(--v2-ink-600)]">{card.text}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="relative min-h-[360px]">
        <Photo src="/home/loving.png" position="center 20%" fill />
      </div>
    </section>
  );
}

function StopList() {
  return (
    <section className="rounded-[22px] bg-[#fff5f5] px-7 py-6" style={{ boxShadow: "inset 4px 0 0 #dc2626" }}>
      <div className="mb-4 flex flex-wrap items-baseline gap-3">
        <span className="text-[12px] font-semibold tracking-[0.13em] text-[#dc2626] uppercase">Стоп-лист</span>
        <h2 className="v2-tight text-[26px] font-semibold tracking-[-0.03em] text-[#7f1d1d]">Что я НЕ делаю до конца ноября</h2>
      </div>
      <div className="flex flex-col gap-2">
        {STOPS.map((text, index) => (
          <div key={text} className="flex items-start gap-3 text-[15.5px] leading-snug text-[#7f1d1d]">
            <i className="v2-tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#dc2626] text-[12px] font-semibold text-white not-italic">
              {index + 1}
            </i>
            {text}
          </div>
        ))}
      </div>
    </section>
  );
}

function Codex() {
  return (
    <section className="v2-card grid overflow-hidden lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,420px)]">
      <div className="flex flex-col gap-5 px-8 py-8">
        <span className="text-[12px] font-semibold tracking-[0.13em] text-[var(--v2-ink-400)] uppercase">Личный кодекс</span>
        <div>
          <h2 className="v2-tight text-[28px] leading-snug font-semibold tracking-[-0.03em]">Я привлекательный, уверенный и чувственный мужчина.</h2>
          <p className="mt-3 text-[15.5px] leading-relaxed text-[var(--v2-ink-600)]">
            Мне нравится женская красота и взаимное притяжение. Я открыт новому, свободно общаюсь, наслаждаюсь флиртом и собственной сексуальностью. Я позволяю желанным событиям развиваться естественно, с взаимным интересом, честностью и уважением к границам.
          </p>
          <p className="mt-3 text-[15.5px] leading-relaxed text-[var(--v2-ink-600)]">
            Я не отказываюсь от своих желаний. Я перестаю жить в ожидании их исполнения и начинаю создавать для них реальную основу.
          </p>
        </div>
        <div className="h-px bg-[var(--v2-ink-100)]" />
        <div>
          <h2 className="v2-tight text-[28px] leading-snug font-semibold tracking-[-0.03em]">Я — автор своей реальности.</h2>
          <p className="mt-3 text-[15.5px] leading-relaxed text-[var(--v2-ink-600)]">
            Я выбираю желаемую жизнь, создаю условия для её воплощения и отпускаю необходимость контролировать весь маршрут.
          </p>
        </div>
      </div>
      <div className="relative min-h-[320px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Photo src="/home/codex.png" position="center 25%" fill />
      </div>
    </section>
  );
}

function Visualization() {
  return (
    <section>
      <SectionHead title="Что именно визуализировать" sub="Четыре постоянные сцены" />
      <p className="mb-4 text-[15.5px] text-[var(--v2-ink-600)]">
        Представлять их от первого лица, как будто это твой обычный образ жизни, а не далёкая награда.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SCENES.map((scene) => (
          <article key={scene.n} className="v2-card overflow-hidden">
            <div className="h-[220px]">
              <Photo src={scene.src} position="center 30%" />
            </div>
            <div className="flex gap-3 px-5 py-4">
              <span className="v2-tnum text-[13px] font-semibold text-[var(--v2-ink-400)]">{scene.n}</span>
              <div>
                <h3 className="text-[17px] font-semibold">{scene.title}</h3>
                <p className="mt-1 text-[14.5px] leading-relaxed text-[var(--v2-ink-600)]">{scene.text}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SectionHead({ n, title, sub }: { n?: string; title: string; sub?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline gap-3.5">
      {n ? <span className="text-[12px] font-semibold tracking-[0.14em] text-[var(--v2-ink-400)]">{n}</span> : null}
      <h2 className="v2-tight text-[26px] font-semibold tracking-[-0.03em]">{title}</h2>
      {sub ? <span className="text-[14.5px] text-[var(--v2-ink-500)]">{sub}</span> : null}
    </div>
  );
}
