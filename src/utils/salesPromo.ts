export interface PromoInput {
  /** Pieces per bundle, e.g. 3 for "buy 3". */
  bundleSize: number | null
  /** Price for one whole bundle, e.g. 50. */
  bundlePrice: number | null
  /** How many bundles were sold. */
  bundleCount: number | null
}

export interface PromoResult {
  qty: number
  revenue: number
  note: string | null
}

const toCount = (value: number | null | undefined): number => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

const toMoney = (value: number | null | undefined): number => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Turn "3 pieces for 50 THB × 2 bundles" into pieces + revenue stored on the record. */
export function resolvePromo(input: PromoInput): PromoResult {
  const size = toCount(input.bundleSize)
  const count = toCount(input.bundleCount)
  if (size === 0 || count === 0) return { qty: 0, revenue: 0, note: null }

  const price = toMoney(input.bundlePrice)
  return {
    qty: size * count,
    revenue: price * count,
    note: `ซื้อ ${size} ชิ้น ${price} บาท × ${count} ชุด`,
  }
}

/** Combine several promotions sold on the same menu/day into one total (pieces, revenue, joined note). */
export function resolvePromos(inputs: PromoInput[]): PromoResult {
  const results = inputs.map(resolvePromo).filter((result) => result.qty > 0)
  if (results.length === 0) return { qty: 0, revenue: 0, note: null }
  return {
    qty: results.reduce((sum, result) => sum + result.qty, 0),
    revenue: results.reduce((sum, result) => sum + result.revenue, 0),
    note: results.map((result) => result.note).join(' + '),
  }
}

/**
 * Revenue for a sales record. Promo pieces are paid at the promo total,
 * the remaining pieces at the normal menu price.
 */
export function salesRevenue(params: {
  qty: number
  unitPrice: number
  promoQty?: number | null
  promoRevenue?: number | null
}): number {
  const qty = Math.max(0, Number(params.qty) || 0)
  const unitPrice = Math.max(0, Number(params.unitPrice) || 0)
  const promoQty = Math.min(qty, Math.max(0, Number(params.promoQty) || 0))
  const promoRevenue = promoQty > 0 ? Math.max(0, Number(params.promoRevenue) || 0) : 0
  return (qty - promoQty) * unitPrice + promoRevenue
}
