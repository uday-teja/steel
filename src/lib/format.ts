const TZ = 'Asia/Kolkata';

export function formatDateLong(dateOrIso: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(dateOrIso) ? new Date(`${dateOrIso}T12:00:00+05:30`) : new Date(dateOrIso);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
}

export function formatDateShort(dateOrIso: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(dateOrIso) ? new Date(`${dateOrIso}T12:00:00+05:30`) : new Date(dateOrIso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
}

export function formatDayMonth(dateOrIso: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(dateOrIso) ? new Date(`${dateOrIso}T12:00:00+05:30`) : new Date(dateOrIso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: TZ });
}

export function formatTime(iso: string): string {
  return `${new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ })} IST`;
}

export function formatDateTime(iso: string): string {
  return `${formatDateShort(iso)}, ${formatTime(iso)}`;
}

/** Relative time; only call from effects/client-only UI (not during pre-render). */
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export function formatNumber(n: number, digits = 0): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
