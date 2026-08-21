export type SaleUnitType = 'box' | 'bag'
export type IngredientType = 'ingredient' | 'packaging'
export const INGREDIENT_CATEGORIES = ['เนื้อสัตว์', 'ผัก', 'เครื่องปรุง', 'อื่นๆ'] as const
export const PRIMARY_INGREDIENT_CATEGORIES = ['เนื้อสัตว์', 'ผัก', 'เครื่องปรุง'] as const
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number]

export function isOtherIngredientCategory(category?: string) {
  return !category || !(PRIMARY_INGREDIENT_CATEGORIES as readonly string[]).includes(category)
}

export interface StoreSettings {
  id: string
  userId: string
  platformName: string
  platformFeePercent: number
  fixedCostBox: number
  fixedCostBag: number
  targetFoodCostPercent?: number
  targetMarginPercent?: number
  createdAt: string
  updatedAt: string
}

export interface Ingredient {
  id: string
  userId: string
  name: string
  unit: string
  pricePerUnit: number
  type: IngredientType
  category?: string
  supplier?: string
  notes?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PriceHistory {
  id: string
  ingredientId: string
  pricePerUnit: number
  effectiveAt: string
  notes?: string
}

export interface RecipeLine {
  id: string
  menuItemId: string
  ingredientId: string
  quantityPerUnit: number
  createdAt: string
  ingredient?: Ingredient
}

export interface MenuAddon {
  id: string
  menuItemId: string
  addonMenuItemId: string
  quantity: number
  createdAt: string
  addonMenuItem?: MenuItem
}

export interface MenuItem {
  id: string
  userId: string
  name: string
  saleUnitType: SaleUnitType
  sellingPrice: number
  category?: string
  imageUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  recipeLines?: RecipeLine[]
  addons?: MenuAddon[]
}

export interface CostLineDetail {
  ingredient: Ingredient
  quantity: number
  cost: number
}

export interface MenuCostBreakdown {
  menuItem: MenuItem
  ingredientCost: number
  packagingCost: number
  fixedCost: number
  totalCost: number
  platformFee: number
  netRevenue: number
  netProfit: number
  netMarginPercent: number
  totalCostPercent: number
  ingredientDetails: CostLineDetail[]
  packagingDetails: CostLineDetail[]
}

export interface Combo {
  id: string
  userId: string
  name: string
  sellingPrice: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  items?: ComboItem[]
}

export interface ComboItem {
  id: string
  comboId: string
  menuItemId: string
  quantity: number
  createdAt: string
  menuItem?: MenuItem
}

export interface ComboCostBreakdown {
  combo: Combo
  totalCost: number
  platformFee: number
  netRevenue: number
  netProfit: number
  netMarginPercent: number
  itemBreakdowns: Array<{
    menuItem: MenuItem
    quantity: number
    unitCost: number
    lineCost: number
  }>
}

export interface PurchasePlan {
  id: string
  userId: string
  name: string
  days: number
  isTemplate: boolean
  createdAt: string
  updatedAt: string
  lines?: PurchasePlanLine[]
}

export interface PurchasePlanLine {
  id: string
  planId: string
  menuItemId: string
  targetQuantity: number
  createdAt: string
  menuItem?: MenuItem
}

export interface PurchaseItem {
  ingredient: Ingredient
  totalQuantity: number
  totalCost: number
  fromMenus: Array<{
    menuName: string
    quantity: number
  }>
}

export interface PurchaseSupplierGroup {
  supplier: string
  items: PurchaseItem[]
  totalCost: number
}

export interface SalesRecord {
  id: string
  userId: string
  planId?: string
  menuItemId: string
  targetQty?: number
  actualQty: number
  recordedAt: string
  menuItem?: MenuItem
}

export interface AppNotification {
  id: string
  type: 'warning' | 'danger' | 'info'
  title: string
  message: string
}

export interface MenuFormPayload {
  name: string
  saleUnitType: SaleUnitType
  sellingPrice: number
  category?: string
  imageUrl?: string
  recipeLines: Array<{ ingredientId: string; quantityPerUnit: number }>
  addons?: Array<{ addonMenuItemId: string; quantity: number }>
}
