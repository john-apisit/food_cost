import {
  isCashCategory,
  isCashEntryType,
  isCashPaymentMethod,
  isMenuStatus,
  WEEKDAYS,
  type CashEntry,
  type Combo,
  type ComboItem,
  type Ingredient,
  type MenuAddon,
  type MenuItem,
  type PriceHistory,
  type PurchasePlan,
  type PurchasePlanLine,
  type RecipeLine,
  type SalesRecord,
  type StoreSettings,
} from './models'

function num(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function optStr(value: unknown): string | undefined {
  return value == null || value === '' ? undefined : String(value)
}

function optDate(value: unknown): string | undefined {
  if (value == null || value === '') return undefined
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1]
}

function strList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item).trim()).filter(Boolean)
}

function optTime(value: unknown): string | undefined {
  if (value == null || value === '') return undefined
  const match = String(value).match(/^(\d{1,2}:\d{2})/)
  return match?.[1]
}

export function mapStoreSettings(row: Record<string, unknown>): StoreSettings {
  const days = Array.isArray(row.open_days) ? row.open_days.map(String) : []
  return {
    id: String(row.id),
    userId: String(row.user_id),
    platformName: String(row.platform_name ?? 'LINE MAN'),
    platformFeePercent: num(row.platform_fee_percent, 30),
    fixedCostBox: num(row.fixed_cost_box),
    fixedCostBag: num(row.fixed_cost_bag),
    targetFoodCostPercent: row.target_food_cost_percent == null ? undefined : num(row.target_food_cost_percent),
    targetMarginPercent: row.target_margin_percent == null ? undefined : num(row.target_margin_percent),
    storeName: optStr(row.store_name),
    storeDescription: optStr(row.store_description),
    logoUrl: optStr(row.logo_url),
    bannerUrl: optStr(row.banner_url),
    openTime: optTime(row.open_time),
    closeTime: optTime(row.close_time),
    openDays: WEEKDAYS.filter((day) => days.includes(day)),
    googleMapUrl: optStr(row.google_map_url),
    address: optStr(row.address),
    phone: optStr(row.phone),
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
    type: String(row.type).trim() === 'packaging' ? 'packaging' : 'ingredient',
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
    description: optStr(row.description),
    saleUnitType: row.sale_unit_type === 'bag' ? 'bag' : 'box',
    sellingPrice: num(row.selling_price),
    category: optStr(row.category),
    imageUrl: optStr(row.image_url),
    status: isMenuStatus(row.status) ? row.status : 'ready_to_sell',
    statusNote: optStr(row.status_note),
    prepSteps: strList(row.prep_steps),
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
    description: optStr(row.description),
    imageUrl: optStr(row.image_url),
    status: isMenuStatus(row.status) ? row.status : 'ready_to_sell',
    statusNote: optStr(row.status_note),
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
    purchaseDate: optDate(row.purchase_date),
    saleStartDate: optDate(row.sale_start_date),
    saleEndDate: optDate(row.sale_end_date),
    isTemplate: Boolean(row.is_template),
    purchasedIngredientIds: Array.isArray(row.purchased_ingredient_ids)
      ? row.purchased_ingredient_ids.map(String)
      : [],
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
    saleDate: optDate(row.sale_date) ?? String(row.recorded_at).slice(0, 10),
    recordedAt: String(row.recorded_at),
    menuItem: menuRaw ? mapMenuItem(menuRaw, false) : undefined,
  }
}

export function mapCashEntry(row: Record<string, unknown>): CashEntry {
  const ingredientRaw = (row.ingredient ?? row.ingredients) as
    | Record<string, unknown>
    | Record<string, unknown>[]
    | undefined
  const ingredientRow = Array.isArray(ingredientRaw) ? ingredientRaw[0] : ingredientRaw
  const planRaw = (row.plan ?? row.purchase_plans) as
    | Record<string, unknown>
    | Record<string, unknown>[]
    | undefined
  const planRow = Array.isArray(planRaw) ? planRaw[0] : planRaw

  return {
    id: String(row.id),
    userId: String(row.user_id),
    type: isCashEntryType(row.type) ? row.type : 'expense',
    category: isCashCategory(row.category) ? row.category : 'other',
    amount: num(row.amount),
    occurredAt: optDate(row.occurred_at) ?? String(row.created_at).slice(0, 10),
    paymentMethod: isCashPaymentMethod(row.payment_method) ? row.payment_method : 'bank_transfer',
    counterparty: optStr(row.counterparty),
    note: optStr(row.note),
    periodFrom: optDate(row.period_from),
    periodTo: optDate(row.period_to),
    grossAmount: row.gross_amount == null ? undefined : num(row.gross_amount),
    feeAmount: row.fee_amount == null ? undefined : num(row.fee_amount),
    adjustmentAmount: row.adjustment_amount == null ? undefined : num(row.adjustment_amount),
    ingredientId: optStr(row.ingredient_id),
    quantity: row.quantity == null ? undefined : num(row.quantity),
    unit: optStr(row.unit),
    isAsset: Boolean(row.is_asset),
    planId: optStr(row.plan_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    ingredient: ingredientRow ? mapIngredient(ingredientRow) : undefined,
    planName: optStr(planRow?.name),
  }
}
