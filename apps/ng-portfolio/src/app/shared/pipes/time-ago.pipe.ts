import { Pipe, PipeTransform } from '@angular/core';

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60]
];

const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "5 minutes ago", "yesterday", "2 years ago". Pure, so it updates when the value changes, not as time passes. */
@Pipe({
  name: 'timeAgo'
})
export class TimeAgoPipe implements PipeTransform {

  transform(value: string | Date, now: Date = new Date()): string {
    const seconds = Math.round((new Date(value).getTime() - now.getTime()) / 1000);
    for (const [unit, size] of UNITS) {
      if (Math.abs(seconds) >= size) {
        return format.format(Math.trunc(seconds / size), unit);
      }
    }
    return 'just now';
  }

}
