import {
  INGREDIENT_CATEGORIES,
  isOtherIngredientCategory,
  type Ingredient,
  type MenuItem,
  type PurchaseCategoryGroup,
  type PurchaseItem,
  type PurchaseSupplierGroup,
  ingredientSupplierName,
} from '@/types/models'
import { getPackagingPresetLines } from '@/utils/packagingPresets'

export const UNSPECIFIED_SUPPLIER = 'ไม่ระบุซัพพลายเออร์'
export const PACKAGING_CATEGORY = 'บรรจุภัณฑ์'

const PURCHASE_CATEGORY_ORDER = [...INGREDIENT_CATEGORIES, PACKAGING_CATEGORY]

export interface PrepStepItem {
  step: string
  fromMenus: string[]
}

export function uniquePrepSteps(
  menuSelections: Array<{ menuItem: MenuItem }>,
): PrepStepItem[] {
  const map = new Map<string, PrepStepItem>()

  for (const { menuItem } of menuSelections) {
    for (const raw of menuItem.prepSteps || []) {
      const step = raw.trim()
      if (!step) continue
      const key = step.toLocaleLowerCase('th')
      const existing = map.get(key)
      if (existing) {
        if (!existing.fromMenus.includes(menuItem.name)) existing.fromMenus.push(menuItem.name)
      } else {
        map.set(key, { step, fromMenus: [menuItem.name] })
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.step.localeCompare(b.step, 'th'))
}

export function supplierLabel(ingredient?: Pick<Ingredient, 'supplier' | 'supplierId'> | null): string {
  return ingredientSupplierName(ingredient) || UNSPECIFIED_SUPPLIER
}

export function purchaseCategoryLabel(item: PurchaseItem): string {
  if (item.ingredient.type === 'packaging') return PACKAGING_CATEGORY
  return isOtherIngredientCategory(item.ingredient.category) ? 'อื่นๆ' : item.ingredient.category!
}

export function comparePurchaseItemsByCategory(a: PurchaseItem, b: PurchaseItem): number {
  const labelA = purchaseCategoryLabel(a)
  const labelB = purchaseCategoryLabel(b)
  const orderA = PURCHASE_CATEGORY_ORDER.indexOf(labelA)
  const orderB = PURCHASE_CATEGORY_ORDER.indexOf(labelB)
  const byCategory = (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB)
  if (byCategory !== 0) return byCategory
  return a.ingredient.name.localeCompare(b.ingredient.name, 'th')
}

export function groupPurchaseItemsBySupplier(items: PurchaseItem[]): PurchaseSupplierGroup[] {
  const map = new Map<string, PurchaseItem[]>()

  for (const item of items) {
    const key = item.ingredient.supplierId || item.ingredient.supplier?.id || UNSPECIFIED_SUPPLIER
    const list = map.get(key)
    if (list) list.push(item)
    else map.set(key, [item])
  }

  return Array.from(map.entries())
    .map(([key, groupItems]) => {
      const itemsByCategory = [...groupItems].sort(comparePurchaseItemsByCategory)
      return {
        supplierId: key === UNSPECIFIED_SUPPLIER ? undefined : key,
        supplier: supplierLabel(groupItems[0]?.ingredient),
        items: itemsByCategory,
        totalCost: itemsByCategory.reduce((sum, item) => sum + item.totalCost, 0),
      }
    })
    .sort((a, b) => {
      if (a.supplier === UNSPECIFIED_SUPPLIER) return 1
      if (b.supplier === UNSPECIFIED_SUPPLIER) return -1
      return a.supplier.localeCompare(b.supplier, 'th')
    })
}

export function groupPurchaseItemsByCategory(items: PurchaseItem[]): PurchaseCategoryGroup[] {
  const map = new Map<string, PurchaseItem[]>()

  for (const item of items) {
    const key = purchaseCategoryLabel(item)
    const list = map.get(key)
    if (list) list.push(item)
    else map.set(key, [item])
  }

  const known = new Set<string>(PURCHASE_CATEGORY_ORDER)
  const extras = Array.from(map.keys())
    .filter((key) => !known.has(key))
    .sort((a, b) => a.localeCompare(b, 'th'))

  return [...PURCHASE_CATEGORY_ORDER, ...extras]
    .filter((category) => map.has(category))
    .map((category) => {
      const groupItems = [...map.get(category)!].sort((a, b) =>
        a.ingredient.name.localeCompare(b.ingredient.name, 'th'),
      )
      return {
        category,
        items: groupItems,
        totalCost: groupItems.reduce((sum, item) => sum + item.totalCost, 0),
      }
    })
}

export function purchaseItemsForMenu(items: PurchaseItem[], menuName: string) {
  return items
    .flatMap((item) => {
      const from = item.fromMenus.find((menu) => menu.menuName === menuName)
      return from ? [{ item, quantity: from.quantity }] : []
    })
    .sort((a, b) => comparePurchaseItemsByCategory(a.item, b.item))
}

export function usePurchasePlanning() {
  const calculatePurchaseList = (
    menuSelections: Array<{ menuItem: MenuItem; quantity: number }>,
    days: number,
    allIngredients: Ingredient[],
    allMenuItems: MenuItem[],
  ): PurchaseItem[] => {
    const purchaseMap = new Map<string, PurchaseItem>()

    const addIngredientToPurchase = (
      ingredientId: string,
      quantity: number,
      menuName: string,
    ) => {
      const ingredient = allIngredients.find((i) => i.id === ingredientId)
      if (!ingredient) return

      if (purchaseMap.has(ingredientId)) {
        const existing = purchaseMap.get(ingredientId)!
        existing.totalQuantity += quantity
        existing.totalCost = existing.totalQuantity * ingredient.pricePerUnit

        const menuEntry = existing.fromMenus.find((m) => m.menuName === menuName)
        if (menuEntry) {
          menuEntry.quantity += quantity
        } else {
          existing.fromMenus.push({ menuName, quantity })
        }
      } else {
        purchaseMap.set(ingredientId, {
          ingredient,
          totalQuantity: quantity,
          totalCost: quantity * ingredient.pricePerUnit,
          fromMenus: [{ menuName, quantity }],
        })
      }
    }

    const packagingCatalog = allIngredients.filter((item) => item.type === 'packaging')

    menuSelections.forEach(({ menuItem, quantity }) => {
      const totalQuantity = quantity * days
      const recipeIngredientIds = new Set(
        (menuItem.recipeLines || []).map((line) => line.ingredientId),
      )

      menuItem.recipeLines?.forEach((line) => {
        addIngredientToPurchase(line.ingredientId, line.quantityPerUnit * totalQuantity, menuItem.name)
      })

      getPackagingPresetLines(menuItem.saleUnitType, packagingCatalog).forEach((line) => {
        if (recipeIngredientIds.has(line.ingredientId)) return
        addIngredientToPurchase(line.ingredientId, line.quantityPerUnit * totalQuantity, menuItem.name)
      })

      const processAddons = (menu: MenuItem, multiplier: number, rootName: string) => {
        menu.addons?.forEach((addon) => {
          const addonMenu =
            addon.addonMenuItem ?? allMenuItems.find((m) => m.id === addon.addonMenuItemId)
          if (!addonMenu) return

          const addonMultiplier = multiplier * addon.quantity

          addonMenu.recipeLines?.forEach((line) => {
            addIngredientToPurchase(
              line.ingredientId,
              line.quantityPerUnit * addonMultiplier,
              `${rootName} (${addonMenu.name})`,
            )
          })

          processAddons(addonMenu, addonMultiplier, rootName)
        })
      }

      processAddons(menuItem, totalQuantity, menuItem.name)
    })

    return Array.from(purchaseMap.values()).sort((a, b) => {
      if (a.ingredient.type !== b.ingredient.type) {
        return a.ingredient.type === 'ingredient' ? -1 : 1
      }
      return a.ingredient.name.localeCompare(b.ingredient.name, 'th')
    })
  }

  return { calculatePurchaseList }
}
