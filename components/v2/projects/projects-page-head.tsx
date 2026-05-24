import { currentMonthLabelPrep } from "@/lib/v2/projects/portfolio-utils";
import type { PortfolioProject } from "@/lib/v2/projects/portfolio-types";
import { isFinishedKanbanStatus } from "@/lib/v2/projects/portfolio-types";
import { pluralRu } from "@/lib/v2/projects/portfolio-utils";

export function ProjectsPageHead({
  activeCount,
  doneThisMonth,
  projects,
}: {
  activeCount: number;
  doneThisMonth: number;
  projects: PortfolioProject[];
}) {
  const date = new Date();
  const days = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
  const months = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
  ];
  const dateLabel = `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;

  const critical = projects.filter((p) => p.health === "critical" && !isFinishedKanbanStatus(p.status));
  const atRisk = projects.filter((p) => p.health === "at_risk" && !isFinishedKanbanStatus(p.status));
  let insight = "";
  if (critical.length > 0) {
    insight = `${critical.length === 1 ? "Один проект горит" : `${critical.length} проекта горят`} — ${critical[0]!.name}.`;
  } else if (atRisk.length > 0) {
    insight = `${atRisk.length} ${pluralRu(atRisk.length, ["проект", "проекта", "проектов"])} под пристальным вниманием.`;
  } else if (activeCount > 0) {
    insight = "Все активные проекты в графике.";
  } else {
    insight = "Создайте первый проект студии.";
  }

  return (
    <div className="mb-6 flex items-end justify-between gap-6">
      <div>
        <div className="v2-tight text-[12.5px] font-medium text-[var(--v2-ink-500)]">{dateLabel}</div>
        <h1 className="v2-tighter mt-1 text-[40px] font-semibold leading-[1.05] text-[var(--v2-ink-900)]">
          Проекты студии
        </h1>
        <p className="v2-tight mt-2 max-w-[62ch] text-[14.5px] text-[var(--v2-ink-500)]">
          <span className="font-medium text-[var(--v2-ink-800)]">{activeCount} активных</span>, {doneThisMonth} сданы в{" "}
          {currentMonthLabelPrep()}. {insight}
        </p>
      </div>
    </div>
  );
}
