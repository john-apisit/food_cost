import { ref } from 'vue'
import { supabase } from '@/config/supabase'
import type { Combo, ComboFormPayload } from '@/types/models'
import { mapCombo } from '@/types/mappers'
import { useAuth } from './useAuth'
import { useCurrentStore } from './useCurrentStore'

const COMBO_SELECT = `
  *,
  combo_items (
    *,
    menu_item:menu_items (
      *,
      recipe_lines (
        *,
        ingredient:ingredients (*, supplier:suppliers(*))
      ),
      menu_addons:menu_addons!menu_addons_menu_item_id_fkey (
        *,
        addon_menu_item:menu_items!addon_menu_item_id (
          *,
          recipe_lines (
            *,
            ingredient:ingredients (*, supplier:suppliers(*))
          )
        )
      )
    )
  )
`

const combos = ref<Combo[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useCombos() {
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  const fetchCombos = async () => {
    if (!user.value || !currentStoreId.value) return
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('combos')
        .select(COMBO_SELECT)
        .eq('store_id', currentStoreId.value)
        .eq('is_active', true)
        .order('name')

      if (fetchError) throw fetchError
      combos.value = (data || []).map((row) => mapCombo(row as Record<string, unknown>))
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'โหลดชุดโปรโมชันไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  const createCombo = async (payload: ComboFormPayload) => {
    if (!user.value || !currentStoreId.value) return
    loading.value = true

    try {
      const { data, error: insertError } = await supabase
        .from('combos')
        .insert({
          user_id: user.value.id,
          store_id: currentStoreId.value,
          name: payload.name,
          description: payload.description || null,
          image_url: payload.imageUrl || null,
          status: payload.status,
          status_note: payload.statusNote || null,
          selling_price: payload.sellingPrice,
        })
        .select()
        .single()

      if (insertError) throw insertError

      if (payload.items.length > 0) {
        const { error: itemError } = await supabase.from('combo_items').insert(
          payload.items.map((item) => ({
            combo_id: data.id,
            menu_item_id: item.menuItemId,
            quantity: item.quantity,
          })),
        )
        if (itemError) throw itemError
      }

      await fetchCombos()
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'สร้างชุดไม่สำเร็จ'
      throw e
    } finally {
      loading.value = false
    }
  }

  const updateCombo = async (id: string, payload: ComboFormPayload) => {
    loading.value = true
    try {
      const { error: updateError } = await supabase
        .from('combos')
        .update({
          name: payload.name,
          description: payload.description || null,
          image_url: payload.imageUrl || null,
          status: payload.status,
          status_note: payload.statusNote || null,
          selling_price: payload.sellingPrice,
        })
        .eq('id', id)
      if (updateError) throw updateError

      await supabase.from('combo_items').delete().eq('combo_id', id)
      if (payload.items.length > 0) {
        const { error: itemError } = await supabase.from('combo_items').insert(
          payload.items.map((item) => ({
            combo_id: id,
            menu_item_id: item.menuItemId,
            quantity: item.quantity,
          })),
        )
        if (itemError) throw itemError
      }

      await fetchCombos()
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'แก้ไขชุดไม่สำเร็จ'
      throw e
    } finally {
      loading.value = false
    }
  }

  const deleteCombo = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('combos')
      .update({ is_active: false })
      .eq('id', id)
    if (deleteError) throw deleteError
    combos.value = combos.value.filter((c) => c.id !== id)
  }

  return {
    combos,
    loading,
    error,
    fetchCombos,
    createCombo,
    updateCombo,
    deleteCombo,
  }
}
