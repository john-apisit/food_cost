import { computed } from 'vue'
import type {
  AppNotification,
  ComboCostBreakdown,
  Ingredient,
  MenuCostBreakdown,
  StoreSettings,
} from '@/types/models'

export function useNotifications(
  ingredients: () => Ingredient[],
  breakdowns: () => MenuCostBreakdown[],
  settings: () => StoreSettings | null,
  comboBreakdowns: () => ComboCostBreakdown[] = () => [],
) {
  const notifications = computed<AppNotification[]>(() => {
    const items: AppNotification[] = []
    const store = settings()

    ingredients()
      .filter((i) => i.isActive && i.pricePerUnit <= 0)
      .forEach((i) => {
        items.push({
          id: `price-${i.id}`,
          type: 'warning',
          title: 'ยังไม่ตั้งราคา',
          message: `${i.name} ยังไม่มีราคาต่อหน่วย`,
        })
      })

    breakdowns()
      .filter((b) => b.netProfit < 0)
      .forEach((b) => {
        items.push({
          id: `neg-${b.menuItem.id}`,
          type: 'danger',
          title: 'Margin ติดลบ',
          message: `${b.menuItem.name} ขาดทุน ${b.netProfit.toFixed(2)} บาท`,
        })
      })

    comboBreakdowns()
      .filter((b) => b.netProfit < 0)
      .forEach((b) => {
        items.push({
          id: `neg-combo-${b.combo.id}`,
          type: 'danger',
          title: 'ชุดโปรติดลบ',
          message: `${b.combo.name} ขาดทุน ${b.netProfit.toFixed(2)} บาท`,
        })
      })

    if (store?.targetFoodCostPercent != null) {
      breakdowns()
        .filter((b) => b.totalCostPercent > store.targetFoodCostPercent!)
        .forEach((b) => {
          items.push({
            id: `fc-${b.menuItem.id}`,
            type: 'warning',
            title: 'เกินเป้า Food Cost %',
            message: `${b.menuItem.name} ต้นทุนรวม ${b.totalCostPercent.toFixed(1)}% (เป้า ≤ ${store.targetFoodCostPercent}%)`,
          })
        })
    }

    if (store?.targetMarginPercent != null) {
      breakdowns()
        .filter((b) => b.netMarginPercent < store.targetMarginPercent! && b.netProfit >= 0)
        .forEach((b) => {
          items.push({
            id: `mg-${b.menuItem.id}`,
            type: 'info',
            title: 'ต่ำกว่าเป้า margin',
            message: `${b.menuItem.name} ได้ ${b.netMarginPercent.toFixed(1)}% (เป้า ≥ ${store.targetMarginPercent}%)`,
          })
        })
    }

    return items
  })

  return { notifications }
}
