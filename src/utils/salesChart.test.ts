import { describe, expect, it } from 'vitest'
import type { MenuItem, SalesRecord } from '@/types/models'
import {
  aggregateDailySales,
  aggregateTopMenus,
  eachIsoDate,
  formatChartBaht,
  formatChartDay,
  recordsInRange,
  salesChartRange,
  shiftIsoDate,
  summarizeSales,
} from './salesChart'

const basil: MenuItem = {
  id: 'm1',
  userId: 'u1',
  name: 'กะเพราหมูสับ',
  saleUnitType: 'box',
  sellingPrice: 80,
  status: 'ready_to_sell',
  isActive: true,
  createdAt: '',
  updatedAt: '',
}

const padThai: MenuItem = {
  ...basil,
  id: 'm2',
  name: 'ผัดไทย',
  sellingPrice: 70,
}

function sale(partial: Partial<SalesRecord> & Pick<SalesRecord, 'id' | 'saleDate' | 'actualQty' | 'menuItemId'>): SalesRecord {
  return {
    userId: 'u1',
    promoQty: 0,
    promoRevenue: 0,
    recordedAt: `${partial.saleDate}T10:00:00.000Z`,
    ...partial,
  }
}

describe('shiftIsoDate', () => {
  it('moves forward and backward without UTC shift', () => {
    expect(shiftIsoDate('2026-08-23', -6)).toBe('2026-08-17')
    expect(shiftIsoDate('2026-08-01', -1)).toBe('2026-07-31')
    expect(shiftIsoDate('2026-08-23', 1)).toBe('2026-08-24')
  })
})

describe('eachIsoDate', () => {
  it('lists inclusive local dates', () => {
    expect(eachIsoDate('2026-08-22', '2026-08-24')).toEqual([
      '2026-08-22',
      '2026-08-23',
      '2026-08-24',
    ])
  })

  it('returns empty when the range is inverted or invalid', () => {
    expect(eachIsoDate('2026-08-24', '2026-08-22')).toEqual([])
    expect(eachIsoDate('', '2026-08-22')).toEqual([])
  })
})

describe('salesChartRange', () => {
  it('uses an inclusive window ending today', () => {
    expect(salesChartRange(7, '2026-08-23')).toEqual({ from: '2026-08-17', to: '2026-08-23' })
    expect(salesChartRange(30, '2026-08-23')).toEqual({ from: '2026-07-25', to: '2026-08-23' })
  })
})

describe('formatChartDay', () => {
  it('formats a short Thai Gregorian date', () => {
    expect(formatChartDay('2026-08-23')).toBe('23 ส.ค.')
  })
})

describe('formatChartBaht', () => {
  it('formats a compact baht label', () => {
    expect(formatChartBaht(1234)).toBe('฿1,234')
  })
})

describe('aggregateDailySales', () => {
  const records = [
    sale({ id: 's1', saleDate: '2026-08-21', menuItemId: 'm1', actualQty: 2, targetQty: 3, menuItem: basil }),
    sale({ id: 's2', saleDate: '2026-08-21', menuItemId: 'm2', actualQty: 1, targetQty: 2, menuItem: padThai }),
    sale({ id: 's3', saleDate: '2026-08-23', menuItemId: 'm1', actualQty: 4, targetQty: 4, menuItem: basil }),
    sale({ id: 's4', saleDate: '2026-08-10', menuItemId: 'm1', actualQty: 9, targetQty: 9, menuItem: basil }),
  ]

  it('fills missing days with zeros and sums the same day', () => {
    const daily = aggregateDailySales(records, '2026-08-21', '2026-08-23')
    expect(daily).toHaveLength(3)
    expect(daily[0]).toMatchObject({
      date: '2026-08-21',
      actualQty: 3,
      targetQty: 5,
      revenue: 2 * 80 + 70,
      targetRevenue: 3 * 80 + 2 * 70,
    })
    expect(daily[1]).toMatchObject({
      date: '2026-08-22',
      actualQty: 0,
      targetQty: 0,
      revenue: 0,
      targetRevenue: 0,
    })
    expect(daily[2]).toMatchObject({
      date: '2026-08-23',
      actualQty: 4,
      revenue: 320,
    })
  })

  it('computes daily profit after platform fee and unit cost', () => {
    const daily = aggregateDailySales(records, '2026-08-21', '2026-08-23', {
      unitCostByMenuId: new Map([
        ['m1', 30],
        ['m2', 25],
      ]),
      platformFeePercent: 10,
    })
    // day 1: revenue 230, fee 23, cost 2*30 + 25 = 85
    expect(daily[0].profit).toBeCloseTo(230 - 23 - 85)
    expect(daily[1].profit).toBe(0)
    // day 3: revenue 320, fee 32, cost 120
    expect(daily[2].profit).toBeCloseTo(320 - 32 - 120)
  })

  it('reports zero profit when no cost data is given', () => {
    expect(aggregateDailySales(records, '2026-08-21', '2026-08-21')[0].profit).toBe(0)
  })
})

describe('aggregateTopMenus', () => {
  it('ranks by revenue and keeps a fallback name', () => {
    const top = aggregateTopMenus([
      sale({ id: 's1', saleDate: '2026-08-21', menuItemId: 'm1', actualQty: 2, menuItem: basil }),
      sale({ id: 's2', saleDate: '2026-08-21', menuItemId: 'm2', actualQty: 5, menuItem: padThai }),
      sale({ id: 's3', saleDate: '2026-08-21', menuItemId: 'm3', actualQty: 1 }),
    ], 8)

    expect(top.map((item) => item.menuItemId)).toEqual(['m2', 'm1', 'm3'])
    expect(top[0]).toMatchObject({ name: 'ผัดไทย', revenue: 350, actualQty: 5 })
    expect(top[2].name).toBe('เมนูที่ถูกลบ')
  })
})

describe('summarizeSales', () => {
  it('computes revenue, target percent, and the top menu', () => {
    const summary = summarizeSales([
      sale({ id: 's1', saleDate: '2026-08-21', menuItemId: 'm1', actualQty: 2, targetQty: 4, menuItem: basil }),
      sale({ id: 's2', saleDate: '2026-08-21', menuItemId: 'm2', actualQty: 2, targetQty: 1, menuItem: padThai }),
    ])

    expect(summary.revenue).toBe(2 * 80 + 2 * 70)
    expect(summary.actualQty).toBe(4)
    expect(summary.targetQty).toBe(5)
    expect(summary.hasTarget).toBe(true)
    expect(summary.targetPercent).toBeCloseTo(80)
    expect(summary.topMenuName).toBe('กะเพราหมูสับ')
  })

  it('counts promo pieces at the promo price instead of the menu price', () => {
    // 10 pieces at 80: 6 sold as 2 × "3 for 150", 4 at normal price
    const summary = summarizeSales([
      sale({
        id: 's1',
        saleDate: '2026-08-21',
        menuItemId: 'm1',
        actualQty: 10,
        promoQty: 6,
        promoRevenue: 300,
        menuItem: basil,
      }),
    ])

    expect(summary.revenue).toBe(4 * 80 + 300)
    expect(summary.actualQty).toBe(10)
  })

  it('returns a null target percent when no target exists', () => {
    const summary = summarizeSales([
      sale({ id: 's1', saleDate: '2026-08-21', menuItemId: 'm1', actualQty: 2, menuItem: basil }),
    ])
    expect(summary.hasTarget).toBe(false)
    expect(summary.targetPercent).toBeNull()
  })
})

describe('recordsInRange', () => {
  it('keeps inclusive boundaries', () => {
    const records = [
      sale({ id: 's1', saleDate: '2026-08-20', menuItemId: 'm1', actualQty: 1 }),
      sale({ id: 's2', saleDate: '2026-08-21', menuItemId: 'm1', actualQty: 1 }),
      sale({ id: 's3', saleDate: '2026-08-23', menuItemId: 'm1', actualQty: 1 }),
    ]
    expect(recordsInRange(records, '2026-08-21', '2026-08-23').map((row) => row.id)).toEqual(['s2', 's3'])
  })
})
