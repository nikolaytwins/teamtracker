"use client";

import "@/components/v2/agency/sofia/sofia-design.css";
import { appPath } from "@/lib/api-url";
import {
  applyDayAssistantPlan,
  applyFinanceAssistantPlan,
  fetchFinanceAssistantContext,
  sendFinanceAssistantMessage,
} from "@/lib/v2/personal/finance-assistant/api-client";
import type { AssistantDomain, DayPlanContext, DayWeekPlan } from "@/lib/v2/personal/finance-assistant/day-plan-types";
import type {
  FinanceAllocationPlan,
  FinanceAssistantAction,
  FinanceAssistantContext,
  FinanceAssistantMessage,
  FinanceAssistantChatTurn,
} from "@/lib/v2/personal/finance-assistant/types";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const FINANCE_CHIPS = [
  "Заработал 170 000",
  "Заработал 200 000",
  "Заработал 280 000",
  "Как работает система?",
];

const DAY_CHIPS = [
  "Распланируй эту неделю",
  "Следующая неделя",
  "Стратегия в понедельник, свидание в субботу",
  "Что ещё не закрыто?",
];

const AVATAR = "/agency/sofia-finance-hero.png";

function uid() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function rub(n: number): string {
  return `${Math.round(n).toLocaleString("ru-RU")} ₽`;
}

function SofiaAvatar({ size = 32 }: { size?: 32 | 44 }) {
  const cls = size === 44 ? "av av--44" : "av av--32";
  return (
    <span className={cls} style={{ overflow: "hidden" }}>
      <Image
        src={AVATAR}
        alt=""
        width={size}
        height={size}
        unoptimized
        style={{
          objectFit: "cover",
          objectPosition: "78% 22%",
          transform: "scale(1.35)",
          transformOrigin: "78% 22%",
        }}
      />
    </span>
  );
}

function ActionButtons({
  actions,
  onAction,
  busy,
}: {
  actions?: FinanceAssistantAction[];
  onAction: (a: FinanceAssistantAction) => void;
  busy?: boolean;
}) {
  if (!actions?.length) return null;
  return (
    <div className="acts">
      {actions.map((a, i) => {
        const label =
          a.label ??
          (a.type === "apply_allocation"
            ? "Записать в фонды"
            : a.type === "apply_day_plan"
              ? "Записать в план"
              : a.type === "prefill"
                ? "Изменить"
                : a.type === "link"
                  ? a.label
                  : "Действие");
        const cls =
          a.type === "apply_allocation" || a.type === "apply_day_plan"
            ? "btn btn--pri btn--sm"
            : "btn btn--line btn--sm";
        if (a.type === "link") {
          return (
            <Link key={i} href={appPath(a.href)} className={cls}>
              {label}
            </Link>
          );
        }
        return (
          <button
            key={i}
            type="button"
            className={cls}
            disabled={busy}
            onClick={() => onAction(a)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function PlanGrid({ plan }: { plan: FinanceAllocationPlan }) {
  return (
    <div className="tl" style={{ marginTop: 12 }}>
      {plan.lines
        .filter((l) => l.amount_rub > 0 || l.key === "payments" || l.key === "free")
        .map((l) => (
          <div key={l.key} className={`tlc${l.fund_key && l.amount_rub > 0 ? " tlc--acc" : ""}`}>
            <span className="tlc-l">{l.label}</span>
            <span className="tlc-v tnum">{rub(l.amount_rub)}</span>
          </div>
        ))}
    </div>
  );
}

function DayPlanGrid({ plan }: { plan: DayWeekPlan }) {
  return (
    <div className="tl" style={{ marginTop: 12 }}>
      {plan.checklist.map((c) => (
        <div key={c.id} className={`tlc${c.ok ? " tlc--acc" : ""}`}>
          <span className="tlc-l">{c.label}</span>
          <span className="tlc-v tnum">{c.ok ? c.plan_date ?? "ок" : "—"}</span>
        </div>
      ))}
    </div>
  );
}

function DecisionCard({
  msg,
  onAction,
  busy,
}: {
  msg: Extract<FinanceAssistantMessage, { kind: "decision" }>;
  onAction: (a: FinanceAssistantAction) => void;
  busy?: boolean;
}) {
  const isDay = Boolean(msg.day_plan);
  return (
    <div className="ans">
      <div className="ans-top">
        <span className="kick">{msg.headline ?? (isDay ? "Неделя" : "Распределение")}</span>
        <p className="ans-d">{msg.decision}</p>
        {msg.alternative ? (
          <div className="ans-alt">
            <span>
              <b>Ещё вариант</b>
              {msg.alternative}
            </span>
          </div>
        ) : null}
      </div>
      <div className="ans-b">
        <span className="kick">{isDay ? "Чеклист недели" : "Куда класть"}</span>
        {msg.day_plan ? <DayPlanGrid plan={msg.day_plan} /> : null}
        {msg.plan ? <PlanGrid plan={msg.plan} /> : null}
        <ul className="why" style={{ marginTop: 16 }}>
          {msg.why.map((w, i) => (
            <li key={i} className={w.warn ? "warn" : undefined}>
              <span className="dot" />
              <span
                dangerouslySetInnerHTML={{
                  __html: w.text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"),
                }}
              />
            </li>
          ))}
        </ul>
        <ActionButtons actions={msg.actions} onAction={onAction} busy={busy} />
      </div>
    </div>
  );
}

function MessageRow({
  msg,
  onChip,
  onAction,
  busy,
}: {
  msg: FinanceAssistantMessage;
  onChip: (text: string) => void;
  onAction: (a: FinanceAssistantAction) => void;
  busy?: boolean;
}) {
  if (msg.role === "user") {
    return (
      <div className="msg msg--me">
        <div className="msg-body">
          <div className="bub">{msg.text}</div>
        </div>
      </div>
    );
  }

  const body = (() => {
    if (msg.kind === "decision") {
      return <DecisionCard msg={msg} onAction={onAction} busy={busy} />;
    }
    if (msg.kind === "clarify") {
      return (
        <>
          <div className="clar">{msg.text}</div>
          {msg.chips.length ? (
            <div className="chips">
              {msg.chips.map((c) => (
                <button key={c} type="button" className="chip chip--q" onClick={() => onChip(c)}>
                  {c}
                </button>
              ))}
            </div>
          ) : null}
        </>
      );
    }
    return (
      <>
        <div className="bub" style={{ whiteSpace: "pre-wrap" }}>
          {msg.text}
        </div>
        {msg.chips?.length ? (
          <div className="chips">
            {msg.chips.map((c) => (
              <button key={c} type="button" className="chip chip--q" onClick={() => onChip(c)}>
                {c}
              </button>
            ))}
          </div>
        ) : null}
        <ActionButtons actions={msg.actions} onAction={onAction} busy={busy} />
      </>
    );
  })();

  return (
    <div className="msg">
      <SofiaAvatar size={32} />
      <div className="msg-body" style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {body}
      </div>
    </div>
  );
}

function FinanceContextPanel({
  context,
  collapsed,
  loading,
  error,
  onRetry,
  onToggle,
}: {
  context: FinanceAssistantContext | null;
  collapsed: boolean;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onToggle: () => void;
}) {
  if (collapsed) {
    return (
      <section className="card ctx collapsed">
        <button type="button" className="tgl" onClick={onToggle} aria-label="Развернуть">
          ←
        </button>
        <span className="vlab">Контекст</span>
      </section>
    );
  }

  return (
    <section className="card ctx">
      <div className="ctx-h">
        <span className="kick">Сейчас</span>
        <button type="button" className="tgl" style={{ marginLeft: "auto" }} onClick={onToggle}>
          →
        </button>
      </div>
      {loading && !context ? <p className="sec-sub">Загрузка…</p> : null}
      {error ? (
        <div>
          <p className="sec-sub">{error}</p>
          <button type="button" className="btn btn--line btn--sm" onClick={onRetry}>
            Ещё раз
          </button>
        </div>
      ) : null}
      {context ? (
        <div className="ctx-b">
          <div className="cg">
            <span className="cg-t">Подушка и капитал</span>
            <div className="cg-row">
              Подушка <b className="tnum">{rub(context.cushion_rub)}</b>
            </div>
            <div className="cg-row">
              Капитал <b className="tnum">{rub(context.capital_rub)}</b>
            </div>
          </div>
          <div className="ctx-div" />
          <div className="cg">
            <span className="cg-t">Фонды</span>
            {context.funds.map((f) => (
              <div key={f.id} className="cg-row">
                {f.name} <b className="tnum">{rub(f.amount_rub)}</b>
              </div>
            ))}
          </div>
          <div className="ctx-div" />
          <div className="cg">
            <span className="cg-t">Правила</span>
            <div className="rl">
              {context.rules_short.slice(0, 4).map((r, i) => (
                <div key={i}>{r}</div>
              ))}
            </div>
          </div>
          <p className="sec-sub" style={{ marginTop: 4 }}>
            {context.free_hint}
          </p>
        </div>
      ) : null}
    </section>
  );
}

function DayContextPanel({
  context,
  collapsed,
  loading,
  error,
  onRetry,
  onToggle,
}: {
  context: DayPlanContext | null;
  collapsed: boolean;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onToggle: () => void;
}) {
  if (collapsed) {
    return (
      <section className="card ctx collapsed">
        <button type="button" className="tgl" onClick={onToggle} aria-label="Развернуть">
          ←
        </button>
        <span className="vlab">Неделя</span>
      </section>
    );
  }

  return (
    <section className="card ctx">
      <div className="ctx-h">
        <span className="kick">Неделя</span>
        <button type="button" className="tgl" style={{ marginLeft: "auto" }} onClick={onToggle}>
          →
        </button>
      </div>
      {loading && !context ? <p className="sec-sub">Загрузка…</p> : null}
      {error ? (
        <div>
          <p className="sec-sub">{error}</p>
          <button type="button" className="btn btn--line btn--sm" onClick={onRetry}>
            Ещё раз
          </button>
        </div>
      ) : null}
      {context ? (
        <div className="ctx-b">
          <div className="cg">
            <span className="cg-t">
              {context.week_start} — {context.week_end}
            </span>
            <div className="cg-row">
              Рабочий день <b className="tnum">{context.work_hours_per_day} ч</b>
            </div>
          </div>
          <div className="ctx-div" />
          <div className="cg">
            <span className="cg-t">Чеклист</span>
            {context.checklist.map((c) => (
              <div key={c.id} className="cg-row">
                {c.label}{" "}
                <b className="tnum">{c.ok ? c.plan_date ?? "✓" : "—"}</b>
              </div>
            ))}
          </div>
          <div className="ctx-div" />
          <div className="cg">
            <span className="cg-t">Дни</span>
            {context.days.map((d) => (
              <div key={d.date} className="cg-row">
                {d.weekday} {d.date.slice(5)}{" "}
                <b className="tnum">
                  {d.mode ?? "·"} · {d.hours}ч
                </b>
              </div>
            ))}
          </div>
          <p className="sec-sub" style={{ marginTop: 4 }}>
            {context.free_hint}
          </p>
        </div>
      ) : null}
    </section>
  );
}

export function FinanceAssistantClient() {
  const [domain, setDomain] = useState<AssistantDomain>("finance");
  const [messages, setMessages] = useState<FinanceAssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [financeContext, setFinanceContext] = useState<FinanceAssistantContext | null>(null);
  const [dayContext, setDayContext] = useState<DayPlanContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState<string | null>(null);
  const [ctxCollapsed, setCtxCollapsed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chips = domain === "day" ? DAY_CHIPS : FINANCE_CHIPS;

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const refreshContext = useCallback((d: AssistantDomain = domain) => {
    setContextLoading(true);
    setContextError(null);
    void fetchFinanceAssistantContext(d)
      .then((r) => {
        if (r.domain === "day") setDayContext(r.context);
        else setFinanceContext(r.context);
      })
      .catch((e) => setContextError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setContextLoading(false));
  }, [domain]);

  useEffect(() => {
    refreshContext(domain);
  }, [domain, refreshContext]);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const switchDomain = useCallback((next: AssistantDomain) => {
    if (next === domain) return;
    setDomain(next);
    setMessages([]);
    setInput("");
  }, [domain]);

  const historyFromMessages = useCallback((list: FinanceAssistantMessage[]): FinanceAssistantChatTurn[] => {
    const out: FinanceAssistantChatTurn[] = [];
    for (const m of list) {
      if (m.role === "user") out.push({ role: "user", text: m.text });
      else if (m.kind === "bubble" || m.kind === "clarify") out.push({ role: "assistant", text: m.text });
      else if (m.kind === "decision") out.push({ role: "assistant", text: m.decision });
    }
    return out.slice(-10);
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || loading) return;
      const userMsg: FinanceAssistantMessage = { id: uid(), role: "user", text };
      const next = [...messages, userMsg];
      setMessages(next);
      setInput("");
      setLoading(true);
      try {
        const result = await sendFinanceAssistantMessage({
          message: text,
          history: historyFromMessages(messages),
          domain,
        });
        setMessages((prev) => [...prev, ...result.messages]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            kind: "bubble",
            text:
              domain === "day"
                ? "Не удалось ответить. Попробуй ещё раз или напиши «распланируй неделю»."
                : "Не удалось ответить. Попробуй ещё раз или напиши сумму цифрами.",
            chips: chips.slice(0, 3),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [chips, domain, historyFromMessages, loading, messages]
  );

  const onChip = useCallback(
    (text: string) => {
      void send(text);
    },
    [send]
  );

  const onAction = useCallback(
    async (a: FinanceAssistantAction) => {
      if (a.type === "prefill") {
        setInput(a.text);
        return;
      }
      if (a.type === "apply_allocation") {
        if (applying) return;
        setApplying(true);
        try {
          const result = await applyFinanceAssistantPlan(a.plan);
          refreshContext("finance");
          const lines = result.applied.map(
            (x) => `${x.name}: ${rub(x.before)} → ${rub(x.after)} (+${rub(x.delta)})`
          );
          const skip = result.skipped.length ? `\n\nВручную: ${result.skipped.join("; ")}` : "";
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              role: "assistant",
              kind: "bubble",
              text:
                result.applied.length > 0
                  ? `Записала в фонды:\n${lines.join("\n")}${skip}`
                  : `В фонды писать нечего.${skip}`,
              actions: [{ type: "link", href: "/v2/personal/finance", label: "К финансам" }],
            },
          ]);
          showToast(result.applied.length ? "Фонды обновлены" : "Нечего записывать");
        } catch {
          showToast("Не удалось записать");
        } finally {
          setApplying(false);
        }
        return;
      }
      if (a.type === "apply_day_plan") {
        if (applying) return;
        setApplying(true);
        try {
          const result = await applyDayAssistantPlan(a.plan);
          refreshContext("day");
          const modes = result.day_modes.map((m) => `${m.plan_date}: ${m.mode}`).join("\n");
          const items = result.created_items
            .map((it) => `${it.plan_date ?? "—"} · ${it.title}`)
            .join("\n");
          const skip = result.skipped.length ? `\n\nПропущено: ${result.skipped.join("; ")}` : "";
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              role: "assistant",
              kind: "bubble",
              text: `Записала в план.\n\nРежимы:\n${modes || "—"}\n\nБлоки:\n${items || "—"}${skip}`,
              actions: [{ type: "link", href: "/v2/agency/plan", label: "Открыть календарь" }],
            },
          ]);
          showToast(
            result.created_items.length || result.day_modes.length
              ? "План обновлён"
              : "Нечего записывать"
          );
        } catch {
          showToast("Не удалось записать в план");
        } finally {
          setApplying(false);
        }
      }
    },
    [applying, refreshContext, showToast]
  );

  const heroKick = domain === "day" ? "Планирование дня" : "Финансовый помощник";
  const heroSub =
    domain === "day"
      ? "Скажи ограничения недели — раскидаю стратегию, творчество, выходы, свидание, выходной и рабочие дни. По одобрению занесу в календарь."
      : "Скажи, сколько заработал — разложу по платежам, свободным и фондам. По одобрению запишу сама.";
  const ask =
    domain === "day" ? "Какую неделю собираем?" : "Сколько сейчас доступно?";
  const role = domain === "day" ? "Планировщик недели" : "Финансовый аналитик";
  const loadingText =
    domain === "day" ? "Смотрю календарь и раскладываю дни…" : "Считаю платежи, свободные и фонды…";
  const placeholder =
    domain === "day"
      ? "Например: распланируй неделю, мероприятие в среду, свидание в субботу…"
      : "Например: заработал 250 тысяч после зарплаты…";
  const footerHint =
    domain === "day"
      ? "После одобрения поставлю режимы дней и события в календарь Плана."
      : "После одобрения пополню одежду, подарки, Леру и подушку. Платежи и свободные — подскажу отдельно.";

  return (
    <div className="sofia-v3 flex min-h-0 flex-1 flex-col">
      <div className="shell flex min-h-0 flex-1 flex-col">
        <main className="main flex min-h-0 flex-1 flex-col">
          <div className="page">
            <section className="card hero">
              <div className="hero-l">
                <span className="kick">{heroKick}</span>
                <h1 className="hero-h1">София</h1>
                <p className="hero-s">{heroSub}</p>
                <div className="chips" style={{ marginTop: 8, marginBottom: 4 }}>
                  <button
                    type="button"
                    className={`chip${domain === "finance" ? " chip--q" : ""}`}
                    onClick={() => switchDomain("finance")}
                  >
                    Финансы
                  </button>
                  <button
                    type="button"
                    className={`chip${domain === "day" ? " chip--q" : ""}`}
                    onClick={() => switchDomain("day")}
                  >
                    План дня
                  </button>
                </div>
                <span className="ask" style={{ fontSize: 19, paddingTop: 12 }}>
                  {ask}
                </span>
                <div className="chips">
                  {chips.map((c) => (
                    <button key={c} type="button" className="chip" onClick={() => void send(c)}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="hero-img">
                <Image
                  src={AVATAR}
                  alt=""
                  fill
                  unoptimized
                  style={{ objectFit: "cover", objectPosition: "82% 35%" }}
                />
              </div>
            </section>

            <div className={`grid${ctxCollapsed ? " narrow" : ""}`}>
              <section className="card chat">
                <div className="chat-h">
                  <SofiaAvatar size={44} />
                  <div>
                    <div className="chat-n">София</div>
                    <div className="chat-r">{role}</div>
                  </div>
                  <span className="chat-on">
                    <i /> {loading || applying ? "Думаю…" : "На связи"}
                  </span>
                </div>
                <div className="thread" ref={threadRef}>
                  {messages.map((m) => (
                    <MessageRow
                      key={m.id}
                      msg={m}
                      onChip={onChip}
                      onAction={(a) => void onAction(a)}
                      busy={applying}
                    />
                  ))}
                  {loading ? (
                    <div className="msg">
                      <SofiaAvatar size={32} />
                      <div className="msg-body">
                        <div className="bub">{loadingText}</div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="compose">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={placeholder}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send(input);
                    }}
                  />
                  <div className="compose-r">
                    <p className="eg">{footerHint}</p>
                    <button
                      type="button"
                      className="btn btn--pri"
                      disabled={loading || !input.trim()}
                      onClick={() => void send(input)}
                    >
                      Отправить Софии
                    </button>
                  </div>
                </div>
              </section>

              {domain === "day" ? (
                <DayContextPanel
                  context={dayContext}
                  collapsed={ctxCollapsed}
                  loading={contextLoading}
                  error={contextError}
                  onRetry={() => refreshContext("day")}
                  onToggle={() => setCtxCollapsed((v) => !v)}
                />
              ) : (
                <FinanceContextPanel
                  context={financeContext}
                  collapsed={ctxCollapsed}
                  loading={contextLoading}
                  error={contextError}
                  onRetry={() => refreshContext("finance")}
                  onToggle={() => setCtxCollapsed((v) => !v)}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      <div className={`toast${toast ? " on" : ""}`} role="status">
        {toast}
      </div>
    </div>
  );
}
