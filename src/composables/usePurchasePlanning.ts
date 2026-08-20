import type { Ingredient, MenuItem, PurchaseItem } from '@/types/models'

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

    menuSelections.forEach(({ menuItem, quantity }) => {
      const totalQuantity = quantity * days

      menuItem.recipeLines?.forEach((line) => {
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
