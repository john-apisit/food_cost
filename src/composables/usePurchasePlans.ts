import { ref } from 'vue'
import { supabase } from '@/config/supabase'
import type { PurchasePlan } from '@/types/models'
import { mapPurchasePlan } from '@/types/mappers'
import { useAuth } from './useAuth'

const plans = ref<PurchasePlan[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const PLAN_SELECT = `
  *,
  purchase_plan_lines (
    *,
    menu_item:menu_items (*)
  )
`

export function usePurchasePlans() {
  const { user } = useAuth()

  const fetchPlans = async () => {
    if (!user.value) return
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('purchase_plans')
        .select(PLAN_SELECT)
        .eq('user_id', user.value.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      plans.value = (data || []).map((row) => mapPurchasePlan(row as Record<string, unknown>))
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'โหลดแผนไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  const savePlan = async (payload: {
    name: string
    days: number
    isTemplate: boolean
    lines: Array<{ menuItemId: string; targetQuantity: number }>
  }) => {
    if (!user.value) return
    loading.value = true

    try {
      const { data, error: insertError } = await supabase
        .from('purchase_plans')
        .insert({
          user_id: user.value.id,
          name: payload.name,
          days: payload.days,
          is_template: payload.isTemplate,
        })
        .select()
        .single()

      if (insertError) throw insertError

      if (payload.lines.length > 0) {
        const { error: lineError } = await supabase.from('purchase_plan_lines').insert(
          payload.lines.map((line) => ({
            plan_id: data.id,
            menu_item_id: line.menuItemId,
            target_quantity: line.targetQuantity,
          })),
        )
        if (lineError) throw lineError
      }

      await fetchPlans()
      return mapPurchasePlan(data as Record<string, unknown>)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'บันทึกแผนไม่สำเร็จ'
      throw e
    } finally {
      loading.value = false
    }
  }

  const deletePlan = async (id: string) => {
    const { error: deleteError } = await supabase.from('purchase_plans').delete().eq('id', id)
    if (deleteError) throw deleteError
    plans.value = plans.value.filter((p) => p.id !== id)
  }

  return { plans, loading, error, fetchPlans, savePlan, deletePlan }
}
