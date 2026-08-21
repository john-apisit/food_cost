<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
      <h2 class="text-2xl font-bold">{{ title }}</h2>
      <button type="button" class="btn-primary" @click="$emit('add')">
        + {{ addLabel || (type === 'ingredient' ? 'เพิ่มวัตถุดิบ' : type === 'packaging' ? 'เพิ่มบรรจุภัณฑ์' : 'เพิ่มรายการ') }}
      </button>
    </div>

    <slot name="tabs" />

    <div class="flex flex-col sm:flex-row gap-3">
      <input
        v-model="searchTerm"
        type="search"
        placeholder="ค้นหา..."
        class="input-field flex-1"
        aria-label="ค้นหา"
      />
      <select v-if="!type" v-model="filterType" class="input-field w-full sm:w-48">
        <option value="">ทั้งหมด</option>
        <option value="ingredient">วัตถุดิบ</option>
        <option value="packaging">บรรจุภัณฑ์</option>
      </select>
    </div>

    <div v-if="loading" class="text-center py-8 text-gray-500">กำลังโหลด...</div>

    <EmptyState
      v-else-if="filteredItems.length === 0"
      title="ไม่พบรายการ"
      description="เพิ่มรายการแรกเพื่อเริ่มคำนวณต้นทุน"
    />

    <div v-else class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชื่อ</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">หน่วย</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ราคา/หน่วย</th>
              <th v-if="!type" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ประเภท</th>
              <th v-if="!hideCategory" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">หมวดหมู่</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ซัพพลายเออร์</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">จัดการ</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="item in filteredItems"
              :key="item.id"
              class="hover:bg-gray-50"
            >
              <td class="px-4 py-3 font-medium">{{ item.name }}</td>
              <td class="px-4 py-3">{{ item.unit }}</td>
              <td class="px-4 py-3" :class="item.pricePerUnit <= 0 ? 'text-yellow-700' : ''">
                {{ formatCurrency(item.pricePerUnit) }}
              </td>
              <td v-if="!type" class="px-4 py-3">
                <span
                  class="px-2 py-1 text-xs rounded-full"
                  :class="item.type === 'ingredient' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'"
                >
                  {{ item.type === 'ingredient' ? 'วัตถุดิบ' : 'บรรจุภัณฑ์' }}
                </span>
              </td>
              <td v-if="!hideCategory" class="px-4 py-3 text-gray-500">{{ item.category || '-' }}</td>
              <td class="px-4 py-3 text-gray-500">{{ item.supplier || '-' }}</td>
              <td class="px-4 py-3 text-right text-sm font-medium whitespace-nowrap">
                <button type="button" class="text-gray-600 hover:text-gray-900 mr-3" @click="$emit('history', item)">
                  ประวัติราคา
                </button>
                <button type="button" class="text-primary-600 hover:text-primary-900 mr-3" @click="$emit('edit', item)">
                  แก้ไข
                </button>
                <button type="button" class="text-red-600 hover:text-red-900" @click="$emit('delete', item)">
                  ลบ
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Ingredient, IngredientType } from '@/types/models'
import { formatCurrency } from '@/utils/format'
import EmptyState from '@/components/common/EmptyState.vue'

const props = defineProps<{
  items: Ingredient[]
  loading: boolean
  title: string
  type?: IngredientType
  addLabel?: string
  hideCategory?: boolean
}>()

defineEmits<{
  add: []
  edit: [item: Ingredient]
  delete: [item: Ingredient]
  history: [item: Ingredient]
}>()

const searchTerm = ref('')
const filterType = ref<IngredientType | ''>('')

const filteredItems = computed(() => {
  let result = props.items
  if (searchTerm.value) {
    const q = searchTerm.value.toLowerCase()
    result = result.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.supplier || '').toLowerCase().includes(q),
    )
  }
  if (filterType.value && !props.type) {
    result = result.filter((item) => item.type === filterType.value)
  }
  return result
})
</script>
