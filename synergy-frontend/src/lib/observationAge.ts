/** Age at publication, not at the time a historical share is opened. */
export function observationAge(end: string | undefined, publishedAt: string): number | null {
  if (!end || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return null;
  const observed = Date.parse(`${end}T00:00:00Z`);
  const published = Date.parse(publishedAt);
  if (!Number.isFinite(observed) || !Number.isFinite(published)) return null;
  if (new Date(observed).toISOString().slice(0,10) !== end) return null;
  const days = Math.floor(published / 86400000) - Math.floor(observed / 86400000);
  return days < 0 ? null : days;
}
