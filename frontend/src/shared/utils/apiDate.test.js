import {
  parseApiDate,
  isPastApiDate,
  apiDateValue,
  toSiteDateTimeInput,
  siteDateTimeInputToApi,
} from './apiDate';

describe('parseApiDate', () => {
  test('treats offset-less API timestamps as UTC', () => {
    expect(parseApiDate('2026-11-20T15:00:00').toISOString()).toBe('2026-11-20T15:00:00.000Z');
  });

  test('keeps explicit offsets and Z', () => {
    expect(parseApiDate('2026-11-20T18:00:00+03:00').toISOString()).toBe('2026-11-20T15:00:00.000Z');
    expect(parseApiDate('2026-11-20T15:00:00Z').toISOString()).toBe('2026-11-20T15:00:00.000Z');
  });

  test('accepts microseconds and space separator', () => {
    expect(parseApiDate('2026-11-20 15:00:00.123456').toISOString()).toBe('2026-11-20T15:00:00.123Z');
  });

  test('returns null for empty or invalid input', () => {
    expect(parseApiDate(null)).toBeNull();
    expect(parseApiDate('')).toBeNull();
    expect(parseApiDate('not a date')).toBeNull();
  });
});

describe('isPastApiDate / apiDateValue', () => {
  const now = new Date('2026-11-20T16:00:00Z');

  test('compares in UTC', () => {
    expect(isPastApiDate('2026-11-20T15:00:00', now)).toBe(true);
    expect(isPastApiDate('2026-11-20T17:00:00', now)).toBe(false);
    expect(isPastApiDate(null, now)).toBe(false);
  });

  test('unreadable dates sort last', () => {
    expect(apiDateValue('bad')).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('datetime-local round trip', () => {
  test('shows Istanbul wall time for a UTC API value', () => {
    expect(toSiteDateTimeInput('2026-11-20T15:00:00')).toBe('2026-11-20T18:00');
  });

  test('edit then save keeps the same instant', () => {
    const api = '2026-11-20T15:00:00';
    const sent = siteDateTimeInputToApi(toSiteDateTimeInput(api));
    expect(sent).toBe('2026-11-20T18:00:00+03:00');
    expect(new Date(sent).toISOString()).toBe('2026-11-20T15:00:00.000Z');
  });

  test('empty input maps to null', () => {
    expect(toSiteDateTimeInput(null)).toBe('');
    expect(siteDateTimeInputToApi('')).toBeNull();
  });
});
