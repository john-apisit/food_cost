import { ref } from 'vue'
import { supabase } from '@/config/supabase'
import type { Supplier } from '@/types/models'
import type { Database } from '@/types/database.types'
import { mapSupplier } from '@/types/mappers'
import { useAuth } from './useAuth'
import { useCurrentStore } from './useCurrentStore'

const suppliers = ref<Supplier[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export type SupplierPayload = {
  name: string
  notes?: string
  isActive?: boolean
}

function duplicateNameError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e)
  if (message.includes('idx_suppliers_store_id_lower_name') || message.includes('duplicate key')) {
    return new Error('มีซัพพลายเออร์ชื่อนี้อยู่แล้ว')
  }
  return e instanceof Error ? e : new Error('บันทึกซัพพลายเออร์ไม่สำเร็จ')
}

export function useSuppliers() {
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  const fetchSuppliers = async (includeInactive = false) => {
    if (!user.value || !currentStoreId.value) return

    loading.value = true
    error.value = null

    try {
      let query = supabase
        .from('suppliers')
        .select('*')
        .eq('store_id', currentStoreId.value)
        .order('name')

      if (!includeInactive) query = query.eq('is_active', true)

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError
      suppliers.value = (data || []).map((row) => mapSupplier(row as Record<string, unknown>))
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'โหลดซัพพลายเออร์ไม่สำเร็จ'
      console.error('Fetch suppliers error:', e)
    } finally {
      loading.value = false
    }
  }

  const createSupplier = async (payload: SupplierPayload) => {
    if (!user.value || !currentStoreId.value) return

    const name = payload.name.trim()
    if (!name) throw new Error('กรุณาใส่ชื่อซัพพลายเออร์')

    loading.value = true
    error.value = null

    try {
      const { data, error: insertError } = await supabase
        .from('suppliers')
        .insert({
          user_id: user.value.id,
          store_id: currentStoreId.value,
          name,
          notes: payload.notes?.trim() || null,
          is_active: payload.isActive ?? true,
        })
        .select()
        .single()

      if (insertError) throw insertError
      const mapped = mapSupplier(data as Record<string, unknown>)
      suppliers.value = [...suppliers.value, mapped].sort((a, b) => a.name.localeCompare(b.name, 'th'))
      return mapped
    } catch (e: unknown) {
      const wrapped = duplicateNameError(e)
      error.value = wrapped.message
      console.error('Create supplier error:', e)
      throw wrapped
    } finally {
      loading.value = false
    }
  }

  const updateSupplier = async (id: string, updates: Partial<SupplierPayload>) => {
    loading.value = true
    error.value = null

    try {
      const payload: Database['public']['Tables']['suppliers']['Update'] = {}
      if (updates.name !== undefined) payload.name = updates.name.trim()
      if (updates.notes !== undefined) payload.notes = updates.notes.trim() || null
      if (updates.isActive !== undefined) payload.is_active = updates.isActive

      const { data, error: updateError } = await supabase
        .from('suppliers')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError
      const mapped = mapSupplier(data as Record<string, unknown>)
      const index = suppliers.value.findIndex((item) => item.id === id)
      if (index !== -1) suppliers.value[index] = mapped
      return mapped
    } catch (e: unknown) {
      const wrapped = duplicateNameError(e)
      error.value = wrapped.message
      console.error('Update supplier error:', e)
      throw wrapped
    } finally {
      loading.value = false
    }
  }

  const deleteSupplier = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('suppliers')
        .update({ is_active: false })
        .eq('id', id)

      if (deleteError) throw deleteError
      suppliers.value = suppliers.value.filter((item) => item.id !== id)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'ลบซัพพลายเออร์ไม่สำเร็จ'
      console.error('Delete supplier error:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    suppliers,
    loading,
    error,
    fetchSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  }
}
