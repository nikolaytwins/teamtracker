/** Автоматическая дата следующего касания по статусу лида (как в API лидов). */
export function calculateNextContactDateForLead(status: string): Date | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (status) {
    case "new": {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
    case "contact_established":
    case "commercial_proposal":
      return today;
    case "thinking": {
      const thinkingDate = new Date(today);
      thinkingDate.setDate(thinkingDate.getDate() + 1);
      return thinkingDate;
    }
    case "paid":
    case "pause":
    case "lost":
      return null;
    default:
      return null;
  }
}
