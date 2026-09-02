"use client";

type DispatchPagePlaceholderProps = {
  title: string;
  description: string;
  apiHint?: string;
};

export function DispatchPagePlaceholder({
  title,
  description,
  apiHint,
}: DispatchPagePlaceholderProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-6 py-8">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-[var(--v2-ink-100)] bg-white p-8 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--v2-brand-600)]">
          Sofia dispatch
        </p>
        <h1 className="mt-2 text-[22px] font-semibold text-[var(--v2-ink-900)]">{title}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--v2-ink-600)]">{description}</p>
        <p className="mt-4 rounded-xl bg-[var(--v2-ink-50)] px-4 py-3 text-[13px] text-[var(--v2-ink-700)]">
          Инфраструктура подключена: доменный слой, API и миграция 070. Визуальный интерфейс появится
          после макета — существующие страницы «Агентство» и канбан не затронуты.
        </p>
        {apiHint ? (
          <p className="mt-3 font-mono text-[12px] text-[var(--v2-ink-500)]">{apiHint}</p>
        ) : null}
      </div>
    </div>
  );
}
