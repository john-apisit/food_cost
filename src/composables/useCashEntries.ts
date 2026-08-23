import { ref } from 'vue'
import { supabase } from '@/config/supabase'
import type { CashEntry, CashEntryPayload } from '@/types/models'
import type { Database } from '@/types/database.types'
import { mapCashEntry } from '@/types/mappers'
import { estimatePlatformPayout, type PlatformPayoutEstimate } from '@/utils/cashbook'
import { useAuth } from './useAuth'

const entries = ref<CashEntry[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const CASH_SELECT = `
  *,
  ingredient:ingredients (id, user_id, name, unit, price_per_unit, type, category, supplier, notes, is_active, created_at, updated_at),
  plan:purchase_plans (id, name)
`

type CashRow = Database['public']['Tables']['cash_entries']['Insert']

function toRow(userId: string, payload: CashEntryPayload): CashRow {
  return {
    user_id: userId,
    type: payload.type,
    category: payload.category,
    amount: payload.amount,
    occurred_at: payload.occurredAt,
    payment_method: payload.paymentMethod,
    counterparty: payload.counterparty?.trim() || null,
    note: payload.note?.trim() || null,
    period_from: payload.periodFrom || null,
    period_to: payload.periodTo || null,
    gross_amount: payload.grossAmount ?? null,
    fee_amount: payload.feeAmount ?? null,
    adjustment_amount: payload.adjustmentAmount ?? null,
    ingredient_id: payload.ingredientId || null,
    quantity: payload.quantity ?? null,
    unit: payload.unit?.trim() || null,
    is_asset: payload.isAsset ?? false,
    plan_id: payload.planId || null,
  }
}

export function useCashEntries() {
  const { user } = useAuth()

  const fetchEntries = async (range: { from: string; to: string }) => {
    if (!user.value) return
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('cash_entries')
        .select(CASH_SELECT)
        .eq('user_id', user.value.id)
        .gte('occurred_at', range.from)
        .lte('occurred_at', range.to)
        .order('occurred_at', { ascending: false })
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      entries.value = (data || []).map((row) => mapCashEntry(row as Record<string, unknown>))
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'โหลดรายการไม่สำเร็จ'
      entries.value = []
    } finally {
      loading.value = false
    }
  }

  const createEntry = async (payload: CashEntryPayload) => {
    if (!user.value) return
    error.value = null

    try {
      const { data, error: insertError } = await supabase
        .from('cash_entries')
        .insert(toRow(user.value.id, payload))
        .select(CASH_SELECT)
        .single()

      if (insertError) throw insertError
      return mapCashEntry(data as Record<string, unknown>)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ'
      throw e
    }
  }

  const updateEntry = async (id: string, payload: CashEntryPayload) => {
    if (!user.value) return
    error.value = null

    try {
      const { user_id: _userId, ...updates } = toRow(user.value.id, payload)
      const { data, error: updateError } = await supabase
        .from('cash_entries')
        .update(updates)
        .eq('id', id)
        .select(CASH_SELECT)
        .single()

      if (updateError) throw updateError
      return mapCashEntry(data as Record<string, unknown>)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'แก้ไขไม่สำเร็จ'
      throw e
    }
  }

  const deleteEntry = async (id: string) => {
    const { error: deleteError } = await supabase.from('cash_entries').delete().eq('id', id)
    if (deleteError) throw deleteError
    entries.value = entries.value.filter((entry) => entry.id !== id)
  }

  const fetchPayoutEstimate = async (
    range: { from: string; to: string },
    platformFeePercent: number,
  ): Promise<PlatformPayoutEstimate> => {
    if (!user.value) return { qty: 0, gross: 0, fee: 0, net: 0 }

    const { data, error: fetchError } = await supabase
      .from('sales_records')
      .select('actual_qty, menu_item:menu_items (selling_price)')
      .eq('user_id', user.value.id)
      .gte('sale_date', range.from)
      .lte('sale_date', range.to)

    if (fetchError) throw fetchError

    const lines = (data || []).map((row) => {
      const record = row as {
        actual_qty: number
        menu_item?: { selling_price?: number } | { selling_price?: number }[] | null
      }
      const menu = Array.isArray(record.menu_item) ? record.menu_item[0] : record.menu_item
      return {
        actualQty: Number(record.actual_qty) || 0,
        sellingPrice: Number(menu?.selling_price) || 0,
      }
    })

    return estimatePlatformPayout(lines, platformFeePercent)
  }

  return {
    entries,
    loading,
    error,
    fetchEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    fetchPayoutEstimate,
  }
}
