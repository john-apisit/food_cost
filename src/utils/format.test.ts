import { describe, expect, it } from 'vitest'
import {
  formatDateOnly,
  formatSaleDateRange,
  formatWeekdayDate,
  inclusiveDayCount,
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
