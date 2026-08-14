"use client";

import { S2Provider, useS2 } from "@/components/v2/personal/s2/s2-context";
import { S2Btn, S2Field, S2Overlay, s2Area, s2Input } from "@/components/v2/personal/s2/s2-ui";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { appPath } from "@/lib/api-url";
import {
  S2_SIGNAL_TYPE,
  type S2BacklogItem,
  type S2Bet,
  type S2Decision,
  type S2Evidence,
  type S2Rule,
  type S2SignalType,
} from "@/lib/v2/s2/types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

const TABS = [
  { href: "/v2/personal/strategy2", label: "Обзор", exact: true },
  { href: "/v2/personal/strategy2/goals", label: "Цели" },
  { href: "/v2/personal/strategy2/system", label: "Система" },
  { href: "/v2/personal/strategy2/sprint", label: "Спринт" },
  { href: "/v2/personal/strategy2/rules", label: "Правила" },
  { href: "/v2/personal/strategy2/decisions", label: "Решения" },
  { href: "/v2/personal/strategy2/backlog", label: "Backlog" },
  { href: "/v2/personal/strategy2/data", label: "Данные" },
  { href: "/v2/personal/strategy2/review", label: "Review" },
] as const;

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const { board, mutate, error } = useS2();
  const [search, setSearch] = useState("");
  const [signalOpen, setSignalOpen] = useState(false);
  const [stuckOpen, setStuckOpen] = useState(false);

  const hits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !board) return null;
    const rules = board.rules.filter((r) => `${r.trigger} ${r.instruction} ${r.old_pattern}`.toLowerCase().includes(q));
    const decisions = board.decisions.filter((d) => `${d.question} ${d.position}`.toLowerCase().includes(q));
    const bets = board.bets.filter((b) => `${b.title} ${b.hypothesis}`.toLowerCase().includes(q));
    const backlog = board.backlog.filter((b) => `${b.title} ${b.why_interesting}`.toLowerCase().includes(q));
    const evidence = board.evidence.filter((e) => `${e.fact} ${e.interpretation}`.toLowerCase().includes(q));
    return { rules, decisions, bets, backlog, evidence };
  }, [board, search]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-[var(--v2-ink-100)] bg-white">
        <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 lg:px-6">
          {TABS.map((tab) => {
            const href = appPath(tab.href);
            const active =
              "exact" in tab && tab.exact
                ? pathname === href
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={tab.href}
                href={href}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
                  active
                    ? "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]"
                    : "text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-900)]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
          <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Правила, решения, ставки…"
              className="v2-input h-8 w-[200px] text-[12.5px] sm:w-[240px]"
            />
            <S2Btn onClick={() => setStuckOpen(true)}>Я застрял</S2Btn>
            <S2Btn kind="solid" onClick={() => setSignalOpen(true)}>
              + Signal
            </S2Btn>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      ) : null}

      {hits ? (
        <div className="border-b border-[var(--v2-ink-100)] bg-[var(--v2-ink-50)]/80 px-6 py-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
            Поиск
          </p>
          <SearchHits hits={hits} onClose={() => setSearch("")} />
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto">{children}</div>

      {signalOpen ? (
        <SignalForm
          onClose={() => setSignalOpen(false)}
          onSave={async (payload) => {
            await mutate({ entity: "signal", action: "create", data: payload });
            setSignalOpen(false);
          }}
        />
      ) : null}
      {stuckOpen && board ? (
        <StuckWizard
          rules={board.rules}
          decisions={board.decisions}
          onClose={() => setStuckOpen(false)}
          onBacklog={async (title) => {
            await mutate({
              entity: "backlog",
              action: "create",
              data: { title, category: "question", why_interesting: "Из «Я застрял»" },
            });
            setStuckOpen(false);
          }}
          onTask={async (title) => {
            await fetchJson("/api/v2/personal/todos", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title }),
            });
            setStuckOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function SearchHits({
  hits,
  onClose,
}: {
  hits: {
    rules: S2Rule[];
    decisions: S2Decision[];
    bets: S2Bet[];
    backlog: S2BacklogItem[];
    evidence: S2Evidence[];
  };
  onClose: () => void;
}) {
  const groups = [
    { label: "Правила", items: hits.rules.map((r) => r.trigger) },
    { label: "Решения", items: hits.decisions.map((d) => d.question) },
    { label: "Ставки", items: hits.bets.map((b) => b.title) },
    { label: "Backlog", items: hits.backlog.map((b) => b.title) },
    { label: "Данные", items: hits.evidence.map((e) => e.fact) },
  ].filter((g) => g.items.length);
  if (!groups.length) {
    return <p className="text-[13px] text-[var(--v2-ink-500)]">Ничего не нашлось</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="text-[11px] font-semibold text-[var(--v2-ink-400)]">{g.label}</p>
          <ul className="mt-1 space-y-1">
            {g.items.slice(0, 4).map((t) => (
              <li key={t} className="v2-tight text-[13px] text-[var(--v2-ink-800)]">
                {t}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <button type="button" className="text-[12px] font-semibold text-[var(--v2-brand-600)]" onClick={onClose}>
        Сбросить
      </button>
    </div>
  );
}

function SignalForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (payload: { type: S2SignalType; text: string }) => Promise<void>;
}) {
  const [type, setType] = useState<S2SignalType>("returns");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <S2Overlay title="+ Signal" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim() || saving) return;
          setSaving(true);
          try {
            await onSave({ type, text: text.trim() });
          } finally {
            setSaving(false);
          }
        }}
      >
        <S2Field label="Тип">
          <select className={s2Input} value={type} onChange={(e) => setType(e.target.value as S2SignalType)}>
            {(Object.keys(S2_SIGNAL_TYPE) as S2SignalType[]).map((k) => (
              <option key={k} value={k}>
                {S2_SIGNAL_TYPE[k]}
              </option>
            ))}
          </select>
        </S2Field>
        <S2Field label="Что произошло">
          <textarea className={s2Area} autoFocus value={text} onChange={(e) => setText(e.target.value)} />
        </S2Field>
        <div className="flex justify-end gap-2">
          <S2Btn onClick={onClose}>Отмена</S2Btn>
          <S2Btn kind="solid" type="submit" disabled={saving || !text.trim()}>
            Записать
          </S2Btn>
        </div>
      </form>
    </S2Overlay>
  );
}

function StuckWizard({
  rules,
  decisions,
  onClose,
  onBacklog,
  onTask,
}: {
  rules: S2Rule[];
  decisions: S2Decision[];
  onClose: () => void;
  onBacklog: (title: string) => Promise<void>;
  onTask: (title: string) => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const deferred = decisions.find((d) => d.status === "deferred");
  const questions = [
    "Это факт или мой прогноз?",
    "Мне не хватает действия или данных?",
    "Я сейчас пытаюсь компенсировать проблему собой?",
    "Какое минимальное действие даст максимум новой информации?",
  ];
  return (
    <S2Overlay title="Я застрял" onClose={onClose}>
      {step < questions.length ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-ink-400)]">
            Шаг {step + 1} / {questions.length}
          </p>
          <p className="v2-tight mt-2 text-[18px] font-bold text-[var(--v2-ink-900)]">{questions[step]}</p>
          {step === 0 && deferred ? (
            <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-[13px] leading-relaxed text-amber-950">
              Активное решение: «{deferred.question}» — {deferred.position}
            </p>
          ) : null}
          {step === 2 ? (
            <p className="mt-3 text-[13px] text-[var(--v2-ink-600)]">
              Правило: {rules.find((r) => r.trigger.includes("capacity"))?.instruction ?? "Сначала меняй систему."}
            </p>
          ) : null}
          <div className="mt-5 flex justify-end gap-2">
            <S2Btn onClick={onClose}>Закрыть</S2Btn>
            <S2Btn kind="solid" onClick={() => setStep((s) => s + 1)}>
              Дальше
            </S2Btn>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="v2-tight text-[15px] font-semibold text-[var(--v2-ink-900)]">Что сделать сейчас</p>
          <S2Btn kind="solid" onClick={() => void onBacklog("Вопрос из «Я застрял»")}>
            Добавить в Backlog
          </S2Btn>
          <S2Btn onClick={() => void onTask("Минимальное действие из стратегии")}>Создать задачу</S2Btn>
          <S2Btn onClick={onClose}>Ничего не делать сейчас</S2Btn>
        </div>
      )}
    </S2Overlay>
  );
}

export function S2Shell({ children }: { children: React.ReactNode }) {
  return (
    <S2Provider>
      <ShellInner>{children}</ShellInner>
    </S2Provider>
  );
}
