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
            <DatePicker
              v-model="saleDate"
              :min="selectedPlan?.saleStartDate"
              :max="selectedPlan?.saleEndDate"
            />
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

      <div class="card">
        <div class="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-sm font-medium text-gray-900">ยอดขายที่บันทึก</p>
            <p class="text-xs text-gray-500">{{ recordsRangeLabel }}</p>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div class="sm:w-52">
              <label class="mb-1 block text-xs font-medium text-gray-500">จากวันที่</label>
              <DatePicker v-model="filterFrom" placeholder="จากวันที่" />
            </div>
            <div class="sm:w-52">
              <label class="mb-1 block text-xs font-medium text-gray-500">ถึงวันที่</label>
              <DatePicker v-model="filterTo" align="right" placeholder="ถึงวันที่" />
            </div>
            <button
              type="button"
              class="text-sm font-medium text-primary-600 hover:text-primary-700 disabled:cursor-not-allowed disabled:text-gray-400 sm:mb-2 sm:ml-1"
              :disabled="!latestSaleDate || showingLatestDay"
              @click="showLatestDay"
            >
              วันที่ล่าสุด
            </button>
          </div>
        </div>
        <div class="overflow-x-auto border-t">
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
        <EmptyState
          v-if="!records.length"
          :title="emptyTitle"
          :description="emptyDescription"
        />
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import DatePicker from '@/components/common/DatePicker.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { usePurchasePlans } from '@/composables/usePurchasePlans'
import { useSalesRecords } from '@/composables/useSalesRecords'
import { useToast } from '@/composables/useToast'
import {
  formatDateOnly,
  formatSaleDateRange,
  normalizeDateRange,
  saleUnitLabel,
  toDateInputValue,
} from '@/utils/format'
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
const { records, loading, fetchLatestSaleDate, fetchRecords, createRecords, deleteRecord } =
  useSalesRecords()
const { success, error } = useToast()

const selectedPlanId = ref('')
const saleDate = ref(toDateInputValue())
const entries = ref<SaleEntry[]>([])
const filterFrom = ref(toDateInputValue())
const filterTo = ref(toDateInputValue())
const latestSaleDate = ref('')
const applyingPreset = ref(false)
const hasCustomRange = ref(false)

const selectedPlan = computed(() => plans.value.find((plan) => plan.id === selectedPlanId.value))

const showingLatestDay = computed(
  () =>
    Boolean(latestSaleDate.value) &&
    filterFrom.value === latestSaleDate.value &&
    filterTo.value === latestSaleDate.value,
)

const recordsRangeLabel = computed(() => {
  const range = normalizeDateRange(filterFrom.value, filterTo.value)
  if (!range) return 'เลือกช่วงวันที่เพื่อดูยอดขายย้อนหลัง'
  if (showingLatestDay.value) return `แสดงวันที่ล่าสุด · ${formatSaleDateRange(range.from, range.to)}`
  return `แสดง ${formatSaleDateRange(range.from, range.to)}`
})

const emptyTitle = computed(() =>
  latestSaleDate.value ? 'ไม่มียอดขายในช่วงวันที่เลือก' : 'ยังไม่มีบันทึกยอดขาย',
)

const emptyDescription = computed(() =>
  latestSaleDate.value ? 'ลองเปลี่ยนช่วงวันที่เพื่อดูย้อนหลัง' : undefined,
)

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

const resetForm = () => {
  selectedPlanId.value = ''
  saleDate.value = toDateInputValue()
  entries.value = []
}

const save = async () => {
  if (!canSave.value || !selectedPlanId.value) return
  const savedSaleDate = saleDate.value
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
    resetForm()
    await refreshLatestSaleDate()
    applyingPreset.value = true
    try {
      hasCustomRange.value = savedSaleDate !== latestSaleDate.value
      filterFrom.value = savedSaleDate
      filterTo.value = savedSaleDate
      await fetchRecords({ from: savedSaleDate, to: savedSaleDate })
    } finally {
      applyingPreset.value = false
    }
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
  }
}

const remove = async (id: string) => {
  if (!confirm('ลบรายการนี้?')) return
  await deleteRecord(id)
  if (!records.value.length) {
    await refreshLatestSaleDate()
    if (!hasCustomRange.value) await showLatestDay()
  }
}

const refreshLatestSaleDate = async () => {
  latestSaleDate.value = (await fetchLatestSaleDate()) ?? ''
}

const applyDateRange = async (from: string, to: string, custom: boolean) => {
  applyingPreset.value = true
  hasCustomRange.value = custom
  try {
    filterFrom.value = from
    filterTo.value = to
    await fetchRecords({ from, to })
  } finally {
    applyingPreset.value = false
  }
}

const showToday = async () => {
  const today = toDateInputValue()
  await refreshLatestSaleDate()
  await applyDateRange(today, today, today !== latestSaleDate.value)
}

const showLatestDay = async () => {
  await refreshLatestSaleDate()
  if (!latestSaleDate.value) {
    await applyDateRange(toDateInputValue(), toDateInputValue(), true)
    return
  }
  await applyDateRange(latestSaleDate.value, latestSaleDate.value, false)
}

watch([filterFrom, filterTo], async ([from, to]) => {
  if (applyingPreset.value) return
  const range = normalizeDateRange(from, to)
  if (!range) return
  if (from !== range.from || to !== range.to) {
    filterFrom.value = range.from
    filterTo.value = range.to
    return
  }
  hasCustomRange.value = !(
    latestSaleDate.value &&
    range.from === latestSaleDate.value &&
    range.to === latestSaleDate.value
  )
  await fetchRecords(range)
})

onMounted(async () => {
  await fetchPlans()
  await showToday()
})
</script>
