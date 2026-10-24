"use client";

import "./goals-page.css";
import { PersonalWishesClient } from "@/components/v2/personal/wishes/personal-wishes-client";
import { appPath } from "@/lib/api-url";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import {
  FUND_DB,
  FUND_KEYS,
  FUND_NAME,
  FUND_SHORT,
  GOAL_CAT,
  GOAL_PHOTO,
  GOAL_PHOTO_POS,
  GOAL_TIERS,
  GOALS_BOARD_LS_KEY,
  RING_GOAL_ID,
  RING_GOAL_URL,
  defaultGoalsBoard,
  lifeGoalProgress,
  sanitizeGoalsBoard,
  tierFromCushion,
  type FundKey,
  type GoalCat,
  type GoalsBoard,
  type LifeGoal,
} from "@/lib/v2/personal/goals-board";
import type { PersonalFinanceDashboard } from "@/lib/v2/personal/types";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const NEAR: Record<FundKey, string> = {
  cush: "своей подушке безопасности",
  wish: "целям из фонда желаний",
  est: "фонду недвижимости",
};

type Balances = Record<FundKey, number>;

function rub(n: number) {
  return `${Math.round(n || 0).toLocaleString("ru-RU")} ₽`;
}

function fn(n: number) {
  return n ? Math.round(n).toLocaleString("ru-RU") : "";
}

function num(v: string) {
  return Number(String(v).replace(/\D/g, "")) || 0;
}

function plural(n: number, a: string, b: string, c: string) {
  const m = n % 10;
  const h = n % 100;
  if (m === 1 && h !== 11) return a;
  if (m >= 2 && m <= 4 && (h < 10 || h >= 20)) return b;
  return c;
}

function fromWish(goal: LifeGoal) {
  return goal.c !== "must";
}

function wishNeedOf(goals: LifeGoal[]) {
  return goals.filter((g) => fromWish(g) && !g.done).reduce((sum, g) => sum + (g.p || 0), 0);
}

function readLocal(): GoalsBoard | null {
  try {
    const raw = localStorage.getItem(GOALS_BOARD_LS_KEY);
    if (!raw) return null;
    return sanitizeGoalsBoard(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeLocal(board: GoalsBoard) {
  try {
    localStorage.setItem(GOALS_BOARD_LS_KEY, JSON.stringify(board));
  } catch {
    /* ignore quota */
  }
}

function ShieldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
      <path d="M12 3l7 3v5.5c0 4.3-3 7.9-7 9.5-4-1.6-7-5.2-7-9.5V6l7-3z" />
    </svg>
  );
}

function WishIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21V10M4 20h16M12 10C10 6 6 5 3 7c3 0 6 1 9 3zM12 10c2-4 6-5 9-3-3 0-6 1-9 3zM12 10c-1.5-3-1-5.5 1-7 0 2.5-.3 4.7-1 7z" />
    </svg>
  );
}

function HouseIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
      <path d="M4 10.5L12 4l8 6.5V20H4z" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

function WaveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M16.5 7.5a6.4 6.4 0 010 9M19.5 4.5a10.6 10.6 0 010 15M7.5 16.5a6.4 6.4 0 010-9" />
    </svg>
  );
}

const FUND_ICON = { cush: ShieldIcon, wish: WishIcon, est: HouseIcon };

function GoalPhoto({ id, title, tall = false }: { id: string; title: string; tall?: boolean }) {
  const src = GOAL_PHOTO[id];
  if (!src) return <div className={tall ? "ph ph-tall" : "ph"}>{title || "Фото цели"}</div>;
  return <img className="fit" src={appPath(src)} alt="" style={{ objectPosition: GOAL_PHOTO_POS[id] ?? "center" }} />;
}

function useGoalsDesk() {
  const [board, setBoard] = useState<GoalsBoard | null>(null);
  const [balances, setBalances] = useState<Balances>({ cush: 0, wish: 0, est: 0 });
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);
  const ids = useRef<Record<FundKey, string | null>>({ cush: null, wish: null, est: null });
  const boardRef = useRef<GoalsBoard | null>(null);
  const balancesRef = useRef<Balances>(balances);
  const timer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);
  boardRef.current = board;
  balancesRef.current = balances;

  const persist = useCallback((next: GoalsBoard) => {
    writeLocal(next);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void fetchJson("/api/v2/personal/goals-board", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board: next }),
      }).catch(() => undefined);
    }, 350);
  }, []);

  const showToast = useCallback((msg: string, undo?: () => void) => {
    setToast({ msg, undo });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  const applyBalances = useCallback(async (next: Balances) => {
    setBalances(next);
    await Promise.all(
      FUND_KEYS.map(async (key) => {
        const id = ids.current[key];
        if (!id) return;
        await fetchJson(`/api/v2/personal/finance/funds/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount_rub: Math.max(0, Math.round(next[key])) }),
        });
      })
    );
  }, []);

  useEffect(() => {
    let cancel = false;
    const now = new Date();
    void (async () => {
      const [dash, remote] = await Promise.all([
        fetchJson<PersonalFinanceDashboard>(
          `/api/v2/personal/finance/dashboard?year=${now.getFullYear()}&month=${now.getMonth() + 1}`
        ).catch(() => null),
        fetchJson<{ board: GoalsBoard | null }>("/api/v2/personal/goals-board").catch(() => null),
      ]);
      if (cancel) return;
      const nextBalances: Balances = { cush: 0, wish: 0, est: 0 };
      for (const key of FUND_KEYS) {
        const row = dash?.funds?.find((fund) => fund.fund_key === FUND_DB[key]);
        if (!row) continue;
        ids.current[key] = row.id;
        nextBalances[key] = row.amount_rub || 0;
      }
      setBalances(nextBalances);
      const raw = remote?.board ?? readLocal();
      const hadRing = Boolean(raw?.goals?.some((goal) => goal.id === RING_GOAL_ID));
      const next = sanitizeGoalsBoard(raw ?? defaultGoalsBoard());
      setBoard(next);
      if (!hadRing && next.goals.some((goal) => goal.id === RING_GOAL_ID)) persist(next);
    })();
    return () => {
      cancel = true;
    };
  }, [persist]);

  const updateBoard = useCallback(
    (recipe: (current: GoalsBoard) => GoalsBoard) => {
      setBoard((current) => {
        if (!current) return current;
        const next = recipe(current);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const restore = useCallback(
    (snap: { board: GoalsBoard; balances: Balances }) => {
      setBoard(snap.board);
      persist(snap.board);
      void applyBalances(snap.balances).catch(() => undefined);
    },
    [applyBalances, persist]
  );

  const setBalance = useCallback(
    async (key: FundKey, amount: number) => {
      const next = { ...balancesRef.current, [key]: Math.max(0, Math.round(amount)) };
      await applyBalances(next);
    },
    [applyBalances]
  );

  const deposit = useCallback(async () => {
    const current = boardRef.current;
    if (!current || !current.flow) return;
    const snap = { board: structuredClone(current), balances: { ...balancesRef.current } };
    const tier = tierFromCushion(snap.balances.cush);
    const parts = GOAL_TIERS[tier].r.map((share) => Math.round((current.flow * share) / 100));
    const next = {
      cush: snap.balances.cush + parts[0],
      wish: snap.balances.wish + parts[1],
      est: snap.balances.est + parts[2],
    };
    updateBoard((item) => ({ ...item, flow: 0 }));
    try {
      await applyBalances(next);
      showToast(`Зачислено ${rub(current.flow)} по системе`, () => restore(snap));
    } catch {
      restore(snap);
      showToast("Не удалось зачислить");
    }
  }, [applyBalances, restore, showToast, updateBoard]);

  const toggleDone = useCallback(
    async (id: string) => {
      const current = boardRef.current;
      if (!current) return;
      const goal = current.goals.find((item) => item.id === id);
      if (!goal) return;
      const snap = { board: structuredClone(current), balances: { ...balancesRef.current } };
      let nextBalances = snap.balances;
      const nextGoals = current.goals.map((item) => {
        if (item.id !== id) return item;
        if (!item.done) {
          const paid = fromWish(item) && item.p ? Math.min(item.p, snap.balances.wish) : 0;
          if (paid) nextBalances = { ...nextBalances, wish: nextBalances.wish - paid };
          return { ...item, done: true, dd: new Date().toISOString(), paid: paid || undefined };
        }
        if (item.paid) nextBalances = { ...nextBalances, wish: nextBalances.wish + item.paid };
        return { ...item, done: false, dd: undefined, paid: undefined };
      });
      updateBoard(() => ({ ...current, goals: nextGoals }));
      try {
        if (nextBalances.wish !== snap.balances.wish) await applyBalances(nextBalances);
        const done = nextGoals.find((item) => item.id === id);
        showToast(
          done?.done
            ? `«${done.t}» — исполнено${done.paid ? `, списано ${rub(done.paid)}` : ""}`
            : "Отметка снята",
          () => restore(snap)
        );
      } catch {
        restore(snap);
        showToast("Не удалось обновить фонд");
      }
    },
    [applyBalances, restore, showToast, updateBoard]
  );

  return {
    ready: Boolean(board),
    board: board ?? defaultGoalsBoard(),
    balances,
    toast,
    dismissToast: () => setToast(null),
    updateBoard,
    setBalance,
    deposit,
    toggleDone,
  };
}

type Desk = ReturnType<typeof useGoalsDesk>;

function progressOf(goal: LifeGoal, board: GoalsBoard, balances: Balances) {
  return lifeGoalProgress(goal, board, balances).pct;
}

function GoalsFinanceCard({ desk }: { desk: Desk }) {
  const { board, balances, updateBoard, deposit } = desk;
  const tierIndex = tierFromCushion(balances.cush);
  const tier = GOAL_TIERS[tierIndex];
  const parts = tier.r.map((share) => Math.round(((board.flow || 0) * share) / 100));
  return (
    <section className="card fs" id="fs">
      <div className="fs-h">
        <div>
          <h2>Финансовая система</h2>
          <p className="sec-sub" style={{ marginTop: 8 }}>
            Проценты от свободного денежного потока, не от всей выручки
          </p>
        </div>
        <div className="leg">
          <span style={{ ["--c" as string]: "var(--c-cush)" }}>
            <i />
            Подушка
          </span>
          <span style={{ ["--c" as string]: "var(--c-wish)" }}>
            <i />
            Желания
          </span>
          <span style={{ ["--c" as string]: "var(--c-est)" }}>
            <i />
            Недвижимость
          </span>
        </div>
      </div>
      <div className="now">
        <div className="now-l">
          <span className="kick">Сейчас · уровень</span>
          <b className="tnum">{tier.d}</b>
        </div>
        <div className="now-r">
          {tier.r.map((share, index) => (
            <div key={FUND_KEYS[index]} className={`nr${share ? "" : " z"}`} style={{ ["--c" as string]: `var(--c-${FUND_KEYS[index]})` }}>
              <span>{FUND_SHORT[FUND_KEYS[index]]}</span>
              <b className="tnum">{share}%</b>
            </div>
          ))}
        </div>
      </div>
      <div className="tiers">
        {GOAL_TIERS.map((item, index) => (
          <div key={item.n} className={`ti${index === tierIndex ? " on" : ""}`}>
            <span className="ti-n">
              <b className="tnum">{item.n}</b>
            </span>
            <span className="ti-bar">
              {item.r.map((share, color) =>
                share ? <i key={FUND_KEYS[color]} style={{ flex: share, ["--c" as string]: `var(--c-${FUND_KEYS[color]})` }} /> : null
              )}
            </span>
            <span className="ti-v">
              {item.r.map((share, color) => (
                <span key={FUND_KEYS[color]} style={{ ["--c" as string]: `var(--c-${FUND_KEYS[color]})` }}>
                  {FUND_SHORT[FUND_KEYS[color]]}
                  <b className={`tnum${share ? "" : " z"}`}>{share}%</b>
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
      <div className="calc">
        <label className="calc-in">
          <span className="kick">Свободный поток за месяц</span>
          <span className="m-in">
            <input
              className="tnum"
              inputMode="numeric"
              placeholder="0"
              value={fn(board.flow)}
              onChange={(event) => {
                const value = num(event.target.value);
                updateBoard((current) => ({ ...current, flow: value }));
              }}
            />
            <em>₽</em>
          </span>
          <span className="k2">по уровню «{tier.n}»</span>
        </label>
        <div className="calc-out">
          {tier.r.map((share, index) => (
            <div key={FUND_KEYS[index]} className="co" style={{ ["--c" as string]: `var(--c-${FUND_KEYS[index]})` }}>
              <span className="kick">
                {FUND_SHORT[FUND_KEYS[index]]} · {share}%
              </span>
              <b className="tnum">{rub(parts[index] ?? 0)}</b>
            </div>
          ))}
          <button type="button" className="btn btn-b co-go" disabled={!board.flow} onClick={() => void deposit()}>
            Зачислить в фонды
          </button>
        </div>
      </div>
    </section>
  );
}

function fundTarget(key: FundKey, board: GoalsBoard, balances: Balances) {
  if (key === "wish") return wishNeedOf(board.goals);
  if (key === "cush") return board.targets.cush;
  return board.targets.est;
}

function GoalsSheet({ desk }: { desk: Desk }) {
  const { board, balances, updateBoard, setBalance, toggleDone, toast, dismissToast } = desk;
  const [openGoal, setOpenGoal] = useState<string | null>(null);
  const [openFund, setOpenFund] = useState<FundKey | null>(null);
  const [topup, setTopup] = useState("");
  const tier = GOAL_TIERS[tierFromCushion(balances.cush)];
  const need = wishNeedOf(board.goals);
  const stats = FUND_KEYS.map((key) => {
    const target = fundTarget(key, board, balances);
    const have = balances[key];
    const pct = target ? Math.min(100, Math.round((have / target) * 100)) : 0;
    return { key, target, have, pct, left: Math.max(0, target - have) };
  });
  const first = stats.find((item) => item.pct < 100);
  const bubble = first
    ? `Ты на ${first.pct}% приблизился к ${NEAR[first.key]}.${first.pct >= 30 ? " Отличный прогресс!" : ""}`
    : "Все фонды собраны.";

  const goal = board.goals.find((item) => item.id === openGoal) ?? null;

  function close() {
    if (goal && goal.id !== "cush" && !goal.t.trim()) {
      updateBoard((current) => ({ ...current, goals: current.goals.filter((item) => item.id !== goal.id) }));
    }
    setOpenGoal(null);
    setOpenFund(null);
    setTopup("");
  }

  function add(cat: GoalCat) {
    const id = `f${Date.now()}`;
    updateBoard((current) => ({
      ...current,
      goals: [...current.goals, { id, c: cat, t: "", p: 0, v: 0 }],
    }));
    setOpenFund(null);
    setOpenGoal(id);
  }

  const groups = (["want", "extra"] as const).map((cat) => {
    const list = board.goals.filter((item) => item.c === cat);
    const sum = list.filter((item) => !item.done).reduce((total, item) => total + (item.p || 0), 0);
    return { cat, list, sum };
  });

  return (
    <div className="gls goals-sheet">
      <div className="page">
        <section className="card hero hx">
          <div className="hero-img">
            <img src={appPath("/goals/hero.jpg")} alt="" />
          </div>
          <div className="hero-l">
            <div className="h-head">
              <div>
                <div className="h-row">
                  <h1 className="h1">Цели</h1>
                  <Link className="fslink" href={appPath("/v2/personal/finance/system")}>
                    Финансовая система
                  </Link>
                </div>
              </div>
              <div className="bubble">
                <i>
                  <WaveIcon />
                </i>
                <span className="tnum">{bubble}</span>
              </div>
            </div>
            <div className="funds">
              {stats.map((item, index) => {
                const Icon = FUND_ICON[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    className="fr"
                    style={{ ["--c" as string]: `var(--c-${item.key})` }}
                    onClick={() => {
                      setOpenGoal(null);
                      setOpenFund(item.key);
                      setTopup("");
                    }}
                  >
                    <span className="fr-ic">
                      <Icon />
                    </span>
                    <span>
                      <span className="fr-n">{FUND_NAME[item.key]}</span>
                      <span className="fr-sh tnum">{tier.r[index]}% потока</span>
                    </span>
                    <span className="fr-m">
                      <span className="fr-mr">
                        <span className="fr-bar">
                          <span style={{ width: `${item.pct}%` }} />
                        </span>
                        <span className="fr-pc tnum">{item.pct}%</span>
                      </span>
                      <span className="fr-cap tnum">
                        <b>{rub(item.have)}</b> из {rub(item.target)}
                        {item.key === "wish" ? "" : item.left ? ` · осталось ${rub(item.left)}` : " · собрано"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section>
          <div className="sh">
            <h2>Обязательные</h2>
            <span className="sec-sub">сначала это</span>
            <button type="button" className="addl" onClick={() => add("must")}>
              + Цель
            </button>
          </div>
          <div className="must">
            {board.goals
              .filter((item) => item.c === "must")
              .map((item) => {
                const pct = progressOf(item, board, balances);
                const target = item.fund === "cush" ? board.targets.cush : item.p;
                const have = item.fund === "cush" ? balances.cush : item.v;
                const left = Math.max(0, target - have);
                return (
                  <div
                    key={item.id}
                    className={`gc${item.noimg ? " noimg" : ""}`}
                    onClick={() => {
                      if (item.fund) {
                        setOpenGoal(null);
                        setOpenFund("cush");
                      } else setOpenGoal(item.id);
                      setTopup("");
                    }}
                  >
                    {item.noimg ? null : (
                      <div className="gc-img">
                        <GoalPhoto id={item.id} title={item.t} />
                      </div>
                    )}
                    <div className="gc-b">
                      <div className="gc-top">
                        <h3 className="gc-n">{item.t}</h3>
                        {item.done ? (
                          <span className="gc-tag">✓ Исполнено</span>
                        ) : item.id === RING_GOAL_ID ? (
                          <span className="gc-tag hot">прям важно</span>
                        ) : item.fund ? (
                          <span className="gc-src">из фонда</span>
                        ) : null}
                      </div>
                      {item.id === RING_GOAL_ID ? (
                        <p className="gc-note">16,5 · красное золото 585</p>
                      ) : null}
                      <div className="gc-v">
                        <span className="gc-cur tnum">{rub(have)}</span>
                        <span className="gc-tg tnum">из {rub(target)}</span>
                      </div>
                      <div className="gc-bar">
                        <span style={{ width: `${pct}%` }} />
                      </div>
                      <div className="gc-foot tnum">
                        <b>{pct}%</b>
                        <span>{left ? `осталось ${rub(left)}` : "собрано"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        {groups.map(({ cat, list, sum }) => (
          <section key={cat}>
            <div className="sh">
              <h2>{GOAL_CAT[cat]}</h2>
              <span className="n tnum">
                {list.length} {plural(list.length, "цель", "цели", "целей")}
              </span>
              <span className="r tnum">
                на сумму <b>{rub(sum)}</b>
              </span>
              <button type="button" className="addl" onClick={() => add(cat)}>
                + Цель
              </button>
            </div>
            <div className={`feed${cat === "extra" ? " sm" : ""}`}>
              {list.map((item) => {
                const pct = progressOf(item, board, balances);
                const can = !item.done && item.p > 0 && balances.wish >= item.p;
                return (
                  <div key={item.id} className={`w${item.done ? " isdone" : ""}`} onClick={() => setOpenGoal(item.id)}>
                    <div className="w-img">
                      {item.done ? <span className="w-done">✓ Исполнено</span> : can ? <span className="w-can">Хватает</span> : null}
                      <GoalPhoto id={item.id} title={item.t || "Фото цели"} />
                    </div>
                    <div className="w-b">
                      <div className="w-t">{item.t || "Без названия"}</div>
                      {item.done ? (
                        <div className="w-r">
                          <span className="w-p tnum">{rub(item.p)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-r">
                            <span className="w-p tnum">{rub(item.p)}</span>
                            <span className={`w-f tnum${can ? " ok" : ""}`}>{can ? "в фонде хватает" : `в фонде ${pct}%`}</span>
                          </div>
                          <div className="w-bar">
                            <span style={{ width: `${pct}%` }} />
                          </div>
                          {can ? null : (
                            <div className="w-src tnum">
                              в фонде {rub(balances.wish)} · не хватает {rub(Math.max(0, item.p - balances.wish))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <button type="button" className="add" onClick={() => add(cat)}>
                <b>+</b>Добавить цель
              </button>
            </div>
          </section>
        ))}

        <GoalsFinanceCard desk={desk} />
      </div>

      <div className={`scrim${openGoal || openFund ? " on" : ""}`} onClick={close} />
      <aside className={`dr${openGoal || openFund ? " on" : ""}`} role="dialog" aria-label="Цель">
        <button type="button" className="dr-x" aria-label="Закрыть" onClick={close}>
          ×
        </button>
        <div className="dr-b">
          {openFund ? (
            <FundDrawer
              fund={openFund}
              balance={balances[openFund]}
              target={fundTarget(openFund, board, balances)}
              topup={topup}
              setTopup={setTopup}
              onBalance={(value) => void setBalance(openFund, value)}
              onTarget={(value) => {
                if (openFund === "wish") return;
                const key = openFund === "cush" ? "cush" : "est";
                updateBoard((current) => ({ ...current, targets: { ...current.targets, [key]: value } }));
              }}
              onTopup={() => {
                const value = num(topup);
                if (!value) return;
                const before = balances[openFund];
                void setBalance(openFund, before + value).then(() => setTopup(""));
              }}
              note={need}
            />
          ) : null}
          {goal ? (
            <GoalDrawer
              goal={goal}
              wish={balances.wish}
              onChange={(patch) =>
                updateBoard((current) => ({
                  ...current,
                  goals: current.goals.map((item) => (item.id === goal.id ? { ...item, ...patch } : item)),
                }))
              }
              onDone={() => void toggleDone(goal.id)}
            />
          ) : null}
        </div>
        <div className="dr-f">
          <button type="button" className="btn btn-b" onClick={close}>
            Готово
          </button>
          <button
            type="button"
            className="del"
            hidden={!goal || goal.id === "cush"}
            onClick={() => {
              if (!goal) return;
              updateBoard((current) => ({ ...current, goals: current.goals.filter((item) => item.id !== goal.id) }));
              setOpenGoal(null);
            }}
          >
            Удалить
          </button>
        </div>
      </aside>
      <div className={`toast${toast ? " on" : ""}`} role="status">
        {toast ? (
          <>
            <span>{toast.msg}</span>
            {toast.undo ? (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.();
                  dismissToast();
                }}
              >
                Отменить
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function FundDrawer({
  fund,
  balance,
  target,
  topup,
  setTopup,
  onBalance,
  onTarget,
  onTopup,
  note,
}: {
  fund: FundKey;
  balance: number;
  target: number;
  topup: string;
  setTopup: (value: string) => void;
  onBalance: (value: number) => void;
  onTarget: (value: number) => void;
  onTopup: () => void;
  note: number;
}) {
  const pct = target ? Math.min(100, Math.round((balance / target) * 100)) : 0;
  const color = `var(--c-${fund})`;
  return (
    <>
      <div style={{ height: 6, background: color }} />
      <div className="m-body" style={{ ["--mc" as string]: color }}>
        <span className="m-cat">Фонд</span>
        <h3 className="m-title">{FUND_NAME[fund]}</h3>
        <div className="m-nums">
          <label className="m-num">
            <span className="kick">В фонде</span>
            <span className="m-in">
              <input className="tnum" inputMode="numeric" value={fn(balance)} placeholder="0" onChange={(event) => onBalance(num(event.target.value))} />
              <em>₽</em>
            </span>
          </label>
          {fund === "wish" ? (
            <div className="m-num ro">
              <span className="kick">Цели стоят</span>
              <b className="tnum">{rub(note)}</b>
            </div>
          ) : (
            <label className="m-num">
              <span className="kick">Цель</span>
              <span className="m-in">
                <input className="tnum" inputMode="numeric" value={fn(target)} placeholder="0" onChange={(event) => onTarget(num(event.target.value))} />
                <em>₽</em>
              </span>
            </label>
          )}
        </div>
        <div>
          <div className="m-bar">
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className="m-pf tnum">
            <b>{target ? `${pct}%` : "цель не задана"}</b>
            <span>{target ? (balance >= target ? "собрано" : `осталось ${rub(target - balance)}`) : ""}</span>
          </div>
        </div>
        <form
          className="fu-add"
          style={{ ["--c" as string]: color }}
          onSubmit={(event) => {
            event.preventDefault();
            onTopup();
          }}
        >
          <input inputMode="numeric" placeholder="Сумма пополнения" aria-label="Пополнить" value={topup} onChange={(event) => setTopup(fn(num(event.target.value)))} />
          <button type="submit">+ Пополнить</button>
        </form>
        {fund === "wish" ? (
          <p className="m-note">Сумма открытых желательных и дополнительных целей. Когда отмечаешь цель исполненной, её цена списывается из фонда.</p>
        ) : null}
      </div>
    </>
  );
}

function GoalDrawer({
  goal,
  wish,
  onChange,
  onDone,
}: {
  goal: LifeGoal;
  wish: number;
  onChange: (patch: Partial<LifeGoal>) => void;
  onDone: () => void;
}) {
  const wishGoal = fromWish(goal);
  const have = wishGoal ? wish : goal.v;
  const pct = goal.p ? Math.min(100, Math.round((have / goal.p) * 100)) : 0;
  return (
    <>
      <div className="m-img">
        <GoalPhoto id={goal.id} title="Перетащи фото" tall />
      </div>
      <div className="m-body" style={{ ["--mc" as string]: wishGoal ? "var(--c-wish)" : "var(--blue)" }}>
        <span className="m-cat">
          {GOAL_CAT[goal.c]}
          {wishGoal ? " · из фонда желаний" : ""}
        </span>
        <input className="m-title" value={goal.t} placeholder="Что за цель?" aria-label="Название" onChange={(event) => onChange({ t: event.target.value })} />
        {goal.id === RING_GOAL_ID ? (
          <div className="m-ring">
            <span className="m-ring-badge">прям важно</span>
            <p>Размер 16,5 · красное золото 585</p>
            <a href={RING_GOAL_URL} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
              Открыть на 585 Золотой →
            </a>
          </div>
        ) : null}
        <div className="m-nums">
          <label className="m-num">
            <span className="kick">Стоимость</span>
            <span className="m-in">
              <input className="tnum" inputMode="numeric" value={fn(goal.p)} placeholder="0" onChange={(event) => onChange({ p: num(event.target.value) })} />
              <em>₽</em>
            </span>
          </label>
          {wishGoal ? (
            <div className="m-num ro">
              <span className="kick">В фонде желаний</span>
              <b className="tnum">{rub(wish)}</b>
            </div>
          ) : (
            <label className="m-num">
              <span className="kick">Накоплено</span>
              <span className="m-in">
                <input className="tnum" inputMode="numeric" value={fn(goal.v)} placeholder="0" onChange={(event) => onChange({ v: num(event.target.value) })} />
                <em>₽</em>
              </span>
            </label>
          )}
        </div>
        {goal.done ? null : (
          <div>
            <div className="m-bar">
              <span style={{ width: `${pct}%` }} />
            </div>
            <div className="m-pf tnum">
              <b>{goal.p ? `${pct}%` : "стоимость не задана"}</b>
              <span>
                {goal.p ? (have >= goal.p ? (wishGoal ? "в фонде хватает" : "собрано") : `не хватает ${rub(goal.p - have)}`) : ""}
              </span>
            </div>
          </div>
        )}
        <div className="fl">
          <span>Категория</span>
          <div className="m-seg">
            {(Object.keys(GOAL_CAT) as GoalCat[]).map((cat) => (
              <button key={cat} type="button" className={goal.c === cat ? "on" : ""} onClick={() => onChange({ c: cat, v: cat === "must" ? goal.v : goal.v })}>
                {GOAL_CAT[cat]}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className={`m-do${goal.done ? " on" : ""}`} onClick={onDone}>
          {goal.done ? "✓ Исполнено — вернуть" : `✓ Отметить исполненной${wishGoal && goal.p ? ` · спишется ${rub(goal.p)}` : ""}`}
        </button>
        <label className="fl">
          <span>Заметка</span>
          <textarea className="in" rows={3} placeholder="Зачем, с кем, какое ощущение" value={goal.note ?? ""} onChange={(event) => onChange({ note: event.target.value })} />
        </label>
      </div>
    </>
  );
}

export function GoalsFinanceMount() {
  const desk = useGoalsDesk();
  if (!desk.ready) return null;
  return (
    <div className="gls">
      <GoalsFinanceCard desk={desk} />
    </div>
  );
}

export function GoalsPageClient() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get("tab") === "wishes" ? "wishes" : "goals";
  const desk = useGoalsDesk();
  const tabs = useMemo(
    () => [
      { id: "goals", label: "Цели", href: "/v2/personal/goals" },
      { id: "wishes", label: "Глобальные желания", href: "/v2/personal/goals?tab=wishes" },
    ],
    []
  );

  return (
    <div className="flex min-h-full min-w-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-[var(--v2-ink-100)] bg-white px-3 sm:px-6">
        <div className="flex gap-1 py-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => router.replace(appPath(item.href))}
              className={`rounded-lg px-3 py-2.5 text-[14px] font-medium transition max-lg:flex-1 lg:py-1.5 lg:text-[13px] ${
                tab === item.id
                  ? "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]"
                  : "text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-900)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {tab === "wishes" ? (
        <PersonalWishesClient />
      ) : desk.ready ? (
        <GoalsSheet desk={desk} />
      ) : (
        <div className="flex min-h-[40vh] items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>
      )}
    </div>
  );
}
