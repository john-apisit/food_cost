import { ref } from 'vue'
import { supabase } from '@/config/supabase'
import type { PurchasePlan, PurchaseRestockLine } from '@/types/models'
import { mapPurchasePlan } from '@/types/mappers'
import { useAuth } from './useAuth'
import { useCurrentStore } from './useCurrentStore'

const plans = ref<PurchasePlan[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const PLAN_SELECT = `
  *,
  purchase_plan_lines (
    *,
    menu_item:menu_items (*)
  ),
  purchase_plan_restock_lines (
    *,
    ingredient:ingredients (*, supplier:suppliers(*))
  )
`

export type RestockLineInput = {
  ingredientId: string
  quantity?: number | null
  stockStatus: Extract<PurchaseRestockLine['stockStatus'], 'low' | 'out'>
  note?: string
}

export function usePurchasePlans() {
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  const fetchPlans = async () => {
    if (!user.value || !currentStoreId.value) return
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('purchase_plans')
        .select(PLAN_SELECT)
        .eq('store_id', currentStoreId.value)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      plans.value = (data || []).map((row) => mapPurchasePlan(row as Record<string, unknown>))
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'โหลดแผนไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  const replacePlanLines = async (
    planId: string,
    lines: Array<{ menuItemId: string; targetQuantity: number }>,
  ) => {
    const { error: deleteLinesError } = await supabase
      .from('purchase_plan_lines')
      .delete()
      .eq('plan_id', planId)
    if (deleteLinesError) throw deleteLinesError

    if (lines.length === 0) return

    const { error: lineError } = await supabase.from('purchase_plan_lines').insert(
      lines.map((line) => ({
        plan_id: planId,
        menu_item_id: line.menuItemId,
        target_quantity: line.targetQuantity,
      })),
    )
    if (lineError) throw lineError
  }

  const findExistingPlanId = async (storeId: string, name: string) => {
    const localMatch = plans.value.find((plan) => plan.name.trim() === name)
    if (localMatch) return localMatch.id

    const { data, error: existingError } = await supabase
      .from('purchase_plans')
      .select('id')
      .eq('store_id', storeId)
      .eq('name', name)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingError) throw existingError
    return data?.id ?? null
  }

  const savePlan = async (payload: {
    name: string
    days: number
    purchaseDate?: string | null
    saleStartDate?: string | null
    saleEndDate?: string | null
    lines: Array<{ menuItemId: string; targetQuantity: number }>
    purchasedIngredientIds?: string[]
  }) => {
    if (!user.value || !currentStoreId.value) return
    loading.value = true

    try {
      const name = payload.name.trim() || 'แผนซื้อของ'
      const purchasedIngredientIds = payload.purchasedIngredientIds ?? []
      const existingId = await findExistingPlanId(currentStoreId.value, name)
      const dates = {
        purchase_date: payload.purchaseDate?.trim() || null,
        sale_start_date: payload.saleStartDate?.trim() || null,
        sale_end_date: payload.saleEndDate?.trim() || null,
      }

      let data: Record<string, unknown>

      if (existingId) {
        const { data: updated, error: updateError } = await supabase
          .from('purchase_plans')
          .update({
            days: payload.days,
            is_template: false,
            purchased_ingredient_ids: purchasedIngredientIds,
            ...dates,
          })
          .eq('id', existingId)
          .select()
          .single()

        if (updateError) throw updateError
        data = updated as Record<string, unknown>
        await replacePlanLines(existingId, payload.lines)
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('purchase_plans')
          .insert({
            user_id: user.value.id,
            store_id: currentStoreId.value,
            name,
            days: payload.days,
            is_template: false,
            purchased_ingredient_ids: purchasedIngredientIds,
            ...dates,
          })
          .select()
          .single()

        if (insertError) throw insertError
        data = inserted as Record<string, unknown>
        await replacePlanLines(inserted.id, payload.lines)
      }

      await fetchPlans()
      return mapPurchasePlan(data)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'บันทึกแผนไม่สำเร็จ'
      throw e
    } finally {
      loading.value = false
    }
  }

  const updatePurchasedIngredientIds = async (planId: string, ingredientIds: string[]) => {
    const { error: updateError } = await supabase
      .from('purchase_plans')
      .update({ purchased_ingredient_ids: ingredientIds })
      .eq('id', planId)
    if (updateError) throw updateError

    plans.value = plans.value.map((plan) =>
      plan.id === planId ? { ...plan, purchasedIngredientIds: ingredientIds } : plan,
    )
  }

  const replaceRestockLines = async (planId: string, lines: RestockLineInput[]) => {
    const { error: deleteError } = await supabase
      .from('purchase_plan_restock_lines')
      .delete()
      .eq('plan_id', planId)
    if (deleteError) throw deleteError

    if (lines.length === 0) return

    const { error: insertError } = await supabase.from('purchase_plan_restock_lines').insert(
      lines.map((line, index) => ({
        plan_id: planId,
        ingredient_id: line.ingredientId,
        quantity: line.quantity ?? null,
        stock_status: line.stockStatus,
        note: line.note?.trim() || null,
        sort_order: index,
      })),
    )
    if (insertError) throw insertError
  }

  const upsertRestockPlan = async (payload: {
    planId?: string | null
    name: string
    purchaseDate: string
    days?: number
    saleStartDate?: string | null
    saleEndDate?: string | null
    menuLines?: Array<{ menuItemId: string; targetQuantity: number }>
    restockLines: RestockLineInput[]
  }) => {
    if (!user.value || !currentStoreId.value) return
    const dates = {
      purchase_date: payload.purchaseDate,
      sale_start_date: payload.saleStartDate?.trim() || payload.purchaseDate,
      sale_end_date: payload.saleEndDate?.trim() || payload.purchaseDate,
    }

    let planId = payload.planId ?? null

    if (planId) {
      const { error: updateError } = await supabase
        .from('purchase_plans')
        .update({
          name: payload.name,
          days: payload.days ?? 1,
          ...dates,
        })
        .eq('id', planId)
      if (updateError) throw updateError
      if (payload.menuLines) await replacePlanLines(planId, payload.menuLines)
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('purchase_plans')
        .insert({
          user_id: user.value.id,
          store_id: currentStoreId.value,
          name: payload.name,
          days: payload.days ?? 1,
          is_template: false,
          purchased_ingredient_ids: [],
          ...dates,
        })
        .select()
        .single()
      if (insertError) throw insertError
      planId = inserted.id
      if (payload.menuLines?.length) await replacePlanLines(planId, payload.menuLines)
    }

    await replaceRestockLines(planId, payload.restockLines)
    await fetchPlans()
    return plans.value.find((plan) => plan.id === planId) ?? null
  }

  const deletePlan = async (id: string) => {
    const { error: deleteError } = await supabase.from('purchase_plans').delete().eq('id', id)
    if (deleteError) throw deleteError
    plans.value = plans.value.filter((p) => p.id !== id)
  }

  return {
    plans,
    loading,
    error,
    fetchPlans,
    savePlan,
    upsertRestockPlan,
    updatePurchasedIngredientIds,
    deletePlan,
  }
}
