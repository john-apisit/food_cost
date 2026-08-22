export type SaleUnitType = 'box' | 'bag'
export type IngredientType = 'ingredient' | 'packaging'
export const INGREDIENT_CATEGORIES = ['เนื้อสัตว์', 'ผัก', 'เครื่องปรุง', 'อื่นๆ'] as const
export const PRIMARY_INGREDIENT_CATEGORIES = ['เนื้อสัตว์', 'ผัก', 'เครื่องปรุง'] as const
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number]
export const MENU_STATUSES = [
  'ready_to_sell',
  'testing_recipe',
  'not_ready',
  'discontinued',
] as const
export type MenuStatus = (typeof MENU_STATUSES)[number]
export const MENU_STATUS_LABELS: Record<MenuStatus, string> = {
  ready_to_sell: 'พร้อมขาย',
  testing_recipe: 'กำลังทดลองสูตร',
  not_ready: 'ยังไม่พร้อม',
  discontinued: 'ยกเลิกขาย',
}
export function isMenuStatus(value: unknown): value is MenuStatus {
  return (MENU_STATUSES as readonly string[]).includes(String(value))
}
export const MENU_CATEGORIES = [
  'อาหารจานเดียว',
  'แกง / ต้ม',
  'ผัด',
  'ทอด',
  'ย่าง / ปิ้ง / อบ',
  'ยำ / สลัด',
  'เส้น / ก๋วยเตี๋ยว',
  'ทานเล่น / ของว่าง',
  'อาหารเช้า',
  'ของหวาน',
  'เครื่องดื่ม',
] as const
export type MenuCategory = (typeof MENU_CATEGORIES)[number]

export function isOtherIngredientCategory(category?: string) {
  return !category || !(PRIMARY_INGREDIENT_CATEGORIES as readonly string[]).includes(category)
}

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type Weekday = (typeof WEEKDAYS)[number]
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'จันทร์',
  tue: 'อังคาร',
  wed: 'พุธ',
  thu: 'พฤหัส',
  fri: 'ศุกร์',
  sat: 'เสาร์',
  sun: 'อาทิตย์',
}
export function isWeekday(value: unknown): value is Weekday {
  return (WEEKDAYS as readonly string[]).includes(String(value))
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
  storeName?: string
  storeDescription?: string
  logoUrl?: string
  bannerUrl?: string
  openTime?: string
  closeTime?: string
  openDays: Weekday[]
  googleMapUrl?: string
  address?: string
  phone?: string
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
  description?: string
  saleUnitType: SaleUnitType
  sellingPrice: number
  category?: string
  imageUrl?: string
  status: MenuStatus
  statusNote?: string
  prepSteps?: string[]
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
  individualSellingTotal: number
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
  purchaseDate?: string
  saleStartDate?: string
  saleEndDate?: string
  isTemplate: boolean
  purchasedIngredientIds: string[]
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
  description?: string
  saleUnitType: SaleUnitType
  sellingPrice: number
  category?: string
  imageUrl?: string
  status: MenuStatus
  statusNote?: string
  prepSteps?: string[]
  recipeLines: Array<{ ingredientId: string; quantityPerUnit: number }>
  addons?: Array<{ addonMenuItemId: string; quantity: number }>
}
