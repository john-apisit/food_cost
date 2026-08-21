import { describe, expect, it } from 'vitest'
import { calculateMenuCost } from './costCalculator'
import {
  forecastMenuRevenue,
  formatOpenDaysLabel,
  monthlyOpenDays,
  summarizeRevenueForecast,
  uniqueOpenWeekdays,
} from './revenueForecast'
import type { Ingredient, MenuItem, StoreSettings } from '@/types/models'

const settings: StoreSettings = {
  id: 's1',
  userId: 'u1',
  platformName: 'LINE MAN',
  platformFeePercent: 30,
  fixedCostBox: 5,
  fixedCostBag: 3,
  openDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  createdAt: '',
  updatedAt: '',
}

const pork: Ingredient = {
  id: 'i1',
  userId: 'u1',
  name: 'หมูสับ',
  unit: 'kg',
  pricePerUnit: 150,
  type: 'ingredient',
  isActive: true,
  createdAt: '',
  updatedAt: '',
}

const box: Ingredient = {
  id: 'p1',
  userId: 'u1',
  name: 'กล่องข้าว',
  unit: 'ใบ',
  pricePerUnit: 4,
  type: 'packaging',
  isActive: true,
  createdAt: '',
  updatedAt: '',
}

const basilPork: MenuItem = {
  id: 'm1',
  userId: 'u1',
  name: 'กะเพราหมูสับ',
  saleUnitType: 'box',
  sellingPrice: 100,
  status: 'ready_to_sell',
  isActive: true,
  createdAt: '',
  updatedAt: '',
  recipeLines: [
    { id: 'r1', menuItemId: 'm1', ingredientId: 'i1', quantityPerUnit: 0.1, createdAt: '' },
    { id: 'r2', menuItemId: 'm1', ingredientId: 'p1', quantityPerUnit: 1, createdAt: '' },
  ],
}

describe('monthlyOpenDays', () => {
  it('maps 7 open days/week to 30 days/month', () => {
    expect(monthlyOpenDays(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).toBe(30)
  })

  it('maps 6 open days/week to 26 days/month', () => {
    expect(monthlyOpenDays(['mon', 'tue', 'wed', 'thu', 'fri', 'sat'])).toBe(26)
  })

  it('returns 0 when open_days is empty', () => {
    expect(monthlyOpenDays([])).toBe(0)
  })

  it('ignores unknown and duplicate weekdays', () => {
    expect(uniqueOpenWeekdays(['mon', 'mon', 'holiday'])).toEqual(['mon'])
    expect(monthlyOpenDays(['mon', 'mon'])).toBe(monthlyOpenDays(['mon']))
  })
})

describe('formatOpenDaysLabel', () => {
  it('joins weekday labels in Thai', () => {
    expect(formatOpenDaysLabel(['mon', 'fri'])).toBe('จันทร์ · ศุกร์')
  })
})

describe('forecastMenuRevenue', () => {
  it('projects monthly gross, net after LINE MAN, and profit from avg daily qty', () => {
    const breakdown = calculateMenuCost(basilPork, settings, [pork, box], [basilPork])
    const days = monthlyOpenDays(settings.openDays)
    const line = forecastMenuRevenue(breakdown, 20, days)

    expect(days).toBe(30)
    expect(line.monthlyQty).toBe(600)
    expect(line.grossRevenue).toBe(60000)
    expect(line.platformFee).toBe(18000)
    expect(line.netRevenue).toBe(42000)
    expect(line.totalCost).toBe(breakdown.totalCost * 600)
    expect(line.netProfit).toBe(breakdown.netProfit * 600)
  })

  it('treats empty or negative qty as zero', () => {
    const breakdown = calculateMenuCost(basilPork, settings, [pork, box], [basilPork])
    expect(forecastMenuRevenue(breakdown, 0, 30).grossRevenue).toBe(0)
    expect(forecastMenuRevenue(breakdown, -5, 30).grossRevenue).toBe(0)
    expect(forecastMenuRevenue(breakdown, Number.NaN, 30).grossRevenue).toBe(0)
  })
})

describe('summarizeRevenueForecast', () => {
  it('sums all lines', () => {
    const breakdown = calculateMenuCost(basilPork, settings, [pork, box], [basilPork])
    const a = forecastMenuRevenue(breakdown, 10, 30)
    const b = forecastMenuRevenue(breakdown, 5, 30)
    const total = summarizeRevenueForecast([a, b])

    expect(total.monthlyQty).toBe(450)
    expect(total.grossRevenue).toBe(45000)
    expect(total.netRevenue).toBe(31500)
  })
})
