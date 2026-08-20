<template>
  <MainLayout>
    <div class="space-y-6">
      <h1 class="page-title">ยอดขายจริง vs เป้า</h1>

      <form class="card p-6 space-y-4" @submit.prevent="save">
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">เมนู *</label>
            <select v-model="form.menuItemId" required class="input-field w-full">
              <option value="">เลือกเมนู...</option>
              <option v-for="menu in menuItems" :key="menu.id" :value="menu.id">{{ menu.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">ยอดจริง *</label>
            <input v-model.number="form.actualQty" type="number" min="0" required class="input-field w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">เป้า (ถ้ามี)</label>
            <input v-model.number="form.targetQty" type="number" min="0" class="input-field w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">ผูกกับแผนซื้อ</label>
            <select v-model="form.planId" class="input-field w-full">
              <option value="">ไม่ผูก</option>
              <option v-for="plan in plans" :key="plan.id" :value="plan.id">{{ plan.name }}</option>
            </select>
          </div>
        </div>
        <button type="submit" class="btn-primary">บันทึกยอดขาย</button>
      </form>

      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันเวลา</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">เมนู</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">เป้า</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">จริง</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ผลต่าง</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="row in records" :key="row.id">
                <td class="px-4 py-3">{{ formatDate(row.recordedAt) }}</td>
                <td class="px-4 py-3">{{ row.menuItem?.name || row.menuItemId }}</td>
                <td class="px-4 py-3 text-right">{{ row.targetQty ?? '-' }}</td>
                <td class="px-4 py-3 text-right font-medium">{{ row.actualQty }}</td>
                <td class="px-4 py-3 text-right" :class="varianceClass(row)">
                  {{ variance(row) }}
                </td>
                <td class="px-4 py-3 text-right">
                  <button type="button" class="text-red-600 text-sm" @click="remove(row.id)">ลบ</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState v-if="!records.length" title="ยังไม่มีบันทึกยอดขาย" />
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useMenu } from '@/composables/useMenu'
import { usePurchasePlans } from '@/composables/usePurchasePlans'
import { useSalesRecords } from '@/composables/useSalesRecords'
import { useToast } from '@/composables/useToast'
import { formatDate } from '@/utils/format'
import type { SalesRecord } from '@/types/models'

const { menuItems, fetchMenuItems } = useMenu()
const { plans, fetchPlans } = usePurchasePlans()
const { records, fetchRecords, createRecord, deleteRecord } = useSalesRecords()
const { success, error } = useToast()

const form = reactive({
  menuItemId: '',
  actualQty: 0,
  targetQty: undefined as number | undefined,
  planId: '',
})

const variance = (row: SalesRecord) => {
  if (row.targetQty == null) return '-'
  const diff = row.actualQty - row.targetQty
  return diff > 0 ? `+${diff}` : String(diff)
}

const varianceClass = (row: SalesRecord) => {
  if (row.targetQty == null) return 'text-gray-500'
  return row.actualQty < row.targetQty ? 'text-red-600' : 'text-green-600'
}

const save = async () => {
  try {
    await createRecord({
      menuItemId: form.menuItemId,
      actualQty: form.actualQty,
      targetQty: form.targetQty,
      planId: form.planId || undefined,
    })
    success('บันทึกยอดขายแล้ว')
    form.actualQty = 0
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
  }
}

const remove = async (id: string) => {
  if (!confirm('ลบรายการนี้?')) return
  await deleteRecord(id)
}

onMounted(async () => {
  await Promise.all([fetchMenuItems(), fetchPlans(), fetchRecords()])
})
</script>
