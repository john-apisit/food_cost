import {
  isWeekday,
  WEEKDAYS,
  WEEKDAY_LABELS,
  type MenuCostBreakdown,
  type Weekday,
} from '@/types/models'

const AVERAGE_WEEKS_PER_MONTH = 52 / 12

export interface RevenueForecastLine {
  breakdown: MenuCostBreakdown
  avgDailyQty: number
  monthlyQty: number
  grossRevenue: number
  platformFee: number
  netRevenue: number
  totalCost: number
  netProfit: number
}

export interface RevenueForecastSummary {
  monthlyQty: number
  grossRevenue: number
  platformFee: number
  netRevenue: number
  totalCost: number
  netProfit: number
}

export function uniqueOpenWeekdays(openDays: readonly string[]): Weekday[] {
  const unique = new Set(openDays.filter(isWeekday))
  return WEEKDAYS.filter((day) => unique.has(day))
}

/** Average open days per month from weekly `store_settings.open_days`. */
export function monthlyOpenDays(openDays: readonly string[]): number {
  const count = uniqueOpenWeekdays(openDays).length
  if (count === 0) return 0
  return Math.round(count * AVERAGE_WEEKS_PER_MONTH)
}

export function formatOpenDaysLabel(openDays: readonly string[]): string {
  const days = uniqueOpenWeekdays(openDays)
  if (!days.length) return 'ยังไม่ได้ตั้งวันเปิดร้าน'
  return days.map((day) => WEEKDAY_LABELS[day]).join(' · ')
}

export function forecastMenuRevenue(
  breakdown: MenuCostBreakdown,
  avgDailyQty: number,
  days: number,
): RevenueForecastLine {
  const qtyPerDay = Number.isFinite(avgDailyQty) && avgDailyQty > 0 ? avgDailyQty : 0
  const openDays = Number.isFinite(days) && days > 0 ? days : 0
  const monthlyQty = qtyPerDay * openDays

  return {
    breakdown,
    avgDailyQty: qtyPerDay,
    monthlyQty,
    grossRevenue: breakdown.menuItem.sellingPrice * monthlyQty,
    platformFee: breakdown.platformFee * monthlyQty,
    netRevenue: breakdown.netRevenue * monthlyQty,
    totalCost: breakdown.totalCost * monthlyQty,
    netProfit: breakdown.netProfit * monthlyQty,
  }
}

export function summarizeRevenueForecast(lines: RevenueForecastLine[]): RevenueForecastSummary {
  return lines.reduce<RevenueForecastSummary>(
    (sum, line) => ({
      monthlyQty: sum.monthlyQty + line.monthlyQty,
      grossRevenue: sum.grossRevenue + line.grossRevenue,
      platformFee: sum.platformFee + line.platformFee,
      netRevenue: sum.netRevenue + line.netRevenue,
      totalCost: sum.totalCost + line.totalCost,
      netProfit: sum.netProfit + line.netProfit,
    }),
    {
      monthlyQty: 0,
      grossRevenue: 0,
      platformFee: 0,
      netRevenue: 0,
      totalCost: 0,
      netProfit: 0,
    },
  )
}
