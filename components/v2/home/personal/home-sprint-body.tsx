"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useHomePersonalFinance } from "@/components/v2/home/personal/home-personal-finance-context";
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
import {
  currentSprintId,
  PRIMARY_HYPOTHESIS_TAG,
  projectColors,
  type Hypothesis,
  type HypothesisProject,
} from "@/lib/v2/personal/hypotheses-meta";
import { hypothesisPage } from "@/lib/v2/personal/hypothesis-workspace";
import type { HypothesesBoard } from "@/lib/v2/personal/personal-hypotheses-repo";
import "./home-sprint-design.css";

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
  { n: "01", title: "Финансовая свобода", text: "Я работаю над интересными продуктами, управляю процессами, получаю устойчивый доход. Мой день не полностью продан клиентам.", src: "/home/scene-finance.png", pos: "center 30%" },
  { n: "02", title: "Любовь и отношения", text: "Мы с Лерой любим друг друга, смеёмся, путешествуем, испытываем нежность и создаём красивые совместные воспоминания.", src: "/home/scene-love.png", pos: "center 30%" },
  { n: "03", title: "Сексуальность и притяжение", text: "Я уверенный, харизматичный, чувственный мужчина. В моей жизни есть взаимное желание, красота, новые знакомства и пространство для добровольных приключений.", src: "/home/scene-attraction.webp", pos: "center 30%" },
  { n: "04", title: "Социальная и красивая жизнь", text: "Я среди интересных людей, бываю в красивых местах, придумываю события, легко общаюсь, проявляю инициативу.", src: "/home/scene-social.png", pos: "center 30%" },
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

function tone(color: string, soft: string): CSSProperties {
  return { ["--c" as string]: color, ["--cs" as string]: soft };
}

export function HomeSprintBody() {
  return (
    <div className="hs">
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
    </div>
  );
}

function Manifesto() {
  const { day, total, pct } = sprintDayProgress();
  return (
    <section className="card mf">
      <div className="mf-img" style={{ backgroundImage: `url(${appPath("/home/manifesto.png")})` }} />
      <div className="mf-r">
        <div className="mf-tag">
          <span className="mf-badge">Спринт</span>
          <span className="kick">13 октября — 30 ноября</span>
        </div>
        <h2 className="mf-h">
          Я перестаю прогнозировать желаемую жизнь. <span>Я начинаю её создавать.</span>
        </h2>
        <p className="mf-p">
          Деньги, любовь, сексуальность, творчество, окружение и красивые впечатления — не альтернативы друг другу. Я постепенно выстраиваю жизнь, в которой всё это присутствует
        </p>
        <div className="mf-prog">
          <div className="bar">
            <span style={{ width: `${pct}%` }} />
          </div>
          <em className="tnum">
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
      <div className="sec-head">
        <span className="sec-n">01</span>
        <h2 className="sec-title">Мои три контура</h2>
        <span className="sec-sub">Конкретные задачи до 30 ноября. Клик — отметить.</span>
      </div>
      <div className="ctrs">
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
    <article className="card ctr" style={tone(contour.color, contour.soft)}>
      <div className="ctr-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={appPath(CONTOUR_PHOTO[contour.id] ?? "")} alt="" style={{ objectPosition: "center 30%" }} />
      </div>
      <div className="ctr-b">
        <div className="ctr-k">
          <span className="ctr-dot" />
          <span className="ctr-n">{contour.name}</span>
          <span className="ctr-pc tnum">{pct}%</span>
        </div>
        <div className="ctr-bar">
          <span style={{ width: `${pct}%` }} />
        </div>
        <h3 className="ctr-t">{contour.title}</h3>
        <p className="ctr-with">{contour.with}</p>
        <p className="ctr-goal">{contour.goal}</p>
        <div className="tasks">
          {contour.items.map((item) => (
            <ContourTask key={item.key} item={item} checks={checks} onSet={onSet} />
          ))}
        </div>
      </div>
    </article>
  );
}

function CheckButton({
  done,
  title,
  note,
  extra,
  onClick,
}: {
  done: boolean;
  title: string;
  note?: string;
  extra?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`tk${done ? " done" : ""}`} onClick={onClick}>
      <span className="tk-box">✓</span>
      <span className="tk-m">
        <span className="tk-t">{title}</span>
        {note ? <span className="tk-s">{note}</span> : null}
      </span>
      {extra ? <span className="grp-c tnum">{extra}</span> : null}
    </button>
  );
}

function ContourTask({
  item,
  checks,
  onSet,
}: {
  item: ContourItem;
  checks: SprintChecks;
  onSet: (key: string, value: boolean | number) => void;
}) {
  if (item.kind === "count") {
    const n = Math.min(item.max, Number(checks[item.key]) || 0);
    return (
      <div className="cnt">
        <div className="cnt-m">
          <div className="cnt-t">{item.title}</div>
          {item.note ? <div className="cnt-s">{item.note}</div> : null}
          <div className="pips">
            {Array.from({ length: item.max }, (_, index) => (
              <i key={index} className={index < n ? "on" : undefined} />
            ))}
          </div>
        </div>
        <span className="cnt-v tnum">
          {n}
          <small> / {item.max}</small>
        </span>
        <span className="stp">
          <button type="button" aria-label="минус" onClick={() => onSet(item.key, Math.max(0, n - 1))}>
            −
          </button>
          <button type="button" aria-label="плюс" onClick={() => onSet(item.key, Math.min(item.max, n + 1))}>
            +
          </button>
        </span>
      </div>
    );
  }
  if (item.kind === "group") {
    const done = item.subs.filter((sub) => checks[sub.key]).length;
    return (
      <div className="grp">
        <CheckButton
          done={Boolean(checks[item.key])}
          title={item.title}
          extra={`${done} / ${item.subs.length}`}
          onClick={() => onSet(item.key, !checks[item.key])}
        />
        <div className="grp-subs">
          {item.subs.map((sub) => (
            <CheckButton
              key={sub.key}
              done={Boolean(checks[sub.key])}
              title={sub.title}
              note={sub.note}
              onClick={() => onSet(sub.key, !checks[sub.key])}
            />
          ))}
        </div>
      </div>
    );
  }
  return (
    <CheckButton
      done={Boolean(checks[item.key])}
      title={item.title}
      note={item.note}
      onClick={() => onSet(item.key, !checks[item.key])}
    />
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
    <section className="card pad">
      <div className="sec-head">
        <span className="sec-n">02</span>
        <h2 className="sec-title">Гипотезы спринта</h2>
        <span className="sec-sub">{sprint ? `${sprint.name} · ${sprint.range_label}` : ""}</span>
        <div className="hy-btns">
          <Link className="btn btn-w" href={`${appPath(HYP_HREF)}#backlog`}>
            Бэклог <b className="tnum">{backlog}</b>
          </Link>
          <Link className="btn btn-b" href={appPath(HYP_HREF)}>
            Все гипотезы →
          </Link>
        </div>
      </div>
      <div className="kick" style={{ marginBottom: 12 }}>
        В работе{sprint?.name ? ` · ${sprint.name}` : ""}
      </div>
      <div className="hy-act">
        {active.length ? (
          active.map((item) => <HomeHypothesisCard key={item.id} item={item} project={projects.get(item.project_id ?? "")} />)
        ) : (
          <div className="sec-sub">В спринте пока нет гипотез — возьми из очереди.</div>
        )}
      </div>
      <div className="hy-q">
        <div className="kick">В очереди · {queue.length}</div>
        {queue.length ? (
          <div className="hy-ql">
            {queue.slice(0, 6).map((item, index) => {
              const project = projects.get(item.project_id ?? "");
              const colors = projectColors(project?.hue ?? 260);
              return (
                <Link key={item.id} className="qr" href={`${appPath(HYP_HREF)}#${item.id}`} style={tone(colors.c, colors.s)}>
                  <span className="qr-n tnum">{index + 1}</span>
                  <span className="qr-m">
                    <span className="qr-t">{item.title}</span>
                    <span className="qr-p">{project?.name}</span>
                  </span>
                  <span className="qr-go">→</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="sec-sub" style={{ marginTop: 12 }}>
            Очередь пуста.
          </div>
        )}
      </div>
    </section>
  );
}

function HomeHypothesisCard({ item, project }: { item: Hypothesis; project?: HypothesisProject }) {
  const colors = projectColors(project?.hue ?? 260);
  const main = item.metric === PRIMARY_HYPOTHESIS_TAG;
  const chip = main ? PRIMARY_HYPOTHESIS_TAG : project?.name;
  return (
    <Link
      className="hc"
      href={
        hypothesisPage(item.title)
          ? appPath(`/v2/personal/hypotheses/${item.id}`)
          : `${appPath(HYP_HREF)}#${item.id}`
      }
      style={tone(colors.c, colors.s)}
    >
      <div className="hc-top">
        {chip ? <span className="pchip">{chip}</span> : null}
        <span className="hc-st">в работе</span>
      </div>
      <h3 className="hc-t">{item.title}</h3>
      {item.body ? <p className="hc-d">{item.body}</p> : null}
      {item.metric && !main ? (
        <div className="hc-m">
          <span className="kick">Критерий проверки</span>
          <b>{item.metric}</b>
        </div>
      ) : null}
    </Link>
  );
}

function Priority() {
  const steps = [
    { n: "1", text: "Оплачиваемые обязательства и продажи TwinLabs Plus", color: "var(--c1)", soft: "var(--c1s)" },
    { n: "2", text: "Качественное время с близкими", color: "var(--c2)", soft: "var(--c2s)" },
    { n: "3", text: "Блог и FoodTech", color: "var(--c3)", soft: "var(--c3s)" },
  ];
  return (
    <section className="card pad prio">
      <div>
        <div className="kick" style={{ marginBottom: 12 }}>
          Приоритет при конфликте задач
        </div>
        <div className="chain">
          {steps.map((step, index) => (
            <span key={step.n} style={{ display: "contents" }}>
              <span className="ch" style={tone(step.color, step.soft)}>
                <b>{step.n}</b>
                {step.text}
              </span>
              {index < steps.length - 1 ? <span className="arr">→</span> : null}
            </span>
          ))}
        </div>
      </div>
      <p className="prio-note">Не пытаться выполнить контент-план ценой финансового провала и выгорания.</p>
    </section>
  );
}

function Reward() {
  const { dashboard } = useHomePersonalFinance();
  const now = dashboard?.summary.monthProfit ?? 0;
  const pct = Math.max(0, Math.min(100, Math.round((now / INCOME_GOAL) * 100)));
  const left = Math.max(0, INCOME_GOAL - now);
  return (
    <section className="card rw">
      <div className="rw-l">
        <div className="sec-head" style={{ marginBottom: 0 }}>
          <h2 className="sec-title">Награда за финансовый результат</h2>
        </div>
        <div className="rw-goal">
          <span className="kick">Цель · личный доход за месяц</span>
          <div className="rw-num tnum">{rub(INCOME_GOAL)}</div>
          <div className="rw-bar">
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className="rw-foot tnum">
            <span>
              Сейчас <b>{rub(now)}</b> · {pct}%
            </span>
            <span>осталось {rub(left)}</span>
          </div>
        </div>
        <div>
          <div className="kick" style={{ color: "var(--c2)" }}>
            Особенное свидание с Лерой
          </div>
          <p className="rw-p" style={{ marginTop: 8 }}>
            <b style={{ fontWeight: 600 }}>Первый вариант</b> — стриптиз-клуб, чтобы вместе посмотреть шоу, если ей самой интересно.
          </p>
        </div>
        <div>
          <div className="kick" style={{ marginBottom: 10 }}>
            Альтернативы
          </div>
          <div className="chips">
            {["Красивый отель", "Кабаре", "Необычное романтическое впечатление", "Другой совместно выбранный формат"].map((chip) => (
              <span key={chip} className="chip">
                {chip}
              </span>
            ))}
          </div>
        </div>
        <p className="rw-note">
          Награда должна укладываться в бюджет после обязательных расходов. Сама идея красивой жизни не отменяется, если денежная цель не достигнута.
        </p>
      </div>
      <div className="rw-img">
        {REWARD_COLLAGE.map((src) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={appPath(src)} alt="" style={{ objectPosition: "center 15%" }} />
        ))}
      </div>
    </section>
  );
}

function Goals() {
  return (
    <section className="card pad">
      <div className="sec-head">
        <h2 className="sec-title">Цели</h2>
        <span className="sec-sub">Общие, без срока</span>
        <div className="hy-btns">
          <Link className="btn btn-w" href={appPath("/v2/personal/goals")}>
            Все цели →
          </Link>
        </div>
      </div>
      <div className="gl">
        <article className="gc">
          <div className="gc-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={appPath("/home/goal-cushion.png")} alt="" style={{ objectPosition: "center 35%" }} />
          </div>
          <div className="gc-b">
            <h3 className="gc-n">Подушка безопасности</h3>
            <div className="gc-v">
              <span className="gc-cur tnum">331 000 ₽</span>
              <span className="gc-tg tnum">из 510 000 ₽</span>
            </div>
            <div className="gc-bar">
              <span style={{ width: "65%" }} />
            </div>
            <div className="gc-foot tnum">
              <b>65%</b>
              <span>осталось 179 000 ₽</span>
            </div>
          </div>
        </article>
        <article className="gc">
          <div className="gc-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={appPath("/home/goal-car.png")} alt="" style={{ objectPosition: "center 35%" }} />
          </div>
          <div className="gc-b">
            <h3 className="gc-n">Машина</h3>
            <div className="gc-v">
              <span className="gc-cur tnum">0 ₽</span>
              <span className="gc-tg">сумма цели не задана</span>
            </div>
            <div className="gc-bar">
              <span style={{ width: "0%" }} />
            </div>
            <div className="gc-foot tnum">
              <b>0%</b>
              <span />
            </div>
          </div>
        </article>
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
    <section className="card pad sx-wrap">
      <div>
        <div className="kick" style={{ marginBottom: 12 }}>
          Сексуальность
        </div>
        <h2 className="sx-h">Я становлюсь уверенным, чувственным, любящим мужчиной.</h2>
        <div className="sx">
          {cards.map((card) => (
            <div key={card.title} className="sx-c">
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="sx-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={appPath("/home/loving.png")} alt="" style={{ objectPosition: "32% 22%" }} />
      </div>
    </section>
  );
}

function StopList() {
  return (
    <section className="stop">
      <div className="sec-head">
        <span className="kick" style={{ color: "#dc2626" }}>
          Стоп-лист
        </span>
        <h2 className="sec-title">Что я НЕ делаю до конца ноября</h2>
      </div>
      <div className="stop-l">
        {STOPS.map((text, index) => (
          <div key={text} className="stop-i">
            <i>{index + 1}</i>
            {text}
          </div>
        ))}
      </div>
    </section>
  );
}

function Codex() {
  return (
    <section className="cx">
      <div className="cx-l">
        <span className="kick">Личный кодекс</span>
        <div>
          <h2 className="cx-q">Я привлекательный, уверенный и чувственный мужчина.</h2>
          <p className="cx-p">
            Мне нравится женская красота и взаимное притяжение. Я открыт новому, свободно общаюсь, наслаждаюсь флиртом и собственной сексуальностью. Я позволяю желанным событиям развиваться естественно, с взаимным интересом, честностью и уважением к границам.
          </p>
          <p className="cx-p">
            Я не отказываюсь от своих желаний. Я перестаю жить в ожидании их исполнения и начинаю создавать для них реальную основу.
          </p>
        </div>
        <div className="cx-sep" />
        <div>
          <h2 className="cx-q">Я — автор своей реальности.</h2>
          <p className="cx-p">
            Я выбираю желаемую жизнь, создаю условия для её воплощения и отпускаю необходимость контролировать весь маршрут.
          </p>
        </div>
      </div>
      <div className="cx-img" style={{ backgroundImage: `url(${appPath("/home/codex.png")})` }} />
    </section>
  );
}

function Visualization() {
  return (
    <section>
      <div className="sec-head">
        <h2 className="sec-title">Что именно визуализировать</h2>
        <span className="sec-sub">Четыре постоянные сцены</span>
      </div>
      <p className="vz-intro">Представлять их от первого лица, как будто это твой обычный образ жизни, а не далёкая награда.</p>
      <div className="vz">
        {SCENES.map((scene) => (
          <article key={scene.n} className="vz-c">
            <div className="vz-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={appPath(scene.src)} alt="" style={{ objectPosition: scene.pos }} />
            </div>
            <div className="vz-b">
              <span className="vz-n">{scene.n}</span>
              <div>
                <h3 className="vz-t">{scene.title}</h3>
                <p className="vz-p">{scene.text}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
