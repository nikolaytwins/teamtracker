import type { ReactNode } from "react";

const assets = [
  {
    number: "01",
    name: "Qmagic",
    role: "Главный технологический актив",
    description: "Внутренняя AI-система TwinLabs, которая сокращает путь от желания получить результат до готового результата.",
    points: ["Быстрее делать сайты и вносить правки", "Автоматизировать производство", "Снижать ручной труд и повышать маржу", "Брать больше проектов без пропорционального роста команды"],
    accent: "border-blue-200 bg-blue-50/70 text-blue-700",
  },
  {
    number: "02",
    name: "Школа AI-креаторов",
    role: "Масштабируемое знание",
    description: "Одна образовательная система о новом способе работы: от отдельного специалиста — к человеку, способному создать digital-продукт с AI.",
    points: ["Не пять отдельных школ", "Разные программы внутри одной системы", "Интеллектуальный продукт", "Будущая аудитория Qmagic"],
    accent: "border-violet-200 bg-violet-50/70 text-violet-700",
  },
  {
    number: "03",
    name: "TwinLabs",
    role: "Денежный двигатель",
    description: "Cashflow, лаборатория Qmagic, источник реальных проблем, кейсов и денег для развития продуктов.",
    points: ["Прибыльные услуги", "Vibe coding / AI-разработка", "Команда делает с AI", "Система забирает всё больше работы"],
    accent: "border-emerald-200 bg-emerald-50/70 text-emerald-700",
  },
  {
    number: "04",
    name: "Медиа",
    role: "Собственная дистрибуция",
    description: "Не отдельная карьера, а накопление аудитории, доверия, клиентов, пользователей и связей вокруг реальной работы.",
    points: ["2 YouTube в месяц", "2 Reels в неделю", "1 карусель в неделю", "Контент из Qmagic, AI и бизнеса"],
    accent: "border-amber-200 bg-amber-50/70 text-amber-700",
  },
] as const;

const steps = [
  {
    title: "Зафиксировать большую игру",
    text: "AI-продукты + AI-образование + агентство как cashflow + медиа как дистрибуция. Не пересматривать это каждую неделю.",
  },
  {
    title: "Выбрать killer use case Qmagic",
    text: "Не строить всю платформу. Взять одну задачу — например, правки или создание сайтов — и делать её заметно лучше и быстрее человека.",
  },
  {
    title: "Встроить Qmagic в TwinLabs",
    text: "Реальная задача клиента → пробуем решить через Qmagic → фиксируем сбой → улучшаем. Первый KPI — сэкономленные человеческие часы.",
  },
  {
    title: "Убрать себя из ручной работы",
    text: "Каждую неделю находить то, что больше не должен делать лично: автоматизировать, описать, передать человеку или AI. Перестать быть bottleneck.",
  },
  {
    title: "Запустить один образовательный продукт",
    text: "Один сильный вход: как самостоятельно создавать digital-продукты с AI. Получить оплаты, учеников, обратную связь и кейсы — затем расширять школу.",
  },
  {
    title: "Каждую неделю выходить к рынку",
    text: "Продажи, разговоры с клиентами, демонстрации, публикации, знакомства, предложения и тесты офферов. Нельзя год сидеть в лаборатории.",
  },
  {
    title: "Поддерживать минимальную медийность",
    text: "2 YouTube в месяц, 2 Reels и 1 карусель в неделю. Выполнять минимум без ожидания вдохновения и огромного продакшна.",
  },
  {
    title: "Считать реальные показатели",
    text: "Ежемесячно смотреть на прибыль, использование продуктов, сэкономленное время, продажи школы и рост личного капитала.",
  },
] as const;

const metrics = [
  { title: "TwinLabs", items: ["Выручка и прибыль", "Личная загрузка", "Часы, сэкономленные AI"] },
  { title: "Qmagic", items: ["Решённые реальные задачи", "Активные пользователи", "Экономия времени", "Функции, за которые готовы платить"] },
  { title: "Школа", items: ["Продажи и конверсия", "Доходимость", "Результаты учеников"] },
  { title: "Личные финансы", items: ["Заработано", "Отложено", "Рост капитала"] },
] as const;

const stopList = [
  "Отдельный курс классического дизайна",
  "Дизайн-поддержка как главный фокус",
  "AI-астролог и AI-фитнес",
  "Аркалиум как текущий коммерческий проект",
  "Отдельный стартап для блогеров",
  "Курсы и подписки по саморазвитию",
  "Случайные новые SaaS",
] as const;

const quitQuestions = [
  "Изменились факты или только моё настроение?",
  "Люди не хотят продукт или я недостаточно его продавал?",
  "Я достаточно долго тестировал или выношу приговор после пары недель?",
  "Проблема в направлении или в оффере, продажах, продукте, onboarding, цене, качестве, дистрибуции либо retention?",
  "Новая возможность объективно сильнее или мне снова нужен восторг начала?",
  "Если запретить новую идею на 6 месяцев — что я сделаю, чтобы текущая заработала?",
] as const;

function Kicker({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <span className={`font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] ${dark ? "text-blue-300" : "text-[var(--v2-brand-600)]"}`}>
      {children}
    </span>
  );
}

function Quote({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <blockquote
      className={`rounded-2xl border px-5 py-4 text-[16px] font-medium leading-relaxed ${
        dark
          ? "border-white/10 bg-white/[0.06] text-white"
          : "border-[var(--v2-brand-200)] bg-[var(--v2-brand-50)] text-[var(--v2-brand-800)]"
      }`}
    >
      {children}
    </blockquote>
  );
}

function BulletList({ items, light = false }: { items: readonly string[]; light?: boolean }) {
  return (
    <ul className={`space-y-2 text-[14px] leading-relaxed ${light ? "text-white/70" : "text-[var(--v2-ink-600)]"}`}>
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className={`mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full ${light ? "bg-blue-400" : "bg-[var(--v2-brand-400)]"}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Section({
  id,
  number,
  kicker,
  title,
  children,
}: {
  id: string;
  number: string;
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-[var(--v2-ink-200)] pt-11">
      <div className="mb-7 flex items-start gap-4">
        <span className="v2-tnum mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--v2-brand-50)] font-mono text-[11px] font-semibold text-[var(--v2-brand-700)]">
          {number}
        </span>
        <div>
          <Kicker>{kicker}</Kicker>
          <h2 className="v2-tighter mt-1 text-[30px] font-light leading-tight text-[var(--v2-ink-900)] sm:text-[34px]">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

const nav = [
  ["choice", "Большая игра"],
  ["assets", "Четыре актива"],
  ["focus", "Фокус"],
  ["bug", "Главный баг"],
  ["plan", "План выхода"],
  ["money", "Капитал"],
  ["rules", "Правила"],
  ["arkalium", "Аркалиум"],
  ["main", "Главное"],
] as const;

export function ImportantStrategyPage() {
  return (
    <div className="min-h-full overflow-y-auto">
      <header className="relative overflow-hidden border-b border-[var(--v2-ink-100)] bg-white">
        <div className="v2-dotgrid pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative mx-auto max-w-[1180px] px-6 py-12 lg:px-10 lg:py-16">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--v2-brand-50)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-brand-700)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--v2-brand-500)]" />
              Важное 2.0
            </span>
            <span className="v2-tnum text-[12px] text-[var(--v2-ink-400)]">Стратегия 2026</span>
          </div>
          <h1 className="v2-tighter mt-6 max-w-[900px] text-[43px] font-light leading-[1.03] text-[var(--v2-ink-900)] sm:text-[58px]">
            Из ручного труда —<br className="hidden sm:block" /> в системы и капитал
          </h1>
          <p className="v2-tight mt-5 max-w-[720px] text-[18px] leading-relaxed text-[var(--v2-ink-600)]">
            Я больше не строю жизнь вокруг роли «хорошего специалиста». Я выбираю путь создателя и владельца систем.
          </p>
          <div className="mt-8 flex max-w-[980px] flex-wrap items-center gap-2">
            {["Ручной труд", "Система", "Продукт", "Компания", "Капитал", "Большие проекты"].map((item, index, all) => (
              <div key={item} className="flex items-center gap-2">
                <span className={`rounded-xl border px-3.5 py-2 text-[12.5px] font-medium ${index === all.length - 1 ? "border-[var(--v2-brand-300)] bg-[var(--v2-brand-600)] text-white" : "border-[var(--v2-ink-200)] bg-white/80 text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)]"}`}>
                  {item}
                </span>
                {index < all.length - 1 ? <span className="text-[var(--v2-ink-300)]">→</span> : null}
              </div>
            ))}
          </div>
          <div className="mt-8 max-w-[900px]">
            <Quote>
              Делать то, что раньше было сложным, дорогим и требовало команды профессионалов, доступным одному человеку или бизнесу через AI.
            </Quote>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1180px] gap-10 px-6 py-10 lg:grid-cols-[180px_minmax(0,1fr)] lg:px-10 lg:py-14">
        <aside className="hidden lg:block">
          <nav className="sticky top-6 space-y-1">
            <p className="mb-3 px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--v2-ink-400)]">Содержание</p>
            {nav.map(([href, label]) => (
              <a key={href} href={`#${href}`} className="block rounded-lg px-2 py-2 text-[12.5px] text-[var(--v2-ink-500)] transition hover:bg-white hover:text-[var(--v2-brand-700)]">
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 space-y-14">
          <Section id="choice" number="01" kicker="Какую жизнь я выбираю" title="Большая ставка — AI-переход">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-white p-6 shadow-[var(--v2-shadow-card)]">
                <h3 className="v2-tight text-[18px] font-medium text-[var(--v2-ink-900)]">Не дешевеющий труд</h3>
                <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--v2-ink-600)]">
                  AI будет делать всё больше работы дизайнеров, разработчиков, копирайтеров и монтажёров. Я не хочу оставаться среди тех, чья работа дешевеет.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--v2-brand-200)] bg-[var(--v2-brand-50)] p-6">
                <h3 className="v2-tight text-[18px] font-medium text-[var(--v2-brand-800)]">Владение инструментами эпохи</h3>
                <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--v2-brand-700)]">
                  Моя позиция — создавать инструменты новой эпохи, владеть ими и превращать технологии в продукты, компании и капитал.
                </p>
              </div>
            </div>
            <Quote>
              Моя большая игра: AI-продукты + AI-образование + агентство как cashflow + медиа как дистрибуция.
            </Quote>
          </Section>

          <Section id="assets" number="02" kicker="Что я строю" title="Четыре связанных актива">
            <div className="grid gap-4 md:grid-cols-2">
              {assets.map((asset) => (
                <article key={asset.name} className="rounded-2xl bg-white p-6 shadow-[var(--v2-shadow-card)]">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`rounded-lg border px-2 py-1 font-mono text-[10px] font-semibold ${asset.accent}`}>{asset.number}</span>
                    <span className="text-right text-[11px] font-medium text-[var(--v2-ink-400)]">{asset.role}</span>
                  </div>
                  <h3 className="v2-tighter mt-5 text-[24px] font-light text-[var(--v2-ink-900)]">{asset.name}</h3>
                  <p className="mt-2 min-h-[66px] text-[13.5px] leading-relaxed text-[var(--v2-ink-500)]">{asset.description}</p>
                  <div className="mt-5 border-t border-[var(--v2-ink-100)] pt-4">
                    <BulletList items={asset.points} />
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-[var(--v2-ink-900)] p-6 text-white shadow-[var(--v2-shadow-pop)]">
              <Kicker dark>Логика Qmagic</Kicker>
              <p className="v2-tight mt-3 text-[19px] font-light leading-relaxed text-white">
                Реальные клиентские задачи → внутренняя технология → доказанная эффективность → решение, что продавать наружу.
              </p>
              <p className="mt-3 text-[13.5px] leading-relaxed text-white/55">
                Если проект раньше требовал 40 часов, а система делает его за 10 — разница превращается в прибыль и масштаб. Публичный SaaS не обязан быть первой целью.
              </p>
            </div>
          </Section>

          <Section id="focus" number="03" kicker="Что я сейчас не строю" title="Хорошая идея больше не означает новый проект">
            <div className="grid gap-4 md:grid-cols-[1fr_0.9fr]">
              <div className="rounded-2xl bg-white p-6 shadow-[var(--v2-shadow-card)]">
                <Kicker>Парковка идей</Kicker>
                <div className="mt-4">
                  <BulletList items={stopList} />
                </div>
              </div>
              <div className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <div>
                  <Kicker>Главный дефицит</Kicker>
                  <p className="v2-tighter mt-3 text-[28px] font-light leading-tight text-amber-950">Не идеи.</p>
                  <p className="v2-tighter mt-1 text-[28px] font-light leading-tight text-amber-950">Долгое движение в одном направлении.</p>
                </div>
                <p className="mt-8 text-[13.5px] leading-relaxed text-amber-800">Аркалиум остаётся мечтой, но сейчас не обязан быть коммерческим проектом.</p>
              </div>
            </div>
          </Section>

          <Section id="bug" number="04" kicker="Что я исправляю" title="Главный баг — награда от потенциала">
            <div className="rounded-2xl bg-white p-6 shadow-[var(--v2-shadow-card)]">
              <Kicker>Старый цикл</Kicker>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {["Идея", "Восторг", "Быстрый старт", "Первые результаты", "Скука", "Сомнения", "Новая идея"].map((item, index, all) => (
                  <div key={item} className="flex items-center gap-2">
                    <span className={`rounded-lg px-3 py-2 text-[12px] ${index === all.length - 1 ? "bg-rose-50 text-rose-700" : "bg-[var(--v2-ink-50)] text-[var(--v2-ink-600)]"}`}>{item}</span>
                    {index < all.length - 1 ? <span className="text-[var(--v2-ink-300)]">→</span> : null}
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[14.5px] leading-relaxed text-[var(--v2-ink-600)]">
                Я получал эмоциональную награду уже от ощущения потенциала и оставался человеком с большим будущим, но недостаточным количеством построенных активов.
              </p>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                ["Эмоциональная стратегия", "Перед сменой курса: изменились факты или изменилось моё состояние? Если только состояние — стратегия прежняя."],
                ["Недоверие длинному процессу", "Не выносить приговор процессу раньше, чем у него появился шанс сработать."],
                ["Альтернативные будущие", "Выбрать одну игру и отказаться от части возможностей — не потеря свободы, а цена капитализации."],
                ["Автономность", "Строить не образ «я сам всё могу», а систему из команды, процессов и AI, которая работает не только через меня."],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-[var(--v2-ink-200)] bg-white/60 p-5">
                  <h3 className="text-[15px] font-medium text-[var(--v2-ink-900)]">{title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--v2-ink-500)]">{text}</p>
                </div>
              ))}
            </div>
            <Quote>Мне не нужно сохранять все возможные будущие. Мне нужно реализовать одно.</Quote>
          </Section>

          <Section id="plan" number="05" kicker="Конкретный план" title="Восемь шагов выхода из болота">
            <div className="space-y-3">
              {steps.map((step, index) => (
                <article key={step.title} className="group grid gap-3 rounded-2xl bg-white p-5 shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)] sm:grid-cols-[54px_220px_1fr] sm:items-start sm:gap-5">
                  <span className="v2-tnum font-mono text-[12px] font-semibold text-[var(--v2-brand-500)]">0{index + 1}</span>
                  <h3 className="v2-tight text-[15px] font-medium text-[var(--v2-ink-900)]">{step.title}</h3>
                  <p className="text-[13.5px] leading-relaxed text-[var(--v2-ink-500)]">{step.text}</p>
                </article>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {metrics.map((metric) => (
                <div key={metric.title} className="rounded-2xl border border-[var(--v2-ink-200)] bg-white/70 p-5">
                  <Kicker>{metric.title}</Kicker>
                  <div className="mt-3">
                    <BulletList items={metric.items} />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="money" number="06" kicker="Финансовая система" title="Каждый год становиться богаче как собственник">
            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <div className="flex flex-col justify-between rounded-2xl bg-[var(--v2-brand-600)] p-6 text-white shadow-[var(--v2-shadow-glow)]">
                <Kicker dark>Первый ориентир</Kicker>
                <div className="mt-10">
                  <p className="v2-tnum text-[42px] font-light leading-none">+1–2 млн ₽</p>
                  <p className="mt-2 text-[13px] text-white/65">капитала в год</p>
                </div>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-[var(--v2-shadow-card)]">
                <h3 className="v2-tight text-[17px] font-medium text-[var(--v2-ink-900)]">Капитал — обязательная строка, а не остаток</h3>
                <div className="mt-5 space-y-4">
                  <div className="rounded-xl bg-emerald-50 px-4 py-3 text-[13.5px] font-medium text-emerald-800">Доход → расходы → развитие основного актива → капитал</div>
                  <div className="rounded-xl bg-rose-50 px-4 py-3 text-[13.5px] text-rose-700 line-through decoration-rose-300">Доход → жизнь → новые проекты → что осталось, то накопил</div>
                </div>
                <p className="mt-5 text-[14px] leading-relaxed text-[var(--v2-ink-600)]">Главный KPI — не сколько денег прошло через меня, а насколько вырос мой капитал за год.</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-[var(--v2-ink-900)] p-7 text-white">
              <Kicker dark>Новая роль</Kicker>
              <h3 className="v2-tighter mt-2 text-[34px] font-light">Создатель систем</h3>
              <p className="mt-3 max-w-[70ch] text-[14.5px] leading-relaxed text-white/65">
                Найти проблему, понять пользователя, сформировать продукт, создать первую версию, продать, задать стандарт, построить процесс, подключить AI и людей, убрать себя из повторяемого производства.
              </p>
              <p className="mt-4 text-[16px] font-medium text-white">Мне не обязательно быть классическим менеджером. Но я обязан стать владельцем результата.</p>
            </div>
          </Section>

          <Section id="rules" number="07" kicker="Операционная система" title="Не строить бизнес на настроении">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Правило 60%", "Понятные задачи, процессы, автоматизация, люди, метрики, расписание и повторяемые продажи. Даже в плохой день система движется."],
                ["Правило скуки", "Скука не обязательно означает конец. Возможно, закончилась романтическая стадия и начался настоящий бизнес, который строит капитал."],
                ["Правило финала", "Незавершённое не считается активом. Сайт, MVP, курс, продукт и контент становятся активами только после выхода к людям."],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl bg-white p-5 shadow-[var(--v2-shadow-card)]">
                  <h3 className="v2-tight text-[16px] font-medium text-[var(--v2-ink-900)]">{title}</h3>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--v2-ink-500)]">{text}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-[var(--v2-brand-200)] bg-[var(--v2-brand-50)] p-6">
              <p className="v2-tighter text-center text-[27px] font-light tracking-tight text-[var(--v2-brand-800)]">DONE &gt; PERFECT &gt; NEW</p>
              <p className="mt-2 text-center text-[13px] text-[var(--v2-brand-600)]">Сначала завершить. Потом улучшить. Только потом начинать следующее.</p>
            </div>
            <div className="mt-4 rounded-2xl bg-white p-6 shadow-[var(--v2-shadow-card)]">
              <Kicker>Когда снова захочется всё бросить</Kicker>
              <ol className="mt-5 space-y-4">
                {quitQuestions.map((question, index) => (
                  <li key={question} className="flex gap-4 border-b border-[var(--v2-ink-100)] pb-4 last:border-0 last:pb-0">
                    <span className="v2-tnum mt-0.5 font-mono text-[11px] text-[var(--v2-brand-500)]">0{index + 1}</span>
                    <p className="text-[14px] leading-relaxed text-[var(--v2-ink-700)]">{question}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-5 rounded-xl bg-[var(--v2-ink-50)] px-4 py-3 text-[14px] font-medium text-[var(--v2-ink-900)]">Вот это действие и надо сделать.</p>
            </div>
            <Quote>Действие → данные → корректировка → повторение.</Quote>
            <p className="mt-4 text-[14.5px] leading-relaxed text-[var(--v2-ink-600)]">
              Каждую неделю что-то должно стать реальнее: функция, клиент, продажа, публикация, автоматизация, обученный сотрудник, новый пользователь или увеличившийся капитал.
            </p>
          </Section>

          <Section id="arkalium" number="08" kicker="Большой проект будущего" title="Как эта стратегия ведёт к Аркалиуму">
            <p className="max-w-[74ch] text-[16px] leading-relaxed text-[var(--v2-ink-700)]">
              Аркалиум — не то, чем я должен прямо сейчас пытаться себя прокормить. Для него нужны деньги, команда, технологии, аудитория, связи, опыт сложных продуктов и способность финансировать собственные идеи. Именно это я сейчас и строю.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {["TwinLabs", "Qmagic", "Школа", "Медиа", "Капитал", "Аркалиум"].map((item, index, all) => (
                <div key={item} className="flex items-center gap-2">
                  <span className={`rounded-xl px-3.5 py-2 text-[12.5px] font-medium ${index === all.length - 1 ? "bg-[var(--v2-brand-600)] text-white" : "bg-white text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)]"}`}>{item}</span>
                  {index < all.length - 1 ? <span className="text-[var(--v2-ink-300)]">→</span> : null}
                </div>
              ))}
            </div>
            <Quote>Я не откладываю мечту. Я создаю инфраструктуру, которая позволит реализовать её не как фантазию, а как настоящий большой проект.</Quote>
          </Section>

          <Section id="main" number="09" kicker="Моя формула" title="Время превращает систему в капитал">
            <div className="rounded-3xl bg-[var(--v2-ink-900)] p-7 text-white shadow-[var(--v2-shadow-pop)] sm:p-9">
              <div className="flex flex-wrap items-center justify-center gap-3">
                {["Технология", "Проблема", "Продукт", "Дистрибуция", "Повторение", "Время"].map((item, index, all) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2 text-[12.5px] font-medium text-white/80">{item}</span>
                    {index < all.length - 1 ? <span className="text-blue-400">×</span> : null}
                  </div>
                ))}
              </div>
              <div className="my-7 h-px bg-white/10" />
              <p className="v2-tighter text-center text-[42px] font-light text-white">= КАПИТАЛ</p>
              <p className="mt-3 text-center text-[13.5px] text-white/50">Моё слабое место раньше было последним пунктом: я не давал времени начать работать на меня.</p>
            </div>

            <div className="mt-5 rounded-3xl border border-[var(--v2-brand-200)] bg-white p-7 shadow-[var(--v2-shadow-card)] sm:p-9">
              <Kicker>Главное</Kicker>
              <div className="mt-5 space-y-4 text-[17px] leading-relaxed text-[var(--v2-ink-700)]">
                <p className="font-medium text-[var(--v2-ink-900)]">Мне не нужен ещё один новый путь.</p>
                <p>Мне нужно довести этот путь до состояния, когда он работает без постоянного героизма с моей стороны.</p>
                <p>Я строю не карьеру дизайнера. Я строю AI-системы, интеллектуальные продукты, аудиторию и капитал.</p>
                <p>Я измеряю себя не количеством дверей, которые могу открыть, а тем, что построено за одной выбранной дверью.</p>
                <p className="font-medium text-[var(--v2-brand-700)]">Моя задача — несколько лет подряд превращать идеи в работающие активы.</p>
              </div>
              <div className="mt-7 rounded-2xl bg-[var(--v2-brand-600)] px-5 py-6 text-center text-white">
                <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-blue-100">Когда хочется снова всё бросить</p>
                <p className="v2-tighter mt-3 text-[24px] font-light sm:text-[29px]">Не начинай заново.</p>
                <p className="v2-tighter mt-1 text-[24px] font-light sm:text-[29px]">Найди bottleneck. Исправь его. Продолжай.</p>
              </div>
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}
