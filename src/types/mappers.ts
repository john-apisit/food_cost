import type {
  Combo,
  ComboItem,
  Ingredient,
  MenuAddon,
  MenuItem,
  PriceHistory,
  PurchasePlan,
  PurchasePlanLine,
  RecipeLine,
  SalesRecord,
  StoreSettings,
} from './models'

function num(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function optStr(value: unknown): string | undefined {
  return value == null || value === '' ? undefined : String(value)
}

export function mapStoreSettings(row: Record<string, unknown>): StoreSettings {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    platformName: String(row.platform_name ?? 'LINE MAN'),
    platformFeePercent: num(row.platform_fee_percent, 30),
    fixedCostBox: num(row.fixed_cost_box),
    fixedCostBag: num(row.fixed_cost_bag),
    targetFoodCostPercent: row.target_food_cost_percent == null ? undefined : num(row.target_food_cost_percent),
    targetMarginPercent: row.target_margin_percent == null ? undefined : num(row.target_margin_percent),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function mapIngredient(row: Record<string, unknown>): Ingredient {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    unit: String(row.unit),
    pricePerUnit: num(row.price_per_unit),
    type: row.type === 'packaging' ? 'packaging' : 'ingredient',
    category: optStr(row.category),
    supplier: optStr(row.supplier),
    notes: optStr(row.notes),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function mapPriceHistory(row: Record<string, unknown>): PriceHistory {
  return {
    id: String(row.id),
    ingredientId: String(row.ingredient_id),
    pricePerUnit: num(row.price_per_unit),
    effectiveAt: String(row.effective_at),
    notes: optStr(row.notes),
  }
}

export function mapRecipeLine(row: Record<string, unknown>): RecipeLine {
  const ingredientRaw = row.ingredient as Record<string, unknown> | Record<string, unknown>[] | undefined
  const ingredientRow = Array.isArray(ingredientRaw) ? ingredientRaw[0] : ingredientRaw

  return {
    id: String(row.id),
    menuItemId: String(row.menu_item_id),
    ingredientId: String(row.ingredient_id),
    quantityPerUnit: num(row.quantity_per_unit),
    createdAt: String(row.created_at),
    ingredient: ingredientRow ? mapIngredient(ingredientRow) : undefined,
  }
}

export function mapMenuItem(row: Record<string, unknown>, nested = true): MenuItem {
  const recipeRaw = row.recipe_lines ?? row.recipeLines
  const addonRaw = row.menu_addons ?? row.addons

  const recipeLines = nested && Array.isArray(recipeRaw)
    ? recipeRaw.map((line) => mapRecipeLine(line as Record<string, unknown>))
    : undefined

  const addons = nested && Array.isArray(addonRaw)
    ? addonRaw.map((addon) => mapMenuAddon(addon as Record<string, unknown>))
    : undefined

  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    saleUnitType: row.sale_unit_type === 'bag' ? 'bag' : 'box',
    sellingPrice: num(row.selling_price),
    category: optStr(row.category),
    imageUrl: optStr(row.image_url),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    recipeLines,
    addons,
  }
}

export function mapMenuAddon(row: Record<string, unknown>): MenuAddon {
  const addonRaw = (row.addon_menu_item ?? row.addonMenuItem) as Record<string, unknown> | undefined

  return {
    id: String(row.id),
    menuItemId: String(row.menu_item_id),
    addonMenuItemId: String(row.addon_menu_item_id),
    quantity: num(row.quantity, 1),
    createdAt: String(row.created_at),
    addonMenuItem: addonRaw ? mapMenuItem(addonRaw) : undefined,
  }
}

export function mapComboItem(row: Record<string, unknown>): ComboItem {
  const menuRaw = (row.menu_item ?? row.menuItem) as Record<string, unknown> | undefined

  return {
    id: String(row.id),
    comboId: String(row.combo_id),
    menuItemId: String(row.menu_item_id),
    quantity: num(row.quantity, 1),
    createdAt: String(row.created_at),
    menuItem: menuRaw ? mapMenuItem(menuRaw) : undefined,
  }
}

export function mapCombo(row: Record<string, unknown>): Combo {
  const itemsRaw = row.combo_items ?? row.items

  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    sellingPrice: num(row.selling_price),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    items: Array.isArray(itemsRaw)
      ? itemsRaw.map((item) => mapComboItem(item as Record<string, unknown>))
      : undefined,
  }
}

export function mapPurchasePlanLine(row: Record<string, unknown>): PurchasePlanLine {
  const menuRaw = (row.menu_item ?? row.menuItem) as Record<string, unknown> | undefined

  return {
    id: String(row.id),
    planId: String(row.plan_id),
    menuItemId: String(row.menu_item_id),
    targetQuantity: num(row.target_quantity),
    createdAt: String(row.created_at),
    menuItem: menuRaw ? mapMenuItem(menuRaw) : undefined,
  }
}

export function mapPurchasePlan(row: Record<string, unknown>): PurchasePlan {
  const linesRaw = row.purchase_plan_lines ?? row.lines

  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    days: num(row.days, 1),
    isTemplate: Boolean(row.is_template),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lines: Array.isArray(linesRaw)
      ? linesRaw.map((line) => mapPurchasePlanLine(line as Record<string, unknown>))
      : undefined,
  }
}

export function mapSalesRecord(row: Record<string, unknown>): SalesRecord {
  const menuRaw = (row.menu_item ?? row.menuItem) as Record<string, unknown> | undefined

  return {
    id: String(row.id),
    userId: String(row.user_id),
    planId: optStr(row.plan_id),
    menuItemId: String(row.menu_item_id),
    targetQty: row.target_qty == null ? undefined : num(row.target_qty),
    actualQty: num(row.actual_qty),
    recordedAt: String(row.recorded_at),
    menuItem: menuRaw ? mapMenuItem(menuRaw, false) : undefined,
  }
}
