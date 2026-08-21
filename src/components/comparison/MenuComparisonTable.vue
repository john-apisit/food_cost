<template>
  <div class="space-y-4">
    <div class="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3">
      <h2 class="text-2xl font-bold">เปรียบเทียบกำไรเมนู</h2>
      <div class="flex flex-col sm:flex-row gap-2">
        <select v-model="sortBy" class="input-field">
          <option value="netProfit">เรียงตามกำไรสุทธิ</option>
          <option value="netMarginPercent">เรียงตาม % margin</option>
          <option value="name">เรียงตามชื่อ</option>
        </select>
        <select v-model="filterCategory" class="input-field">
          <option value="">ทุกหมวดหมู่</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
        <select v-model="filterUnitType" class="input-field">
          <option value="">ทุกประเภท</option>
          <option value="box">กล่อง</option>
          <option value="bag">มัดถุง</option>
        </select>
        <MultiSelectFilter
          v-model="filterStatuses"
          placeholder="ทุกสถานะ"
          :options="statusOptions"
        />
      </div>
    </div>

    <div v-if="loading" class="text-center py-8 text-gray-500">กำลังคำนวณ...</div>
    <EmptyState v-else-if="sortedBreakdowns.length === 0" title="ไม่มีเมนู" description="สร้างเมนูพร้อมสูตรก่อนจึงจะเปรียบเทียบได้" />

    <div v-else class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">เมนู</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ประเภท</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ราคาขาย</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ต้นทุนรวม</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ค่าบริการ</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">กำไรสุทธิ</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% Margin</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="breakdown in sortedBreakdowns"
              :key="breakdown.menuItem.id"
              class="hover:bg-gray-50 cursor-pointer"
              :class="getRowClass(breakdown)"
              @click="$emit('select', breakdown.menuItem)"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-3 min-w-0">
                  <MenuImage
                    class="h-10 w-10 shrink-0 rounded-lg border border-gray-100"
                    :src="breakdown.menuItem.imageUrl"
                    :alt="breakdown.menuItem.name"
                    wrapper-class="h-10 w-10"
                    icon-class="h-4 w-4"
                  />
                  <span class="font-medium truncate">{{ breakdown.menuItem.name }}</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <span
                  class="px-2 py-1 text-xs rounded-full"
                  :class="breakdown.menuItem.saleUnitType === 'box' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'"
                >
                  {{ saleUnitLabel(breakdown.menuItem.saleUnitType) }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="space-y-1">
                  <span class="inline-flex px-2 py-1 text-xs rounded-full" :class="menuStatusBadgeClass(breakdown.menuItem.status)">
                    {{ menuStatusLabel(breakdown.menuItem.status) }}
                  </span>
                  <p
                    v-if="breakdown.menuItem.statusNote"
                    class="text-xs text-gray-500 max-w-[12rem] line-clamp-2"
                    :title="breakdown.menuItem.statusNote"
                  >
                    {{ breakdown.menuItem.statusNote }}
                  </p>
                </div>
              </td>
              <td class="px-4 py-3 text-right">{{ formatCurrency(breakdown.menuItem.sellingPrice) }}</td>
              <td class="px-4 py-3 text-right">{{ formatCurrency(breakdown.totalCost) }}</td>
              <td class="px-4 py-3 text-right text-red-600">{{ formatCurrency(breakdown.platformFee) }}</td>
              <td
                class="px-4 py-3 text-right font-semibold"
                :class="breakdown.netProfit < 0 ? 'text-red-600' : 'text-green-600'"
              >
                {{ formatCurrency(breakdown.netProfit) }}
              </td>
              <td class="px-4 py-3 text-right font-semibold" :class="getMarginClass(breakdown.netMarginPercent)">
                {{ breakdown.netMarginPercent.toFixed(1) }}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="targetMargin" class="bg-yellow-50 border-t border-yellow-200 px-4 py-3 text-sm text-yellow-800">
        เป้าหมาย margin: {{ targetMargin }}% —
        <span class="font-semibold">{{ belowTargetCount }}</span> เมนูต่ำกว่าเป้า
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { MENU_STATUSES, MENU_STATUS_LABELS, type MenuCostBreakdown, type MenuItem, type MenuStatus } from '@/types/models'
import { formatCurrency, menuStatusBadgeClass, menuStatusLabel, saleUnitLabel } from '@/utils/format'
import EmptyState from '@/components/common/EmptyState.vue'
import MenuImage from '@/components/menu/MenuImage.vue'
import MultiSelectFilter from '@/components/common/MultiSelectFilter.vue'

const props = defineProps<{
  breakdowns: MenuCostBreakdown[]
  loading: boolean
  targetMargin?: number
}>()

defineEmits<{
  select: [menuItem: MenuItem]
}>()

const sortBy = ref<'netProfit' | 'netMarginPercent' | 'name'>('netProfit')
const filterCategory = ref('')
const filterUnitType = ref<'' | 'box' | 'bag'>('')
const filterStatuses = ref<MenuStatus[]>([])

const statusOptions = MENU_STATUSES.map((status) => ({
  value: status,
  label: MENU_STATUS_LABELS[status],
}))

const categories = computed(() => {
  const cats = new Set<string>()
  props.breakdowns.forEach((b) => {
    if (b.menuItem.category) cats.add(b.menuItem.category)
  })
  return Array.from(cats).sort()
})

const filteredBreakdowns = computed(() => {
  return props.breakdowns.filter((b) => {
    if (filterCategory.value && b.menuItem.category !== filterCategory.value) return false
    if (filterUnitType.value && b.menuItem.saleUnitType !== filterUnitType.value) return false
    if (filterStatuses.value.length && !filterStatuses.value.includes(b.menuItem.status)) return false
    return true
  })
})

const sortedBreakdowns = computed(() => {
  const sorted = [...filteredBreakdowns.value]
  if (sortBy.value === 'netProfit') sorted.sort((a, b) => b.netProfit - a.netProfit)
  else if (sortBy.value === 'netMarginPercent') sorted.sort((a, b) => b.netMarginPercent - a.netMarginPercent)
  else sorted.sort((a, b) => a.menuItem.name.localeCompare(b.menuItem.name, 'th'))
  return sorted
})

const belowTargetCount = computed(() => {
  if (!props.targetMargin) return 0
  return props.breakdowns.filter((b) => b.netMarginPercent < props.targetMargin!).length
})

const getRowClass = (breakdown: MenuCostBreakdown) => {
  if (breakdown.netProfit < 0) return 'bg-red-50'
  if (props.targetMargin && breakdown.netMarginPercent < props.targetMargin) return 'bg-yellow-50'
  return ''
}

const getMarginClass = (margin: number) => {
  if (margin < 0) return 'text-red-600'
  if (props.targetMargin && margin < props.targetMargin) return 'text-yellow-600'
  return 'text-green-600'
}
</script>
