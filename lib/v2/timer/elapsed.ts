export function elapsedSecondsSinceStartedAt(startedAt: string, nowMs = Date.now()): number {
  const startedMs = new Date(startedAt).getTime();
  if (Number.isNaN(startedMs)) return 0;
  return Math.max(0, Math.floor((nowMs - startedMs) / 1000));
}
