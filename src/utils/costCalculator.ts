import type {
  Combo,
  ComboCostBreakdown,
  Ingredient,
  MenuCostBreakdown,
  MenuItem,
  StoreSettings,
} from '@/types/models'

interface RecipeCost {
  ingredientCost: number
  packagingCost: number
  ingredientDetails: MenuCostBreakdown['ingredientDetails']
  packagingDetails: MenuCostBreakdown['packagingDetails']
}

function mergeDetails(
  target: MenuCostBreakdown['ingredientDetails'],
  extra: MenuCostBreakdown['ingredientDetails'],
  multiplier: number,
) {
  extra.forEach((detail) => {
    const existing = target.find((d) => d.ingredient.id === detail.ingredient.id)
    if (existing) {
      existing.quantity += detail.quantity * multiplier
      existing.cost += detail.cost * multiplier
    } else {
      target.push({
        ingredient: detail.ingredient,
        quantity: detail.quantity * multiplier,
        cost: detail.cost * multiplier,
      })
    }
  })
}

export function calculateMenuCost(
  menuItem: MenuItem,
  storeSettings: StoreSettings,
  allIngredients: Ingredient[],
  allMenuItems: MenuItem[],
): MenuCostBreakdown {
  const getIngredient = (id: string) =>
    allIngredients.find((i) => i.id === id)

  const calculateRecipeCost = (menu: MenuItem, visited = new Set<string>()): RecipeCost => {
    if (visited.has(menu.id)) {
      throw new Error(`พบการอ้างอิงเมนูพ่วงวนซ้ำ: ${menu.name}`)
    }
    visited.add(menu.id)

    let ingredientCost = 0
    let packagingCost = 0
    const ingredientDetails: RecipeCost['ingredientDetails'] = []
    const packagingDetails: RecipeCost['packagingDetails'] = []

    menu.recipeLines?.forEach((line) => {
      const ingredient = line.ingredient ?? getIngredient(line.ingredientId)
      if (!ingredient) return

      const cost = line.quantityPerUnit * ingredient.pricePerUnit

      if (ingredient.type === 'ingredient') {
        ingredientCost += cost
        ingredientDetails.push({
          ingredient,
          quantity: line.quantityPerUnit,
          cost,
        })
      } else {
        packagingCost += cost
        packagingDetails.push({
          ingredient,
          quantity: line.quantityPerUnit,
          cost,
        })
      }
    })

    menu.addons?.forEach((addon) => {
      const addonMenu =
        addon.addonMenuItem ?? allMenuItems.find((m) => m.id === addon.addonMenuItemId)
      if (!addonMenu) return

      const addonCost = calculateRecipeCost(addonMenu, new Set(visited))

      ingredientCost += addonCost.ingredientCost * addon.quantity
      packagingCost += addonCost.packagingCost * addon.quantity

      mergeDetails(ingredientDetails, addonCost.ingredientDetails, addon.quantity)
      mergeDetails(packagingDetails, addonCost.packagingDetails, addon.quantity)
    })

    return { ingredientCost, packagingCost, ingredientDetails, packagingDetails }
  }

  const recipeCost = calculateRecipeCost(menuItem)
  const fixedCost = menuItem.saleUnitType === 'box'
    ? storeSettings.fixedCostBox
    : storeSettings.fixedCostBag

  const totalCost = recipeCost.ingredientCost + recipeCost.packagingCost + fixedCost
  const sellingPrice = menuItem.sellingPrice
  const platformFee = sellingPrice * (storeSettings.platformFeePercent / 100)
  const netRevenue = sellingPrice - platformFee
  const netProfit = netRevenue - totalCost
  const netMarginPercent = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0
  const totalCostPercent = sellingPrice > 0 ? ((totalCost + platformFee) / sellingPrice) * 100 : 0

  return {
    menuItem,
    ingredientCost: recipeCost.ingredientCost,
    packagingCost: recipeCost.packagingCost,
    fixedCost,
    totalCost,
    platformFee,
    netRevenue,
    netProfit,
    netMarginPercent,
    totalCostPercent,
    ingredientDetails: recipeCost.ingredientDetails,
    packagingDetails: recipeCost.packagingDetails,
  }
}

export function calculateSuggestedPrice(
  targetMarginPercent: number,
  totalCost: number,
  platformFeePercent: number,
): number {
  const targetMarginDecimal = targetMarginPercent / 100
  const platformFeeDecimal = platformFeePercent / 100

  if (targetMarginDecimal + platformFeeDecimal >= 1) {
    throw new Error('เป้า margin รวมกับค่าบริการแพลตฟอร์มต้องน้อยกว่า 100%')
  }

  return totalCost / (1 - targetMarginDecimal - platformFeeDecimal)
}

export function simulateIngredientPriceChange(
  breakdown: MenuCostBreakdown,
  priceChangePercent: number,
): MenuCostBreakdown {
  const factor = 1 + priceChangePercent / 100
  const newIngredientCost = breakdown.ingredientCost * factor
  const newTotalCost = newIngredientCost + breakdown.packagingCost + breakdown.fixedCost
  const sellingPrice = breakdown.menuItem.sellingPrice
  const newNetProfit = breakdown.netRevenue - newTotalCost
  const newNetMarginPercent = sellingPrice > 0 ? (newNetProfit / sellingPrice) * 100 : 0
  const newTotalCostPercent = sellingPrice > 0
    ? ((newTotalCost + breakdown.platformFee) / sellingPrice) * 100
    : 0

  return {
    ...breakdown,
    ingredientCost: newIngredientCost,
    totalCost: newTotalCost,
    netProfit: newNetProfit,
    netMarginPercent: newNetMarginPercent,
    totalCostPercent: newTotalCostPercent,
    ingredientDetails: breakdown.ingredientDetails.map((d) => ({
      ...d,
      cost: d.cost * factor,
    })),
  }
}

export function simulateSellingPrice(
  breakdown: MenuCostBreakdown,
  newSellingPrice: number,
  platformFeePercent: number,
): MenuCostBreakdown {
  const platformFee = newSellingPrice * (platformFeePercent / 100)
  const netRevenue = newSellingPrice - platformFee
  const netProfit = netRevenue - breakdown.totalCost
  const netMarginPercent = newSellingPrice > 0 ? (netProfit / newSellingPrice) * 100 : 0
  const totalCostPercent = newSellingPrice > 0
    ? ((breakdown.totalCost + platformFee) / newSellingPrice) * 100
    : 0

  return {
    ...breakdown,
    menuItem: { ...breakdown.menuItem, sellingPrice: newSellingPrice },
    platformFee,
    netRevenue,
    netProfit,
    netMarginPercent,
    totalCostPercent,
  }
}

export function calculateComboCost(
  combo: Combo,
  storeSettings: StoreSettings,
  allIngredients: Ingredient[],
  allMenuItems: MenuItem[],
): ComboCostBreakdown {
  const itemBreakdowns = (combo.items ?? []).map((item) => {
    const menuItem = item.menuItem ?? allMenuItems.find((m) => m.id === item.menuItemId)
    if (!menuItem) {
      return {
        menuItem: {
          id: item.menuItemId,
          userId: '',
          name: 'ไม่พบเมนู',
          saleUnitType: 'box' as const,
          sellingPrice: 0,
          status: 'not_ready' as const,
          isActive: false,
          createdAt: '',
          updatedAt: '',
        },
        quantity: item.quantity,
        unitCost: 0,
        lineCost: 0,
      }
    }

    const cost = calculateMenuCost(menuItem, storeSettings, allIngredients, allMenuItems)
    return {
      menuItem,
      quantity: item.quantity,
      unitCost: cost.totalCost,
      lineCost: cost.totalCost * item.quantity,
    }
  })

  const totalCost = itemBreakdowns.reduce((sum, item) => sum + item.lineCost, 0)
  const individualSellingTotal = itemBreakdowns.reduce(
    (sum, item) => sum + item.menuItem.sellingPrice * item.quantity,
    0,
  )
  const platformFee = combo.sellingPrice * (storeSettings.platformFeePercent / 100)
  const netRevenue = combo.sellingPrice - platformFee
  const netProfit = netRevenue - totalCost
  const netMarginPercent = combo.sellingPrice > 0 ? (netProfit / combo.sellingPrice) * 100 : 0

  return {
    combo,
    totalCost,
    platformFee,
    netRevenue,
    netProfit,
    netMarginPercent,
    individualSellingTotal,
    itemBreakdowns,
  }
}

export function simulateComboFromMenuBreakdowns(
  comboBreakdown: ComboCostBreakdown,
  simulatedMenus: MenuCostBreakdown[],
): ComboCostBreakdown {
  const byId = new Map(simulatedMenus.map((row) => [row.menuItem.id, row]))
  const itemBreakdowns = comboBreakdown.itemBreakdowns.map((item) => {
    const simulated = byId.get(item.menuItem.id)
    if (!simulated) return item
    return {
      ...item,
      unitCost: simulated.totalCost,
      lineCost: simulated.totalCost * item.quantity,
    }
  })

  const totalCost = itemBreakdowns.reduce((sum, item) => sum + item.lineCost, 0)
  const netProfit = comboBreakdown.netRevenue - totalCost
  const sellingPrice = comboBreakdown.combo.sellingPrice
  const netMarginPercent = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0

  return {
    ...comboBreakdown,
    totalCost,
    netProfit,
    netMarginPercent,
    itemBreakdowns,
  }
}
