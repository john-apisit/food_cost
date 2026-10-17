import { describe, expect, it } from 'vitest'
import { resolvePromo, salesRevenue } from './salesPromo'

describe('resolvePromo', () => {
  it('converts bundles into pieces and revenue', () => {
    expect(resolvePromo({ bundleSize: 3, bundlePrice: 50, bundleCount: 2 })).toEqual({
      qty: 6,
      revenue: 100,
      note: 'ซื้อ 3 ชิ้น 50 บาท × 2 ชุด',
    })
  })

  it('returns an empty promo when nothing was sold', () => {
    const empty = { qty: 0, revenue: 0, note: null }
    expect(resolvePromo({ bundleSize: 3, bundlePrice: 50, bundleCount: 0 })).toEqual(empty)
    expect(resolvePromo({ bundleSize: null, bundlePrice: 50, bundleCount: 2 })).toEqual(empty)
    expect(resolvePromo({ bundleSize: 3, bundlePrice: 50, bundleCount: null })).toEqual(empty)
  })
})

describe('salesRevenue', () => {
  it('uses the normal price when there is no promo', () => {
    expect(salesRevenue({ qty: 10, unitPrice: 20 })).toBe(200)
  })

  it('charges promo pieces at the promo total and the rest at normal price', () => {
    // 10 pieces: 6 sold as 2 bundles of "3 for 50", 4 at 20 each
    expect(salesRevenue({ qty: 10, unitPrice: 20, promoQty: 6, promoRevenue: 100 })).toBe(180)
  })

  it('never counts more promo pieces than total pieces', () => {
    expect(salesRevenue({ qty: 3, unitPrice: 20, promoQty: 6, promoRevenue: 100 })).toBe(100)
  })

  it('ignores promo revenue when no promo pieces were sold', () => {
    expect(salesRevenue({ qty: 2, unitPrice: 20, promoQty: 0, promoRevenue: 50 })).toBe(40)
  })
})
