import { describe, expect, it } from 'vitest'
import {
  UNSPECIFIED_SUPPLIER,
  groupPurchaseItemsBySupplier,
  usePurchasePlanning,
} from '@/composables/usePurchasePlanning'
import type { Ingredient, MenuItem, PurchaseItem } from '@/types/models'

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
  status: 'ready_to_sell',
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

  it('groups purchase items by supplier and puts unspecified last', () => {
    const makroPork: PurchaseItem = {
      ingredient: { ...pork, supplier: 'Makro' },
      totalQuantity: 2,
      totalCost: 300,
      fromMenus: [],
    }
    const marketVeg: PurchaseItem = {
      ingredient: { ...pork, id: 'i2', name: 'กะหล่ำ', supplier: 'ตลาดสด' },
      totalQuantity: 1,
      totalCost: 40,
      fromMenus: [],
    }
    const unnamedBox: PurchaseItem = {
      ingredient: { ...box, supplier: '  ' },
      totalQuantity: 10,
      totalCost: 40,
      fromMenus: [],
    }
    const makroRice: PurchaseItem = {
      ingredient: { ...pork, id: 'i3', name: 'ข้าว', supplier: 'Makro' },
      totalQuantity: 5,
      totalCost: 200,
      fromMenus: [],
    }

    const groups = groupPurchaseItemsBySupplier([makroPork, marketVeg, unnamedBox, makroRice])
    const byName = Object.fromEntries(groups.map((g) => [g.supplier, g]))

    expect(groups.map((g) => g.supplier)).toEqual(['ตลาดสด', 'Makro', UNSPECIFIED_SUPPLIER])
    expect(byName.Makro.items).toHaveLength(2)
    expect(byName.Makro.totalCost).toBe(500)
    expect(byName['ตลาดสด'].totalCost).toBe(40)
    expect(byName[UNSPECIFIED_SUPPLIER].totalCost).toBe(40)
    expect(groups.at(-1)?.supplier).toBe(UNSPECIFIED_SUPPLIER)
  })
})
