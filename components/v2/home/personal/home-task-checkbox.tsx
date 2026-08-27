/** Стандартный квадратный чекбокс для плашек задач на главной. */
export function HomeTaskCheckbox({ done, tone = "default" }: { done: boolean; tone?: "default" | "on-blue" }) {
  const onBlue = tone === "on-blue" || done;
  return (
    <span
      className={`inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] border-2 transition ${
        done
          ? onBlue
            ? "border-white bg-white"
            : "border-[var(--v2-brand-600)] bg-[var(--v2-brand-600)]"
          : "border-[var(--v2-ink-300)] bg-white"
      }`}
      aria-hidden
    >
      {done ? (
        <svg viewBox="0 0 12 10" className={`h-2.5 w-2.5 ${onBlue ? "text-[#2d5eef]" : "text-white"}`} fill="none">
          <path
            d="M1 5.2 4.2 8.4 11 1.6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  );
}
