<template>
  <MainLayout>
    <div class="space-y-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="page-title">รายรับ-รายจ่าย</h1>
          <p class="mt-1 text-sm text-gray-500">
            เงินเข้า–ออกจริง ไม่ใช่ยอดขายบนแอป — รายรับหลักคือเงินที่{{ platformName }}โอนมา
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="btn-secondary px-3" aria-label="เดือนก่อนหน้า" @click="shiftMonth(-1)">
            ‹
          </button>
          <p class="min-w-[9rem] text-center text-sm font-medium text-gray-900">{{ monthLabel }}</p>
          <button type="button" class="btn-secondary px-3" aria-label="เดือนถัดไป" @click="shiftMonth(1)">
            ›
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="card p-4">
          <p class="text-xs font-medium text-gray-500">รายรับ</p>
          <p class="mt-1 text-xl font-bold text-green-700">{{ formatCurrency(summary.income) }}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs font-medium text-gray-500">รายจ่ายประจำ</p>
          <p class="mt-1 text-xl font-bold text-red-700">{{ formatCurrency(summary.operatingExpense) }}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs font-medium text-gray-500">ซื้อสินทรัพย์</p>
          <p class="mt-1 text-xl font-bold text-amber-700">{{ formatCurrency(summary.assetSpend) }}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs font-medium text-gray-500">เหลือจากดำเนินงาน</p>
          <p class="mt-1 text-xl font-bold" :class="summary.operatingCash >= 0 ? 'text-gray-900' : 'text-red-700'">
            {{ formatCurrency(summary.operatingCash) }}
          </p>
        </div>
      </div>

      <div v-if="summary.byCategory.length" class="flex flex-wrap gap-2">
        <span
          v-for="row in summary.byCategory"
          :key="row.category"
          class="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
        >
          {{ CASH_CATEGORY_LABELS[row.category] }} {{ formatCurrency(row.amount) }}
        </span>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="action in CASH_QUICK_ACTIONS"
          :key="`${action.type}-${action.category}`"
          type="button"
          class="rounded-full border px-3 py-1.5 text-sm font-medium"
          :class="quickActionClass(action.type)"
          @click="openCreate(action.type, action.category)"
        >
          {{ quickActionLabel(action) }}
        </button>
      </div>

      <div v-if="loadError" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {{ loadError }}
      </div>

      <div class="card">
        <div class="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex gap-1 overflow-x-auto">
            <button
              v-for="tab in typeTabs"
              :key="tab.value"
              type="button"
              class="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium"
              :class="typeFilter === tab.value ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'"
              @click="typeFilter = tab.value"
            >
              {{ tab.label }}
            </button>
          </div>
          <input
            v-model="search"
            type="search"
            placeholder="ค้นหาชื่อร้าน หรือหมายเหตุ"
            class="input-field w-full sm:w-64"
          />
        </div>

        <div v-if="loading && !filteredEntries.length" class="px-4 py-10 text-center text-sm text-gray-500">
          กำลังโหลด...
        </div>

        <div v-else class="hidden md:block overflow-x-auto border-t">
          <table class="min-w-full divide-y text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">รายการ</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">หมวด</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">จำนวนเงิน</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="row in filteredEntries" :key="row.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 whitespace-nowrap">{{ formatDateOnly(row.occurredAt) }}</td>
                <td class="px-4 py-3">
                  <p class="font-medium text-gray-900">{{ cashEntryTitle(row) }}</p>
                  <p class="text-xs text-gray-500">{{ rowMeta(row) }}</p>
                </td>
                <td class="px-4 py-3">
                  <span class="rounded-full px-2 py-0.5 text-xs" :class="categoryBadgeClass(row)">
                    {{ categoryBadge(row) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right font-semibold" :class="amountClass(row)">
                  {{ amountLabel(row) }}
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap">
                  <button type="button" class="text-primary-600 text-sm mr-3" @click="openEdit(row)">แก้ไข</button>
                  <button type="button" class="text-red-600 text-sm" @click="remove(row)">ลบ</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="md:hidden divide-y border-t">
          <div v-for="row in filteredEntries" :key="row.id" class="px-4 py-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-medium text-gray-900 truncate">{{ cashEntryTitle(row) }}</p>
                <p class="text-xs text-gray-500">{{ formatDateOnly(row.occurredAt) }} · {{ categoryBadge(row) }}</p>
              </div>
              <p class="shrink-0 font-semibold" :class="amountClass(row)">{{ amountLabel(row) }}</p>
            </div>
            <div class="mt-2 flex gap-3">
              <button type="button" class="text-primary-600 text-sm" @click="openEdit(row)">แก้ไข</button>
              <button type="button" class="text-red-600 text-sm" @click="remove(row)">ลบ</button>
            </div>
          </div>
        </div>

        <EmptyState
          v-if="!loading && !filteredEntries.length"
          :title="emptyTitle"
          :description="emptyDescription"
        >
          <button type="button" class="btn-primary" @click="openCreate('income', 'platform_payout')">
            บันทึกโอนรอบแรก
          </button>
        </EmptyState>
      </div>
    </div>

    <CashEntryFormModal
      :is-open="formOpen"
      :entry="editing"
      :initial-type="createType"
      :initial-category="createCategory"
      :default-period="monthRange"
      :platform-name="platformName"
      :platform-fee-percent="settings?.platformFeePercent"
      :ingredients="ingredients"
      :plans="plans"
      :saving="saving"
      @close="formOpen = false"
      @save="save"
    />
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import CashEntryFormModal from '@/components/cashbook/CashEntryFormModal.vue'
import { useCashEntries } from '@/composables/useCashEntries'
import { useIngredients } from '@/composables/useIngredients'
import { usePurchasePlans } from '@/composables/usePurchasePlans'
import { useStoreSettings } from '@/composables/useStoreSettings'
import { useToast } from '@/composables/useToast'
import {
  CASH_CATEGORY_LABELS,
  CASH_PAYMENT_METHOD_LABELS,
  type CashCategory,
  type CashEntry,
  type CashEntryPayload,
  type CashEntryType,
} from '@/types/models'
import {
  CASH_QUICK_ACTIONS,
  cashEntryTitle,
  defaultCategoryForType,
  signedCashAmount,
  suggestedPricePerUnit,
  summarizeCashEntries,
} from '@/utils/cashbook'
import {
  addMonthsToDate,
  formatCurrency,
  formatDateOnly,
  formatMonthYear,
  formatSaleDateRange,
  monthDateRange,
  parseLocalDate,
  toDateInputValue,
} from '@/utils/format'

const { entries, loading, error: loadError, fetchEntries, createEntry, updateEntry, deleteEntry } = useCashEntries()
const { ingredients, fetchIngredients, updateIngredient } = useIngredients()
const { plans, fetchPlans, updatePurchasedIngredientIds } = usePurchasePlans()
const { settings, fetchSettings } = useStoreSettings()
const { success, error } = useToast()

const monthCursor = ref(new Date())
const typeFilter = ref<CashEntryType | 'all'>('all')
const search = ref('')
const formOpen = ref(false)
const editing = ref<CashEntry | null>(null)
const createType = ref<CashEntryType>('expense')
const createCategory = ref<CashCategory>('ingredient')
const saving = ref(false)

const typeTabs: Array<{ value: CashEntryType | 'all'; label: string }> = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'income', label: 'รายรับ' },
  { value: 'expense', label: 'รายจ่าย' },
  { value: 'transfer', label: 'ไม่นับกำไร' },
]

const monthRange = computed(() => monthDateRange(monthCursor.value))
const monthLabel = computed(() => formatMonthYear(monthCursor.value))
const platformName = computed(() => settings.value?.platformName || 'LINE MAN')
const summary = computed(() => summarizeCashEntries(entries.value))

const filteredEntries = computed(() => {
  const query = search.value.trim().toLowerCase()
  return entries.value
    .map((entry) => ({
      ...entry,
      ingredient: entry.ingredient ?? ingredients.value.find((item) => item.id === entry.ingredientId),
      planName: entry.planName ?? plans.value.find((item) => item.id === entry.planId)?.name,
    }))
    .filter((entry) => {
      if (typeFilter.value !== 'all' && entry.type !== typeFilter.value) return false
      if (!query) return true
      const haystack = [cashEntryTitle(entry), entry.note, entry.counterparty, entry.planName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
})

const emptyTitle = computed(() =>
  search.value || typeFilter.value !== 'all' ? 'ไม่พบรายการตามที่กรอง' : 'ยังไม่มีรายรับ-รายจ่ายเดือนนี้',
)
const emptyDescription = computed(() =>
  search.value || typeFilter.value !== 'all'
    ? 'ลองเปลี่ยนตัวกรองหรือคำค้น'
    : 'เริ่มจากเงินที่แพลตฟอร์มโอนเข้าบัญชี',
)

const shiftMonth = (amount: number) => {
  const current = parseLocalDate(toDateInputValue(monthCursor.value)) ?? new Date()
  monthCursor.value = addMonthsToDate(current, amount)
}

const quickActionLabel = (action: (typeof CASH_QUICK_ACTIONS)[number]) =>
  action.category === 'platform_payout' ? `รับโอน ${platformName.value}` : action.label

const quickActionClass = (type: CashEntryType) => {
  if (type === 'income') return 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100'
  if (type === 'expense') return 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100'
  return 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
}

const categoryBadge = (row: CashEntry) =>
  row.isAsset ? `${CASH_CATEGORY_LABELS[row.category]} · สินทรัพย์` : CASH_CATEGORY_LABELS[row.category]

const categoryBadgeClass = (row: CashEntry) => {
  if (row.type === 'income') return 'bg-green-50 text-green-800'
  if (row.type === 'transfer' || row.isAsset) return 'bg-gray-100 text-gray-700'
  return 'bg-red-50 text-red-800'
}

const amountClass = (row: CashEntry) => {
  if (row.type === 'income') return 'text-green-700'
  if (row.type === 'transfer') return 'text-gray-500'
  return 'text-red-700'
}

const amountLabel = (row: CashEntry) => {
  if (row.type === 'transfer') return formatCurrency(row.amount)
  const signed = signedCashAmount(row)
  return `${signed > 0 ? '+' : ''}${formatCurrency(signed)}`
}

const rowMeta = (row: CashEntry) => {
  const parts = [CASH_PAYMENT_METHOD_LABELS[row.paymentMethod]]
  if (row.planName) parts.push(row.planName)
  if (row.periodFrom && row.periodTo) parts.push(formatSaleDateRange(row.periodFrom, row.periodTo))
  if (row.quantity && row.unit) parts.push(`${row.quantity} ${row.unit}`)
  return parts.join(' · ')
}

const openCreate = (type: CashEntryType, category?: CashCategory) => {
  editing.value = null
  createType.value = type
  createCategory.value = category ?? defaultCategoryForType(type)
  formOpen.value = true
}

const openEdit = (entry: CashEntry) => {
  editing.value = entry
  createType.value = entry.type
  createCategory.value = entry.category
  formOpen.value = true
}

const reloadMonth = async () => {
  await fetchEntries(monthRange.value)
}

const save = async (payload: CashEntryPayload, options: { updateIngredientPrice: boolean }) => {
  saving.value = true
  try {
    if (editing.value) await updateEntry(editing.value.id, payload)
    else await createEntry(payload)

    if (options.updateIngredientPrice && payload.ingredientId) {
      const price = suggestedPricePerUnit(payload.amount, payload.quantity ?? 0)
      if (price != null) {
        await updateIngredient(payload.ingredientId, {
          pricePerUnit: Math.round(price * 100) / 100,
        })
      }
    }

    if (payload.planId && payload.ingredientId) {
      const plan = plans.value.find((item) => item.id === payload.planId)
      if (plan && !plan.purchasedIngredientIds.includes(payload.ingredientId)) {
        await updatePurchasedIngredientIds(payload.planId, [
          ...plan.purchasedIngredientIds,
          payload.ingredientId,
        ])
      }
    }

    success('บันทึกรายการแล้ว')
    formOpen.value = false
    editing.value = null
    await reloadMonth()
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
  } finally {
    saving.value = false
  }
}

const remove = async (row: CashEntry) => {
  if (!confirm(`ลบรายการ ${cashEntryTitle(row)}?`)) return
  try {
    await deleteEntry(row.id)
    success('ลบรายการแล้ว')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
  }
}

watch(monthRange, (range) => {
  fetchEntries(range)
}, { immediate: false })

onMounted(async () => {
  await Promise.all([fetchSettings(), fetchIngredients(), fetchPlans(), reloadMonth()])
})
</script>
