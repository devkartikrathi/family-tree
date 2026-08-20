/**
 * Genealogy runs on incomplete dates. "Grandma was born in 1931" is a fact worth
 * recording even when nobody remembers the month. Every date in this app is a
 * partial ISO string — "1931", "1931-06", or "1931-06-14" — and every function
 * here is written to survive all three.
 */

export type PartialDate = {
  year: number;
  month?: number; // 1-12
  day?: number; // 1-31
  precision: 'year' | 'month' | 'day';
};

const PARTIAL_DATE_RE = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/;

export function parsePartialDate(input?: string | null): PartialDate | null {
  if (!input) return null;
  const match = input.trim().match(PARTIAL_DATE_RE);
  if (!match) return null;

  const year = Number(match[1]);
  if (year < 1 || year > 3000) return null;

  const month = match[2] ? Number(match[2]) : undefined;
  if (month !== undefined && (month < 1 || month > 12)) return null;

  const day = match[3] ? Number(match[3]) : undefined;
  if (day !== undefined && (day < 1 || day > 31)) return null;

  return {
    year,
    month,
    day,
    precision: day !== undefined ? 'day' : month !== undefined ? 'month' : 'year',
  };
}

export function isValidPartialDate(input?: string | null): boolean {
  return input === undefined || input === null || input === '' || parsePartialDate(input) !== null;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "14 June 1931" · "June 1931" · "1931" */
export function formatPartialDate(input?: string | null, style: 'long' | 'short' = 'long'): string {
  const date = parsePartialDate(input);
  if (!date) return '';

  const month = date.month ? MONTHS[date.month - 1] : undefined;
  const monthLabel = style === 'short' ? month?.slice(0, 3) : month;

  if (date.day && monthLabel) return `${date.day} ${monthLabel} ${date.year}`;
  if (monthLabel) return `${monthLabel} ${date.year}`;
  return String(date.year);
}

export function yearOf(input?: string | null): number | null {
  return parsePartialDate(input)?.year ?? null;
}

/** Sorts oldest first. Unknown dates sort last. */
export function comparePartialDates(a?: string | null, b?: string | null): number {
  const left = parsePartialDate(a);
  const right = parsePartialDate(b);
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return (
    left.year - right.year ||
    (left.month ?? 0) - (right.month ?? 0) ||
    (left.day ?? 0) - (right.day ?? 0)
  );
}

/** Midpoint of the imprecision window — good enough for timelines and maps. */
export function toApproximateTime(input?: string | null): number | null {
  const date = parsePartialDate(input);
  if (!date) return null;
  return Date.UTC(date.year, (date.month ?? 7) - 1, date.day ?? 1);
}

export function ageBetween(birth?: string | null, end?: string | null): number | null {
  const from = parsePartialDate(birth);
  if (!from) return null;

  const to = parsePartialDate(end);
  const toYear = to?.year ?? new Date().getUTCFullYear();
  const toMonth = to?.month ?? new Date().getUTCMonth() + 1;
  const toDay = to?.day ?? new Date().getUTCDate();

  let age = toYear - from.year;
  if (from.month !== undefined) {
    const beforeBirthday =
      toMonth < from.month || (toMonth === from.month && from.day !== undefined && toDay < from.day);
    if (beforeBirthday) age -= 1;
  }
  return age >= 0 && age < 130 ? age : null;
}

/** "1931 – 2004" · "b. 1988" · "d. 2004" · "" */
export function lifespanLabel(person: {
  birthDate?: string | null;
  deathDate?: string | null;
  isLiving?: boolean;
}): string {
  const birth = yearOf(person.birthDate);
  const death = yearOf(person.deathDate);

  if (birth && death) return `${birth} – ${death}`;
  if (birth && person.isLiving === false) return `${birth} – ?`;
  if (birth) return `b. ${birth}`;
  if (death) return `d. ${death}`;
  return '';
}

/** Today, as a partial date — the max for a date input. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Nearest upcoming anniversary of a month/day date, or null. */
export function daysUntilAnniversary(input?: string | null): number | null {
  const date = parsePartialDate(input);
  if (!date?.month || !date.day) return null;

  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  let next = Date.UTC(now.getUTCFullYear(), date.month - 1, date.day);
  if (next < today) next = Date.UTC(now.getUTCFullYear() + 1, date.month - 1, date.day);

  return Math.round((next - today) / 86_400_000);
}

export function formatRelativeTime(value: Date | string): string {
  const time = typeof value === 'string' ? new Date(value).getTime() : value.getTime();
  const seconds = Math.round((Date.now() - time) / 1000);

  if (seconds < 45) return 'just now';
  if (seconds < 90) return 'a minute ago';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;

  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;

  return `${Math.round(months / 12)} year${Math.round(months / 12) === 1 ? '' : 's'} ago`;
}
