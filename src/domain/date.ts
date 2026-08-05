export function todayISO() {
  return toISODate(new Date());
}

export function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISODate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function formatDisplayDate(value: string, options?: Intl.DateTimeFormatOptions) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    ...options,
  }).format(parseISODate(value));
}

export function formatFullDate(value: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(parseISODate(value));
}

export function getWeekStart(date = new Date()) {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = normalized.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  normalized.setDate(normalized.getDate() + diff);
  return normalized;
}

export function getWeekEnd(date = new Date()) {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

export function isBetweenISO(value: string, startISO: string, endISO: string) {
  return value >= startISO && value <= endISO;
}

export function daysAgoISO(days: number, from = new Date()) {
  const date = new Date(from);
  date.setDate(date.getDate() - days);
  return toISODate(date);
}

export function minutesToPace(distanceKm: number, durationMinutes: number) {
  if (!distanceKm || !durationMinutes) return '';
  const pace = durationMinutes / distanceKm;
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}/km`;
}

export function paceToSeconds(pace: string) {
  const clean = pace.replace('/km', '').trim();
  const [minutes, seconds] = clean.split(':').map(Number);
  if (!Number.isFinite(minutes)) return Number.POSITIVE_INFINITY;
  return minutes * 60 + (Number.isFinite(seconds) ? seconds : 0);
}
