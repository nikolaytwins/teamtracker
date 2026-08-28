export function weekFocusToYmd(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function weekFocusMondayOf(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function weekFocusAddDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function weekFocusOffsetLabel(offset: number) {
  if (offset === 0) return "эта неделя";
  if (offset === 1) return "следующая";
  if (offset === -1) return "прошлая";
  if (offset > 0) return `+${offset} недели`;
  return `${offset} недели`;
}

export function weekFocusHeading(offset: number, label: string) {
  if (offset === 0) return "Эта неделя";
  if (offset === 1) return "Следующая неделя";
  if (offset === -1) return "Прошлая неделя";
  return label;
}
