"use client";

import "./work-rules-design.css";
import type {
  WorkRulesAgreement,
  WorkRulesCapCard,
  WorkRulesDocument,
} from "@/lib/v2/agency/dispatch/work-rules-document";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { DispatchRulesRow } from "@/lib/v2/agency/dispatch/dispatch-types";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const ICONS: Record<string, ReactNode> = {
  clock: (
    <>
      <circle cx="9" cy="9" r="6.6" />
      <path d="M9 5.1V9l2.9 1.8" />
    </>
  ),
  swap: (
    <>
      <path d="M2.6 6.2h11l-2.8-2.9M15.4 11.8h-11l2.8 2.9" />
    </>
  ),
  arrow: <path d="M2.8 9h12.4M10.9 4.8 15.2 9l-4.3 4.2" />,
  list: (
    <>
      <path d="M3 5h12M3 9h12M3 13h7" />
    </>
  ),
  star: (
    <>
      <path d="M9 2.8v12.4M2.8 9h12.4M4.6 4.6l8.8 8.8M13.4 4.6l-8.8 8.8" />
    </>
  ),
  lock: (
    <>
      <rect x="3.2" y="7.6" width="11.6" height="7.2" rx="2.2" />
      <path d="M6.1 7.6V5.9a2.9 2.9 0 0 1 5.8 0v1.7" />
    </>
  ),
  flag: <path d="M4.4 15.2V3.2h9l-1.7 3.3 1.7 3.3h-9" />,
  bolt: <path d="M9.8 2.5 4.2 10.3h3.7l-.7 5.2 5.6-7.8H9.1z" />,
};

function RuleIcon({ name }: { name: string }) {
  return (
    <svg className="svgi" viewBox="0 0 18 18">
      {ICONS[name] ?? ICONS.list}
    </svg>
  );
}

type DrawerState =
  | { type: "cap"; index: number }
  | { type: "agr"; index: number }
  | { type: "section"; section: "cap" | "rates" | "money" | "agr" | "prio" };

async function saveWorkRules(doc: WorkRulesDocument) {
  return fetchJson<DispatchRulesRow>("/api/v2/agency/dispatch/rules", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workRules: doc }),
  });
}

export function WorkRulesTab() {
  const [doc, setDoc] = useState<WorkRulesDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  const persist = useCallback(
    async (next: WorkRulesDocument, message: string) => {
      setSaving(true);
      try {
        const saved = await saveWorkRules(next);
        setDoc(saved.workRules);
        showToast(message);
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Не удалось сохранить");
      } finally {
        setSaving(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    let cancelled = false;
    fetchJson<DispatchRulesRow>("/api/v2/agency/dispatch/rules")
      .then((data) => {
        if (!cancelled) setDoc(data.workRules);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (loading && !doc) {
    return <div className="work-rules-v3 p-8 text-[var(--ink-500)]">Загрузка правил…</div>;
  }
  if (error && !doc) {
    return <div className="work-rules-v3 p-8 text-[var(--red)]">{error}</div>;
  }
  if (!doc) return null;

  return (
    <div className="work-rules-v3">
      <div className="shell">
        <main className="main">
          <div className="page">
            <section className="card hero">
              <div className="hero-l">
                <span className="kick">Моя рабочая система</span>
                <h1 className="hero-h1">Правила работы</h1>
                <p className="hero-s">Условия, которые защищают деньги, сроки и моё время.</p>
                <div className="hero-a">
                  <button type="button" className="btn btn--pri" onClick={() => setDrawer({ type: "section", section: "cap" })}>
                    Редактировать правила
                  </button>
                </div>
              </div>
              <div className="hero-img">
                <Image src="/agency/rules-hero.png" alt="" fill sizes="(max-width: 1180px) 0vw, 40vw" priority />
              </div>
            </section>

            <section className="card pad">
              <div className="headrow">
                <h2 className="big-title">Время и мощность</h2>
                <span className="sec-sub">Сколько работы можно обещать, не ломая неделю</span>
                <button
                  type="button"
                  className="btn btn--line btn--sm"
                  style={{ marginLeft: "auto" }}
                  onClick={() => setDrawer({ type: "section", section: "cap" })}
                >
                  Изменить
                </button>
              </div>
              <div className="cap" style={{ marginTop: 20 }}>
                {doc.cap.map((c, i) => (
                  <CapCard key={i} card={c} onEdit={() => setDrawer({ type: "cap", index: i })} />
                ))}
              </div>
            </section>

            <div className="money">
              <section className="card pad">
                <div className="headrow">
                  <h2 className="sec-title">Стоимость работы</h2>
                  <span className="sec-sub">Ориентиры ставки</span>
                </div>
                <div className="tiers">
                  {doc.tiers.map((t, i) => (
                    <div key={i} className={`tier${t.c ? ` tier--${t.c}` : ""}`}>
                      <span className="tier-v tnum">{t.v}</span>
                      <span className="tier-r">
                        <span className="tier-b" style={{ width: `${t.w}%` }} />
                        <span className="tier-l">{t.l}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="rule">
                  <RuleIcon name="arrow" />
                  <span>{doc.rateRule}</span>
                </div>
                <div style={{ marginTop: 16 }}>
                  <button type="button" className="btn btn--line btn--sm" onClick={() => setDrawer({ type: "section", section: "rates" })}>
                    Изменить ориентиры
                  </button>
                </div>
              </section>

              <section className="card pad">
                <div className="headrow">
                  <h2 className="sec-title">Деньги месяца</h2>
                  <span className="sec-sub">Ориентиры прибыли</span>
                </div>
                <div className="goals">
                  {doc.goals.map((g, i) => (
                    <div key={i} className={`goal${g.acc ? " goal--acc" : ""}`}>
                      <span className="goal-v tnum">{g.v}</span>
                      <span className="goal-l">{g.l}</span>
                    </div>
                  ))}
                </div>
                <div className="rule rule--soft">
                  <RuleIcon name="lock" />
                  <span>{doc.moneyRule}</span>
                </div>
                <div style={{ marginTop: 16 }}>
                  <button type="button" className="btn btn--line btn--sm" onClick={() => setDrawer({ type: "section", section: "money" })}>
                    Изменить ориентиры
                  </button>
                </div>
              </section>
            </div>

            <section className="card pad">
              <div className="headrow">
                <h2 className="big-title">Клиентские договорённости</h2>
                <span className="sec-sub">Что действует по умолчанию в любом проекте</span>
                <button
                  type="button"
                  className="btn btn--line btn--sm"
                  style={{ marginLeft: "auto" }}
                  onClick={() => setDrawer({ type: "section", section: "agr" })}
                >
                  Изменить договорённости
                </button>
              </div>
              <div className="agr">
                {doc.agr.map((a, i) => (
                  <button key={i} type="button" className="agrr" onClick={() => setDrawer({ type: "agr", index: i })}>
                    <span className="ico">
                      <RuleIcon name={a.i} />
                    </span>
                    <span className="agrr-t">{a.t}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="prio">
              <div>
                <span className="kick">Как определяется приоритет</span>
                <h2 className="prio-h2">Когда всё кажется срочным</h2>
                <p className="prio-s">Пять вопросов по порядку. Ответ на первый, который действительно срабатывает, и есть приоритет.</p>
                <div className="prio-final">{doc.prioFinal}</div>
                <div style={{ marginTop: 22 }}>
                  <button type="button" className="btn btn--gh btn--sm" onClick={() => setDrawer({ type: "section", section: "prio" })}>
                    Изменить
                  </button>
                </div>
              </div>
              <div className="steps">
                {doc.steps.map((s, i) => (
                  <div key={i} className="step">
                    <span className="step-n tnum">{i + 1}</span>
                    <span className="step-t">{s}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="foot">
              <span className="av">
                <Image src="/agency/rules-hero.png" alt="" width={30} height={30} />
              </span>
              <span>Эти правила использует София, когда помогает оценивать проекты и перестраивать план.</span>
            </div>
          </div>
        </main>
      </div>

      <div className={`scrim${drawer ? " on" : ""}`} onClick={() => setDrawer(null)} />
      {drawer && (
        <RulesDrawer
          doc={doc}
          drawer={drawer}
          saving={saving}
          onClose={() => setDrawer(null)}
          onSave={(next, msg) => {
            setDrawer(null);
            void persist(next, msg);
          }}
        />
      )}

      <div className={`toast${toast ? " on" : ""}`} role="status">
        {toast}
        {saving ? " · сохраняем…" : ""}
      </div>
    </div>
  );
}

function CapCard({ card, onEdit }: { card: WorkRulesCapCard; onEdit: () => void }) {
  return (
    <div className={`capc${card.acc ? " capc--acc" : ""}`}>
      <div className="capc-h">
        <span className="capc-n">{card.n}</span>
        <button type="button" className="iedit" title="Изменить" onClick={onEdit}>
          <RuleIcon name="swap" />
        </button>
      </div>
      <span className="capc-v tnum">{card.v}</span>
      <span className="capc-l">{card.l}</span>
      {card.note ? <p className="capc-note">{card.note}</p> : null}
    </div>
  );
}

function RulesDrawer({
  doc,
  drawer,
  saving,
  onClose,
  onSave,
}: {
  doc: WorkRulesDocument;
  drawer: DrawerState;
  saving: boolean;
  onClose: () => void;
  onSave: (next: WorkRulesDocument, message: string) => void;
}) {
  if (drawer.type === "cap") {
    return (
      <CapEditDrawer
        card={doc.cap[drawer.index]!}
        onClose={onClose}
        saving={saving}
        onSave={(c) => {
          const cap = [...doc.cap];
          cap[drawer.index] = c;
          onSave({ ...doc, cap }, `«${c.n}» обновлено`);
        }}
      />
    );
  }
  if (drawer.type === "agr") {
    return (
      <AgrEditDrawer
        item={doc.agr[drawer.index]!}
        onClose={onClose}
        saving={saving}
        onSave={(t) => {
          const agr = [...doc.agr];
          agr[drawer.index] = { ...agr[drawer.index]!, t };
          onSave({ ...doc, agr }, "Договорённость обновлена");
        }}
        onDelete={() => {
          const agr = doc.agr.filter((_, i) => i !== drawer.index);
          onSave({ ...doc, agr }, "Договорённость удалена");
        }}
      />
    );
  }
  return (
    <SectionEditDrawer
      doc={doc}
      section={drawer.section}
      onClose={onClose}
      saving={saving}
      onSave={onSave}
    />
  );
}

function DrawerShell({
  kick,
  title,
  children,
  footer,
  onClose,
}: {
  kick: string;
  title: string;
  children: ReactNode;
  footer: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <aside className="drawer on" aria-hidden="false">
      <div className="dr-h">
        <div style={{ flex: 1 }}>
          <span className="kick">{kick}</span>
          <h2 className="sec-title" style={{ marginTop: 6 }}>
            {title}
          </h2>
        </div>
        <button type="button" className="xbtn" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="dr-b">{children}</div>
      <div className="dr-f">{footer}</div>
    </aside>
  );
}

function CapEditDrawer({
  card,
  onClose,
  onSave,
  saving,
}: {
  card: WorkRulesCapCard;
  onClose: () => void;
  onSave: (c: WorkRulesCapCard) => void;
  saving: boolean;
}) {
  const [n, setN] = useState(card.n);
  const [v, setV] = useState(card.v);
  const [l, setL] = useState(card.l);
  const [note, setNote] = useState(card.note ?? "");
  return (
    <DrawerShell
      kick="Время и мощность"
      title={card.n}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--pri" disabled={saving} onClick={() => onSave({ ...card, n: n || card.n, v, l, note })}>
            Сохранить
          </button>
          <button type="button" className="btn btn--gh" onClick={onClose}>
            Отмена
          </button>
        </>
      }
    >
      <Field label="Название" value={n} onChange={setN} />
      <Field label="Значение" value={v} onChange={setV} />
      <Field label="Подпись" value={l} onChange={setL} />
      <TextArea label="Пояснение" value={note} onChange={setNote} />
      <p className="dr-note">Значение показывается крупно на карточке. Пояснение можно оставить пустым.</p>
    </DrawerShell>
  );
}

function AgrEditDrawer({
  item,
  onClose,
  onSave,
  onDelete,
  saving,
}: {
  item: WorkRulesAgreement;
  onClose: () => void;
  onSave: (t: string) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [t, setT] = useState(item.t);
  return (
    <DrawerShell
      kick="Клиентская договорённость"
      title="Формулировка"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--pri" disabled={saving} onClick={() => t && onSave(t)}>
            Сохранить
          </button>
          <button type="button" className="btn btn--gh" disabled={saving} onClick={onDelete}>
            Удалить
          </button>
          <button type="button" className="btn btn--gh" onClick={onClose}>
            Отмена
          </button>
        </>
      }
    >
      <TextArea label="Правило" value={t} onChange={setT} />
      <p className="dr-note">Одно предложение. Правило действует по умолчанию во всех проектах.</p>
    </DrawerShell>
  );
}

function SectionEditDrawer({
  doc,
  section,
  onClose,
  onSave,
  saving,
}: {
  doc: WorkRulesDocument;
  section: "cap" | "rates" | "money" | "agr" | "prio";
  onClose: () => void;
  onSave: (next: WorkRulesDocument, message: string) => void;
  saving: boolean;
}) {
  const [cap, setCap] = useState(doc.cap.map((c) => ({ v: c.v, l: c.l })));
  const [tiers, setTiers] = useState(doc.tiers.map((t) => ({ v: t.v, l: t.l })));
  const [rateRule, setRateRule] = useState(doc.rateRule);
  const [goals, setGoals] = useState(doc.goals.map((g) => ({ v: g.v, l: g.l })));
  const [moneyRule, setMoneyRule] = useState(doc.moneyRule);
  const [agr, setAgr] = useState(doc.agr.map((a) => a.t));
  const [newAgr, setNewAgr] = useState("");
  const [steps, setSteps] = useState([...doc.steps]);
  const [prioFinal, setPrioFinal] = useState(doc.prioFinal);

  const saveCap = () => {
    const nextCap = doc.cap.map((c, i) => ({ ...c, v: cap[i]?.v || c.v, l: cap[i]?.l ?? c.l }));
    onSave({ ...doc, cap: nextCap }, "Время и мощность обновлены");
  };

  const saveRates = () => {
    const nextTiers = doc.tiers.map((t, i) => ({ ...t, v: tiers[i]?.v || t.v, l: tiers[i]?.l ?? t.l }));
    onSave({ ...doc, tiers: nextTiers, rateRule }, "Ориентиры ставки обновлены");
  };

  const saveMoney = () => {
    const nextGoals = doc.goals.map((g, i) => ({ ...g, v: goals[i]?.v || g.v, l: goals[i]?.l ?? g.l }));
    onSave({ ...doc, goals: nextGoals, moneyRule }, "Ориентиры месяца обновлены");
  };

  const saveAgr = () => {
    const out: WorkRulesAgreement[] = [];
    agr.forEach((t, i) => {
      if (t.trim()) out.push({ ...doc.agr[i]!, t: t.trim() });
    });
    if (newAgr.trim()) out.push({ i: "list", t: newAgr.trim() });
    onSave({ ...doc, agr: out }, "Договорённости обновлены");
  };

  const savePrio = () => {
    onSave({ ...doc, steps, prioFinal }, "Порядок приоритета обновлён");
  };

  if (section === "cap") {
    return (
      <DrawerShell
        kick="Правила работы"
        title="Время и мощность"
        onClose={onClose}
        footer={
          <>
            <button type="button" className="btn btn--pri" disabled={saving} onClick={saveCap}>
              Сохранить
            </button>
            <button type="button" className="btn btn--gh" onClick={onClose}>
              Отмена
            </button>
          </>
        }
      >
        {doc.cap.map((c, i) => (
          <div key={i} className="fld2">
            <Field label={`${c.n} · значение`} value={cap[i]?.v ?? ""} onChange={(v) => setCap((s) => s.map((x, j) => (j === i ? { ...x, v } : x)))} />
            <Field label="Подпись" value={cap[i]?.l ?? ""} onChange={(l) => setCap((s) => s.map((x, j) => (j === i ? { ...x, l } : x)))} />
          </div>
        ))}
        <p className="dr-note">Пояснения к блокам меняются в отдельной карточке — нажмите иконку на нужном блоке.</p>
      </DrawerShell>
    );
  }

  if (section === "rates") {
    return (
      <DrawerShell kick="Деньги и цена" title="Стоимость работы" onClose={onClose} footer={<SaveFooter saving={saving} onSave={saveRates} onClose={onClose} />}>
        {doc.tiers.map((t, i) => (
          <div key={i} className="fld2">
            <Field label="Ставка" value={tiers[i]?.v ?? ""} onChange={(v) => setTiers((s) => s.map((x, j) => (j === i ? { ...x, v } : x)))} />
            <Field label="Подпись" value={tiers[i]?.l ?? ""} onChange={(l) => setTiers((s) => s.map((x, j) => (j === i ? { ...x, l } : x)))} />
          </div>
        ))}
        <TextArea label="Главное правило" value={rateRule} onChange={setRateRule} />
      </DrawerShell>
    );
  }

  if (section === "money") {
    return (
      <DrawerShell kick="Деньги и цена" title="Деньги месяца" onClose={onClose} footer={<SaveFooter saving={saving} onSave={saveMoney} onClose={onClose} />}>
        {doc.goals.map((g, i) => (
          <div key={i} className="fld2">
            <Field label="Сумма" value={goals[i]?.v ?? ""} onChange={(v) => setGoals((s) => s.map((x, j) => (j === i ? { ...x, v } : x)))} />
            <Field label="Подпись" value={goals[i]?.l ?? ""} onChange={(l) => setGoals((s) => s.map((x, j) => (j === i ? { ...x, l } : x)))} />
          </div>
        ))}
        <TextArea label="Правило" value={moneyRule} onChange={setMoneyRule} />
        <p className="dr-note">Это ориентиры, а не отчёт. Текущая прибыль месяца живёт в «Транзакциях».</p>
      </DrawerShell>
    );
  }

  if (section === "agr") {
    return (
      <DrawerShell kick="Правила работы" title="Клиентские договорённости" onClose={onClose} footer={<SaveFooter saving={saving} onSave={saveAgr} onClose={onClose} />}>
        {doc.agr.map((a, i) => (
          <TextArea key={i} label={`Правило ${i + 1}`} value={agr[i] ?? ""} onChange={(v) => setAgr((s) => s.map((x, j) => (j === i ? v : x)))} />
        ))}
        <TextArea label="Добавить правило" value={newAgr} onChange={setNewAgr} />
        <p className="dr-note">Пустое поле удаляет правило.</p>
      </DrawerShell>
    );
  }

  return (
    <DrawerShell kick="Правила работы" title="Когда всё кажется срочным" onClose={onClose} footer={<SaveFooter saving={saving} onSave={savePrio} onClose={onClose} />}>
      {steps.map((s, i) => (
        <TextArea key={i} label={`Шаг ${i + 1}`} value={s} onChange={(v) => setSteps((arr) => arr.map((x, j) => (j === i ? v : x)))} />
      ))}
      <TextArea label="Финальная мысль" value={prioFinal} onChange={setPrioFinal} />
    </DrawerShell>
  );
}

function SaveFooter({ saving, onSave, onClose }: { saving: boolean; onSave: () => void; onClose: () => void }) {
  return (
    <>
      <button type="button" className="btn btn--pri" disabled={saving} onClick={onSave}>
        Сохранить
      </button>
      <button type="button" className="btn btn--gh" onClick={onClose}>
        Отмена
      </button>
    </>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="fld">
      <label>{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="fld">
      <label>{label}</label>
      <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
