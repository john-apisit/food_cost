import type { SalesRecord } from '@/types/models'
import { formatNumber, parseLocalDate, toDateInputValue } from './format'
import { salesRevenue } from './salesPromo'

export const SALES_CHART_MAX_DAYS = 30
export const SALES_CHART_PRESETS = [7, 14, 30] as const
export type SalesChartRangeDays = (typeof SALES_CHART_PRESETS)[number]

export interface DailySalesPoint {
  date: string
  label: string
  actualQty: number
  targetQty: number
  revenue: number
  targetRevenue: number
  /** Net profit for the day; 0 when no cost data was supplied. */
  profit: number
}

export interface TopMenuPoint {
  menuItemId: string
  name: string
  actualQty: number
  revenue: number
}

export interface SalesChartSummary {
  revenue: number
  actualQty: number
  targetQty: number
  targetPercent: number | null
  hasTarget: boolean
  topMenuName: string | null
  topMenuRevenue: number
  recordCount: number
}

export function shiftIsoDate(value: string, days: number): string {
  const date = parseLocalDate(value)
  if (!date) return value
  return toDateInputValue(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days))
}

export function eachIsoDate(from: string, to: string): string[] {
  const start = parseLocalDate(from)
  const end = parseLocalDate(to)
  if (!start || !end || from > to) return []

  const dates: string[] = []
  let cursor = start
  while (cursor.getTime() <= end.getTime()) {
    dates.push(toDateInputValue(cursor))
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
  }
  return dates
}

export function salesChartRange(
  days: SalesChartRangeDays,
  today = toDateInputValue(),
): { from: string; to: string } {
  return {
    from: shiftIsoDate(today, -(days - 1)),
    to: today,
  }
}

export function recordsInRange(records: SalesRecord[], from: string, to: string): SalesRecord[] {
  return records.filter((record) => record.saleDate >= from && record.saleDate <= to)
}

export function formatChartDay(value: string): string {
  const date = parseLocalDate(value)
  if (!date) return value
  return new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

export function formatChartBaht(amount: number): string {
  return `฿${formatNumber(amount, 0)}`
}

export function recordUnitPrice(record: SalesRecord): number {
  return record.menuItem?.sellingPrice ?? 0
}

export function recordRevenue(record: SalesRecord): number {
  return salesRevenue({
    qty: record.actualQty,
    unitPrice: recordUnitPrice(record),
    promoQty: record.promoQty,
    promoRevenue: record.promoRevenue,
  })
}

export function recordTargetRevenue(record: SalesRecord): number {
  return (record.targetQty ?? 0) * recordUnitPrice(record)
}

export interface ProfitContext {
  /** Full cost of one unit per menu item id (ingredients + packaging + fixed cost). */
  unitCostByMenuId: Map<string, number>
  platformFeePercent: number
}

/** Revenue − platform fee on that revenue − unit cost × pieces sold. */
export function recordProfit(record: SalesRecord, context: ProfitContext): number {
  const revenue = recordRevenue(record)
  const fee = revenue * (Math.max(0, context.platformFeePercent) / 100)
  const cost = (context.unitCostByMenuId.get(record.menuItemId) ?? 0) * Math.max(0, record.actualQty)
  return revenue - fee - cost
}

export function aggregateDailySales(
  records: SalesRecord[],
  from: string,
  to: string,
  profitContext?: ProfitContext,
): DailySalesPoint[] {
  const byDate = new Map<string, Omit<DailySalesPoint, 'date' | 'label'>>()

  for (const record of records) {
    if (record.saleDate < from || record.saleDate > to) continue
    const current = byDate.get(record.saleDate) ?? {
      actualQty: 0,
      targetQty: 0,
      revenue: 0,
      targetRevenue: 0,
      profit: 0,
    }
    current.actualQty += record.actualQty
    current.targetQty += record.targetQty ?? 0
    current.revenue += recordRevenue(record)
    current.targetRevenue += recordTargetRevenue(record)
    if (profitContext) current.profit += recordProfit(record, profitContext)
    byDate.set(record.saleDate, current)
  }

  return eachIsoDate(from, to).map((date) => {
    const current = byDate.get(date) ?? {
      actualQty: 0,
      targetQty: 0,
      revenue: 0,
      targetRevenue: 0,
      profit: 0,
    }
    return {
      date,
      label: formatChartDay(date),
      ...current,
    }
  })
}

export function aggregateTopMenus(records: SalesRecord[], limit = 8): TopMenuPoint[] {
  const byMenu = new Map<string, TopMenuPoint>()

  for (const record of records) {
    const name = record.menuItem?.name?.trim() || 'เมนูที่ถูกลบ'
    const current = byMenu.get(record.menuItemId) ?? {
      menuItemId: record.menuItemId,
      name,
      actualQty: 0,
      revenue: 0,
    }
    if (record.menuItem?.name?.trim()) current.name = record.menuItem.name.trim()
    current.actualQty += record.actualQty
    current.revenue += recordRevenue(record)
    byMenu.set(record.menuItemId, current)
  }

  return [...byMenu.values()]
    .filter((item) => item.actualQty > 0 || item.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue || b.actualQty - a.actualQty || a.name.localeCompare(b.name, 'th'))
    .slice(0, limit)
}

export function summarizeSales(records: SalesRecord[]): SalesChartSummary {
  let revenue = 0
  let actualQty = 0
  let targetQty = 0
  let hasTarget = false

  for (const record of records) {
    revenue += recordRevenue(record)
    actualQty += record.actualQty
    if (record.targetQty != null) {
      hasTarget = true
      targetQty += record.targetQty
    }
  }

  const top = aggregateTopMenus(records, 1)[0]

  return {
    revenue,
    actualQty,
    targetQty,
    hasTarget,
    targetPercent: hasTarget && targetQty > 0 ? (actualQty / targetQty) * 100 : null,
    topMenuName: top?.name ?? null,
    topMenuRevenue: top?.revenue ?? 0,
    recordCount: records.length,
  }
}
