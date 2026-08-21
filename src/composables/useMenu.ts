import { ref } from 'vue'
import { supabase } from '@/config/supabase'
import type { MenuFormPayload, MenuItem } from '@/types/models'
import { mapMenuItem } from '@/types/mappers'
import { useAuth } from './useAuth'

const MENU_SELECT = `
  *,
  recipe_lines (
    *,
    ingredient:ingredients (*)
  ),
  menu_addons:menu_addons!menu_addons_menu_item_id_fkey (
    *,
    addon_menu_item:menu_items!addon_menu_item_id (
      *,
      recipe_lines (
        *,
        ingredient:ingredients (*)
      )
    )
  )
`

const menuItems = ref<MenuItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useMenu() {
  const { user } = useAuth()

  const fetchMenuItems = async (includeInactive = false) => {
    if (!user.value) return

    loading.value = true
    error.value = null

    try {
      let query = supabase
        .from('menu_items')
        .select(MENU_SELECT)
        .eq('user_id', user.value.id)
        .order('name')

      if (!includeInactive) query = query.eq('is_active', true)

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError
      menuItems.value = (data || []).map((row) => mapMenuItem(row as Record<string, unknown>))
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'โหลดเมนูไม่สำเร็จ'
      console.error('Fetch menu items error:', e)
    } finally {
      loading.value = false
    }
  }

  const fetchMenuItemById = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('menu_items')
        .select(MENU_SELECT)
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      return mapMenuItem(data as Record<string, unknown>)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'โหลดเมนูไม่สำเร็จ'
      console.error('Fetch menu item error:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const createMenuItem = async (menuItem: MenuFormPayload) => {
    if (!user.value) return

    loading.value = true
    error.value = null

    try {
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .insert({
          user_id: user.value.id,
          name: menuItem.name,
          description: menuItem.description || null,
          sale_unit_type: menuItem.saleUnitType,
          selling_price: menuItem.sellingPrice,
          category: menuItem.category || null,
          image_url: menuItem.imageUrl || null,
          status: menuItem.status,
          status_note: menuItem.statusNote || null,
        })
        .select()
        .single()

      if (menuError) throw menuError

      if (menuItem.recipeLines.length > 0) {
        const { error: recipeError } = await supabase.from('recipe_lines').insert(
          menuItem.recipeLines.map((line) => ({
            menu_item_id: menuData.id,
            ingredient_id: line.ingredientId,
            quantity_per_unit: line.quantityPerUnit,
          })),
        )
        if (recipeError) throw recipeError
      }

      if (menuItem.addons && menuItem.addons.length > 0) {
        const { error: addonError } = await supabase.from('menu_addons').insert(
          menuItem.addons.map((addon) => ({
            menu_item_id: menuData.id,
            addon_menu_item_id: addon.addonMenuItemId,
            quantity: addon.quantity,
          })),
        )
        if (addonError) throw addonError
      }

      await fetchMenuItems()
      return mapMenuItem(menuData as Record<string, unknown>, false)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'สร้างเมนูไม่สำเร็จ'
      console.error('Create menu item error:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const updateMenuItem = async (id: string, updates: MenuFormPayload) => {
    loading.value = true
    error.value = null

    try {
      const { error: updateError } = await supabase
        .from('menu_items')
        .update({
          name: updates.name,
          description: updates.description || null,
          sale_unit_type: updates.saleUnitType,
          selling_price: updates.sellingPrice,
          category: updates.category || null,
          image_url: updates.imageUrl || null,
          status: updates.status,
          status_note: updates.statusNote || null,
        })
        .eq('id', id)

      if (updateError) throw updateError

      await supabase.from('recipe_lines').delete().eq('menu_item_id', id)
      if (updates.recipeLines.length > 0) {
        const { error: recipeError } = await supabase.from('recipe_lines').insert(
          updates.recipeLines.map((line) => ({
            menu_item_id: id,
            ingredient_id: line.ingredientId,
            quantity_per_unit: line.quantityPerUnit,
          })),
        )
        if (recipeError) throw recipeError
      }

      await supabase.from('menu_addons').delete().eq('menu_item_id', id)
      if (updates.addons && updates.addons.length > 0) {
        const { error: addonError } = await supabase.from('menu_addons').insert(
          updates.addons.map((addon) => ({
            menu_item_id: id,
            addon_menu_item_id: addon.addonMenuItemId,
            quantity: addon.quantity,
          })),
        )
        if (addonError) throw addonError
      }

      await fetchMenuItems()
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'แก้ไขเมนูไม่สำเร็จ'
      console.error('Update menu item error:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const deleteMenuItem = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('menu_items')
        .update({ is_active: false })
        .eq('id', id)

      if (deleteError) throw deleteError
      menuItems.value = menuItems.value.filter((m) => m.id !== id)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'ลบเมนูไม่สำเร็จ'
      console.error('Delete menu item error:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const duplicateMenuItem = async (id: string, newName: string) => {
    const original = await fetchMenuItemById(id)
    if (!original) throw new Error('ไม่พบเมนู')

    await createMenuItem({
      name: newName,
      description: original.description,
      saleUnitType: original.saleUnitType,
      sellingPrice: original.sellingPrice,
      category: original.category,
      imageUrl: original.imageUrl,
      status: original.status,
      statusNote: original.statusNote,
      recipeLines: original.recipeLines?.map((line) => ({
        ingredientId: line.ingredientId,
        quantityPerUnit: line.quantityPerUnit,
      })) || [],
      addons: original.addons?.map((addon) => ({
        addonMenuItemId: addon.addonMenuItemId,
        quantity: addon.quantity,
      })) || [],
    })
  }

  return {
    menuItems,
    loading,
    error,
    fetchMenuItems,
    fetchMenuItemById,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    duplicateMenuItem,
  }
}
