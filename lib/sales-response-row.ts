/** Подсветка строк таблицы откликов Profi/Threads — светлая и тёмная тема */
export function salesResponseRowClass(status: string): string {
  const base = "border-b border-[var(--border)] border-l-4 transition-colors";
  switch (status) {
    case "response":
      return `${base} border-l-amber-400 bg-amber-50 hover:bg-amber-100/80 dark:border-l-amber-400 dark:bg-amber-500/[0.12] dark:hover:bg-amber-500/[0.18]`;
    case "viewed":
      return `${base} border-l-emerald-400 bg-emerald-50 hover:bg-emerald-100/80 dark:border-l-emerald-400 dark:bg-emerald-500/[0.12] dark:hover:bg-emerald-500/[0.18]`;
    case "conversation":
      return `${base} border-l-emerald-500 bg-emerald-100 hover:bg-emerald-200/80 dark:border-l-emerald-400 dark:bg-emerald-500/[0.16] dark:hover:bg-emerald-500/[0.22]`;
    case "proposal":
      return `${base} border-l-sky-400 bg-sky-50 hover:bg-sky-100/80 dark:border-l-sky-400 dark:bg-sky-500/[0.14] dark:hover:bg-sky-500/[0.2]`;
    case "paid":
      return `${base} border-l-emerald-400 bg-emerald-50 hover:bg-emerald-100/80 dark:border-l-emerald-400 dark:bg-emerald-500/[0.14] dark:hover:bg-emerald-500/[0.2]`;
    default:
      return "border-b border-[var(--border)] border-l-4 border-l-transparent transition-colors hover:bg-[var(--surface-2)]/50 dark:hover:bg-[var(--surface-2)]/90";
  }
}
