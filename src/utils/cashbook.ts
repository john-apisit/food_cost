import { salesRevenue } from './salesPromo'
import {
  CASH_CATEGORIES_BY_TYPE,
  CASH_CATEGORY_LABELS,
  type CashbookSummary,
  type CashCategory,
  type CashEntry,
  type CashEntryType,
  type CashPaymentMethod,
} from '@/types/models'

export const CASH_QUICK_ACTIONS: Array<{
  type: CashEntryType
  category: CashCategory
  label: string
}> = [
  { type: 'income', category: 'platform_payout', label: 'รับโอนแพลตฟอร์ม' },
  { type: 'income', category: 'other_income', label: 'รายได้อื่น' },
  { type: 'expense', category: 'ingredient', label: 'ซื้อวัตถุดิบ' },
  { type: 'expense', category: 'packaging', label: 'ซื้อบรรจุภัณฑ์' },
  { type: 'expense', category: 'equipment', label: 'อุปกรณ์ครัว' },
  { type: 'expense', category: 'utility', label: 'ค่าแก๊ส / ไฟ' },
  { type: 'expense', category: 'labor', label: 'ค่าแรง' },
  { type: 'expense', category: 'other', label: 'รายจ่ายอื่น' },
  { type: 'transfer', category: 'owner_draw', label: 'ถอนส่วนตัว' },
]

export function categoriesForType(type: CashEntryType): readonly CashCategory[] {
  return CASH_CATEGORIES_BY_TYPE[type]
}

export function defaultCategoryForType(type: CashEntryType): CashCategory {
  return CASH_CATEGORIES_BY_TYPE[type][0]
}

export function defaultPaymentMethod(category: CashCategory): CashPaymentMethod {
  return category === 'ingredient' ? 'cash' : 'bank_transfer'
}

export function defaultIsAsset(category: CashCategory): boolean {
  return category === 'equipment'
}

export function defaultCounterpartyFromSupplier(
  current: string,
  supplier?: string | null,
): string {
  const next = supplier?.trim()
  return next || current
}

export function cashEntryTitle(entry: Pick<CashEntry, 'category' | 'counterparty' | 'ingredient' | 'supplier' | 'note'>): string {
  if (entry.ingredient?.name) return entry.ingredient.name
  if (entry.supplier?.name?.trim()) return entry.supplier.name.trim()
  if (entry.counterparty?.trim()) return entry.counterparty.trim()
  if (entry.note?.trim()) return entry.note.trim()
  return CASH_CATEGORY_LABELS[entry.category]
}

export function signedCashAmount(entry: Pick<CashEntry, 'type' | 'amount'>): number {
  if (entry.type === 'income') return entry.amount
  if (entry.type === 'expense') return -entry.amount
  return 0
}

export function suggestedPricePerUnit(amount: number, quantity: number): number | null {
  if (!(amount > 0) || !(quantity > 0)) return null
  return amount / quantity
}

export function suggestedPayoutNet(gross?: number, fee?: number, adjustment?: number): number | null {
  const hasAny =
    (gross != null && Number.isFinite(gross)) ||
    (fee != null && Number.isFinite(fee)) ||
    (adjustment != null && Number.isFinite(adjustment))
  if (!hasAny) return null
  const net = (gross ?? 0) - (fee ?? 0) + (adjustment ?? 0)
  return Number.isFinite(net) ? net : null
}

export interface PlatformPayoutEstimate {
  qty: number
  gross: number
  fee: number
  net: number
}

export function estimatePlatformPayout(
  lines: Array<{
    actualQty: number
    sellingPrice: number
    promoQty?: number
    promoRevenue?: number
  }>,
  platformFeePercent: number,
): PlatformPayoutEstimate {
  const qty = lines.reduce((sum, line) => sum + Math.max(0, line.actualQty), 0)
  const gross = lines.reduce(
    (sum, line) =>
      sum +
      salesRevenue({
        qty: line.actualQty,
        unitPrice: line.sellingPrice,
        promoQty: line.promoQty,
        promoRevenue: line.promoRevenue,
      }),
    0,
  )
  const feeRate = Number.isFinite(platformFeePercent) ? platformFeePercent / 100 : 0
  const fee = gross * feeRate
  return { qty, gross, fee, net: gross - fee }
}

export type PayoutVarianceStatus = 'match' | 'over' | 'under' | 'none'

export function payoutVariance(actual: number, estimated: number): {
  diff: number
  status: PayoutVarianceStatus
} {
  if (!(estimated > 0) || !(actual > 0)) return { diff: actual - estimated, status: 'none' }
  const diff = actual - estimated
  const tolerance = Math.max(20, estimated * 0.02)
  if (Math.abs(diff) <= tolerance) return { diff, status: 'match' }
  return { diff, status: diff > 0 ? 'over' : 'under' }
}

export function summarizeCashEntries(entries: CashEntry[]): CashbookSummary {
  const categoryTotals = new Map<CashCategory, number>()
  let income = 0
  let operatingExpense = 0
  let assetSpend = 0
  let ownerDraw = 0

  for (const entry of entries) {
    if (entry.type === 'income') {
      income += entry.amount
      categoryTotals.set(entry.category, (categoryTotals.get(entry.category) ?? 0) + entry.amount)
      continue
    }
    if (entry.type === 'transfer') {
      ownerDraw += entry.amount
      continue
    }
    if (entry.isAsset) {
      assetSpend += entry.amount
      continue
    }
    operatingExpense += entry.amount
    categoryTotals.set(entry.category, (categoryTotals.get(entry.category) ?? 0) + entry.amount)
  }

  const byCategory = [...categoryTotals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  return {
    income,
    operatingExpense,
    assetSpend,
    ownerDraw,
    operatingCash: income - operatingExpense,
    byCategory,
  }
}
