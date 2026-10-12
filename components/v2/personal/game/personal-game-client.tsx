"use client";

import { useEffect, useState, type ReactNode } from "react";
import { appPath } from "@/lib/api-url";

const HERO_BLUE = "#2d5eef";
const WEEK_KEY = "tt-game-week";

const TOC = [
  { id: "decision", l: "Главное решение" },
  { id: "system", l: "Трансерфинг" },
  { id: "life", l: "Желаемая жизнь" },
  { id: "do", l: "Действия" },
  { id: "girls", l: "Как себя вести" },
  { id: "lera", l: "Лера" },
  { id: "practice", l: "Практика 14 дней" },
  { id: "code", l: "Кодекс" },
] as const;

const RHYTHM = [
  { id: "money", t: "Деньги и свобода", d: "Каждый рабочий день — одно действие, которое приносит доход или уменьшает зависимость от ручной работы." },
  { id: "circle", t: "Новое окружение", d: "Минимум одно мероприятие, встреча или новая компания за неделю." },
  { id: "lera", t: "Лера и романтика", d: "Одно качественное свидание или новое совместное впечатление в неделю. Плюс обычная повседневная забота." },
  { id: "voice", t: "Уверенность", d: "Первым начинать разговоры, проявлять инициативу, практиковать речь и общение." },
  { id: "beauty", t: "Красота жизни", d: "Прогулки, интересные места, друзья и удовольствие — не только после финансовых целей." },
] as const;

const ENV = [
  {
    src: "/life/meh-masque.webp",
    t: "Кабаре, бурлеск, джаз, красивые вечеринки",
    d: "Пространство эстетики, чувственности и необычных впечатлений. Подходит и для вечера с Лерой.",
  },
  {
    src: "/life/friends-dinner.webp",
    t: "Творческая и предпринимательская среда",
    d: "Люди, рядом с которыми одновременно растут идеи, деловые возможности, харизма и круг общения.",
  },
  {
    src: "/life/terrace-sea.webp",
    t: "Друзья и живое общение",
    d: "Прогулки, встречи, новые знакомства, спонтанные события. Источник энергии, а не трата времени.",
  },
  {
    src: "/life/night-office.webp",
    t: "Секс-позитивное образование",
    d: "Лекции, тематические встречи, БДСМ-образование, опыт людей в нестандартных отношениях. Без ожидания, что участие само приведёт к сексу.",
  },
] as const;

const SITUATIONS: [string, string][] = [
  ["Вижу красивую девушку", "Замечаю красоту, чувствую притяжение. Не превращаю встречу в мысленный фильм о том, чего мне не хватает."],
  ["Хочется заговорить", "Если контекст уместный — проявляю социальную инициативу, не дожидаясь внутреннего одобрения заранее."],
  ["Она сама начинает общение", "Общаюсь тепло и уверенно. Не обесцениваю взаимный интерес и не делаю поспешных сексуальных выводов."],
  ["Она явно заинтересовалась", "Получаю удовольствие от взаимной симпатии. Не скрываю статус отношений, если контакт становится романтическим."],
  ["Нет взаимности", "Спокойно заканчиваю контакт. Не делаю из этого вывод о своей привлекательности."],
  ["Меня сильно возбуждает девушка", "Признаю своё желание. Но не считаю сильное возбуждение причиной нарушить действующие договорённости."],
];

function weekId() {
  const d = new Date();
  const shift = (d.getDay() + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - shift);
  return monday.toISOString().slice(0, 10);
}

function loadChecks(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(WEEK_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { week: string; checks: Record<string, boolean> };
    if (parsed.week !== weekId()) return {};
    return parsed.checks || {};
  } catch {
    return {};
  }
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 88, behavior: "smooth" });
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

function Sect({
  id,
  n,
  title,
  children,
}: {
  id: string;
  n: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="v2-card scroll-mt-[88px] px-8 py-7">
      <Kicker tint="var(--v2-brand-600)">{n}</Kicker>
      <h2 className="v2-tight mt-2 text-[28px] font-semibold leading-[1.15] tracking-[-0.032em] text-[var(--v2-ink-900)]">
        {title}
      </h2>
      <div className="mt-6 flex flex-col gap-5">{children}</div>
    </section>
  );
}

function Lead({ children }: { children: ReactNode }) {
  return (
    <p
      className="v2-tight max-w-[72ch] rounded-[20px] bg-[var(--v2-brand-50)] px-6 py-5 text-[17px] font-medium leading-[1.45] tracking-[-0.02em] text-[var(--v2-brand-800)]"
      style={{ boxShadow: "inset 4px 0 0 var(--v2-brand-600)", textWrap: "pretty" }}
    >
      {children}
    </p>
  );
}

function Formula({ kicker, children }: { kicker: string; children: ReactNode }) {
  return (
    <div
      className="rounded-[20px] px-7 py-6 text-white"
      style={{ background: HERO_BLUE, boxShadow: "0 16px 40px -18px rgba(45,94,239,0.85)" }}
    >
      <Kicker tint="rgba(255,255,255,.55)">{kicker}</Kicker>
      <p className="v2-tight mt-2 text-[20px] font-semibold leading-[1.35] tracking-[-0.026em]">{children}</p>
    </div>
  );
}

export function PersonalGameClient() {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState<(typeof TOC)[number]["id"]>("decision");

  useEffect(() => {
    setChecks(loadChecks());
    const hash = window.location.hash.slice(1);
    if (hash) setTimeout(() => scrollToId(hash), 80);
  }, []);

  useEffect(() => {
    const nodes = TOC.map((t) => document.getElementById(t.id)).filter((n): n is HTMLElement => Boolean(n));
    if (!nodes.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = visible[0]?.target.id as (typeof TOC)[number]["id"] | undefined;
        if (id) setActive(id);
      },
      { rootMargin: "-12% 0px -70% 0px", threshold: [0.05, 0.3, 0.6] }
    );
    nodes.forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, []);

  const toggle = (id: string) => {
    const next = { ...checks, [id]: !checks[id] };
    setChecks(next);
    try {
      localStorage.setItem(WEEK_KEY, JSON.stringify({ week: weekId(), checks: next }));
    } catch {
      /* ignore */
    }
  };

  const done = RHYTHM.filter((r) => checks[r.id]).length;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-[1720px] flex-col gap-7 px-9 pb-24 pt-7">
        <section id="decision" className="v2-card relative scroll-mt-[88px] overflow-hidden">
          <div className="relative h-[210px] overflow-hidden sm:h-[240px] lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={appPath("/life/hero-game.jpg")} alt="" className="h-full w-full object-cover object-[72%_22%]" />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={appPath("/life/hero-game.jpg")}
            alt=""
            className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-[78%_28%] lg:block"
          />
          <div
            className="pointer-events-none absolute inset-y-0 left-0 hidden lg:block"
            style={{
              width: "58%",
              background:
                "linear-gradient(90deg, #ffffff 0%, #ffffff 40%, rgba(255,255,255,0.86) 62%, rgba(255,255,255,0) 100%)",
            }}
          />
          <div className="relative z-10 flex min-h-0 max-w-[740px] flex-col justify-center gap-5 px-8 py-8 lg:min-h-[440px] lg:px-10">
            <div>
              <Kicker tint="var(--v2-brand-600)">Игра · главное решение</Kicker>
              <h1 className="v2-tight mt-2 text-[38px] font-semibold leading-[1.08] tracking-[-0.036em] text-[var(--v2-ink-900)]">
                Я перестаю прогнозировать желаемую жизнь
                <span className="mt-1 block text-[var(--v2-brand-700)]">и начинаю её создавать.</span>
              </h1>
              <p className="v2-tight mt-4 max-w-[54ch] text-[16px] leading-relaxed text-[var(--v2-ink-500)]">
                Я не отказываюсь от мечты о любви, семье, сексуальной свободе, красивых женщинах, деньгах и приключениях.
                Я перестаю требовать гарантии её исполнения. Выбираю нужный образ жизни и каждый день создаю для него
                реальные условия.
              </p>
            </div>
          </div>
        </section>

        <nav className="v2-card sticky top-0 z-10 flex flex-wrap gap-1.5 px-4 py-3">
          {TOC.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActive(t.id);
                scrollToId(t.id);
              }}
              className={`v2-tight rounded-[10px] px-3 py-1.5 text-[13px] font-medium transition ${
                active === t.id
                  ? "bg-[var(--v2-brand-600)] text-white"
                  : "bg-[var(--v2-ink-50)] text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
              }`}
            >
              <span className="v2-tnum mr-1.5 opacity-55">{String(i + 1).padStart(2, "0")}</span>
              {t.l}
            </button>
          ))}
        </nav>

        <Sect id="system" n="01 · Система" title="Трансерфинг — моя основная система">
          <Lead>
            Не «мне не обязательно получить желаемое». Я действительно этого хочу и намерен к этому идти. Меняется
            отношение к неизвестному маршруту — не само желание.
          </Lead>
          <Kicker>Как я создаю реальность</Kicker>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["01", "Выбираю", "Определяю желаемую жизнь. Не торгуюсь со своими желаниями."],
              ["02", "Проживаю образ", "Держу не только конечный результат, но и себя в роли уверенного свободного создателя."],
              ["03", "Действую", "Зарабатываю, знакомлюсь, развиваюсь, организую впечатления и укрепляю отношения."],
              ["04", "Отпускаю контроль", "Не назначаю сроки, чужие желания и единственно возможный путь."],
            ].map(([n, t, d]) => (
              <article key={n} className="rounded-[18px] bg-[var(--v2-ink-50)] px-5 py-4">
                <span className="v2-tnum text-[12px] font-semibold text-[var(--v2-brand-600)]">{n}</span>
                <h3 className="v2-tight mt-1.5 text-[17px] font-semibold text-[var(--v2-ink-900)]">{t}</h3>
                <p className="v2-tight mt-2 text-[14px] leading-relaxed text-[var(--v2-ink-600)]">{d}</p>
              </article>
            ))}
          </div>
          <div className="rounded-[16px] bg-[var(--v2-ink-50)] px-5 py-3.5 text-[14.5px] font-medium text-[var(--v2-ink-700)]">
            Получаю опыт → корректирую действия → продолжаю
          </div>
          <h3 className="v2-tight text-[19px] font-semibold tracking-[-0.022em] text-[var(--v2-ink-900)]">Мои правила</h3>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {[
              [
                "Правило 01",
                "Снижаю важность контроля, а не мечты",
                "Сексуальная свобода важна. Новые впечатления — самостоятельное желание, а не попытка закрыть дыру в самооценке. Я не уговариваю себя, что прекрасно проживу без них всю жизнь.",
                "Но больше не привязываю осуществление мечты к конкретной дате, предсказанию или обязательному изменению желаний Леры.",
              ],
              [
                "Правило 02",
                "Внешнее намерение — не пассивное ожидание",
                "Я допускаю неожиданные возможности и маршруты. Но не жду, пока Вселенная сама принесёт готовую жизнь. Я создаю условия, в которых эти возможности способны появиться.",
                "",
              ],
              [
                "Правило 03",
                "Не борюсь с реальностью",
                "Если сегодня чего-то нет — это информация о текущих обстоятельствах, а не приговор всей жизни.",
                "Если Лера сейчас против тройничка, это её настоящая граница, и я её соблюдаю. Сегодняшняя ситуация не становится предсказанием всех следующих лет.",
              ],
              [
                "Правило 04",
                "Доверяю Богу неизвестный маршрут",
                "Могу молиться, верить, чувствовать благодарность. Не использую знаки, повторяющиеся числа или карты как гарантию событий.",
                "Трансерфинг для меня — способ держать намерение и действовать спокойнее. Не механизм управления чужой волей.",
              ],
            ].map(([k, t, a, b]) => (
              <article key={k} className="rounded-[18px] bg-[var(--v2-ink-50)] px-5 py-5">
                <Kicker tint="var(--v2-brand-600)">{k}</Kicker>
                <h3 className="v2-tight mt-1.5 text-[17px] font-semibold text-[var(--v2-ink-900)]">{t}</h3>
                <p className="v2-tight mt-2 text-[14.5px] leading-relaxed text-[var(--v2-ink-600)]">{a}</p>
                {b ? <p className="v2-tight mt-2 text-[14.5px] leading-relaxed text-[var(--v2-ink-600)]">{b}</p> : null}
              </article>
            ))}
          </div>
          <Formula kicker="Моя главная формула">
            Я выбрал жизнь, которую хочу. Я создаю для неё реальные условия, замечаю возможности и использую их. Мне не
            нужно знать весь маршрут заранее.
          </Formula>
        </Sect>

        <Sect id="life" n="02 · Образ" title="Моя желаемая жизнь — что именно я строю">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[
              ["Любовь", "Лера, близость, тёплый дом, поддержка, совместные приключения, будущая семья."],
              ["Сексуальная свобода", "Страсть, красивые женщины, взаимное влечение, новые впечатления и возможность согласованного разнообразия."],
              ["Деньги", "От 240 000 ₽ личного стабильного дохода в месяц. Минимальная зависимость от ручной работы."],
              ["Красота и творчество", "Свои продукты, эстетичные места, мероприятия, окружение, путешествия, воплощение идей."],
            ].map(([t, d]) => (
              <article key={t} className="rounded-[18px] bg-[var(--v2-ink-50)] px-5 py-4">
                <Kicker tint="var(--v2-brand-600)">{t}</Kicker>
                <p className="v2-tight mt-2 text-[15px] leading-relaxed text-[var(--v2-ink-700)]">{d}</p>
              </article>
            ))}
          </div>
          <Lead>
            Я не меняю сексуальную свободу на успешный бизнес или красивые свидания. Мне нужно, чтобы всё это жило в
            одной жизни. Поэтому задача шире, чем смелость: выстроить целую систему.
          </Lead>
        </Sect>

        <Sect id="do" n="03 · Ритм" title="Конкретные действия — что я начинаю делать">
          <div className="rounded-[20px] bg-[var(--v2-ink-50)] px-6 py-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <Kicker tint="var(--v2-brand-600)">Минимальный недельный ритм</Kicker>
                <h3 className="v2-tight mt-1.5 text-[20px] font-semibold text-[var(--v2-ink-900)]">Пять пунктов этой недели</h3>
              </div>
              <div className="v2-tnum text-[22px] font-semibold text-[var(--v2-brand-700)]">
                {done} / {RHYTHM.length}
              </div>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white">
              <i
                className="block h-full rounded-full bg-[var(--v2-brand-600)]"
                style={{ width: `${(done / RHYTHM.length) * 100}%` }}
              />
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {RHYTHM.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggle(r.id)}
                  className={`flex items-start gap-3.5 rounded-[16px] px-4 py-3.5 text-left transition ${
                    checks[r.id] ? "bg-[var(--v2-brand-600)] text-white" : "bg-white text-[var(--v2-ink-800)]"
                  }`}
                >
                  <span
                    className={`mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] ${
                      checks[r.id] ? "border-white bg-white" : "border-[var(--v2-brand-400)] bg-[var(--v2-brand-50)]"
                    }`}
                  >
                    {checks[r.id] ? <span className="text-[11px] font-bold text-[var(--v2-brand-600)]">✓</span> : null}
                  </span>
                  <span>
                    <b className="block text-[15px] font-semibold">{r.t}</b>
                    <small className={`mt-0.5 block text-[13.5px] leading-relaxed ${checks[r.id] ? "text-white/75" : "text-[var(--v2-ink-500)]"}`}>
                      {r.d}
                    </small>
                  </span>
                </button>
              ))}
            </div>
            <p className="v2-tight mt-3 text-[13px] text-[var(--v2-ink-400)]">
              Чек-лист сбрасывается каждый понедельник. Это ритм, а не отчёт перед собой.
            </p>
          </div>

          <h3 className="v2-tight text-[19px] font-semibold tracking-[-0.022em] text-[var(--v2-ink-900)]">
            Окружение — среда будущей жизни
          </h3>
          <Lead>
            Не обязательно ждать сексуальной свободы, чтобы уже сейчас быть среди людей, эстетики и новых впечатлений.
          </Lead>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {ENV.map((item) => (
              <article key={item.t} className="overflow-hidden rounded-[20px] bg-[var(--v2-ink-50)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={appPath(item.src)} alt="" className="block h-auto w-full" />
                <div className="px-5 py-4">
                  <h3 className="v2-tight text-[16.5px] font-semibold text-[var(--v2-ink-900)]">{item.t}</h3>
                  <p className="v2-tight mt-1.5 text-[14px] leading-relaxed text-[var(--v2-ink-600)]">{item.d}</p>
                </div>
              </article>
            ))}
          </div>

          <h3 className="v2-tight text-[19px] font-semibold tracking-[-0.022em] text-[var(--v2-ink-900)]">
            Харизма — уверенность через практику
          </h3>
          <p className="v2-tight max-w-[72ch] text-[16px] leading-[1.7] text-[var(--v2-ink-600)]">
            Выбранная черта — уверенность. Не нужно ждать ощущения «я на сто процентов готов», чтобы начать общаться.
            Уверенность растёт из опыта.
          </p>
          <div className="flex flex-wrap gap-2">
            {["Начать разговор", "Удержать интересный контакт", "Спокойно завершить — независимо от реакции"].map((s) => (
              <span
                key={s}
                className="rounded-full bg-[var(--v2-ink-50)] px-3.5 py-1.5 text-[13.5px] font-medium text-[var(--v2-ink-700)]"
              >
                {s}
              </span>
            ))}
          </div>
          <p className="v2-tight max-w-[72ch] text-[15px] leading-relaxed text-[var(--v2-ink-600)]">
            Плюс дикция, выразительность речи, осанка и стиль. Это работает сразу в личной жизни, в бизнесе и в медийности.
          </p>
        </Sect>

        <Sect id="girls" n="04 · Протокол" title="Красивые девушки — как себя вести прямо сейчас">
          <Lead>
            Именно здесь чаще всего затягивает обратно в переживания о будущем. Поэтому здесь нужен протокол, а не
            импровизация из тревоги.
          </Lead>
          <div className="flex flex-col gap-2.5">
            <div className="hidden grid-cols-2 gap-3 px-1 md:grid">
              <Kicker tint="#B42318">Ситуация</Kicker>
              <Kicker tint="var(--v2-brand-600)">Поведение</Kicker>
            </div>
            {SITUATIONS.map(([a, b]) => (
              <div key={a} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-[16px] bg-[#FEF3F2] px-4 py-3.5 text-[14.5px] leading-[1.5] text-[#912018]">{a}</div>
                <div
                  className="rounded-[16px] bg-[var(--v2-brand-50)] px-4 py-3.5 text-[14.5px] font-medium leading-[1.5] text-[var(--v2-brand-800)]"
                  style={{ boxShadow: "inset 0 0 0 1px rgba(59,111,247,.16)" }}
                >
                  {b}
                </div>
              </div>
            ))}
          </div>
          <h3 className="v2-tight text-[19px] font-semibold tracking-[-0.022em] text-[var(--v2-ink-900)]">
            Новая внутренняя реакция
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-[18px] bg-[#FEF3F2] px-5 py-4">
              <Kicker tint="#B42318">Вместо</Kicker>
              <p className="v2-tight mt-2 text-[15px] leading-relaxed text-[#912018]">
                «Какая девушка. Но мне нельзя. А вдруг мне никогда не будет можно?»
              </p>
            </div>
            <div className="rounded-[18px] bg-[var(--v2-brand-50)] px-5 py-4">
              <Kicker tint="var(--v2-brand-600)">Я выбираю</Kicker>
              <p className="v2-tight mt-2 text-[15px] leading-relaxed text-[var(--v2-brand-800)]">
                «Она красивая. Мне нравится женская красота, и я хочу жить насыщенной сексуальной жизнью. Я развиваю
                себя, создаю окружение и возможности. Мне не нужно прямо сейчас превращать эту встречу в прогноз всей
                судьбы.»
              </p>
            </div>
          </div>
          <p className="v2-tight max-w-[72ch] text-[16px] leading-[1.7] text-[var(--v2-ink-600)]">
            Это не подавление желания. Желание остаётся. Убирается катастрофический прогноз.
          </p>
          <p className="v2-tight max-w-[72ch] text-[16px] leading-[1.7] text-[var(--v2-ink-600)]">
            И ещё одно правило: не путать уверенный социальный контакт с тайным поиском новых сексуальных отношений.
            Пока договорённости с Лерой моногамные, новые сексуальные контакты требовали бы предварительного пересмотра
            этих договорённостей.
          </p>
        </Sect>

        <Sect id="lera" n="05 · Отношения" title="Лера — как вернуть безопасность и притяжение">
          <Lead>
            Качество, которое я хочу развить: уметь быть одновременно свободным, страстным и заботливым. Раньше попытка
            провести тройничок иногда забирала внимание у её эмоционального состояния. Теперь другой подход.
          </Lead>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[
              ["Безопасность", "Она может сказать «нет» без страха потерять мою любовь."],
              ["Желанность", "Она получает внимание, флирт, нежность и романтику ради вас двоих."],
              ["Новизна", "Вы вместе создаёте красивые впечатления, которые интересны обоим."],
              ["Честность", "Собственные желания признаются, границы обсуждаются без давления."],
            ].map(([t, d]) => (
              <article key={t} className="rounded-[18px] bg-[var(--v2-ink-50)] px-5 py-4">
                <Kicker tint="var(--v2-brand-600)">{t}</Kicker>
                <p className="v2-tight mt-2 text-[15px] leading-relaxed text-[var(--v2-ink-700)]">{d}</p>
              </article>
            ))}
          </div>
          <h3 className="v2-tight text-[19px] font-semibold tracking-[-0.022em] text-[var(--v2-ink-900)]">Что делать</h3>
          <ul className="flex flex-col gap-2.5">
            {[
              ["Сейчас.", "Уменьшить давление вокруг тройничков. Проявлять повседневную заботу, инициировать свидания, говорить приятные вещи, предлагать необычные впечатления, интересоваться тем, что её возбуждает и радует."],
              ["В совместной сексуальности.", "Больше внимания к её удовольствию, фантазиям, инициативе и праву отказаться. Новизну можно исследовать сначала внутри ваших отношений, если ей это интересно."],
              ["С мероприятиями.", "Кабаре или бурлеск могут быть самостоятельным свиданием. Стриптиз-клуб или секс-вечеринка в качестве зрителей — только после отдельного добровольного обсуждения условий."],
              ["В перспективе.", "Если моногамия по-прежнему кажется существенной потребностью, эту тему нельзя заменить свиданиями и заботой. Нужен честный разговор о представлениях об отношениях — без попытки добиться заранее назначенного ответа."],
            ].map(([k, t]) => (
              <li key={k} className="rounded-[16px] bg-[var(--v2-ink-50)] px-4 py-3.5 text-[15px] leading-relaxed text-[var(--v2-ink-700)]">
                <b className="text-[var(--v2-ink-900)]">{k}</b> {t}
              </li>
            ))}
          </ul>
          <h3 className="v2-tight text-[19px] font-semibold tracking-[-0.022em] text-[var(--v2-ink-900)]">Чего не делать</h3>
          <ul className="flex flex-col gap-2">
            {[
              "Не использовать восстановленную безопасность как «прогрев» к тройничку.",
              "Не считать, что если Лера наслаждалась эротическим шоу, она теперь должна захотеть следующий эксперимент.",
              "Не проводить тайных сексуальных действий в расчёте на то, что никто не узнает.",
            ].map((t) => (
              <li key={t} className="rounded-[16px] bg-[#FEF3F2] px-4 py-3.5 text-[14.5px] leading-relaxed text-[#912018]">
                {t}
              </li>
            ))}
          </ul>
          <Lead>
            Желаемый результат — не добиться нужной реакции Леры. А создать отношения, где возможно настоящее взаимное
            желание и открытый выбор. Это не гарантия согласия на конкретную модель. Это единственный устойчивый способ
            сочетать любовь и свободу без скрытого принуждения.
          </Lead>
        </Sect>

        <Sect id="practice" n="06 · Практика" title="Практика — намерение, молитва, 14 дней">
          <Lead>
            Желание и намерение отличаются. Первое концентрируется на том, чего не хватает. Второе — на выбранном
            направлении жизни. Задача не отказаться от желания, а перевести его из состояния нехватки в состояние
            намерения.
          </Lead>
          <Formula kicker="Формула намерения">
            Я привлекательный, уверенный и чувственный мужчина. Мне нравится женская красота, страсть и сексуальное
            разнообразие. Я открыт новым впечатлениям с женщинами, которые сами этого хотят. В моей жизни есть место
            взаимному желанию, ярким эмоциям и чувственным приключениям. Я создаю возможности для нового опыта, действую
            свободно, честно и с уважением к границам всех участников. Мне не нужно торопить события или бороться за
            желаемое. Я выбираю эту жизнь и постепенно создаю её.
          </Formula>
          <h3 className="v2-tight text-[19px] font-semibold tracking-[-0.022em] text-[var(--v2-ink-900)]">
            Как обращаться с желанием к Богу
          </h3>
          <p className="v2-tight max-w-[72ch] text-[16px] leading-[1.7] text-[var(--v2-ink-600)]">
            Если Бог — источник возможностей, а не исполнитель заказов, молитва может быть способом прояснить намерение
            и ценности. Не обязанностью считать, что просьба будет исполнена.
          </p>
          <blockquote className="rounded-[20px] bg-[#FFF7E8] px-7 py-6 text-[16px] leading-[1.65] text-[#7A2E0E]">
            Боже, ты знаешь мои настоящие желания. Я хочу познавать свою сексуальность, чувственность, страсть,
            близость и разнообразие. Помоги мне найти честный и безопасный путь к этому опыту, не причиняя вреда себе
            и другим. Дай мне смелость действовать, мудрость распознавать подходящие возможности и спокойствие не
            цепляться за результат. Если моя нынешняя модель отношений несовместима с той жизнью, которую я хочу,
            помоги увидеть это ясно и сделать зрелый выбор.
          </blockquote>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <article className="rounded-[18px] bg-[var(--v2-ink-50)] px-5 py-5">
              <Kicker tint="var(--v2-brand-600)">Утром · 3 минуты</Kicker>
              <h3 className="v2-tight mt-1.5 text-[17px] font-semibold text-[var(--v2-ink-900)]">Целевой слайд</h3>
              <p className="v2-tight mt-2 text-[14.5px] leading-relaxed text-[var(--v2-ink-600)]">
                Представляю не конкретную девушку и не сцену секса, а себя в жизни, где я сексуально свободен в рамках
                честных договорённостей, уверен, открыт к новым знакомствам и не живу из мучительного дефицита. Важно
                почувствовать спокойную естественность этого состояния, а не раскручивать возбуждение.
              </p>
            </article>
            <article className="rounded-[18px] bg-[var(--v2-ink-50)] px-5 py-5">
              <Kicker tint="var(--v2-brand-600)">Днём</Kicker>
              <h3 className="v2-tight mt-1.5 text-[17px] font-semibold text-[var(--v2-ink-900)]">Снять избыточную важность</h3>
              <p className="v2-tight mt-2 text-[14.5px] leading-relaxed text-[var(--v2-ink-600)]">
                Когда вижу привлекательную женщину и возникает болезненное «я тоже хочу», меняю мысль на: «Мне нравится
                женская красота. Я могу хотеть этого, не страдая от того, что прямо сейчас этого нет». Не требуется
                убеждать себя, что всё уже случилось.
              </p>
            </article>
          </div>
        </Sect>

        <Sect id="code" n="08 · Кодекс" title="Каким человеком я становлюсь">
          <div
            className="rounded-[20px] px-7 py-7 text-white"
            style={{ background: HERO_BLUE, boxShadow: "0 16px 40px -18px rgba(45,94,239,0.85)" }}
          >
            <Kicker tint="rgba(255,255,255,.55)">Мой личный кодекс</Kicker>
            <div className="mt-4 flex flex-col gap-4 text-[16.5px] leading-[1.6]">
              <p>
                Я привлекательный, уверенный и чувственный мужчина. Мне нравится женская красота и взаимное притяжение.
                Я открыт новому, свободно общаюсь, наслаждаюсь флиртом и собственной сексуальностью. Я позволяю желанным
                событиям развиваться естественно — с взаимным интересом, честностью и уважением к границам.
              </p>
              <p>Я — создатель. Воплощаю идеи, строю бизнес, организую события, знакомлюсь с людьми и создаю красивые впечатления.</p>
              <p>Я — любящий мужчина. Умею быть опорой, не теряя собственной личности. Моя сексуальность и способность любить не являются врагами.</p>
              <p>Я — самостоятельный мужчина. Создаю финансовую устойчивость, развиваю уверенность и осознанно выбираю свои обязательства.</p>
              <p>Я — мужчина действия. Не заменяю реальные поступки планированием, духовными прогнозами или поиском знаков.</p>
              <p className="text-[20px] font-semibold tracking-[-0.024em]">Моя мечта остаётся прежней. Меняется способ её осуществления.</p>
            </div>
          </div>
        </Sect>
      </div>
    </div>
  );
}
