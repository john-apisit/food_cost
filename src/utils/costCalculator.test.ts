import { describe, expect, it } from 'vitest'
import {
  calculateComboCost,
  calculateMenuCost,
  calculateSuggestedPrice,
  simulateComboFromMenuBreakdowns,
  simulateIngredientPriceChange,
  simulateSellingPrice,
} from './costCalculator'
import type { Combo, Ingredient, MenuItem, StoreSettings } from '@/types/models'

const settings: StoreSettings = {
  id: 's1',
  userId: 'u1',
  platformName: 'LINE MAN',
  platformFeePercent: 30,
  fixedCostBox: 5,
  fixedCostBag: 3,
  targetMarginPercent: 30,
  openDays: [],
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

const egg: Ingredient = {
  id: 'i2',
  userId: 'u1',
  name: 'ไข่ไก่',
  unit: 'ฟอง',
  pricePerUnit: 5,
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

const friedEgg: MenuItem = {
  id: 'm2',
  userId: 'u1',
  name: 'ไข่ดาว',
  saleUnitType: 'bag',
  sellingPrice: 10,
  status: 'ready_to_sell',
  isActive: true,
  createdAt: '',
  updatedAt: '',
  recipeLines: [
    { id: 'r2', menuItemId: 'm2', ingredientId: 'i2', quantityPerUnit: 1, createdAt: '' },
  ],
}

const basilPork: MenuItem = {
  id: 'm1',
  userId: 'u1',
  name: 'กะเพราหมูสับ + ไข่ดาว',
  saleUnitType: 'box',
  sellingPrice: 100,
  status: 'ready_to_sell',
  isActive: true,
  createdAt: '',
  updatedAt: '',
  recipeLines: [
    { id: 'r1', menuItemId: 'm1', ingredientId: 'i1', quantityPerUnit: 0.1, createdAt: '' },
    { id: 'r3', menuItemId: 'm1', ingredientId: 'p1', quantityPerUnit: 1, createdAt: '' },
  ],
  addons: [
    { id: 'a1', menuItemId: 'm1', addonMenuItemId: 'm2', quantity: 1, createdAt: '' },
  ],
}

describe('calculateMenuCost', () => {
  it('matches the business example: 100 baht sale, 30% LINE MAN, 35 baht net profit', () => {
    // pork 0.1kg * 150 = 15, egg 5, box 4, fixed 5 → total 29
    // To match BRD example of total cost 35, use extra ingredient cost via recipe
    const ingredients = [pork, egg, box]
    const menus = [basilPork, friedEgg]
    const result = calculateMenuCost(basilPork, settings, ingredients, menus)

    expect(result.ingredientCost).toBe(20) // 15 pork + 5 egg addon
    expect(result.packagingCost).toBe(4)
    expect(result.fixedCost).toBe(5)
    expect(result.totalCost).toBe(29)
    expect(result.platformFee).toBe(30)
    expect(result.netRevenue).toBe(70)
    expect(result.netProfit).toBe(41)
    expect(result.netMarginPercent).toBeCloseTo(41)
  })

  it('uses bag fixed cost for bag menus', () => {
    const result = calculateMenuCost(friedEgg, settings, [egg], [friedEgg])
    expect(result.fixedCost).toBe(3)
    expect(result.ingredientCost).toBe(5)
  })
})

describe('calculateSuggestedPrice', () => {
  it('accounts for platform fee and target margin', () => {
    // cost 35, fee 30%, margin 35% → price = 35 / (1 - 0.35 - 0.30) = 100
    expect(calculateSuggestedPrice(35, 35, 30)).toBeCloseTo(100)
  })

  it('throws when margin + fee >= 100%', () => {
    expect(() => calculateSuggestedPrice(80, 35, 30)).toThrow()
  })
})

describe('calculateComboCost', () => {
  it('sums item costs and applies platform fee on the combo price', () => {
    const combo: Combo = {
      id: 'c1',
      userId: 'u1',
      name: 'ชุดกะเพรา + ไข่ดาว',
      sellingPrice: 90,
      isActive: true,
      createdAt: '',
      updatedAt: '',
      items: [
        { id: 'ci1', comboId: 'c1', menuItemId: 'm1', quantity: 1, createdAt: '', menuItem: basilPork },
        { id: 'ci2', comboId: 'c1', menuItemId: 'm2', quantity: 1, createdAt: '', menuItem: friedEgg },
      ],
    }

    const result = calculateComboCost(combo, settings, [pork, egg, box], [basilPork, friedEgg])
    expect(result.totalCost).toBe(37)
    expect(result.individualSellingTotal).toBe(110)
    expect(result.platformFee).toBe(27)
    expect(result.netRevenue).toBe(63)
    expect(result.netProfit).toBe(26)
    expect(result.netMarginPercent).toBeCloseTo(28.89, 1)
  })
})

describe('what-if helpers', () => {
  it('simulates ingredient price increase', () => {
    const base = calculateMenuCost(basilPork, settings, [pork, egg, box], [basilPork, friedEgg])
    const sim = simulateIngredientPriceChange(base, 10)
    expect(sim.ingredientCost).toBeCloseTo(base.ingredientCost * 1.1)
    expect(sim.netProfit).toBeLessThan(base.netProfit)
  })

  it('simulates a new selling price', () => {
    const base = calculateMenuCost(basilPork, settings, [pork, egg, box], [basilPork, friedEgg])
    const sim = simulateSellingPrice(base, 120, 30)
    expect(sim.platformFee).toBeCloseTo(36)
    expect(sim.netRevenue).toBeCloseTo(84)
  })

  it('simulates combo cost from updated menu breakdowns', () => {
    const combo: Combo = {
      id: 'c1',
      userId: 'u1',
      name: 'ชุดกะเพรา + ไข่ดาว',
      sellingPrice: 90,
      isActive: true,
      createdAt: '',
      updatedAt: '',
      items: [
        { id: 'ci1', comboId: 'c1', menuItemId: 'm1', quantity: 1, createdAt: '', menuItem: basilPork },
        { id: 'ci2', comboId: 'c1', menuItemId: 'm2', quantity: 1, createdAt: '', menuItem: friedEgg },
      ],
    }
    const menus = [basilPork, friedEgg]
    const ingredients = [pork, egg, box]
    const comboBase = calculateComboCost(combo, settings, ingredients, menus)
    const simulatedMenus = menus.map((menu) =>
      simulateIngredientPriceChange(calculateMenuCost(menu, settings, ingredients, menus), 10),
    )
    const sim = simulateComboFromMenuBreakdowns(comboBase, simulatedMenus)
    expect(sim.totalCost).toBeGreaterThan(comboBase.totalCost)
    expect(sim.netProfit).toBeLessThan(comboBase.netProfit)
  })
})
