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
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
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
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(date)
}

export function inclusiveDayCount(start: string, end: string): number {
  const from = parseLocalDate(start)
  const to = parseLocalDate(end)
  if (!from || !to) return 1
  const diff = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1
  return Math.max(1, diff)
}

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
