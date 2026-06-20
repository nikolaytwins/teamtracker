export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function endOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function localDayBoundsFromYmd(dateYmd: string): { start: Date; end: Date } {
  const [y, m, d] = dateYmd.split("-").map((x) => parseInt(x, 10));
  const day = new Date(y, m - 1, d);
  return { start: startOfLocalDay(day), end: endOfLocalDay(day) };
}

export function overlapSeconds(
  startedAt: string,
  endedAt: string | null,
  windowStart: Date,
  windowEnd: Date,
  now: Date = new Date()
): number {
  const start = new Date(startedAt).getTime();
  const end = (endedAt ? new Date(endedAt) : now).getTime();
  const from = Math.max(start, windowStart.getTime());
  const to = Math.min(end, windowEnd.getTime());
  if (to <= from) return 0;
  return Math.floor((to - from) / 1000);
}

export type SessionTimeSlice = {
  started_at: string;
  ended_at: string | null;
  duration_seconds?: number | null;
};

/** Эффективная длительность сессии (учитывает активный таймер). */
export function effectiveSessionSeconds(session: SessionTimeSlice, now: Date = new Date()): number {
  if (session.duration_seconds != null) return session.duration_seconds;
  if (session.ended_at) {
    return Math.max(
      0,
      Math.floor((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000)
    );
  }
  return Math.max(0, Math.floor((now.getTime() - new Date(session.started_at).getTime()) / 1000));
}

export function sessionSecondsInRange(
  session: SessionTimeSlice,
  rangeStart: Date,
  rangeEnd: Date,
  now: Date = new Date()
): number {
  return overlapSeconds(session.started_at, session.ended_at, rangeStart, rangeEnd, now);
}
