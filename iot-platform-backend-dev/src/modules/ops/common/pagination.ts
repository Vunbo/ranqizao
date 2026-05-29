export function normalizePage(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export function normalizePageSize(value: unknown, fallback: number, max = 100) {
  return Math.min(normalizePage(value, fallback), max);
}
