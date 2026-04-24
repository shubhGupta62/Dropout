const LIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

function toDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getDropStatus(drop, now = new Date()) {
  const dropDate = toDate(drop?.dropTime);
  if (!dropDate) return 'unknown';

  const timeUntilDrop = dropDate.getTime() - now.getTime();
  if (timeUntilDrop > 0) return 'upcoming';
  if (Math.abs(timeUntilDrop) < LIVE_WINDOW_MS) return 'live';
  return 'ended';
}

export function filterDropsByTab(drops, tab, now = new Date()) {
  if (tab === 'all') return drops;
  return drops.filter((drop) => getDropStatus(drop, now) === tab);
}

export function isDropLive(drop, now = new Date()) {
  return getDropStatus(drop, now) === 'live';
}
