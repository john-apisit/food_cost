import { describe, expect, it } from 'vitest'
import {
  formatDateOnly,
  formatMonthYear,
  formatSaleDateRange,
  formatWeekdayDate,
  inclusiveDayCount,
  isDateInInclusiveRange,
  latestDateValue,
  monthCalendarDays,
  monthDateRange,
  normalizeDateRange,
  parseLocalDate,
  toDateInputValue,
} from './format'

describe('parseLocalDate', () => {
  it('parses YYYY-MM-DD as a local calendar date', () => {
    const date = parseLocalDate('2026-08-23')
    expect(date).not.toBeNull()
    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(7)
    expect(date?.getDate()).toBe(23)
  })

  it('returns null for invalid values', () => {
    expect(parseLocalDate('')).toBeNull()
    expect(parseLocalDate('next week')).toBeNull()
    expect(parseLocalDate('2026-08-23T12:00:00.000Z')).toBeNull()
  })
})

describe('toDateInputValue', () => {
  it('formats a Date as YYYY-MM-DD in local time', () => {
    expect(toDateInputValue(new Date(2026, 7, 20))).toBe('2026-08-20')
  })

  it('keeps a date-only string unchanged', () => {
    expect(toDateInputValue('2026-08-20')).toBe('2026-08-20')
  })
})

describe('inclusiveDayCount', () => {
  it('counts a single day as 1', () => {
    expect(inclusiveDayCount('2026-08-23', '2026-08-23')).toBe(1)
  })

  it('counts inclusive ranges', () => {
    expect(inclusiveDayCount('2026-08-24', '2026-08-26')).toBe(3)
  })

  it('falls back to 1 when the range is invalid', () => {
    expect(inclusiveDayCount('2026-08-26', '2026-08-24')).toBe(1)
    expect(inclusiveDayCount('', '2026-08-24')).toBe(1)
  })
})

describe('formatDateOnly', () => {
  it('formats a date with a Gregorian year and without shifting the calendar day', () => {
    const formatted = formatDateOnly('2026-08-23')
    expect(formatted).toBe('23 ส.ค. 2026')
  })
})

describe('formatWeekdayDate', () => {
  it('uses fixed Thai weekday abbreviations, not full weekday names', () => {
    expect(formatWeekdayDate('2026-08-23')).toBe('อา. 23 ส.ค. 2026')
    expect(formatWeekdayDate('2026-08-24')).toBe('จ. 24 ส.ค. 2026')
    expect(formatWeekdayDate('2026-08-25')).toBe('อ. 25 ส.ค. 2026')
    expect(formatWeekdayDate('2026-08-23')).not.toContain('อาทิตย์')
  })
})

describe('formatSaleDateRange', () => {
  it('formats a single day without repeating it', () => {
    expect(formatSaleDateRange('2026-08-24', '2026-08-24')).toBe('จ. 24 ส.ค. 2026')
  })

  it('formats an inclusive range', () => {
    expect(formatSaleDateRange('2026-08-24', '2026-08-26')).toBe('จ. 24 ส.ค. 2026–พ. 26 ส.ค. 2026')
  })
})

describe('formatMonthYear', () => {
  it('formats a Gregorian month and year in Thai', () => {
    expect(formatMonthYear(new Date(2026, 7, 1))).toBe('สิงหาคม 2026')
  })
})

describe('monthDateRange', () => {
  it('returns the first and last calendar day of the month', () => {
    expect(monthDateRange(new Date(2026, 7, 23))).toEqual({
      from: '2026-08-01',
      to: '2026-08-31',
    })
  })

  it('parses a date-only string without shifting the month', () => {
    expect(monthDateRange('2026-02-10')).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    })
  })
})

describe('latestDateValue', () => {
  it('returns the latest valid YYYY-MM-DD', () => {
    expect(latestDateValue(['2026-08-20', '2026-08-23', '2026-08-21'])).toBe('2026-08-23')
  })

  it('ignores invalid values', () => {
    expect(latestDateValue([undefined, '', '2026-08-10'])).toBe('2026-08-10')
    expect(latestDateValue([])).toBeNull()
  })
})

describe('isDateInInclusiveRange', () => {
  it('includes both ends of the range', () => {
    expect(isDateInInclusiveRange('2026-08-20', '2026-08-20', '2026-08-22')).toBe(true)
    expect(isDateInInclusiveRange('2026-08-22', '2026-08-20', '2026-08-22')).toBe(true)
    expect(isDateInInclusiveRange('2026-08-19', '2026-08-20', '2026-08-22')).toBe(false)
  })
})

describe('normalizeDateRange', () => {
  it('swaps inverted ranges', () => {
    expect(normalizeDateRange('2026-08-26', '2026-08-24')).toEqual({
      from: '2026-08-24',
      to: '2026-08-26',
    })
  })

  it('treats a single bound as a one-day range', () => {
    expect(normalizeDateRange('2026-08-24', '')).toEqual({
      from: '2026-08-24',
      to: '2026-08-24',
    })
  })
})

describe('monthCalendarDays', () => {
  it('pads August 2026 from Saturday through the following week', () => {
    const days = monthCalendarDays(new Date(2026, 7, 1))
    expect(days[0]).toEqual({ iso: '2026-07-26', inMonth: false })
    expect(days[6]).toEqual({ iso: '2026-08-01', inMonth: true })
    expect(days.at(-1)).toEqual({ iso: '2026-09-05', inMonth: false })
    expect(days).toHaveLength(42)
  })
})
