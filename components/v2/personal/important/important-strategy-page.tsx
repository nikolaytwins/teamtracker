import type { ReactNode } from "react";

const hierarchy = [
  { level: "01", role: "Кто меня кормит", title: "Twinlabs ↔ найм", note: "Обе ветки активны, пока одна не закроет финансовую базу.", tone: "blue" },
  { level: "02", role: "Масштабируемый бизнес", title: "Импульс", note: "Главный коммерческий актив, который нужно переизобрести.", tone: "violet" },
  { level: "03", role: "Медийный капитал", title: "YouTube", note: "2 сильных ролика в месяц. Instagram — только дистрибуция.", tone: "rose" },
  { level: "04", role: "Проект идентичности", title: "Аркалиум", note: "4–6 защищённых часов в неделю.", tone: "amber" },
  { level: "05", role: "Исследование будущего", title: "Робототехника", note: "Разведка без давления на монетизацию.", tone: "emerald" },
  { level: "06", role: "Продуктовый опцион", title: "Qmagic", note: "Только при появлении сильного внешнего сигнала.", tone: "slate" },
] as const;

const tones = {
  blue: "border-blue-200 bg-blue-50/70 text-blue-700",
  violet: "border-violet-200 bg-violet-50/70 text-violet-700",
  rose: "border-rose-200 bg-rose-50/70 text-rose-700",
  amber: "border-amber-200 bg-amber-50/70 text-amber-700",
  emerald: "border-emerald-200 bg-emerald-50/70 text-emerald-700",
  slate: "border-slate-200 bg-slate-50/70 text-slate-600",
} as const;

function Kicker({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--v2-brand-600)]">{children}</span>;
}

function Bullets({ children }: { children: ReactNode }) {
  return <ul className="mt-3 space-y-2 text-[14.5px] leading-relaxed text-[var(--v2-ink-700)]">{children}</ul>;
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--v2-brand-400)]" />
      <span>{children}</span>
    </li>
  );
}

function Quote({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return (
    <blockquote
      className={`mt-5 rounded-2xl border px-5 py-4 text-[16px] font-medium leading-relaxed ${
        accent
          ? "border-[var(--v2-brand-200)] bg-[var(--v2-brand-50)] text-[var(--v2-brand-800)]"
          : "border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] text-[var(--v2-ink-800)]"
      }`}
    >
      {children}
    </blockquote>
  );
}

function Section({
  id,
  number,
  title,
  subtitle,
  children,
}: {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-[var(--v2-ink-200)] pt-10">
      <div className="mb-7 flex items-start gap-4">
        <span className="v2-tnum mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--v2-brand-50)] font-mono text-[12px] font-semibold text-[var(--v2-brand-700)]">
          {number}
        </span>
        <div>
          <Kicker>{subtitle}</Kicker>
          <h2 className="v2-tighter mt-1 text-[30px] font-light leading-tight text-[var(--v2-ink-900)]">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-[var(--v2-shadow-card)]">
      <h3 className="v2-tight text-[18px] font-medium text-[var(--v2-ink-900)]">{title}</h3>
      <div className="mt-3 text-[14.5px] leading-relaxed text-[var(--v2-ink-600)]">{children}</div>
    </div>
  );
}

const nav = [
  ["base", "Денежная база"],
  ["impulse", "Импульс"],
  ["youtube", "YouTube"],
  ["instagram", "Instagram"],
  ["arkalium", "Аркалиум"],
  ["robotics", "Робототехника"],
  ["qmagic", "Qmagic"],
  ["rules", "Правила выбора"],
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
              Важное
            </span>
            <span className="v2-tnum text-[12px] text-[var(--v2-ink-400)]">Сентябрь 2026</span>
          </div>
          <h1 className="v2-tighter mt-6 max-w-[780px] text-[46px] font-light leading-[1.02] text-[var(--v2-ink-900)] sm:text-[58px]">
            Стратегия проектов
          </h1>
          <p className="v2-tight mt-5 max-w-[700px] text-[18px] leading-relaxed text-[var(--v2-ink-600)]">
            Не выбирать один проект «на всю жизнь», а собрать систему, где каждое направление выполняет свою функцию.
          </p>
          <div className="mt-8 grid max-w-[920px] gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {["Деньги сейчас", "Масштабируемый бизнес", "Аудитория и дистрибуция", "Проект идентичности", "Исследование будущего", "Опционы на новые ветки"].map(
              (item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border border-[var(--v2-ink-100)] bg-white/80 px-4 py-3 shadow-[var(--v2-shadow-card)] backdrop-blur">
                  <span className="v2-tnum font-mono text-[10px] text-[var(--v2-ink-300)]">0{index + 1}</span>
                  <span className="v2-tight text-[13.5px] font-medium text-[var(--v2-ink-700)]">{item}</span>
                </div>
              )
            )}
          </div>
          <Quote accent>
            Сначала определить, кто меня кормит — Twinlabs или работа. Параллельно переизобрести Импульс, методично строить YouTube, не отпускать Аркалиум, исследовать робототехнику и не распыляться на Qmagic / Instagram без сигнала.
          </Quote>
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

        <main className="min-w-0 space-y-12">
          <section>
            <div className="mb-5">
              <Kicker>Карта приоритетов</Kicker>
              <h2 className="v2-tighter mt-1 text-[30px] font-light text-[var(--v2-ink-900)]">Итоговая иерархия</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {hierarchy.map((item) => (
                <div key={item.level} className="rounded-2xl bg-white p-5 shadow-[var(--v2-shadow-card)]">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`rounded-lg border px-2 py-1 font-mono text-[10px] font-semibold ${tones[item.tone]}`}>{item.level}</span>
                    <span className="text-right text-[11px] font-medium text-[var(--v2-ink-400)]">{item.role}</span>
                  </div>
                  <h3 className="v2-tight mt-5 text-[19px] font-medium text-[var(--v2-ink-900)]">{item.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--v2-ink-500)]">{item.note}</p>
                </div>
              ))}
            </div>
          </section>

          <Section id="base" number="01" subtitle="Финансовый фундамент" title="Денежная база: Twinlabs ↔ найм">
            <p className="max-w-[72ch] text-[16px] leading-relaxed text-[var(--v2-ink-700)]">
              Сейчас <strong className="font-semibold text-[var(--v2-ink-900)]">не задвигать Twinlabs</strong>, пока не станет понятно, может ли найм реально заменить его как основной источник дохода.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Subsection title="Twinlabs">
                <p>Текущая доказанная внешняя встречность: деньги, портфолио, кейсы и лаборатория для новых AI/design-подходов.</p>
                <Bullets>
                  <Bullet>Красиво переупаковать портфолио и новые услуги.</Bullet>
                  <Bullet>Продавать сильные проекты на хороший чек.</Bullet>
                  <Bullet>Не строить большую агентскую машину любой ценой.</Bullet>
                  <Bullet>Проверить, может ли Twinlabs снова полностью закрывать расходы.</Bullet>
                </Bullets>
                <p className="mt-4 text-[13px] text-[var(--v2-ink-500)]">Также: источник проблем для Qmagic и доказательство экспертизы для Импульса.</p>
              </Subsection>
              <Subsection title="Найм">
                <p>Сильный тактический сценарий текущего периода, но не конечная жизненная траектория.</p>
                <Bullets>
                  <Bullet>Part-time, гибридный или офлайн-формат.</Bullet>
                  <Bullet>Без перегруза, с границами и местом для своих проектов.</Bullet>
                  <Bullet>Сильная командная среда, живое окружение и связи.</Bullet>
                  <Bullet>Роль рядом с AI / product / creative tech / robotics.</Bullet>
                </Bullets>
              </Subsection>
            </div>
            <div className="mt-4 rounded-2xl border border-[var(--v2-ink-200)] bg-white p-6">
              <Kicker>Контрольные точки найма</Kicker>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {[["3 месяца", "ускорение"], ["6 месяцев", "стабилизация"], ["1 год", "обязательный пересмотр"], ["2 года", "переход дальше"]].map(([time, label]) => (
                  <div key={time} className="border-l-2 border-[var(--v2-brand-200)] pl-3">
                    <p className="v2-tnum text-[14px] font-semibold text-[var(--v2-ink-900)]">{time}</p>
                    <p className="mt-0.5 text-[12px] text-[var(--v2-ink-500)]">{label}</p>
                  </div>
                ))}
              </div>
              <Quote>«Я всё ещё получаю здесь новые возможности или уже просто остаюсь по инерции?»</Quote>
              <p className="mt-4 text-[14px] leading-relaxed text-[var(--v2-ink-600)]">
                Найм должен дать не только зарплату, но и новые варианты будущего: связи, индустрии, идеи, бизнес-модели и роли.
              </p>
            </div>
          </Section>

          <Section id="impulse" number="02" subtitle="Главный коммерческий актив" title="Импульс">
            <p className="text-[16px] leading-relaxed text-[var(--v2-ink-700)]">Не запускать как старую школу в прежней форме.</p>
            <Quote accent>Импульс = система профессионального перехода в AI-эпоху.</Quote>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Subsection title="Не просто курс">
                <Bullets>
                  <Bullet>Не «школа нейросетей» и не «творческая школа».</Bullet>
                  <Bullet>Не подработка и не курс по одному инструменту.</Bullet>
                  <Bullet>Не начинать сразу с большой подписочной платформы без аудитории.</Bullet>
                </Bullets>
              </Subsection>
              <Subsection title="Результат для человека">
                <p>Человек пересобирает профессиональную модель и снова понимает, как создавать ценность и зарабатывать в новом рынке — когда навыки дешевеют, профессия меняется и непонятно, чему учиться.</p>
              </Subsection>
            </div>
            <div className="mt-4 rounded-2xl bg-[var(--v2-ink-900)] p-6 text-white shadow-[var(--v2-shadow-pop)]">
              <Kicker>Первая сильная гипотеза</Kicker>
              <h3 className="v2-tighter mt-2 text-[25px] font-light">Переучивание дизайнеров в vibe-coding / AI-product роль</h3>
              <p className="mt-4 text-[16px] leading-relaxed text-white/85">«Перестань быть только дизайнером: научись сам собирать интерфейс и запускать цифровой продукт с AI».</p>
              <p className="mt-3 text-[13.5px] text-white/55">Смысл — смена профессиональной роли, а не ещё один инструмент.</p>
            </div>
            <div className="mt-4 rounded-2xl bg-white p-6 shadow-[var(--v2-shadow-card)]">
              <Kicker>Логика развития</Kicker>
              <ol className="mt-4 grid gap-3 md:grid-cols-5">
                {["Один сильный флагман", "Проверка спроса и результата", "Второй продукт", "Аудитория, контент и база", "Платформа / подписка"].map((step, index) => (
                  <li key={step} className="flex gap-2 md:block">
                    <span className="v2-tnum font-mono text-[10px] text-[var(--v2-brand-500)]">0{index + 1}</span>
                    <p className="mt-1 text-[12.5px] leading-snug text-[var(--v2-ink-700)]">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          </Section>

          <Section id="youtube" number="03" subtitle="Главный медийный актив" title="YouTube">
            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <Subsection title="Роль канала">
                <Bullets>
                  <Bullet>Приводить людей в Импульс и усиливать Twinlabs.</Bullet>
                  <Bullet>Постепенно строить личную аудиторию.</Bullet>
                  <Bullet>Позже давать аудиторию Аркалиуму и новым продуктам.</Bullet>
                  <Bullet>Создавать связи для будущих направлений.</Bullet>
                </Bullets>
                <p className="mt-4">Канал собирает весь мой мир: AI, изменение профессий, бизнес, мышление, проекты, эксперименты и личный путь. Импульс можно продавать открыто, но YouTube должен иметь самостоятельную ценность.</p>
              </Subsection>
              <div className="flex flex-col justify-between rounded-2xl bg-[var(--v2-brand-600)] p-6 text-white shadow-[var(--v2-shadow-glow)]">
                <Kicker>Обязательный ритм</Kicker>
                <div>
                  <p className="v2-tnum text-[54px] font-light leading-none">2</p>
                  <p className="mt-2 text-[15px] leading-snug text-white/85">сильных ролика в месяц</p>
                </div>
                <p className="mt-8 text-[12px] leading-relaxed text-white/60">Даже при найме. Не превращать канал в контент-фабрику.</p>
              </div>
            </div>
          </Section>

          <Section id="instagram" number="04" subtitle="Вспомогательная дистрибуция" title="Instagram">
            <p className="text-[16px] leading-relaxed text-[var(--v2-ink-700)]">Не самостоятельный обязательный проект. Его можно пропускать первым, если не хватает времени.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Subsection title="Ориентир на неделю">
                <p><strong className="text-[var(--v2-ink-900)]">2–3 Reels</strong> и <strong className="text-[var(--v2-ink-900)]">1 карусель</strong>, но это не жёсткий KPI.</p>
              </Subsection>
              <Subsection title="Принцип">
                <p>Есть материал и ресурс — распространяю. Нет ресурса — не жертвую более важными направлениями. Instagram переупаковывает уже созданные смыслы.</p>
              </Subsection>
            </div>
          </Section>

          <Section id="arkalium" number="05" subtitle="Главный проект идентичности" title="Аркалиум">
            <p className="text-[16px] leading-relaxed text-[var(--v2-ink-700)]">Направление, которое я сильнее всего пожалел бы не попробовать. Оно не обязано кормить сейчас, но не должно снова исчезнуть из-за срочных дел.</p>
            <Quote accent><span className="v2-tnum">4–6</span> защищённых часов в неделю. Без KPI по выручке.</Quote>
            <Bullets>
              <Bullet>Придумывать и прототипировать.</Bullet>
              <Bullet>Собирать мир и тестировать механики.</Bullet>
              <Bullet>Постепенно превращать идею в актив.</Bullet>
              <Bullet>Двигаться непрерывно, но не форсироваться.</Bullet>
            </Bullets>
          </Section>

          <Section id="robotics" number="06" subtitle="Исследовательский горизонт" title="Робототехника">
            <p className="text-[16px] leading-relaxed text-[var(--v2-ink-700)]"><strong className="font-semibold text-[var(--v2-ink-900)]">Пока не запускать стартап.</strong> Это не текущий бизнес, а разведка следующей большой главы.</p>
            <Bullets>
              <Bullet>Изучать рынок, компании и продукты.</Bullet>
              <Bullet>Искать проблемы и общаться с людьми.</Bullet>
              <Bullet>Понять, есть ли достойная идея.</Bullet>
              <Bullet>По возможности использовать найм как способ приблизиться к индустрии.</Bullet>
            </Bullets>
          </Section>

          <Section id="qmagic" number="07" subtitle="Продуктовый опцион" title="Qmagic">
            <p className="text-[16px] leading-relaxed text-[var(--v2-ink-700)]">Не давать постоянный обязательный слот просто потому, что проект существует.</p>
            <Quote>Qmagic должен заслужить дополнительное внимание внешним сигналом.</Quote>
            <Bullets>
              <Bullet>Возвращаться при реальной проблеме клиента.</Bullet>
              <Bullet>Нужны сильная гипотеза и понятный use case.</Bullet>
              <Bullet>Если сигнал есть — быстро собирать и тестировать MVP.</Bullet>
              <Bullet>Если сигнала нет — не кормить проект временем из чувства вины.</Bullet>
            </Bullets>
          </Section>

          <Section id="rules" number="→" subtitle="При дефиците времени" title="Простое правило">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-white p-6 shadow-[var(--v2-shadow-card)]">
                <Kicker>Режу в таком порядке</Kicker>
                <ol className="mt-4 space-y-3">
                  {["Instagram", "Qmagic", "Робототехника", "Дополнительные активности Twinlabs / медиа"].map((item, index) => (
                    <li key={item} className="flex items-center gap-3 border-b border-[var(--v2-ink-100)] pb-3 last:border-0 last:pb-0">
                      <span className="v2-tnum w-5 font-mono text-[11px] text-[var(--v2-ink-300)]">0{index + 1}</span>
                      <span className="text-[14px] text-[var(--v2-ink-700)]">{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-2xl border border-[var(--v2-brand-200)] bg-[var(--v2-brand-50)] p-6">
                <Kicker>Стараюсь не резать</Kicker>
                <Bullets>
                  <Bullet>Денежную базу.</Bullet>
                  <Bullet>Ключевую задачу Импульса.</Bullet>
                  <Bullet>2 YouTube-ролика в месяц.</Bullet>
                  <Bullet>Минимальный защищённый слот Аркалиума.</Bullet>
                </Bullets>
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-3xl bg-[var(--v2-ink-900)] p-7 text-white shadow-[var(--v2-shadow-pop)] sm:p-9">
              <Kicker>Главная конструкция</Kicker>
              <div className="mt-6 space-y-4">
                {[
                  ["Twinlabs или найм", "обеспечивают настоящее."],
                  ["Импульс", "строит следующий источник независимости."],
                  ["YouTube", "строит аудиторию."],
                  ["Аркалиум", "строит будущее, которое я действительно хочу."],
                  ["Робототехника", "исследует следующую большую главу."],
                  ["Qmagic", "ждёт доказательства."],
                  ["Instagram", "обслуживает систему, а не управляет ей."],
                ].map(([name, description]) => (
                  <p key={name} className="v2-tight border-b border-white/10 pb-4 text-[16px] leading-relaxed last:border-0 last:pb-0">
                    <strong className="font-semibold text-white">{name}</strong>{" "}
                    <span className="text-white/65">{description}</span>
                  </p>
                ))}
              </div>
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}
