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

export const ROUTINE_KINDS = ['kitchen_prep', 'stock_check', 'custom'] as const
export type RoutineKind = (typeof ROUTINE_KINDS)[number]
export const ROUTINE_KIND_LABELS: Record<RoutineKind, string> = {
  kitchen_prep: 'เตรียมครัว',
  stock_check: 'เช็ควัตถุดิบ',
  custom: 'งานอื่นๆ',
}
export function isRoutineKind(value: unknown): value is RoutineKind {
  return (ROUTINE_KINDS as readonly string[]).includes(String(value))
}

export const ROUTINE_ITEM_SOURCES = ['manual', 'menu_prep', 'ingredient'] as const
export type RoutineItemSource = (typeof ROUTINE_ITEM_SOURCES)[number]
export function isRoutineItemSource(value: unknown): value is RoutineItemSource {
  return (ROUTINE_ITEM_SOURCES as readonly string[]).includes(String(value))
}

export const ROUTINE_RUN_STATUSES = ['pending', 'in_progress', 'done', 'skipped'] as const
export type RoutineRunStatus = (typeof ROUTINE_RUN_STATUSES)[number]
export const ROUTINE_RUN_STATUS_LABELS: Record<RoutineRunStatus, string> = {
  pending: 'ยังไม่เริ่ม',
  in_progress: 'กำลังทำ',
  done: 'เสร็จแล้ว',
  skipped: 'ข้ามวันนี้',
}
export function isRoutineRunStatus(value: unknown): value is RoutineRunStatus {
  return (ROUTINE_RUN_STATUSES as readonly string[]).includes(String(value))
}

export const STOCK_STATUSES = ['ok', 'low', 'out'] as const
export type StockStatus = (typeof STOCK_STATUSES)[number]
export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  ok: 'พอใช้',
  low: 'ใกล้หมด',
  out: 'หมด',
}
export function isStockStatus(value: unknown): value is StockStatus {
  return (STOCK_STATUSES as readonly string[]).includes(String(value))
}

export const ROUTINE_WINDOW_STATUSES = ['upcoming', 'active', 'overdue', 'done', 'skipped'] as const
export type RoutineWindowStatus = (typeof ROUTINE_WINDOW_STATUSES)[number]
export const ROUTINE_WINDOW_STATUS_LABELS: Record<RoutineWindowStatus, string> = {
  upcoming: 'ยังไม่ถึงเวลา',
  active: 'ถึงเวลาแล้ว',
  overdue: 'เลยเวลา',
  done: 'เสร็จแล้ว',
  skipped: 'ข้ามวันนี้',
}

export interface RoutineItem {
  id: string
  routineId: string
  title: string
  notes?: string
  source: RoutineItemSource
  sourceId?: string
  sortOrder: number
  createdAt: string
}

export interface Routine {
  id: string
  userId: string
  storeId?: string
  name: string
  description?: string
  kind: RoutineKind
  days: Weekday[]
  startTime: string
  endTime: string
  includePackaging: boolean
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  items: RoutineItem[]
}

export interface RoutineRunItem {
  id: string
  runId: string
  templateItemId?: string
  title: string
  notes?: string
  source: RoutineItemSource
  sourceId?: string
  sortOrder: number
  isDone: boolean
  doneAt?: string
  doneBy?: string
  stockStatus?: StockStatus
  restockQuantity?: number
  itemNote?: string
  createdAt: string
}

export interface RoutineRun {
  id: string
  routineId: string
  storeId?: string
  userId: string
  runDate: string
  status: RoutineRunStatus
  note?: string
  completedAt?: string
  completedBy?: string
  purchasePlanId?: string
  createdAt: string
  updatedAt: string
  items: RoutineRunItem[]
  routine?: Pick<Routine, 'id' | 'name' | 'kind' | 'description' | 'days' | 'startTime' | 'endTime'>
}

export interface RoutinePayload {
  name: string
  description?: string
  kind: RoutineKind
  days: Weekday[]
  startTime: string
  endTime: string
  includePackaging?: boolean
  isActive?: boolean
  sortOrder?: number
  items: Array<{
    title: string
    notes?: string
    source: RoutineItemSource
    sourceId?: string
  }>
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
  storeId?: string
}

export interface Supplier {
  id: string
  userId: string
  storeId?: string
  name: string
  notes?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Ingredient {
  id: string
  userId: string
  storeId?: string
  name: string
  unit: string
  pricePerUnit: number
  type: IngredientType
  category?: string
  supplierId?: string
  supplier?: Supplier
  notes?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function ingredientSupplierName(ingredient?: Pick<Ingredient, 'supplier'> | null): string | undefined {
  const name = ingredient?.supplier?.name?.trim()
  return name || undefined
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
  storeId?: string
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
  storeId?: string
  name: string
  description?: string
  imageUrl?: string
  status: MenuStatus
  statusNote?: string
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
  storeId?: string
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
  restockLines?: PurchaseRestockLine[]
}

export interface PurchaseRestockLine {
  id: string
  planId: string
  ingredientId: string
  quantity?: number
  stockStatus: Extract<StockStatus, 'low' | 'out'>
  note?: string
  sortOrder: number
  ingredient?: Ingredient
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
  needsRestock?: boolean
  stockStatus?: StockStatus
  restockNote?: string
}

export interface PurchaseSupplierGroup {
  supplierId?: string
  supplier: string
  items: PurchaseItem[]
  totalCost: number
}

export interface PurchaseCategoryGroup {
  category: string
  items: PurchaseItem[]
  totalCost: number
}

export interface SalesRecord {
  id: string
  userId: string
  storeId?: string
  planId?: string
  menuItemId: string
  targetQty?: number
  /** Total pieces sold (includes promo pieces). */
  actualQty: number
  /** Pieces sold under a promotion (subset of actualQty). */
  promoQty: number
  /** Total money received for the promo pieces. */
  promoRevenue: number
  promoNote?: string
  /** Snapshots taken when the sale was recorded; undefined for older records. */
  unitPrice?: number
  unitCost?: number
  platformFeePercent?: number
  saleDate: string
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

export interface ComboFormPayload {
  name: string
  description?: string
  imageUrl?: string
  status: MenuStatus
  statusNote?: string
  sellingPrice: number
  items: Array<{ menuItemId: string; quantity: number }>
}

export const CASH_ENTRY_TYPES = ['income', 'expense', 'transfer'] as const
export type CashEntryType = (typeof CASH_ENTRY_TYPES)[number]

export const CASH_CATEGORIES = [
  'platform_payout',
  'other_income',
  'ingredient',
  'packaging',
  'equipment',
  'utility',
  'labor',
  'other',
  'owner_draw',
] as const
export type CashCategory = (typeof CASH_CATEGORIES)[number]

export const CASH_PAYMENT_METHODS = ['cash', 'bank_transfer'] as const
export type CashPaymentMethod = (typeof CASH_PAYMENT_METHODS)[number]

export const CASH_ENTRY_TYPE_LABELS: Record<CashEntryType, string> = {
  income: 'รายรับ',
  expense: 'รายจ่าย',
  transfer: 'ไม่นับกำไร',
}

export const CASH_CATEGORY_LABELS: Record<CashCategory, string> = {
  platform_payout: 'รับโอนแพลตฟอร์ม',
  other_income: 'รายได้อื่น',
  ingredient: 'วัตถุดิบ',
  packaging: 'บรรจุภัณฑ์',
  equipment: 'อุปกรณ์ครัว',
  utility: 'สาธารณูปโภค',
  labor: 'แรงงาน',
  other: 'อื่นๆ',
  owner_draw: 'ถอนส่วนตัว',
}

export const CASH_PAYMENT_METHOD_LABELS: Record<CashPaymentMethod, string> = {
  cash: 'เงินสด',
  bank_transfer: 'โอนบัญชี',
}

export const CASH_CATEGORIES_BY_TYPE: Record<CashEntryType, readonly CashCategory[]> = {
  income: ['platform_payout', 'other_income'],
  expense: ['ingredient', 'packaging', 'equipment', 'utility', 'labor', 'other'],
  transfer: ['owner_draw'],
}

export function isCashEntryType(value: unknown): value is CashEntryType {
  return (CASH_ENTRY_TYPES as readonly string[]).includes(String(value))
}

export function isCashCategory(value: unknown): value is CashCategory {
  return (CASH_CATEGORIES as readonly string[]).includes(String(value))
}

export function isCashPaymentMethod(value: unknown): value is CashPaymentMethod {
  return (CASH_PAYMENT_METHODS as readonly string[]).includes(String(value))
}

export interface CashEntry {
  id: string
  userId: string
  storeId?: string
  type: CashEntryType
  category: CashCategory
  amount: number
  occurredAt: string
  paymentMethod: CashPaymentMethod
  counterparty?: string
  note?: string
  periodFrom?: string
  periodTo?: string
  grossAmount?: number
  feeAmount?: number
  adjustmentAmount?: number
  ingredientId?: string
  supplierId?: string
  quantity?: number
  unit?: string
  isAsset: boolean
  planId?: string
  createdAt: string
  updatedAt: string
  ingredient?: Ingredient
  supplier?: Supplier
  planName?: string
}

export interface CashEntryPayload {
  type: CashEntryType
  category: CashCategory
  amount: number
  occurredAt: string
  paymentMethod: CashPaymentMethod
  counterparty?: string
  note?: string
  periodFrom?: string
  periodTo?: string
  grossAmount?: number
  feeAmount?: number
  adjustmentAmount?: number
  ingredientId?: string
  supplierId?: string
  quantity?: number
  unit?: string
  isAsset?: boolean
  planId?: string
}

export interface CashbookSummary {
  income: number
  operatingExpense: number
  assetSpend: number
  ownerDraw: number
  operatingCash: number
  byCategory: Array<{ category: CashCategory; amount: number }>
}
