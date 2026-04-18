/** Источник Profi.ru — без автоматического напоминания при создании лида. */
export function isProfiRuLeadSource(source: string): boolean {
  return String(source ?? "")
    .toLowerCase()
    .includes("profi");
}

/** Локальный полдень выбранного календарного дня — как в модалке (T12:00:00), без сдвига даты из‑за UTC. */
function atLocalNoon(dayStart: Date): Date {
  const d = new Date(dayStart);
  d.setHours(12, 0, 0, 0);
  return d;
}

/** Автоматическая дата следующего касания по статусу лида (как в API лидов). */
export function calculateNextContactDateForLead(status: string): Date | null {
  const day = new Date();
  day.setHours(0, 0, 0, 0);

  switch (status) {
    case "new": {
      const tomorrow = new Date(day);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return atLocalNoon(tomorrow);
    }
    case "contact_established":
    case "commercial_proposal":
      return atLocalNoon(day);
    case "thinking": {
      const thinkingDate = new Date(day);
      thinkingDate.setDate(thinkingDate.getDate() + 1);
      return atLocalNoon(thinkingDate);
    }
    case "paid":
    case "pause":
    case "lost":
      return null;
    default:
      return null;
  }
}
