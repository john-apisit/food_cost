import { describe, expect, it } from 'vitest'
import type { MenuItem, SalesRecord } from '@/types/models'
import { recordProfit, summarizeProfit } from './salesProfit'

const basil: MenuItem = {
  id: 'm1',
  userId: 'u1',
  name: 'กะเพรา',
  saleUnitType: 'box',
  sellingPrice: 80,
  status: 'ready_to_sell',
  isActive: true,
  createdAt: '',
  updatedAt: '',
}

function sale(partial: Partial<SalesRecord> & Pick<SalesRecord, 'id' | 'actualQty'>): SalesRecord {
  return {
    userId: 'u1',
    menuItemId: 'm1',
    saleDate: '2026-08-21',
    promoQty: 0,
    promoRevenue: 0,
    recordedAt: '2026-08-21T10:00:00.000Z',
    menuItem: basil,
    ...partial,
  }
}

describe('recordProfit', () => {
  it('uses the saved snapshot: revenue - platform fee - cost', () => {
    const result = recordProfit(
      sale({ id: 's1', actualQty: 10, unitCost: 30, platformFeePercent: 30, unitPrice: 100 }),
    )
    // revenue 1000, fee 300, cost 300
    expect(result).toMatchObject({
      revenue: 1000,
      platformFee: 300,
      cost: 300,
      profit: 400,
      estimated: false,
    })
    expect(result?.marginPercent).toBeCloseTo(40)
  })

  it('keeps the saved price even when the menu price changes later', () => {
    const result = recordProfit(
      sale({ id: 's1', actualQty: 1, unitPrice: 50, unitCost: 0, platformFeePercent: 0 }),
    )
    expect(result?.revenue).toBe(50)
  })

  it('applies promo revenue before fee and cost', () => {
    // 10 pcs: 6 promo for 100 total, 4 at 80 → 420 revenue
    const result = recordProfit(
      sale({
        id: 's1',
        actualQty: 10,
        promoQty: 6,
        promoRevenue: 100,
        unitCost: 20,
        platformFeePercent: 30,
      }),
    )
    expect(result).toMatchObject({ revenue: 420, platformFee: 126, cost: 200, profit: 94 })
  })

  it('falls back to live cost for old records and marks them estimated', () => {
    const result = recordProfit(sale({ id: 's1', actualQty: 2 }), {
      unitCost: 40,
      platformFeePercent: 25,
    })
    expect(result).toMatchObject({ revenue: 160, platformFee: 40, cost: 80, profit: 40, estimated: true })
  })

  it('returns null when cost is unknown', () => {
    expect(recordProfit(sale({ id: 's1', actualQty: 2 }))).toBeNull()
  })
})

describe('summarizeProfit', () => {
  it('totals revenue, profit and margin and finds the most profitable menu', () => {
    const other: MenuItem = { ...basil, id: 'm2', name: 'ผัดไทย', sellingPrice: 70 }
    const summary = summarizeProfit([
      sale({ id: 's1', actualQty: 10, targetQty: 20, unitCost: 30, platformFeePercent: 30 }),
      sale({
        id: 's2',
        menuItemId: 'm2',
        menuItem: other,
        saleDate: '2026-08-22',
        actualQty: 10,
        targetQty: 10,
        unitCost: 60,
        platformFeePercent: 30,
      }),
    ])

    // s1: 800 - 240 - 300 = 260 ; s2: 700 - 210 - 600 = -110
    expect(summary.revenue).toBe(1500)
    expect(summary.profit).toBe(150)
    expect(summary.marginPercent).toBeCloseTo(10)
    expect(summary.targetPercent).toBeCloseTo((20 / 30) * 100)
    expect(summary.dayCount).toBe(2)
    expect(summary.revenuePerDay).toBe(750)
    expect(summary.topProfitMenuName).toBe('กะเพรา')
    expect(summary.unknownCostCount).toBe(0)
  })

  it('counts records without cost separately and excludes them from profit', () => {
    const summary = summarizeProfit([
      sale({ id: 's1', actualQty: 1, unitCost: 10, platformFeePercent: 0 }),
      sale({ id: 's2', actualQty: 5 }),
    ])
    expect(summary.revenue).toBe(480)
    expect(summary.profit).toBe(70)
    expect(summary.unknownCostCount).toBe(1)
  })

  it('uses the fallback resolver for old records', () => {
    const summary = summarizeProfit([sale({ id: 's1', actualQty: 1 })], () => ({
      unitCost: 20,
      platformFeePercent: 0,
    }))
    expect(summary.profit).toBe(60)
    expect(summary.estimatedCount).toBe(1)
  })

  it('handles an empty list', () => {
    const summary = summarizeProfit([])
    expect(summary).toMatchObject({
      revenue: 0,
      profit: 0,
      marginPercent: null,
      targetPercent: null,
      topProfitMenuName: null,
      revenuePerDay: 0,
    })
  })
})
