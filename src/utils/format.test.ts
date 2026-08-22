import { describe, expect, it } from 'vitest'
import { formatDateOnly, inclusiveDayCount, parseLocalDate } from './format'

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
  it('formats a date without shifting the calendar day', () => {
    const formatted = formatDateOnly('2026-08-23')
    expect(formatted).toContain('23')
    expect(formatted).toMatch(/ส\.ค\.|8/)
  })
})
