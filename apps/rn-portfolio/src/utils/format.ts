// ng-portfolio's minutes and timeAgo pipes, and the date pipe formats it uses.

/** 135 -> "2h 15m" */
export function minutes(value: number): string {
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  return `${hours > 0 ? `${hours}h ` : ''}${mins}m`;
}

type Unit = 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute';

const UNITS: [Unit, number][] = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60]
];

// Hermes may not have Intl.RelativeTimeFormat, so this spells out what it would say in English with numeric: 'auto'.
function relative(amount: number, unit: Unit): string {
  if (typeof Intl !== 'undefined' && 'RelativeTimeFormat' in Intl) {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(amount, unit);
  }
  if (amount === -1 && unit === 'day') return 'yesterday';
  if (amount === 1 && unit === 'day') return 'tomorrow';
  if (amount === -1 && unit !== 'hour' && unit !== 'minute') return `last ${unit}`;
  if (amount === 1 && unit !== 'hour' && unit !== 'minute') return `next ${unit}`;
  const count = Math.abs(amount);
  const label = `${count} ${unit}${count === 1 ? '' : 's'}`;
  return amount < 0 ? `${label} ago` : `in ${label}`;
}

/** "5 minutes ago", "yesterday", "2 years ago" */
export function timeAgo(value: string | Date, now: Date = new Date()): string {
  const seconds = Math.round((new Date(value).getTime() - now.getTime()) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      return relative(Math.trunc(seconds / size), unit);
    }
  }
  return 'just now';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Angular's 'mediumDate': "Nov 19, 2026" */
export function mediumDate(value: string | Date): string {
  const date = new Date(value);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
