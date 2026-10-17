import type { SalesRecord } from '@/types/models'
import { recordRevenue } from './salesChart'

/** Live cost values used for records saved before cost snapshots existed. */
export interface CostFallback {
  unitCost: number
  platformFeePercent: number
}

export type CostFallbackResolver = (record: SalesRecord) => CostFallback | undefined

export interface RecordProfit {
  revenue: number
  platformFee: number
  cost: number
  profit: number
  /** Profit as a percent of revenue, null when revenue is 0. */
  marginPercent: number | null
  /** True when live cost was used because the record has no snapshot. */
  estimated: boolean
}

export interface ProfitSummary {
  revenue: number
  platformFee: number
  cost: number
  /** Profit across records whose cost is known. */
  profit: number
  marginPercent: number | null
  actualQty: number
  /** Pieces sold on records that have a target (the fair side of the target comparison). */
  targetedActualQty: number
  targetQty: number
  targetPercent: number | null
  hasTarget: boolean
  dayCount: number
  revenuePerDay: number
  topProfitMenuName: string | null
  topProfitMenuProfit: number
  recordCount: number
  /** Records with neither a snapshot nor a live cost to fall back on. */
  unknownCostCount: number
  /** Records whose profit relies on live (not snapshot) cost. */
  estimatedCount: number
}

export function recordProfit(
  record: SalesRecord,
  fallback?: CostFallback,
): RecordProfit | null {
  const unitCost = record.unitCost ?? fallback?.unitCost
  const feePercent = record.platformFeePercent ?? fallback?.platformFeePercent
  if (unitCost == null || feePercent == null) return null

  const revenue = recordRevenue(record)
  const platformFee = revenue * (feePercent / 100)
  const cost = unitCost * record.actualQty
  const profit = revenue - platformFee - cost

  return {
    revenue,
    platformFee,
    cost,
    profit,
    marginPercent: revenue > 0 ? (profit / revenue) * 100 : null,
    estimated: record.unitCost == null || record.platformFeePercent == null,
  }
}

export function summarizeProfit(
  records: SalesRecord[],
  resolveFallback?: CostFallbackResolver,
): ProfitSummary {
  let revenue = 0
  let costedRevenue = 0
  let platformFee = 0
  let cost = 0
  let profit = 0
  let actualQty = 0
  let targetedActualQty = 0
  let targetQty = 0
  let hasTarget = false
  let unknownCostCount = 0
  let estimatedCount = 0
  const days = new Set<string>()
  const profitByMenu = new Map<string, { name: string; profit: number }>()

  for (const record of records) {
    days.add(record.saleDate)
    actualQty += record.actualQty
    if (record.targetQty != null) {
      hasTarget = true
      targetQty += record.targetQty
      targetedActualQty += record.actualQty
    }
    const recordTotal = recordRevenue(record)
    revenue += recordTotal

    const result = recordProfit(record, resolveFallback?.(record))
    if (!result) {
      unknownCostCount += 1
      continue
    }
    if (result.estimated) estimatedCount += 1
    costedRevenue += recordTotal
    platformFee += result.platformFee
    cost += result.cost
    profit += result.profit

    const name = record.menuItem?.name?.trim() || 'เมนูที่ถูกลบ'
    const current = profitByMenu.get(record.menuItemId) ?? { name, profit: 0 }
    current.profit += result.profit
    profitByMenu.set(record.menuItemId, current)
  }

  const top = [...profitByMenu.values()].sort(
    (a, b) => b.profit - a.profit || a.name.localeCompare(b.name, 'th'),
  )[0]
  const dayCount = days.size

  return {
    revenue,
    platformFee,
    cost,
    profit,
    marginPercent: costedRevenue > 0 ? (profit / costedRevenue) * 100 : null,
    actualQty,
    targetedActualQty,
    targetQty,
    hasTarget,
    targetPercent: hasTarget && targetQty > 0 ? (targetedActualQty / targetQty) * 100 : null,
    dayCount,
    revenuePerDay: dayCount > 0 ? revenue / dayCount : 0,
    topProfitMenuName: top && top.profit > 0 ? top.name : null,
    topProfitMenuProfit: top && top.profit > 0 ? top.profit : 0,
    recordCount: records.length,
    unknownCostCount,
    estimatedCount,
  }
}
