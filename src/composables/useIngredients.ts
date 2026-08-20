import { ref } from 'vue'
import { supabase } from '@/config/supabase'
import type { Ingredient, IngredientType, PriceHistory } from '@/types/models'
import type { Database } from '@/types/database.types'
import { mapIngredient, mapPriceHistory } from '@/types/mappers'
import { STANDARD_PACKAGING } from '@/utils/packagingPresets'
import { useAuth } from './useAuth'

const ingredients = ref<Ingredient[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useIngredients() {
  const { user } = useAuth()

  const fetchIngredients = async (includeInactive = false) => {
    if (!user.value) return

    loading.value = true
    error.value = null

    try {
      let query = supabase
        .from('ingredients')
        .select('*')
        .eq('user_id', user.value.id)
        .order('name')

      if (!includeInactive) {
        query = query.eq('is_active', true)
      }

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError
      ingredients.value = (data || []).map((row) => mapIngredient(row as Record<string, unknown>))
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'โหลดรายการไม่สำเร็จ'
      console.error('Fetch ingredients error:', e)
    } finally {
      loading.value = false
    }
  }

  const fetchIngredientById = async (id: string) => {
    const { data, error: fetchError } = await supabase
      .from('ingredients')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError
    return mapIngredient(data as Record<string, unknown>)
  }

  const createIngredient = async (ingredient: {
    name: string
    unit: string
    pricePerUnit: number
    type: IngredientType
    category?: string
    supplier?: string
    notes?: string
    isActive?: boolean
  }) => {
    if (!user.value) return

    loading.value = true
    error.value = null

    try {
      const { data, error: insertError } = await supabase
        .from('ingredients')
        .insert({
          user_id: user.value.id,
          name: ingredient.name,
          unit: ingredient.unit,
          price_per_unit: ingredient.pricePerUnit,
          type: ingredient.type,
          category: ingredient.category || null,
          supplier: ingredient.supplier || null,
          notes: ingredient.notes || null,
          is_active: ingredient.isActive ?? true,
        })
        .select()
        .single()

      if (insertError) throw insertError
      const mapped = mapIngredient(data as Record<string, unknown>)
      ingredients.value = [...ingredients.value, mapped].sort((a, b) => a.name.localeCompare(b.name, 'th'))
      return mapped
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'เพิ่มรายการไม่สำเร็จ'
      console.error('Create ingredient error:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const updateIngredient = async (id: string, updates: Partial<Ingredient>) => {
    loading.value = true
    error.value = null

    try {
      const payload: Database['public']['Tables']['ingredients']['Update'] = {}
      if (updates.name !== undefined) payload.name = updates.name
      if (updates.unit !== undefined) payload.unit = updates.unit
      if (updates.pricePerUnit !== undefined) payload.price_per_unit = updates.pricePerUnit
      if (updates.type !== undefined) payload.type = updates.type
      if (updates.category !== undefined) payload.category = updates.category || null
      if (updates.supplier !== undefined) payload.supplier = updates.supplier || null
      if (updates.notes !== undefined) payload.notes = updates.notes || null
      if (updates.isActive !== undefined) payload.is_active = updates.isActive

      const { data, error: updateError } = await supabase
        .from('ingredients')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError
      const mapped = mapIngredient(data as Record<string, unknown>)
      const index = ingredients.value.findIndex((i) => i.id === id)
      if (index !== -1) ingredients.value[index] = mapped
      return mapped
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'แก้ไขรายการไม่สำเร็จ'
      console.error('Update ingredient error:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const deleteIngredient = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('ingredients')
        .update({ is_active: false })
        .eq('id', id)

      if (deleteError) throw deleteError
      ingredients.value = ingredients.value.filter((i) => i.id !== id)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'ลบรายการไม่สำเร็จ'
      console.error('Delete ingredient error:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const searchIngredients = async (searchTerm: string, type?: IngredientType) => {
    if (!user.value) return []

    let query = supabase
      .from('ingredients')
      .select('*')
      .eq('user_id', user.value.id)
      .eq('is_active', true)
      .ilike('name', `%${searchTerm}%`)
      .order('name')

    if (type) query = query.eq('type', type)

    const { data, error: fetchError } = await query
    if (fetchError) throw fetchError
    return (data || []).map((row) => mapIngredient(row as Record<string, unknown>))
  }

  const fetchPriceHistory = async (ingredientId: string): Promise<PriceHistory[]> => {
    const { data, error: fetchError } = await supabase
      .from('ingredient_price_history')
      .select('*')
      .eq('ingredient_id', ingredientId)
      .order('effective_at', { ascending: false })

    if (fetchError) throw fetchError
    return (data || []).map((row) => mapPriceHistory(row as Record<string, unknown>))
  }

  const seedStandardPackaging = async () => {
    if (!user.value) return

    await fetchIngredients()
    const existingNames = new Set(ingredients.value.filter((i) => i.type === 'packaging').map((i) => i.name))

    for (const item of STANDARD_PACKAGING) {
      if (existingNames.has(item.name)) continue
      await createIngredient({
        name: item.name,
        unit: item.unit,
        pricePerUnit: 0,
        type: 'packaging',
        category: item.category,
        notes: item.notes,
      })
    }

    await fetchIngredients()
  }

  return {
    ingredients,
    loading,
    error,
    fetchIngredients,
    fetchIngredientById,
    createIngredient,
    updateIngredient,
    deleteIngredient,
    searchIngredients,
    fetchPriceHistory,
    seedStandardPackaging,
  }
}
