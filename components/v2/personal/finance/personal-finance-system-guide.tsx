import type { ReactNode } from "react";

const fixedPayments = [
  { label: "Аренда", amount: "59 000 ₽" },
  { label: "Подписки", amount: "≈ 27 000 ₽" },
  { label: "Метро на двоих", amount: "7 000 ₽" },
] as const;

const normalFunds = [
  { label: "Одежда", amount: "5 000 ₽" },
  { label: "Подарки", amount: "10 000 ₽" },
  { label: "Сюрпризы Лере", amount: "5 000 ₽" },
] as const;

function Kicker({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <span
      className={`font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] ${
        light ? "text-white/50" : "text-[var(--v2-brand-600)]"
      }`}
    >
      {children}
    </span>
  );
}

function MoneyRow({
  label,
  amount,
  muted = false,
}: {
  label: string;
  amount: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--v2-ink-100)] py-3.5 last:border-0">
      <span className={`text-[14px] ${muted ? "text-[var(--v2-ink-500)]" : "text-[var(--v2-ink-700)]"}`}>{label}</span>
      <span className="v2-tnum shrink-0 text-[14px] font-semibold text-[var(--v2-ink-900)]">{amount}</span>
    </div>
  );
}

export function PersonalFinanceSystemGuide() {
  return (
    <div className="min-h-full overflow-y-auto">
      <header className="relative overflow-hidden border-b border-[var(--v2-ink-100)] bg-white">
        <div className="v2-dotgrid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-[1050px] px-6 py-10 lg:px-10 lg:py-14">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--v2-brand-50)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-brand-700)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--v2-brand-500)]" />
            Финансовая система
          </span>
          <h1 className="v2-tighter mt-5 max-w-[820px] text-[42px] font-light leading-[1.04] text-[var(--v2-ink-900)] sm:text-[54px]">
            Одно простое решение<br />на каждый месяц
          </h1>
          <p className="v2-tight mt-4 max-w-[650px] text-[17px] leading-relaxed text-[var(--v2-ink-600)]">
            Сначала зарплата и жизнь. Всё сверх нормального бюджета автоматически превращается в накопления.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1050px] space-y-5 px-6 py-10 lg:px-10 lg:py-12">
        <section className="overflow-hidden rounded-3xl bg-[var(--v2-ink-900)] p-7 text-white shadow-[var(--v2-shadow-pop)] sm:p-9">
          <Kicker light>Правило месяца</Kicker>
          <p className="v2-tighter mt-3 max-w-[820px] text-[25px] font-light leading-snug sm:text-[31px]">
            Откладываю зарплату, выбираю режим жизни — экономный или нормальный. Из всего сверх 200 000 ₽: 80% сохраняю, 20% добавляю к свободным деньгам.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/[0.07] p-5">
              <p className="v2-tnum text-[26px] font-semibold">50 000 ₽</p>
              <p className="mt-1 text-[12px] text-white/50">зарплата каждый месяц</p>
            </div>
            <div className="rounded-2xl bg-white/[0.07] p-5">
              <p className="v2-tnum text-[26px] font-semibold">170 000 ₽</p>
              <p className="mt-1 text-[12px] text-white/50">экономный личный бюджет</p>
            </div>
            <div className="rounded-2xl bg-[var(--v2-brand-600)] p-5">
              <p className="v2-tnum text-[26px] font-semibold">200 000 ₽</p>
              <p className="mt-1 text-[12px] text-blue-100">нормальный личный бюджет</p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-[var(--v2-brand-200)] bg-white p-7 shadow-[var(--v2-shadow-card)] sm:p-9">
          <Kicker>Горизонт до 1 октября 2027</Kicker>
          <p className="v2-tighter mt-3 max-w-[760px] text-[24px] font-light leading-snug text-[var(--v2-ink-900)] sm:text-[28px]">
            Две цели, к которым сходится вся система.
          </p>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-[var(--v2-ink-50)] p-6">
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-ink-400)]">
                Доход
              </p>
              <p className="v2-tnum mt-3 text-[30px] font-semibold leading-none text-[var(--v2-ink-900)]">
                400 000 ₽
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-[var(--v2-ink-600)]">
                Выйти на стабильные 400 тысяч в месяц.
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--v2-brand-50)] p-6">
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-brand-600)]">
                Капитал
              </p>
              <p className="v2-tnum mt-3 text-[30px] font-semibold leading-none text-[var(--v2-ink-900)]">
                1,8–2,4 млн ₽
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-[var(--v2-ink-600)]">
                Прибавить капитал до 1,8–2,4 миллионов рублей.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-2xl bg-white p-6 shadow-[var(--v2-shadow-card)]">
            <Kicker>Сначала бизнес</Kicker>
            <div className="mt-5 rounded-2xl bg-[var(--v2-ink-50)] px-5 py-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[14px] font-medium text-[var(--v2-ink-900)]">Зарплата</p>
                  <p className="mt-1 text-[12px] text-[var(--v2-ink-500)]">откладываю каждый месяц</p>
                </div>
                <p className="v2-tnum text-[25px] font-semibold text-[var(--v2-ink-900)]">50 000 ₽</p>
              </div>
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-[var(--v2-ink-500)]">
              Зарплата — отдельное обязательство бизнеса. Режим 170/200 тысяч считается уже для личной жизни.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-[var(--v2-shadow-card)]">
            <Kicker>Затем обязательная жизнь</Kicker>
            <div className="mt-3">
              {fixedPayments.map((item) => (
                <MoneyRow key={item.label} {...item} />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between rounded-xl bg-[var(--v2-ink-900)] px-4 py-3 text-white">
              <span className="text-[13px] font-medium">Обязательные платежи</span>
              <span className="v2-tnum text-[17px] font-semibold">93 000 ₽</span>
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-[var(--v2-ink-200)] bg-white p-7 shadow-[var(--v2-shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Kicker>Экономный месяц</Kicker>
                <p className="v2-tnum mt-2 text-[36px] font-semibold leading-none text-[var(--v2-ink-900)]">170 000 ₽</p>
              </div>
              <span className="rounded-full bg-[var(--v2-ink-100)] px-3 py-1 text-[11px] font-medium text-[var(--v2-ink-500)]">режим экономии</span>
            </div>
            <div className="mt-7">
              <MoneyRow label="Обязательные платежи" amount="93 000 ₽" />
              <MoneyRow label="Свободные деньги" amount="77 000 ₽" />
            </div>
            <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
              <span className="bg-[var(--v2-ink-700)]" style={{ width: "54.7%" }} />
              <span className="bg-[var(--v2-brand-400)]" style={{ width: "45.3%" }} />
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-[var(--v2-ink-500)]">
              Одежду, подарки и сюрпризы Лере в этом месяце не пополняю.
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/65 p-7 shadow-[var(--v2-shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Kicker>Нормальный месяц</Kicker>
                <p className="v2-tnum mt-2 text-[36px] font-semibold leading-none text-emerald-950">200 000 ₽</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-medium text-emerald-700">от 200 тысяч</span>
            </div>
            <div className="mt-7">
              <MoneyRow label="Обязательные платежи" amount="93 000 ₽" />
              <MoneyRow label="Свободные деньги" amount="87 000 ₽" />
              {normalFunds.map((item) => (
                <MoneyRow key={item.label} {...item} muted />
              ))}
            </div>
            <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-emerald-100">
              <span className="bg-emerald-800" style={{ width: "46.5%" }} />
              <span className="bg-[var(--v2-brand-400)]" style={{ width: "43.5%" }} />
              <span className="bg-amber-400" style={{ width: "10%" }} />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl bg-[var(--v2-brand-600)] p-7 text-white shadow-[var(--v2-shadow-glow)] sm:p-9">
          <Kicker light>Всё сверх 200 000 ₽</Kicker>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/[0.1] p-6">
              <p className="v2-tnum text-[46px] font-semibold leading-none">80%</p>
              <p className="mt-3 text-[16px] font-medium">В подушку / капитал</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-white/55">Сначала заполняю подушку, затем увеличиваю капитал.</p>
            </div>
            <div className="rounded-2xl bg-white p-6 text-[var(--v2-ink-900)]">
              <p className="v2-tnum text-[46px] font-semibold leading-none text-[var(--v2-brand-700)]">20%</p>
              <p className="mt-3 text-[16px] font-medium">В свободные деньги</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--v2-ink-500)]">Можно жить чуть свободнее, не превращая весь рост дохода в расходы.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["250 000 ₽", "40 000 ₽", "10 000 ₽"],
              ["300 000 ₽", "80 000 ₽", "20 000 ₽"],
              ["400 000 ₽", "160 000 ₽", "40 000 ₽"],
            ].map(([income, capital, free]) => (
              <div key={income} className="rounded-xl border border-white/15 px-4 py-3">
                <p className="v2-tnum text-[14px] font-semibold">{income}</p>
                <p className="mt-1 text-[11.5px] text-white/55">{capital} в капитал · {free} свободно</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--v2-brand-200)] bg-white px-7 py-8 text-center shadow-[var(--v2-shadow-card)]">
          <Kicker>Вся система в одной строке</Kicker>
          <p className="v2-tighter mx-auto mt-3 max-w-[800px] text-[25px] font-light leading-snug text-[var(--v2-ink-900)]">
            50 тысяч на зарплату → 170 или 200 тысяч на жизнь → всё сверх 200 делю 80 / 20.
          </p>
        </section>
      </main>
    </div>
  );
}
