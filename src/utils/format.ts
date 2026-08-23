import { MENU_STATUS_LABELS, type MenuStatus } from '@/types/models'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(amount)
}

export function formatNumber(amount: number, digits = 2): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(amount)
}

export function parseLocalDate(value: string): Date | null {
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

export function toDateInputValue(value: Date | string = new Date()): string {
  const date =
    typeof value === 'string' ? (parseLocalDate(value) ?? new Date(value)) : value
  if (Number.isNaN(date.getTime())) return toDateInputValue()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatDateOnly(value: string): string {
  const date = parseLocalDate(value)
  if (!date) return value
  return new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const THAI_WEEKDAY_ABBR = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'] as const

export function formatWeekdayDate(value: string): string {
  const date = parseLocalDate(value)
  if (!date) return value
  const weekday = THAI_WEEKDAY_ABBR[date.getDay()]
  return `${weekday} ${formatDateOnly(value)}`
}

export function formatSaleDateRange(start?: string, end?: string): string {
  if (start && end) {
    return start === end
      ? formatWeekdayDate(start)
      : `${formatWeekdayDate(start)}–${formatWeekdayDate(end)}`
  }
  if (start) return formatWeekdayDate(start)
  if (end) return formatWeekdayDate(end)
  return ''
}

export function inclusiveDayCount(start: string, end: string): number {
  const from = parseLocalDate(start)
  const to = parseLocalDate(end)
  if (!from || !to) return 1
  const diff = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1
  return Math.max(1, diff)
}

export function formatMonthYear(value: Date | string): string {
  const date = typeof value === 'string' ? parseLocalDate(value) : value
  if (!date || Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function addMonthsToDate(value: Date, amount: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1)
}

export function monthDateRange(value: Date | string = new Date()): { from: string; to: string } {
  const date = typeof value === 'string' ? parseLocalDate(value) : value
  const safe = date && !Number.isNaN(date.getTime()) ? date : new Date()
  return {
    from: toDateInputValue(new Date(safe.getFullYear(), safe.getMonth(), 1)),
    to: toDateInputValue(new Date(safe.getFullYear(), safe.getMonth() + 1, 0)),
  }
}

export function latestDateValue(dates: Array<string | undefined>): string | null {
  const valid = dates.filter((value): value is string => Boolean(parseLocalDate(value ?? '')))
  if (!valid.length) return null
  return valid.reduce((latest, value) => (value > latest ? value : latest))
}

export function isDateInInclusiveRange(value: string, from?: string, to?: string): boolean {
  if (!parseLocalDate(value)) return false
  if (from && value < from) return false
  if (to && value > to) return false
  return true
}

export function normalizeDateRange(from?: string, to?: string): { from: string; to: string } | null {
  const start = from && parseLocalDate(from) ? from : null
  const end = to && parseLocalDate(to) ? to : null
  if (!start && !end) return null
  if (start && end) return start <= end ? { from: start, to: end } : { from: end, to: start }
  const only = start ?? end
  return only ? { from: only, to: only } : null
}

export type CalendarDay = {
  iso: string
  inMonth: boolean
}

export function monthCalendarDays(month: Date): CalendarDay[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: CalendarDay[] = []

  for (let offset = first.getDay(); offset > 0; offset--) {
    const date = new Date(month.getFullYear(), month.getMonth(), 1 - offset)
    cells.push({ iso: toDateInputValue(date), inMonth: false })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      iso: toDateInputValue(new Date(month.getFullYear(), month.getMonth(), day)),
      inMonth: true,
    })
  }

  while (cells.length % 7 !== 0) {
    const last = parseLocalDate(cells[cells.length - 1].iso)
    if (!last) break
    cells.push({
      iso: toDateInputValue(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1)),
      inMonth: false,
    })
  }

  return cells
}

export const CALENDAR_WEEKDAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] as const

export function saleUnitLabel(type: 'box' | 'bag'): string {
  return type === 'box' ? 'กล่อง' : 'มัดถุง'
}

export function menuStatusLabel(status: MenuStatus): string {
  return MENU_STATUS_LABELS[status]
}

export function menuStatusBadgeClass(status: MenuStatus): string {
  switch (status) {
    case 'ready_to_sell':
      return 'bg-green-100 text-green-800'
    case 'testing_recipe':
      return 'bg-amber-100 text-amber-800'
    case 'not_ready':
      return 'bg-gray-100 text-gray-700'
    case 'discontinued':
      return 'bg-red-100 text-red-800'
  }
}

export function ingredientTypeLabel(type: 'ingredient' | 'packaging'): string {
  return type === 'ingredient' ? 'วัตถุดิบ' : 'บรรจุภัณฑ์'
}
