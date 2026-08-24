import { ref } from 'vue'
import { supabase } from '@/config/supabase'
import type { StoreSettings } from '@/types/models'
import type { Database } from '@/types/database.types'
import { mapStoreSettings } from '@/types/mappers'
import { useAuth } from './useAuth'
import { useCurrentStore } from './useCurrentStore'

const settings = ref<StoreSettings | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

export function useStoreSettings() {
  const { user } = useAuth()
  const { currentStoreId, loadMemberships } = useCurrentStore()

  const fetchSettings = async () => {
    if (!user.value || !currentStoreId.value) return

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('store_settings')
        .select('*')
        .eq('store_id', currentStoreId.value)
        .maybeSingle()

      if (fetchError) throw fetchError

      if (!data) {
        const { data: created, error: insertError } = await supabase
          .from('store_settings')
          .insert({
            user_id: user.value.id,
            store_id: currentStoreId.value,
            platform_name: 'LINE MAN',
            platform_fee_percent: 30,
            fixed_cost_box: 5,
            fixed_cost_bag: 3,
          })
          .select()
          .single()

        if (insertError) throw insertError
        settings.value = mapStoreSettings(created as Record<string, unknown>)
        return
      }

      settings.value = mapStoreSettings(data as Record<string, unknown>)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'โหลดตั้งค่าไม่สำเร็จ'
      console.error('Fetch settings error:', e)
    } finally {
      loading.value = false
    }
  }

  const updateSettings = async (updates: Partial<StoreSettings>) => {
    if (!user.value || !currentStoreId.value) return

    loading.value = true
    error.value = null

    try {
      const payload: Database['public']['Tables']['store_settings']['Update'] = {}
      if (updates.platformName !== undefined) payload.platform_name = updates.platformName
      if (updates.platformFeePercent !== undefined) payload.platform_fee_percent = updates.platformFeePercent
      if (updates.fixedCostBox !== undefined) payload.fixed_cost_box = updates.fixedCostBox
      if (updates.fixedCostBag !== undefined) payload.fixed_cost_bag = updates.fixedCostBag
      if ('targetFoodCostPercent' in updates) {
        payload.target_food_cost_percent = updates.targetFoodCostPercent ?? null
      }
      if ('targetMarginPercent' in updates) {
        payload.target_margin_percent = updates.targetMarginPercent ?? null
      }
      if ('storeName' in updates) payload.store_name = updates.storeName?.trim() || null
      if ('storeDescription' in updates) payload.store_description = updates.storeDescription?.trim() || null
      if ('logoUrl' in updates) payload.logo_url = updates.logoUrl?.trim() || null
      if ('bannerUrl' in updates) payload.banner_url = updates.bannerUrl?.trim() || null
      if ('openTime' in updates) payload.open_time = updates.openTime?.trim() || null
      if ('closeTime' in updates) payload.close_time = updates.closeTime?.trim() || null
      if ('openDays' in updates) payload.open_days = updates.openDays ?? []
      if ('googleMapUrl' in updates) payload.google_map_url = updates.googleMapUrl?.trim() || null
      if ('address' in updates) payload.address = updates.address?.trim() || null
      if ('phone' in updates) payload.phone = updates.phone?.trim() || null

      const { data, error: updateError } = await supabase
        .from('store_settings')
        .update(payload)
        .eq('store_id', currentStoreId.value)
        .select()
        .single()

      if (updateError) throw updateError
      settings.value = mapStoreSettings(data as Record<string, unknown>)

      if (updates.storeName !== undefined && currentStoreId.value) {
        await supabase
          .from('stores')
          .update({ name: updates.storeName?.trim() || 'ร้านของฉัน' })
          .eq('id', currentStoreId.value)
        await loadMemberships()
      }
      return settings.value
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'บันทึกตั้งค่าไม่สำเร็จ'
      console.error('Update settings error:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings,
  }
}
