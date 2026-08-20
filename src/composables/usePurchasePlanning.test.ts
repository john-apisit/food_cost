import { describe, expect, it } from 'vitest'
import { usePurchasePlanning } from '@/composables/usePurchasePlanning'
import type { Ingredient, MenuItem } from '@/types/models'

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

const friedRice: MenuItem = {
  id: 'm1',
  userId: 'u1',
  name: 'ข้าวผัดหมู',
  saleUnitType: 'box',
  sellingPrice: 80,
  isActive: true,
  createdAt: '',
  updatedAt: '',
  recipeLines: [
    { id: 'r1', menuItemId: 'm1', ingredientId: 'i1', quantityPerUnit: 0.1, createdAt: '' },
    { id: 'r2', menuItemId: 'm1', ingredientId: 'p1', quantityPerUnit: 1, createdAt: '' },
  ],
}

describe('purchase planning', () => {
  it('multiplies recipe qty by target qty and days', () => {
    const { calculatePurchaseList } = usePurchasePlanning()
    const items = calculatePurchaseList(
      [{ menuItem: friedRice, quantity: 50 }],
      5,
      [pork, box],
      [friedRice],
    )

    const porkLine = items.find((i) => i.ingredient.id === 'i1')
    const boxLine = items.find((i) => i.ingredient.id === 'p1')

    expect(porkLine?.totalQuantity).toBe(25)
    expect(porkLine?.totalCost).toBe(3750)
    expect(boxLine?.totalQuantity).toBe(250)
    expect(boxLine?.totalCost).toBe(1000)
  })
})
