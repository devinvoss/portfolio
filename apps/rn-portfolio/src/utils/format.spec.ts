import { mediumDate, minutes, timeAgo } from './format';

describe('minutes', () => {
  it.each([
    [45, '45m'],
    [60, '1h 0m'],
    [135, '2h 15m']
  ])('%p -> %p', (value, expected) => {
    expect(minutes(value)).toBe(expected);
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-11-19T12:00:00Z');
  const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);

  it.each([
    [10, 'just now'],
    [60, '1 minute ago'],
    [5 * 60, '5 minutes ago'],
    [2 * 60 * 60, '2 hours ago'],
    [24 * 60 * 60, 'yesterday'],
    [3 * 24 * 60 * 60, '3 days ago'],
    [7 * 24 * 60 * 60, 'last week'],
    [2 * 365 * 24 * 60 * 60, '2 years ago']
  ])('%p seconds ago -> %p', (seconds, expected) => {
    expect(timeAgo(ago(seconds), now)).toBe(expected);
  });
});

describe('mediumDate', () => {
  it('formats like Angular', () => {
    expect(mediumDate(new Date(2026, 10, 19))).toBe('Nov 19, 2026');
  });
});
