<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
      <h2 class="text-2xl font-bold">เปรียบเทียบกำไรชุดโปร</h2>
      <select v-model="sortBy" class="input-field sm:w-56">
        <option value="netProfit">เรียงตามกำไรสุทธิ</option>
        <option value="netMarginPercent">เรียงตาม % margin</option>
        <option value="name">เรียงตามชื่อ</option>
      </select>
    </div>

    <div v-if="loading" class="text-center py-8 text-gray-500">กำลังคำนวณ...</div>
    <EmptyState
      v-else-if="sortedBreakdowns.length === 0"
      title="ยังไม่มีชุดโปร"
      description="เลือกหลายเมนูมาขายพร้อมกันเป็นชุด แล้วตั้งราคาขายชุดเพื่อดูต้นทุนและกำไรแยกจากเมนูเดี่ยว"
    >
      <router-link to="/combos" class="btn-primary">สร้างชุดโปร</router-link>
    </EmptyState>

    <div v-else class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชุด</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">เมนูในชุด</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ราคาขายชุด</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ราคาแยกชิ้น</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ต้นทุนรวม</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ค่าบริการ</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">กำไรสุทธิ</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% Margin</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="breakdown in sortedBreakdowns"
              :key="breakdown.combo.id"
              class="hover:bg-gray-50 cursor-pointer"
              :class="getRowClass(breakdown)"
              @click="$emit('select', breakdown.combo)"
            >
              <td class="px-4 py-3 font-medium">{{ breakdown.combo.name }}</td>
              <td class="px-4 py-3 text-sm text-gray-600">
                <ul class="space-y-0.5">
                  <li v-for="item in breakdown.itemBreakdowns" :key="item.menuItem.id">
                    {{ item.menuItem.name }}
                    <span v-if="item.quantity > 1" class="text-gray-400">× {{ item.quantity }}</span>
                  </li>
                </ul>
              </td>
              <td class="px-4 py-3 text-right">{{ formatCurrency(breakdown.combo.sellingPrice) }}</td>
              <td class="px-4 py-3 text-right text-gray-500">{{ formatCurrency(breakdown.individualSellingTotal) }}</td>
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
        <span class="font-semibold">{{ belowTargetCount }}</span> ชุดต่ำกว่าเป้า
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Combo, ComboCostBreakdown } from '@/types/models'
import { formatCurrency } from '@/utils/format'
import EmptyState from '@/components/common/EmptyState.vue'

const props = defineProps<{
  breakdowns: ComboCostBreakdown[]
  loading: boolean
  targetMargin?: number
}>()

defineEmits<{
  select: [combo: Combo]
}>()

const sortBy = ref<'netProfit' | 'netMarginPercent' | 'name'>('netProfit')

const sortedBreakdowns = computed(() => {
  const sorted = [...props.breakdowns]
  if (sortBy.value === 'netProfit') sorted.sort((a, b) => b.netProfit - a.netProfit)
  else if (sortBy.value === 'netMarginPercent') sorted.sort((a, b) => b.netMarginPercent - a.netMarginPercent)
  else sorted.sort((a, b) => a.combo.name.localeCompare(b.combo.name, 'th'))
  return sorted
})

const belowTargetCount = computed(() => {
  if (!props.targetMargin) return 0
  return props.breakdowns.filter((b) => b.netMarginPercent < props.targetMargin!).length
})

const getRowClass = (breakdown: ComboCostBreakdown) => {
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
