<template>
  <MainLayout>
    <IngredientsList
      title="วัตถุดิบ"
      type="ingredient"
      :items="filteredItems"
      :loading="loading"
      :add-label="activeCategory === 'อื่นๆ' ? 'เพิ่มรายการอื่นๆ' : `เพิ่ม${activeCategory}`"
      :hide-category="activeCategory !== 'อื่นๆ'"
      @add="openCreate"
      @edit="openEdit"
      @delete="confirmDelete"
      @history="openHistory"
    >
      <template #tabs>
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex gap-1 sm:gap-4" aria-label="หมวดหมู่วัตถุดิบ">
            <button
              v-for="cat in INGREDIENT_CATEGORIES"
              :key="cat"
              type="button"
              class="whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors"
              :class="
                activeCategory === cat
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              "
              @click="activeCategory = cat"
            >
              {{ cat }}
              <span
                class="ml-1.5 rounded-full px-2 py-0.5 text-xs"
                :class="activeCategory === cat ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'"
              >
                {{ categoryCounts[cat] }}
              </span>
            </button>
          </nav>
        </div>
      </template>
    </IngredientsList>

    <IngredientFormModal
      :is-open="formOpen"
      :ingredient="editing"
      type="ingredient"
      :default-category="activeCategory"
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
import { INGREDIENT_CATEGORIES, isOtherIngredientCategory, type Ingredient, type IngredientCategory, type PriceHistory } from '@/types/models'

const { ingredients, loading, fetchIngredients, createIngredient, updateIngredient, deleteIngredient, fetchPriceHistory } = useIngredients()
const { success, error } = useToast()

const activeCategory = ref<IngredientCategory>(INGREDIENT_CATEGORIES[0])
const items = computed(() => ingredients.value.filter((i) => i.type === 'ingredient'))
const filteredItems = computed(() =>
  items.value.filter((i) =>
    activeCategory.value === 'อื่นๆ'
      ? isOtherIngredientCategory(i.category)
      : i.category === activeCategory.value,
  ),
)
const categoryCounts = computed(() =>
  Object.fromEntries(
    INGREDIENT_CATEGORIES.map((cat) => [
      cat,
      items.value.filter((i) =>
        cat === 'อื่นๆ' ? isOtherIngredientCategory(i.category) : i.category === cat,
      ).length,
    ]),
  ) as Record<IngredientCategory, number>,
)
const formOpen = ref(false)
const editing = ref<Ingredient | null>(null)
const saving = ref(false)
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
  supplier?: string
  notes?: string
}) => {
  saving.value = true
  try {
    if (editing.value) {
      await updateIngredient(editing.value.id, data)
      success('บันทึกวัตถุดิบแล้ว')
    } else {
      await createIngredient({ ...data, type: 'ingredient' })
      success('เพิ่มวัตถุดิบแล้ว')
    }
    if (data.category && (INGREDIENT_CATEGORIES as readonly string[]).includes(data.category)) {
      activeCategory.value = data.category as IngredientCategory
    } else {
      activeCategory.value = 'อื่นๆ'
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
