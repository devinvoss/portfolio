import { TimeAgoPipe } from './time-ago.pipe';

describe('TimeAgoPipe', () => {
  const pipe = new TimeAgoPipe();
  const now = new Date('2026-10-26T12:00:00Z');
  const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000).toISOString();

  it('says just now for the last minute', () => {
    expect(pipe.transform(ago(30), now)).toBe('just now');
  });

  it('uses the largest whole unit', () => {
    expect(pipe.transform(ago(5 * 60), now)).toBe('5 minutes ago');
    expect(pipe.transform(ago(3 * 60 * 60), now)).toBe('3 hours ago');
    expect(pipe.transform(ago(24 * 60 * 60), now)).toBe('yesterday');
    expect(pipe.transform(ago(800 * 24 * 60 * 60), now)).toBe('2 years ago');
  });
});
