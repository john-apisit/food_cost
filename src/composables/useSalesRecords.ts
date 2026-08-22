import { ref } from 'vue'
import { supabase } from '@/config/supabase'
import type { SalesRecord } from '@/types/models'
import { mapSalesRecord } from '@/types/mappers'
import { useAuth } from './useAuth'

const records = ref<SalesRecord[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

type SalesRecordRange = {
  from?: string
  to?: string
}

export function useSalesRecords() {
  const { user } = useAuth()
  let lastRange: SalesRecordRange = {}

  const fetchLatestSaleDate = async (): Promise<string | null> => {
    if (!user.value) return null

    const { data, error: fetchError } = await supabase
      .from('sales_records')
      .select('sale_date')
      .eq('user_id', user.value.id)
      .order('sale_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError) throw fetchError
    return data?.sale_date ?? null
  }

  const fetchRecords = async (range: SalesRecordRange = lastRange) => {
    if (!user.value) return
    lastRange = range
    loading.value = true
    error.value = null

    try {
      let query = supabase
        .from('sales_records')
        .select(`
          *,
          menu_item:menu_items (*)
        `)
        .eq('user_id', user.value.id)

      if (range.from) query = query.gte('sale_date', range.from)
      if (range.to) query = query.lte('sale_date', range.to)

      query = query.order('sale_date', { ascending: false }).order('recorded_at', { ascending: false })
      if (!range.from && !range.to) query = query.limit(200)

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      records.value = (data || []).map((row) => mapSalesRecord(row as Record<string, unknown>))
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'โหลดยอดขายไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  const createRecords = async (
    payloads: Array<{
      menuItemId: string
      actualQty: number
      targetQty?: number
      planId?: string
      saleDate: string
    }>,
  ) => {
    if (!user.value || payloads.length === 0) return
    loading.value = true

    try {
      const { error: insertError } = await supabase.from('sales_records').insert(
        payloads.map((payload) => ({
          user_id: user.value!.id,
          menu_item_id: payload.menuItemId,
          actual_qty: payload.actualQty,
          target_qty: payload.targetQty ?? null,
          plan_id: payload.planId ?? null,
          sale_date: payload.saleDate,
        })),
      )
      if (insertError) throw insertError
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'บันทึกยอดขายไม่สำเร็จ'
      throw e
    } finally {
      loading.value = false
    }
  }

  const deleteRecord = async (id: string) => {
    const { error: deleteError } = await supabase.from('sales_records').delete().eq('id', id)
    if (deleteError) throw deleteError
    records.value = records.value.filter((r) => r.id !== id)
  }

  return { records, loading, error, fetchLatestSaleDate, fetchRecords, createRecords, deleteRecord }
}
