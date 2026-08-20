import { describe, expect, it } from 'vitest';
import {
  ageBetween,
  comparePartialDates,
  formatPartialDate,
  isValidPartialDate,
  lifespanLabel,
  parsePartialDate,
  yearOf,
} from './dates';

describe('parsePartialDate', () => {
  it('accepts all three precisions', () => {
    expect(parsePartialDate('1931')).toMatchObject({ year: 1931, precision: 'year' });
    expect(parsePartialDate('1931-06')).toMatchObject({ year: 1931, month: 6, precision: 'month' });
    expect(parsePartialDate('1931-06-14')).toMatchObject({ day: 14, precision: 'day' });
  });

  it('rejects nonsense without throwing', () => {
    for (const value of ['', 'yesterday', '1931-13', '1931-06-32', '31-06-14', null, undefined]) {
      expect(parsePartialDate(value)).toBeNull();
    }
  });

  it('treats empty input as valid so optional fields stay optional', () => {
    expect(isValidPartialDate('')).toBe(true);
    expect(isValidPartialDate(undefined)).toBe(true);
    expect(isValidPartialDate('nope')).toBe(false);
  });
});

describe('formatPartialDate', () => {
  it('shows only what is known', () => {
    expect(formatPartialDate('1931-06-14')).toBe('14 June 1931');
    expect(formatPartialDate('1931-06')).toBe('June 1931');
    expect(formatPartialDate('1931')).toBe('1931');
    expect(formatPartialDate('1931-06-14', 'short')).toBe('14 Jun 1931');
    expect(formatPartialDate(null)).toBe('');
  });
});

describe('comparePartialDates', () => {
  it('sorts oldest first and pushes unknowns to the end', () => {
    const dates = ['1990', null, '1948-03', '1948-03-12', '1948'];
    expect(dates.slice().sort(comparePartialDates)).toEqual([
      '1948', '1948-03', '1948-03-12', '1990', null,
    ]);
  });
});

describe('ageBetween', () => {
  it('counts whole years', () => {
    expect(ageBetween('1931-06-14', '2004-06-13')).toBe(72);
    expect(ageBetween('1931-06-14', '2004-06-14')).toBe(73);
  });

  it('falls back to years when the month is unknown', () => {
    expect(ageBetween('1931', '2004')).toBe(73);
  });

  it('returns null rather than a wrong number', () => {
    expect(ageBetween(null, '2004')).toBeNull();
    expect(ageBetween('2004', '1931')).toBeNull();
  });
});

describe('lifespanLabel', () => {
  it('reads the way a headstone does', () => {
    expect(lifespanLabel({ birthDate: '1931', deathDate: '2004' })).toBe('1931 – 2004');
    expect(lifespanLabel({ birthDate: '1988', isLiving: true })).toBe('b. 1988');
    expect(lifespanLabel({ birthDate: '1931', isLiving: false })).toBe('1931 – ?');
    expect(lifespanLabel({ deathDate: '2004' })).toBe('d. 2004');
    expect(lifespanLabel({})).toBe('');
  });
});

describe('yearOf', () => {
  it('extracts the year or nothing', () => {
    expect(yearOf('1948-03-12')).toBe(1948);
    expect(yearOf('garbage')).toBeNull();
  });
});
