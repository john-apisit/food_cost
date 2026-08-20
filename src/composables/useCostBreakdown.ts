import { computed } from 'vue'
import { calculateComboCost, calculateMenuCost } from '@/utils/costCalculator'
import { useMenu } from './useMenu'
import { useIngredients } from './useIngredients'
import { useStoreSettings } from './useStoreSettings'
import { useCombos } from './useCombos'

export function useCostBreakdown() {
  const { menuItems, fetchMenuItems, loading: menuLoading } = useMenu()
  const { ingredients, fetchIngredients, loading: ingredientLoading } = useIngredients()
  const { settings, fetchSettings, loading: settingsLoading } = useStoreSettings()
  const { combos, fetchCombos } = useCombos()

  const loading = computed(
    () => menuLoading.value || ingredientLoading.value || settingsLoading.value,
  )

  const breakdowns = computed(() => {
    if (!settings.value) return []
    return menuItems.value.map((menu) =>
      calculateMenuCost(menu, settings.value!, ingredients.value, menuItems.value),
    )
  })

  const comboBreakdowns = computed(() => {
    if (!settings.value) return []
    return combos.value.map((combo) =>
      calculateComboCost(combo, settings.value!, ingredients.value, menuItems.value),
    )
  })

  const loadAll = async () => {
    await Promise.all([
      fetchSettings(),
      fetchIngredients(),
      fetchMenuItems(),
      fetchCombos(),
    ])
  }

  return {
    breakdowns,
    comboBreakdowns,
    loading,
    loadAll,
    menuItems,
    ingredients,
    settings,
    combos,
  }
}
