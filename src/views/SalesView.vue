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
              <template v-for="entry in entries" :key="entry.id">
                <tr>
                  <td class="py-3 pr-4">
                    <p class="font-medium text-gray-900">{{ entry.menuName }}</p>
                    <p v-if="entry.unitLabel" class="text-xs text-gray-500">
                      {{ entry.unitLabel }} · ราคาปกติ {{ formatCurrency(entry.sellingPrice) }}
                    </p>
                    <button
                      type="button"
                      class="mt-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                      @click="entry.promoOpen = !entry.promoOpen"
                    >
                      {{ entry.promoOpen ? '− ยกเลิกโปรโมชั่น' : '+ ขายแบบโปรโมชั่น' }}
                    </button>
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
                <tr v-if="entry.promoOpen">
                  <td colspan="4" class="pb-4 pt-0">
                    <div class="rounded-lg bg-amber-50 border border-amber-100 p-3 space-y-3">
                      <p class="text-xs text-amber-800">
                        ยอดจริงด้านบนคือจำนวนรวมทุกชิ้น (รวมที่ขายโปร) ส่วนโปรโมชั่นกรอกเป็นชุด เช่น ซื้อ 3 ชิ้น 50 บาท
                      </p>
                      <div class="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                        <span>ซื้อ</span>
                        <input
                          v-model.number="entry.bundleSize"
                          type="number"
                          min="1"
                          step="1"
                          placeholder="3"
                          class="input-field w-20 text-right"
                        />
                        <span>ชิ้น ราคา</span>
                        <input
                          v-model.number="entry.bundlePrice"
                          type="number"
                          min="0"
                          step="any"
                          placeholder="50"
                          class="input-field w-24 text-right"
                        />
                        <span>บาท ขายได้</span>
                        <input
                          v-model.number="entry.bundleCount"
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          class="input-field w-20 text-right"
                        />
                        <span>ชุด</span>
                      </div>
                      <p v-if="promoError(entry)" class="text-xs text-red-600">{{ promoError(entry) }}</p>
                      <p v-else-if="entryPromo(entry).qty > 0" class="text-xs text-gray-600">
                        โปร {{ entryPromo(entry).qty }} ชิ้น = {{ formatCurrency(entryPromo(entry).revenue) }}
                        · ขายปกติ {{ Number(entry.actualQty) - entryPromo(entry).qty }} ชิ้น
                        · <span class="font-medium text-gray-900">รวมรายได้ {{ formatCurrency(entryRevenue(entry)) }}</span>
                      </p>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <button v-if="entries.length" type="submit" class="btn-primary" :disabled="!canSave || loading">
          {{ loading ? 'กำลังบันทึก...' : 'บันทึกยอดขายทั้งหมด' }}
        </button>
      </form>

      <div v-if="records.length" class="space-y-2">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="card p-5">
            <h3 class="text-gray-500 text-sm font-medium">รายได้</h3>
            <p class="text-2xl font-bold mt-2">{{ formatCurrency(summary.revenue) }}</p>
            <p class="text-xs text-gray-500 mt-1">
              ขายได้ {{ formatNumber(summary.actualQty, 0) }} ชิ้น
              <template v-if="summary.dayCount > 1">
                · เฉลี่ย {{ formatCurrency(summary.revenuePerDay) }}/วัน
              </template>
            </p>
          </div>
          <div class="card p-5">
            <h3 class="text-gray-500 text-sm font-medium">กำไรสุทธิ</h3>
            <p class="text-2xl font-bold mt-2" :class="profitClass(summary.profit, summary.marginPercent !== null)">
              {{ summary.marginPercent === null ? '—' : formatCurrency(summary.profit) }}
            </p>
            <p class="text-xs text-gray-500 mt-1">
              <template v-if="summary.marginPercent !== null">
                กำไร {{ formatNumber(summary.marginPercent, 1) }}% ·
                ต้นทุน {{ formatCurrency(summary.cost) }} ·
                ค่าแพลตฟอร์ม {{ formatCurrency(summary.platformFee) }}
              </template>
              <template v-else>ยังไม่มีข้อมูลต้นทุน</template>
            </p>
          </div>
          <div class="card p-5">
            <h3 class="text-gray-500 text-sm font-medium">เทียบเป้า</h3>
            <p class="text-2xl font-bold mt-2" :class="targetPercentClass">
              {{ summary.targetPercent === null ? '—' : `${formatNumber(summary.targetPercent, 0)}%` }}
            </p>
            <p class="text-xs text-gray-500 mt-1">
              <template v-if="summary.hasTarget">
                จริง {{ formatNumber(summary.targetedActualQty, 0) }} / เป้า {{ formatNumber(summary.targetQty, 0) }} ชิ้น
              </template>
              <template v-else>ยังไม่มีเป้าในรายการเหล่านี้</template>
            </p>
          </div>
          <div class="card p-5">
            <h3 class="text-gray-500 text-sm font-medium">เมนูทำกำไรสูงสุด</h3>
            <p class="text-2xl font-bold mt-2 truncate" :title="summary.topProfitMenuName ?? undefined">
              {{ summary.topProfitMenuName ?? '—' }}
            </p>
            <p class="text-xs text-gray-500 mt-1">
              {{ summary.topProfitMenuName ? `กำไร ${formatCurrency(summary.topProfitMenuProfit)}` : 'ยังไม่มีเมนูที่มีกำไร' }}
            </p>
          </div>
        </div>
        <p v-if="summary.estimatedCount > 0 || summary.unknownCostCount > 0" class="text-xs text-gray-500">
          <template v-if="summary.estimatedCount > 0">
            ~ {{ summary.estimatedCount }} รายการเป็นรายการเก่าที่ไม่ได้บันทึกต้นทุนไว้ ใช้ต้นทุนปัจจุบันประมาณการ
          </template>
          <template v-if="summary.unknownCostCount > 0">
            · {{ summary.unknownCostCount }} รายการหาต้นทุนไม่ได้ (เมนูถูกลบหรือยังโหลดไม่เสร็จ) จึงไม่รวมในกำไร
          </template>
        </p>
      </div>

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
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">รายได้</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">กำไร</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="row in records" :key="row.id">
                <td class="px-4 py-3">{{ formatDateOnly(row.saleDate) }}</td>
                <td class="px-4 py-3">{{ planNameById(row.planId) }}</td>
                <td class="px-4 py-3">
                  <p>{{ row.menuItem?.name || row.menuItemId }}</p>
                  <p v-if="row.promoQty > 0" class="text-xs text-amber-700">
                    โปร: {{ row.promoNote || `${row.promoQty} ชิ้น` }} ({{ row.promoQty }} ชิ้น)
                  </p>
                </td>
                <td class="px-4 py-3 text-right">{{ row.targetQty ?? '-' }}</td>
                <td class="px-4 py-3 text-right font-medium">{{ row.actualQty }}</td>
                <td class="px-4 py-3 text-right" :class="varianceClass(row)">
                  {{ variance(row) }}
                </td>
                <td class="px-4 py-3 text-right">{{ formatCurrency(recordRevenue(row)) }}</td>
                <td class="px-4 py-3 text-right">
                  <template v-if="rowProfit(row)">
                    <p
                      class="font-medium"
                      :class="profitClass(rowProfit(row)!.profit, true)"
                      :title="rowProfit(row)!.estimated ? 'ประมาณการจากต้นทุนปัจจุบัน' : undefined"
                    >
                      {{ rowProfit(row)!.estimated ? '~' : '' }}{{ formatCurrency(rowProfit(row)!.profit) }}
                    </p>
                    <p v-if="rowProfit(row)!.marginPercent !== null" class="text-xs text-gray-500">
                      {{ formatNumber(rowProfit(row)!.marginPercent!, 1) }}%
                    </p>
                  </template>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td class="px-4 py-3 text-right">
                  <button type="button" class="text-red-600 text-sm" @click="remove(row.id)">ลบ</button>
                </td>
              </tr>
            </tbody>
            <tfoot v-if="records.length" class="bg-gray-50 font-medium">
              <tr>
                <td class="px-4 py-3" colspan="3">รวม {{ summary.recordCount }} รายการ</td>
                <td class="px-4 py-3 text-right">{{ summary.hasTarget ? formatNumber(summary.targetQty, 0) : '-' }}</td>
                <td class="px-4 py-3 text-right">{{ formatNumber(summary.actualQty, 0) }}</td>
                <td class="px-4 py-3 text-right" :class="totalVarianceClass">{{ totalVariance }}</td>
                <td class="px-4 py-3 text-right">{{ formatCurrency(summary.revenue) }}</td>
                <td class="px-4 py-3 text-right" :class="profitClass(summary.profit, summary.marginPercent !== null)">
                  {{ summary.marginPercent === null ? '-' : formatCurrency(summary.profit) }}
                </td>
                <td class="px-4 py-3"></td>
              </tr>
            </tfoot>
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
import { useCostBreakdown } from '@/composables/useCostBreakdown'
import { useSalesRecords } from '@/composables/useSalesRecords'
import { useToast } from '@/composables/useToast'
import {
  formatCurrency,
  formatDateOnly,
  formatNumber,
  formatSaleDateRange,
  normalizeDateRange,
  saleUnitLabel,
  toDateInputValue,
} from '@/utils/format'
import { recordRevenue, shiftIsoDate } from '@/utils/salesChart'
import { resolvePromo, salesRevenue } from '@/utils/salesPromo'
import {
  recordProfit,
  summarizeProfit,
  type CostFallback,
} from '@/utils/salesProfit'
import type { PurchasePlan, SalesRecord } from '@/types/models'

type SaleEntry = {
  id: string
  menuItemId: string
  menuName: string
  unitLabel: string
  sellingPrice: number
  targetQty: number
  actualQty: number | null
  promoOpen: boolean
  bundleSize: number | null
  bundlePrice: number | null
  bundleCount: number | null
}

const { plans, fetchPlans } = usePurchasePlans()
const { records, loading, fetchLatestSaleDate, fetchRecords, createRecords, deleteRecord } =
  useSalesRecords()
const { success, error } = useToast()
const { breakdowns, settings, loadAll: loadCostData } = useCostBreakdown()

const breakdownByMenuId = computed(
  () => new Map(breakdowns.value.map((breakdown) => [breakdown.menuItem.id, breakdown])),
)

// Live cost, used when saving (snapshot) and for records saved before snapshots existed.
const liveCostFor = (menuItemId: string): CostFallback | undefined => {
  const breakdown = breakdownByMenuId.value.get(menuItemId)
  if (!breakdown || !settings.value) return undefined
  return { unitCost: breakdown.totalCost, platformFeePercent: settings.value.platformFeePercent }
}

const rowProfit = (row: SalesRecord) => recordProfit(row, liveCostFor(row.menuItemId))

const summary = computed(() => summarizeProfit(records.value, (row) => liveCostFor(row.menuItemId)))

const profitClass = (value: number, known: boolean) => {
  if (!known) return 'text-gray-400'
  return value < 0 ? 'text-red-600' : 'text-green-600'
}

const targetPercentClass = computed(() => {
  const percent = summary.value.targetPercent
  if (percent === null) return 'text-gray-400'
  return percent < 100 ? 'text-red-600' : 'text-green-600'
})

const totalVariance = computed(() => {
  if (!summary.value.hasTarget) return '-'
  const diff = summary.value.targetedActualQty - summary.value.targetQty
  return diff > 0 ? `+${diff}` : String(diff)
})

const totalVarianceClass = computed(() => {
  if (!summary.value.hasTarget) return 'text-gray-500'
  return summary.value.targetedActualQty < summary.value.targetQty ? 'text-red-600' : 'text-green-600'
})

const selectedPlanId = ref('')
const saleDate = ref(toDateInputValue())
const entries = ref<SaleEntry[]>([])
// Default view: the last 7 days including today
const DEFAULT_FILTER_DAYS = 7
const defaultFilterFrom = (today: string) => shiftIsoDate(today, -(DEFAULT_FILTER_DAYS - 1))
const filterFrom = ref(defaultFilterFrom(toDateInputValue()))
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

// Promo only counts while its section is open; closing it discards the values.
const entryPromo = (entry: SaleEntry) =>
  entry.promoOpen
    ? resolvePromo({
        bundleSize: entry.bundleSize,
        bundlePrice: entry.bundlePrice,
        bundleCount: entry.bundleCount,
      })
    : { qty: 0, revenue: 0, note: null }

const promoError = (entry: SaleEntry): string => {
  if (!entry.promoOpen) return ''
  const count = Number(entry.bundleCount) || 0
  if (count <= 0) return ''
  if (!(Number(entry.bundleSize) >= 1)) return 'กรอกจำนวนชิ้นต่อชุด'
  if (typeof entry.bundlePrice !== 'number' || !(entry.bundlePrice >= 0)) return 'กรอกราคาโปรโมชั่น'
  if (Number.isFinite(entry.actualQty) && entryPromo(entry).qty > Number(entry.actualQty)) {
    return `ขายโปร ${entryPromo(entry).qty} ชิ้น มากกว่ายอดจริงรวม ${entry.actualQty} ชิ้น`
  }
  return ''
}

const entryRevenue = (entry: SaleEntry) =>
  salesRevenue({
    qty: Number(entry.actualQty) || 0,
    unitPrice: entry.sellingPrice,
    promoQty: entryPromo(entry).qty,
    promoRevenue: entryPromo(entry).revenue,
  })

const canSave = computed(
  () =>
    Boolean(selectedPlanId.value) &&
    Boolean(saleDate.value) &&
    entries.value.length > 0 &&
    entries.value.every((entry) => Number.isFinite(entry.actualQty) && !promoError(entry)),
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
      sellingPrice: line.menuItem?.sellingPrice ?? 0,
      targetQty: line.targetQuantity,
      actualQty: null,
      promoOpen: false,
      bundleSize: null,
      bundlePrice: null,
      bundleCount: null,
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
  try {
    await createRecords(
      entries.value.map((entry) => {
        const promo = entryPromo(entry)
        const liveCost = liveCostFor(entry.menuItemId)
        return {
          unitPrice: entry.sellingPrice,
          unitCost: liveCost?.unitCost ?? null,
          platformFeePercent: liveCost?.platformFeePercent ?? null,
          saleDate: saleDate.value,
          menuItemId: entry.menuItemId,
          actualQty: Number(entry.actualQty),
          targetQty: entry.targetQty,
          planId: selectedPlanId.value,
          promoQty: promo.qty,
          promoRevenue: promo.revenue,
          promoNote: promo.note,
        }
      }),
    )
    success('บันทึกยอดขายแล้ว')
    resetForm()
    await refreshLatestSaleDate()
    // Keep the date filter the user had; just reload the list for that same range.
    await fetchRecords(normalizeDateRange(filterFrom.value, filterTo.value) ?? undefined)
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

const showRecentDays = async () => {
  const today = toDateInputValue()
  await refreshLatestSaleDate()
  await applyDateRange(defaultFilterFrom(today), today, true)
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
  await Promise.all([fetchPlans(), loadCostData()])
  await showRecentDays()
})
</script>
