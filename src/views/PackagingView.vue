<template>
  <MainLayout>
    <div class="mb-4">
      <button type="button" class="btn-secondary text-sm" :disabled="seeding" @click="seed">
        {{ seeding ? 'กำลังเพิ่ม...' : 'เพิ่มบรรจุภัณฑ์มาตรฐาน (กล่อง / ช้อน / ถุง)' }}
      </button>
    </div>

    <IngredientsList
      title="บรรจุภัณฑ์"
      type="packaging"
      :items="items"
      :loading="loading"
      @add="openCreate"
      @edit="openEdit"
      @delete="confirmDelete"
      @history="openHistory"
    />

    <IngredientFormModal
      :is-open="formOpen"
      :ingredient="editing"
      type="packaging"
      :saving="saving"
      @close="formOpen = false"
      @save="save"
    />

    <PriceHistoryModal
      :is-open="historyOpen"
      :ingredient="historyItem"
      :history="history"
      :loading="historyLoading"
      @close="historyOpen = false"
    />
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import IngredientsList from '@/components/ingredients/IngredientsList.vue'
import IngredientFormModal from '@/components/ingredients/IngredientFormModal.vue'
import PriceHistoryModal from '@/components/ingredients/PriceHistoryModal.vue'
import { useIngredients } from '@/composables/useIngredients'
import { useToast } from '@/composables/useToast'
import type { Ingredient, PriceHistory } from '@/types/models'

const {
  ingredients,
  loading,
  fetchIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  fetchPriceHistory,
  seedStandardPackaging,
} = useIngredients()
const { success, error } = useToast()

const items = computed(() => ingredients.value.filter((i) => i.type === 'packaging'))
const formOpen = ref(false)
const editing = ref<Ingredient | null>(null)
const saving = ref(false)
const seeding = ref(false)
const historyOpen = ref(false)
const historyItem = ref<Ingredient | null>(null)
const history = ref<PriceHistory[]>([])
const historyLoading = ref(false)

const openCreate = () => {
  editing.value = null
  formOpen.value = true
}

const openEdit = (item: Ingredient) => {
  editing.value = item
  formOpen.value = true
}

const save = async (data: {
  name: string
  unit: string
  pricePerUnit: number
  category?: string
  notes?: string
}) => {
  saving.value = true
  try {
    if (editing.value) {
      await updateIngredient(editing.value.id, data)
      success('บันทึกบรรจุภัณฑ์แล้ว')
    } else {
      await createIngredient({ ...data, type: 'packaging' })
      success('เพิ่มบรรจุภัณฑ์แล้ว')
    }
    formOpen.value = false
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
  } finally {
    saving.value = false
  }
}

const confirmDelete = async (item: Ingredient) => {
  if (!confirm(`ลบ ${item.name}?`)) return
  try {
    await deleteIngredient(item.id)
    success('ลบแล้ว')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
  }
}

const seed = async () => {
  seeding.value = true
  try {
    await seedStandardPackaging()
    success('เพิ่มบรรจุภัณฑ์มาตรฐานแล้ว — อย่าลืมใส่ราคา')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'เพิ่มไม่สำเร็จ')
  } finally {
    seeding.value = false
  }
}

const openHistory = async (item: Ingredient) => {
  historyItem.value = item
  historyOpen.value = true
  historyLoading.value = true
  try {
    history.value = await fetchPriceHistory(item.id)
  } catch {
    history.value = []
  } finally {
    historyLoading.value = false
  }
}

onMounted(() => fetchIngredients())
</script>
