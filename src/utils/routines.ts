import { uniquePrepSteps } from '@/composables/usePurchasePlanning'
import {
  INGREDIENT_CATEGORIES,
  WEEKDAYS,
  WEEKDAY_LABELS,
  isOtherIngredientCategory,
  type Ingredient,
  type MenuItem,
  type PurchaseItem,
  type PurchaseRestockLine,
  type Routine,
  type RoutineItem,
  type RoutineKind,
  type RoutineRun,
  type RoutineRunItem,
  type RoutineWindowStatus,
  type StockStatus,
  type Weekday,
} from '@/types/models'
import { parseLocalDate, toDateInputValue } from '@/utils/format'

export const WEEKDAY_MON_FRI: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri']

export type SnapshotItemInput = {
  title: string
  notes?: string
  source: RoutineItem['source']
  sourceId?: string
  templateItemId?: string
}

export type RestockDraft = {
  ingredient: Ingredient
  quantity?: number
  stockStatus: Extract<StockStatus, 'low' | 'out'>
  note?: string
}

export function normalizeTime(value: string): string {
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})/)
  if (!match) return '00:00'
  return `${match[1].padStart(2, '0')}:${match[2]}`
}

export function formatTimeRange(start: string, end: string): string {
  return `${normalizeTime(start)}–${normalizeTime(end)}`
}

export function formatRoutineDays(days: readonly Weekday[]): string {
  return days.map((d) => WEEKDAY_LABELS[d]).join(' ')
}

export function weekdayFromDate(iso: string, fallback = new Date()): Weekday {
  const date = parseLocalDate(iso) ?? fallback
  return WEEKDAYS[(date.getDay() + 6) % 7]
}

export function currentTimeHm(now = new Date()): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export function addDaysIso(iso: string, amount: number): string {
  const date = parseLocalDate(iso) ?? new Date()
  date.setDate(date.getDate() + amount)
  return toDateInputValue(date)
}

export function isRoutineScheduledOn(routine: Pick<Routine, 'days' | 'isActive'>, weekday: Weekday) {
  return routine.isActive && routine.days.includes(weekday)
}

export function routineWindowStatus(
  startTime: string,
  endTime: string,
  runStatus: RoutineRun['status'] | undefined,
  nowHm: string,
): RoutineWindowStatus {
  if (runStatus === 'done') return 'done'
  if (runStatus === 'skipped') return 'skipped'
  const start = normalizeTime(startTime)
  const end = normalizeTime(endTime)
  const now = normalizeTime(nowHm)
  if (now < start) return 'upcoming'
  if (now <= end) return 'active'
  return 'overdue'
}

export function runProgress(kind: RoutineKind, items: RoutineRunItem[]) {
  const total = items.length
  const done =
    kind === 'stock_check'
      ? items.filter((item) => Boolean(item.stockStatus)).length
      : items.filter((item) => item.isDone).length
  return { done, total }
}

function titleKey(value: string) {
  return value.trim().toLocaleLowerCase('th')
}

function compareIngredients(a: Ingredient, b: Ingredient) {
  const categoryA = a.type === 'packaging' ? 'บรรจุภัณฑ์' : isOtherIngredientCategory(a.category) ? 'อื่นๆ' : a.category!
  const categoryB = b.type === 'packaging' ? 'บรรจุภัณฑ์' : isOtherIngredientCategory(b.category) ? 'อื่นๆ' : b.category!
  const order = [...INGREDIENT_CATEGORIES, 'บรรจุภัณฑ์']
  const byCategory = (order.indexOf(categoryA) === -1 ? 99 : order.indexOf(categoryA))
    - (order.indexOf(categoryB) === -1 ? 99 : order.indexOf(categoryB))
  if (byCategory !== 0) return byCategory
  return a.name.localeCompare(b.name, 'th')
}

export function buildKitchenPrepSnapshot(
  templateItems: RoutineItem[],
  menus: MenuItem[],
): SnapshotItemInput[] {
  const result: SnapshotItemInput[] = []
  const seen = new Set<string>()

  const add = (item: SnapshotItemInput) => {
    const key = titleKey(item.title)
    if (!key || seen.has(key)) return
    seen.add(key)
    result.push(item)
  }

  for (const item of [...templateItems].sort((a, b) => a.sortOrder - b.sortOrder)) {
    add({
      title: item.title,
      notes: item.notes,
      source: item.source,
      sourceId: item.sourceId,
      templateItemId: item.id,
    })
  }

  const prepMenus = menus.filter((menu) => menu.isActive && menu.status !== 'discontinued')
  for (const step of uniquePrepSteps(prepMenus.map((menuItem) => ({ menuItem })))) {
    add({
      title: step.step,
      notes: step.fromMenus.join(', '),
      source: 'menu_prep',
    })
  }

  return result
}

export function buildStockCheckSnapshot(
  templateItems: RoutineItem[],
  ingredients: Ingredient[],
  includePackaging = false,
): SnapshotItemInput[] {
  const result: SnapshotItemInput[] = []
  const selectedIds = templateItems
    .filter((item) => item.source === 'ingredient' && item.sourceId)
    .map((item) => item.sourceId!)

  const pool = ingredients.filter((ingredient) => {
    if (!ingredient.isActive) return false
    if (selectedIds.length) return selectedIds.includes(ingredient.id)
    if (ingredient.type === 'packaging') return includePackaging
    return true
  })

  const ordered = selectedIds.length
    ? selectedIds
        .map((id) => pool.find((ingredient) => ingredient.id === id))
        .filter((ingredient): ingredient is Ingredient => Boolean(ingredient))
    : [...pool].sort(compareIngredients)

  const templateByIngredient = new Map(
    templateItems
      .filter((item) => item.source === 'ingredient' && item.sourceId)
      .map((item) => [item.sourceId!, item]),
  )

  for (const ingredient of ordered) {
    const template = templateByIngredient.get(ingredient.id)
    result.push({
      title: ingredient.name,
      notes: template?.notes || [ingredient.supplier?.name, ingredient.unit].filter(Boolean).join(' · '),
      source: 'ingredient',
      sourceId: ingredient.id,
      templateItemId: template?.id,
    })
  }

  for (const item of [...templateItems].sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (item.source !== 'manual') continue
    result.push({
      title: item.title,
      notes: item.notes,
      source: 'manual',
      templateItemId: item.id,
    })
  }

  return result
}

export function buildCustomSnapshot(templateItems: RoutineItem[]): SnapshotItemInput[] {
  return [...templateItems]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      title: item.title,
      notes: item.notes,
      source: item.source,
      sourceId: item.sourceId,
      templateItemId: item.id,
    }))
    .filter((item) => item.title.trim())
}

export function buildRunSnapshot(
  routine: Pick<Routine, 'kind' | 'items' | 'includePackaging'>,
  menus: MenuItem[],
  ingredients: Ingredient[],
): SnapshotItemInput[] {
  if (routine.kind === 'kitchen_prep') return buildKitchenPrepSnapshot(routine.items, menus)
  if (routine.kind === 'stock_check') {
    return buildStockCheckSnapshot(routine.items, ingredients, routine.includePackaging)
  }
  return buildCustomSnapshot(routine.items)
}

export function restockFromRunItems(
  items: RoutineRunItem[],
  ingredients: Ingredient[],
): RestockDraft[] {
  const result: RestockDraft[] = []
  for (const item of items) {
    if (item.stockStatus !== 'low' && item.stockStatus !== 'out') continue
    const ingredient = ingredients.find((row) => row.id === item.sourceId)
    if (!ingredient) continue
    result.push({
      ingredient,
      quantity: item.restockQuantity != null && item.restockQuantity > 0 ? item.restockQuantity : undefined,
      stockStatus: item.stockStatus,
      note: item.itemNote,
    })
  }
  return result
}

export function restockPlanName(purchaseDate: string) {
  return `ซื้อของจากเช็คสต็อก ${purchaseDate}`
}

export function mergeRestockIntoPurchaseItems(
  items: PurchaseItem[],
  restock: Array<RestockDraft | (PurchaseRestockLine & { ingredient?: Ingredient })>,
): PurchaseItem[] {
  const map = new Map(
    items.map((item) => [
      item.ingredient.id,
      { ...item, fromMenus: item.fromMenus.map((menu) => ({ ...menu })) },
    ]),
  )

  for (const row of restock) {
    const ingredient = 'ingredient' in row && row.ingredient && 'pricePerUnit' in row.ingredient
      ? row.ingredient
      : undefined
    if (!ingredient) continue
    const quantity = row.quantity != null && row.quantity > 0 ? row.quantity : 0
    const label = row.stockStatus === 'out' ? 'เช็คสต็อก · หมด' : 'เช็คสต็อก · ใกล้หมด'
    const existing = map.get(ingredient.id)

    if (existing) {
      existing.needsRestock = true
      existing.stockStatus = row.stockStatus
      existing.restockNote = 'note' in row ? row.note : undefined
      if (quantity > existing.totalQuantity) {
        existing.totalQuantity = quantity
        existing.totalCost = quantity * ingredient.pricePerUnit
      }
      if (!existing.fromMenus.some((menu) => menu.menuName.startsWith('เช็คสต็อก'))) {
        existing.fromMenus.unshift({
          menuName: label,
          quantity: quantity || existing.totalQuantity,
        })
      }
    } else {
      map.set(ingredient.id, {
        ingredient,
        totalQuantity: quantity,
        totalCost: quantity * ingredient.pricePerUnit,
        fromMenus: [{ menuName: label, quantity }],
        needsRestock: true,
        stockStatus: row.stockStatus,
        restockNote: 'note' in row ? row.note : undefined,
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (Boolean(a.needsRestock) !== Boolean(b.needsRestock)) return a.needsRestock ? -1 : 1
    return a.ingredient.name.localeCompare(b.ingredient.name, 'th')
  })
}

export const SUGGESTED_ROUTINES: Array<{
  name: string
  description: string
  kind: RoutineKind
  days: Weekday[]
  startTime: string
  endTime: string
  items: Array<{ title: string; source: RoutineItem['source'] }>
}> = [
  {
    name: 'เตรียมห้องครัว',
    description: 'งานก่อนเปิดร้าน — รายการจากขั้นตอนเตรียมของในเมนูจะถูกเติมให้อัตโนมัติ',
    kind: 'kitchen_prep',
    days: WEEKDAY_MON_FRI,
    startTime: '09:00',
    endTime: '10:00',
    items: [
      { title: 'เปิดไฟและเตา', source: 'manual' },
      { title: 'เช็ดเคาน์เตอร์และพื้นที่เตรียมของ', source: 'manual' },
      { title: 'เตรียมบรรจุภัณฑ์ให้พร้อมขาย', source: 'manual' },
    ],
  },
  {
    name: 'เช็ควัตถุดิบคงเหลือ',
    description: 'เช็คของหลังปิดร้าน แล้วสร้างแผนซื้อของวันถัดไปจากรายการที่ใกล้หมดหรือหมด',
    kind: 'stock_check',
    days: WEEKDAY_MON_FRI,
    startTime: '21:00',
    endTime: '22:00',
    items: [],
  },
]
