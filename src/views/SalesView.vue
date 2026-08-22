<template>
  <MainLayout>
    <div class="space-y-6">
      <h1 class="page-title">ยอดขายจริง vs เป้า</h1>

      <form class="card p-6 space-y-4" @submit.prevent="save">
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">แผนซื้อ *</label>
            <select v-model="selectedPlanId" required class="input-field w-full">
              <option value="">เลือกแผนซื้อ...</option>
              <option v-for="plan in plans" :key="plan.id" :value="plan.id">
                {{ planOptionLabel(plan) }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">วันที่ *</label>
            <input v-model="saleDate" type="date" required class="input-field w-full" />
          </div>
        </div>

        <div v-if="!plans.length" class="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center">
          <p class="font-medium text-gray-700">ยังไม่มีแผนซื้อ</p>
          <p class="mt-1 text-sm text-gray-500">สร้างแผนซื้อก่อน แล้วค่อยกลับมาบันทึกยอดขาย</p>
          <router-link to="/planning" class="btn-primary mt-4 inline-flex">ไปวางแผนซื้อ</router-link>
        </div>

        <div
          v-else-if="!selectedPlanId"
          class="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500"
        >
          เลือกแผนซื้อเพื่อสร้างฟอร์มตามเมนูในแผน
        </div>

        <div
          v-else-if="!entries.length"
          class="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500"
        >
          แผนนี้ยังไม่มีเมนู แก้ไขแผนซื้อแล้วลองใหม่
        </div>

        <div v-else class="overflow-x-auto -mx-6 px-6">
          <table class="min-w-full divide-y text-sm">
            <thead>
              <tr class="text-gray-500">
                <th class="py-2 pr-4 text-left text-xs font-medium uppercase">เมนู</th>
                <th class="py-2 px-4 text-right text-xs font-medium uppercase">เป้า</th>
                <th class="py-2 pl-4 text-left text-xs font-medium uppercase">ยอดจริง *</th>
                <th class="hidden sm:table-cell py-2 pl-4 text-right text-xs font-medium uppercase">ผลต่าง</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="entry in entries" :key="entry.id">
                <td class="py-3 pr-4">
                  <p class="font-medium text-gray-900">{{ entry.menuName }}</p>
                  <p v-if="entry.unitLabel" class="text-xs text-gray-500">{{ entry.unitLabel }}</p>
                </td>
                <td class="py-3 px-4 text-right text-gray-700">{{ entry.targetQty }}</td>
                <td class="py-3 pl-4">
                  <input
                    v-model.number="entry.actualQty"
                    type="number"
                    min="0"
                    required
                    class="input-field w-24 ml-auto text-right"
                  />
                </td>
                <td class="hidden sm:table-cell py-3 pl-4 text-right" :class="entryVarianceClass(entry)">
                  {{ entryVariance(entry) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <button v-if="entries.length" type="submit" class="btn-primary" :disabled="!canSave || loading">
          {{ loading ? 'กำลังบันทึก...' : 'บันทึกยอดขายทั้งหมด' }}
        </button>
      </form>

      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">แผน</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">เมนู</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">เป้า</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">จริง</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ผลต่าง</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="row in records" :key="row.id">
                <td class="px-4 py-3">{{ formatDateOnly(row.saleDate) }}</td>
                <td class="px-4 py-3">{{ planNameById(row.planId) }}</td>
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
import { computed, onMounted, ref, watch } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { usePurchasePlans } from '@/composables/usePurchasePlans'
import { useSalesRecords } from '@/composables/useSalesRecords'
import { useToast } from '@/composables/useToast'
import { formatDateOnly, formatSaleDateRange, saleUnitLabel, toDateInputValue } from '@/utils/format'
import type { PurchasePlan, SalesRecord } from '@/types/models'

type SaleEntry = {
  id: string
  menuItemId: string
  menuName: string
  unitLabel: string
  targetQty: number
  actualQty: number | null
}

const { plans, fetchPlans } = usePurchasePlans()
const { records, loading, fetchRecords, createRecords, deleteRecord } = useSalesRecords()
const { success, error } = useToast()

const selectedPlanId = ref('')
const saleDate = ref(toDateInputValue())
const entries = ref<SaleEntry[]>([])

const selectedPlan = computed(() => plans.value.find((plan) => plan.id === selectedPlanId.value))

const canSave = computed(
  () =>
    Boolean(selectedPlanId.value) &&
    Boolean(saleDate.value) &&
    entries.value.length > 0 &&
    entries.value.every((entry) => Number.isFinite(entry.actualQty)),
)

const saleRangeLabel = (plan: PurchasePlan) =>
  formatSaleDateRange(plan.saleStartDate, plan.saleEndDate)

const planOptionLabel = (plan: PurchasePlan) => {
  const range = saleRangeLabel(plan)
  return range ? `${plan.name} (${range})` : plan.name
}

const planNameById = (planId?: string) => {
  if (!planId) return '-'
  return plans.value.find((plan) => plan.id === planId)?.name || '-'
}

const defaultSaleDate = (plan: PurchasePlan) => {
  const today = toDateInputValue()
  if (plan.saleStartDate && plan.saleEndDate) {
    if (today >= plan.saleStartDate && today <= plan.saleEndDate) return today
    return plan.saleEndDate
  }
  return plan.saleStartDate || plan.saleEndDate || today
}

const entriesFromPlan = (plan?: PurchasePlan): SaleEntry[] =>
  (plan?.lines ?? [])
    .filter((line) => line.menuItemId)
    .map((line, index) => ({
      id: line.id || `${line.menuItemId}-${index}`,
      menuItemId: line.menuItemId,
      menuName: line.menuItem?.name || line.menuItemId,
      unitLabel: line.menuItem ? saleUnitLabel(line.menuItem.saleUnitType) : '',
      targetQty: line.targetQuantity,
      actualQty: null,
    }))

watch(
  selectedPlan,
  (plan) => {
    entries.value = entriesFromPlan(plan)
    if (plan) saleDate.value = defaultSaleDate(plan)
  },
)

const entryVariance = (entry: SaleEntry) => {
  if (!Number.isFinite(entry.actualQty)) return '-'
  const diff = Number(entry.actualQty) - entry.targetQty
  return diff > 0 ? `+${diff}` : String(diff)
}

const entryVarianceClass = (entry: SaleEntry) => {
  if (!Number.isFinite(entry.actualQty)) return 'text-gray-400'
  return Number(entry.actualQty) < entry.targetQty ? 'text-red-600' : 'text-green-600'
}

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
  if (!canSave.value || !selectedPlanId.value) return
  try {
    await createRecords(
      entries.value.map((entry) => ({
        saleDate: saleDate.value,
        menuItemId: entry.menuItemId,
        actualQty: Number(entry.actualQty),
        targetQty: entry.targetQty,
        planId: selectedPlanId.value,
      })),
    )
    success('บันทึกยอดขายแล้ว')
    entries.value = entries.value.map((entry) => ({ ...entry, actualQty: null }))
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
  }
}

const remove = async (id: string) => {
  if (!confirm('ลบรายการนี้?')) return
  await deleteRecord(id)
}

onMounted(async () => {
  await Promise.all([fetchPlans(), fetchRecords()])
})
</script>
