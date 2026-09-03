"use client";

import "./sofia-design.css";
import { appPath } from "@/lib/api-url";
import { applyReplan, fetchSofiaContext, sendSofiaMessage } from "@/lib/v2/agency/sofia/sofia-api-client";
import type { ReplanPreviewPayload } from "@/lib/v2/agency/plan/plan-replan-types";
import { formatChangeLine } from "@/lib/v2/agency/plan/plan-replan-types";
import type {
  SofiaAction,
  SofiaContextPanel,
  SofiaMessage,
  SofiaChatTurn,
} from "@/lib/v2/agency/sofia/sofia-types";
import { formatRub } from "@/lib/v2/finance/meta";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const HERO_CHIPS = [
  "Можно брать новый проект?",
  "Прилетела срочная задача",
  "Перестроить план",
  "Что делать сейчас?",
  "Проверить цену и срок",
];

const AVATAR = "/agency/sofia-hero.png";

function uid() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function CheckIcon() {
  return (
    <svg className="svgi" viewBox="0 0 18 18" aria-hidden>
      <path d="M3.4 9.4l3.4 3.4 7.8-7.8" />
    </svg>
  );
}

function SofiaAvatar({ size = 32 }: { size?: 32 | 44 }) {
  const cls = size === 44 ? "av av--44" : "av av--32";
  return (
    <span className={cls}>
      <Image src={AVATAR} alt="" width={size} height={size} unoptimized />
    </span>
  );
}

function ActionButtons({
  actions,
  onAction,
}: {
  actions?: SofiaAction[];
  onAction: (a: SofiaAction) => void;
}) {
  if (!actions?.length) return null;
  return (
    <div className="acts">
      {actions.map((a, i) => {
        const label =
          a.label ??
          (a.type === "copy_client"
            ? "Скопировать сообщение"
            : a.type === "prefill"
              ? "Изменить условия"
              : a.type === "confirm_plan"
                ? "Показать изменения"
                : a.type === "link"
                  ? a.label
                  : "Действие");
        const cls =
          a.type === "copy_client" || a.type === "confirm_plan"
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
          <button key={i} type="button" className={cls} onClick={() => onAction(a)}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function DecisionCard({
  msg,
  onAction,
}: {
  msg: Extract<SofiaMessage, { kind: "decision" }>;
  onAction: (a: SofiaAction) => void;
}) {
  return (
    <div className="ans">
      <div className="ans-top">
        <span className="kick">{msg.headline ?? "Главное решение"}</span>
        <p className="ans-d">{msg.decision}</p>
        {msg.alternative ? (
          <div className="ans-alt">
            <span>
              <b>Запасной вариант</b>
              {msg.alternative}
            </span>
          </div>
        ) : null}
      </div>
      <div className="ans-b">
        <span className="kick">Почему</span>
        <ul className="why">
          {msg.why.map((w, i) => (
            <li key={i} className={w.warn ? "warn" : undefined}>
              <span className="dot" />
              <span dangerouslySetInnerHTML={{ __html: w.text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>") }} />
            </li>
          ))}
        </ul>
        {msg.planChanges?.length ? (
          <div className="blk">
            <span className="kick">Что изменится в плане</span>
            <div className="tl">
              {msg.planChanges.map((c, i) => (
                <div key={i} className={`tlc${c.accent ? " tlc--acc" : ""}`}>
                  <span className="tlc-l">{c.label}</span>
                  <span className="tlc-v">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {msg.clientMessage ? (
          <div className="blk">
            <span className="kick">Сообщение клиенту</span>
            <p className="cmsg">{msg.clientMessage}</p>
            <ActionButtons actions={msg.actions} onAction={onAction} />
          </div>
        ) : (
          <ActionButtons actions={msg.actions} onAction={onAction} />
        )}
      </div>
    </div>
  );
}

function MessageRow({
  msg,
  onChip,
  onAction,
}: {
  msg: SofiaMessage;
  onChip: (text: string) => void;
  onAction: (a: SofiaAction) => void;
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
      return <DecisionCard msg={msg} onAction={onAction} />;
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
    if (msg.kind === "stale_check") {
      return (
        <>
          <div className="bub">{msg.text}</div>
          <div className="chips">
            {msg.chips.map((c) => (
              <button key={c} type="button" className="chip chip--q" onClick={() => onChip(c)}>
                {c}
              </button>
            ))}
          </div>
        </>
      );
    }
    return (
      <>
        <div className="bub">{msg.text}</div>
        {msg.chips?.length ? (
          <div className="chips">
            {msg.chips.map((c) => (
              <button key={c} type="button" className="chip chip--q" onClick={() => onChip(c)}>
                {c}
              </button>
            ))}
          </div>
        ) : null}
        {"actions" in msg ? <ActionButtons actions={msg.actions} onAction={onAction} /> : null}
      </>
    );
  })();

  return (
    <div className="msg">
      <SofiaAvatar size={32} />
      <div className="msg-body" style={{ flex: msg.kind === "decision" ? 1 : undefined }}>
        {body}
      </div>
    </div>
  );
}

function ContextPanel({
  context,
  collapsed,
  onToggle,
}: {
  context: SofiaContextPanel | null;
  collapsed: boolean;
  onToggle: () => void;
}) {
  if (!context) {
    return (
      <aside className={`card ctx${collapsed ? " collapsed" : ""}`}>
        <div className="ctx-h">
          <span className="sec-title" style={{ fontSize: 17 }}>
            Контекст решения
          </span>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`card ctx${collapsed ? " collapsed" : ""}`} id="ctx">
      <div className="ctx-h">
        <span className="sec-title" style={{ fontSize: 17 }}>
          Контекст решения
        </span>
        {!collapsed ? (
          <span className="vlab" style={{ display: "none" }}>
            Контекст
          </span>
        ) : (
          <span className="vlab">Контекст</span>
        )}
        <button
          type="button"
          className="tgl"
          style={{ marginLeft: collapsed ? 0 : "auto" }}
          title={collapsed ? "Развернуть" : "Свернуть"}
          onClick={onToggle}
        >
          {collapsed ? "‹" : "›"}
        </button>
      </div>
      {!collapsed ? (
        <div className="ctx-b">
          <div className="cg">
            <span className="cg-t">План</span>
            <div className="cg-box">
              <span className="cg-row">
                Работа распределена до
                <b>{context.workScheduledUntil ?? "—"}</b>
              </span>
              <span className="cg-row">
                Ближайшее окно
                <b>{context.nextFreeWindow ?? "—"}</b>
              </span>
            </div>
          </div>
          <div className="ctx-div" />
          <div className="cg">
            <span className="cg-t">Сроки</span>
            {context.deadlinesOk ? (
              <span className="cg-ok">
                <CheckIcon />
                {context.deadlinesNote}
              </span>
            ) : (
              <span className="cg-ok" style={{ background: "var(--amber-bg)", color: "#78350f" }}>
                {context.deadlinesNote}
              </span>
            )}
          </div>
          <div className="ctx-div" />
          <div className="cg">
            <span className="cg-t">Деньги {context.monthLabel.toLowerCase()}</span>
            <div className="cg-box">
              <span className="cg-row">
                Надёжная прибыль
                <b className="tnum">{formatRub(context.reliableProfitRub)}</b>
              </span>
              <span className="cg-row">
                Плановая прибыль
                <b className="tnum">{formatRub(context.plannedProfitRub)}</b>
              </span>
            </div>
          </div>
          {context.protectedDays.length ? (
            <>
              <div className="ctx-div" />
              <div className="cg">
                <span className="cg-t">Защищённые дни</span>
                {context.protectedDays.map((d) => (
                  <span key={d.date} className="cg-day">
                    <i className={d.mode === "strategy" ? "s" : "a"}>{d.label}</i>
                    {d.date}
                  </span>
                ))}
              </div>
            </>
          ) : null}
          <div className="ctx-div" />
          <div className="cg">
            <span className="cg-t">Использованные правила</span>
            <div className="rl">
              {context.rulesUsed.map((r) => (
                <div key={r} dangerouslySetInnerHTML={{ __html: r.replace(/(\d[\d\s]*\s*₽\/ч)/, "<b>$1</b>") }} />
              ))}
            </div>
            <Link
              href={appPath("/v2/agency/plan?tab=rules")}
              className="btn btn--line btn--sm"
              style={{ marginTop: 4, textDecoration: "none" }}
            >
              Открыть все правила
            </Link>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function ConfirmModal({
  open,
  preview,
  applying,
  onClose,
  onApply,
}: {
  open: boolean;
  preview: ReplanPreviewPayload | null;
  applying: boolean;
  onClose: () => void;
  onApply: () => void;
}) {
  if (!open || !preview) return null;
  return (
    <>
      <div className="scrim on" onClick={onClose} aria-hidden />
      <div className="modal on" role="dialog" aria-modal="true">
        <div className="md-h">
          <span className="kick">София предлагает</span>
          <h2 className="sec-title" style={{ marginTop: 7 }}>
            Подтвердить изменения?
          </h2>
          <p className="sec-sub" style={{ marginTop: 8 }}>
            План изменится только после вашего подтверждения ({preview.changes.length}{" "}
            {preview.changes.length === 1 ? "задача" : preview.changes.length < 5 ? "задачи" : "задач"}).
          </p>
        </div>
        <div className="md-b">
          {preview.changes.map((ch) => (
            <div key={ch.itemId} className="ch">
              <svg className="svgi" viewBox="0 0 18 18" aria-hidden>
                {ch.changeType === "place" ? (
                  <path d="M9 3.4v11.2M3.4 9h11.2" />
                ) : (
                  <path d="M2.8 9h12.4M10.9 4.8 15.2 9l-4.3 4.2" />
                )}
              </svg>
              <span>{formatChangeLine(ch)}</span>
            </div>
          ))}
          {preview.keeps.map((k) => (
            <div key={k} className="ch ch--keep">
              <CheckIcon />
              <span>{k}</span>
            </div>
          ))}
          {preview.nextFreeWindowAfter ? (
            <div className="ch">
              <svg className="svgi" viewBox="0 0 18 18" aria-hidden>
                <circle cx="9" cy="9" r="6.6" />
                <path d="M9 5.1V9l2.9 1.8" />
              </svg>
              <span>
                Ближайшее свободное окно станет <b>{preview.nextFreeWindowAfter}</b>
              </span>
            </div>
          ) : null}
          {preview.warnings.map((w) => (
            <div key={w} className="warnbox">
              <svg className="svgi" viewBox="0 0 18 18" aria-hidden>
                <path d="M9 2.6 16 15H2z" />
                <path d="M9 7.2v3.4M9 12.6h.01" />
              </svg>
              <span>{w}</span>
            </div>
          ))}
        </div>
        <div className="md-f">
          <button type="button" className="btn btn--pri" disabled={applying} onClick={onApply}>
            {applying ? "Применяю…" : "Применить изменения"}
          </button>
          <button type="button" className="btn btn--gh" disabled={applying} onClick={onClose}>
            Оставить текущий план
          </button>
        </div>
      </div>
    </>
  );
}

export function SofiaChatClient() {
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);
  const [context, setContext] = useState<SofiaContextPanel | null>(null);
  const [messages, setMessages] = useState<SofiaMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ctxCollapsed, setCtxCollapsed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activePreview, setActivePreview] = useState<ReplanPreviewPayload | null>(null);
  const [replanPreviews, setReplanPreviews] = useState<Record<string, ReplanPreviewPayload>>({});
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = useCallback((t: string) => {
    setToast(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  const scrollDown = useCallback(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const refreshContext = useCallback(() => {
    fetchSofiaContext(year, month)
      .then(({ context: c }) => setContext(c))
      .catch(() => {});
  }, [year, month]);

  useEffect(() => {
    fetchSofiaContext(year, month)
      .then(({ context: c, staleChecks }) => {
        setContext(c);
        if (staleChecks.length) setMessages(staleChecks);
      })
      .catch(() => {});
  }, [year, month]);

  useEffect(() => {
    scrollDown();
  }, [messages, loading, scrollDown]);

  const historyFromMessages = useCallback((): SofiaChatTurn[] => {
    const out: SofiaChatTurn[] = [];
    for (const m of messages) {
      if (m.role === "user") out.push({ role: "user", text: m.text });
      else if (m.kind === "decision") out.push({ role: "assistant", text: m.decision });
      else if (m.kind === "clarify" || m.kind === "bubble" || m.kind === "stale_check")
        out.push({ role: "assistant", text: m.text });
    }
    return out;
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: SofiaMessage = { id: uid(), role: "user", text: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const history = [...historyFromMessages(), { role: "user" as const, text: trimmed }];
        const res = await sendSofiaMessage({
          message: trimmed,
          history: history.slice(0, -1),
          year,
          month,
        });
        setMessages((prev) => [...prev, ...res.messages]);
        if (res.replanPreview) {
          setReplanPreviews((prev) => ({
            ...prev,
            [res.replanPreview!.previewId]: res.replanPreview!,
          }));
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "sofia",
            kind: "bubble",
            text: "Не удалось получить ответ. Попробуйте ещё раз.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [historyFromMessages, loading, month, year]
  );

  const onChip = useCallback(
    (text: string) => {
      if (["Да", "Осталось меньше", "Осталось больше"].includes(text)) {
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "user", text },
          {
            id: uid(),
            role: "sofia",
            kind: "bubble",
            text:
              text === "Да"
                ? "Хорошо, оставляю текущую оценку. План не меняю."
                : "Обновите оценку в проекте — и я пересчитаю ближайшие окна.",
          },
        ]);
        return;
      }
      const chipText = text.match(/^\d+\s*час/) ? `Примерно ${text}` : text;
      void send(chipText);
    },
    [send]
  );

  const onAction = useCallback(
    (a: SofiaAction) => {
      if (a.type === "copy_client") {
        void navigator.clipboard?.writeText(a.text);
        showToast("Сообщение скопировано");
      } else if (a.type === "prefill") {
        setInput(a.text);
      } else if (a.type === "confirm_plan") {
        const preview = replanPreviews[a.previewId];
        if (preview) {
          setActivePreview(preview);
          setModalOpen(true);
        } else {
          showToast("Превью устарело — напишите «Перестроить план» снова");
        }
      }
    },
    [replanPreviews, showToast]
  );

  const handleApplyReplan = useCallback(async () => {
    if (!activePreview?.changes.length) return;
    setApplying(true);
    try {
      const result = await applyReplan(activePreview.changes);
      setModalOpen(false);
      refreshContext();
      const skippedNote =
        result.skipped.length > 0 ? ` Пропущено: ${result.skipped.length}.` : "";
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "sofia",
          kind: "bubble",
          text: `Применила ${result.applied} ${result.applied === 1 ? "изменение" : "изменения"} в плане.${skippedNote} Ближайшее окно — ${activePreview.nextFreeWindowAfter ?? "см. календарь"}.`,
        },
      ]);
      showToast("План обновлён");
      setActivePreview(null);
    } catch {
      showToast("Не удалось применить изменения");
    } finally {
      setApplying(false);
    }
  }, [activePreview, refreshContext, showToast]);

  return (
    <div className="sofia-v3 flex min-h-0 flex-1 flex-col">
      <div className="shell flex min-h-0 flex-1 flex-col">
        <main className="main flex min-h-0 flex-1 flex-col">
          <div className="page">
            <section className="card hero">
              <div className="hero-l">
                <span className="kick">Рабочий диспетчер</span>
                <h1 className="hero-h1">София</h1>
                <p className="hero-s">
                  Поможет принять новый проект, разрешить конфликт сроков и перестроить план.
                </p>
                <span className="ask" style={{ fontSize: 19, paddingTop: 12 }}>
                  Что сейчас нужно решить?
                </span>
                <div className="chips">
                  {HERO_CHIPS.map((c) => (
                    <button key={c} type="button" className="chip" onClick={() => void send(c)}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="hero-img">
                <Image src={AVATAR} alt="" fill unoptimized style={{ objectFit: "cover" }} />
              </div>
            </section>

            <div className={`grid${ctxCollapsed ? " narrow" : ""}`}>
              <section className="card chat">
                <div className="chat-h">
                  <SofiaAvatar size={44} />
                  <div>
                    <div className="chat-n">София</div>
                    <div className="chat-r">Рабочий помощник</div>
                  </div>
                  <span className="chat-on">
                    <i /> {loading ? "Думаю…" : "На связи"}
                  </span>
                </div>
                <div className="thread" ref={threadRef}>
                  {messages.map((m) => (
                    <MessageRow key={m.id} msg={m} onChip={onChip} onAction={onAction} />
                  ))}
                  {loading ? (
                    <div className="msg">
                      <SofiaAvatar size={32} />
                      <div className="msg-body">
                        <div className="bub">Проверяю цену, дедлайн и свободные окна…</div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="compose">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Опишите ситуацию обычным сообщением…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send(input);
                    }}
                  />
                  <div className="compose-r">
                    <p className="eg">
                      Например: сайт за 45 000 ₽, дедлайн 18 сентября, примерно 10 часов. Можно
                      брать?
                    </p>
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

              <ContextPanel
                context={context}
                collapsed={ctxCollapsed}
                onToggle={() => setCtxCollapsed((v) => !v)}
              />
            </div>
          </div>
        </main>
      </div>

      <ConfirmModal
        open={modalOpen}
        preview={activePreview}
        applying={applying}
        onClose={() => {
          setModalOpen(false);
          showToast("План оставлен без изменений");
        }}
        onApply={() => void handleApplyReplan()}
      />

      <div className={`toast${toast ? " on" : ""}`} role="status">
        {toast}
      </div>
    </div>
  );
}
