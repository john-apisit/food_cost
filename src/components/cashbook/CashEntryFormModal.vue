<template>
  <Modal :is-open="isOpen" :title="heading" wide @close="$emit('close')">
    <form class="space-y-4" @submit.prevent="submit">
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="option in typeOptions"
          :key="option.value"
          type="button"
          class="rounded-lg border px-3 py-2 text-sm font-medium"
          :class="form.type === option.value ? option.activeClass : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
          @click="setType(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">หมวด *</label>
          <select v-model="form.category" class="input-field w-full" @change="onCategoryChange">
            <option v-for="category in categoryOptions" :key="category" :value="category">
              {{ categoryLabel(category) }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">วันที่ *</label>
          <DatePicker v-model="form.occurredAt" />
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">จำนวนเงิน (บาท) *</label>
          <input
            v-model.number="form.amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            class="input-field w-full"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">ช่องทางจ่าย</label>
          <select v-model="form.paymentMethod" class="input-field w-full">
            <option v-for="method in CASH_PAYMENT_METHODS" :key="method" :value="method">
              {{ CASH_PAYMENT_METHOD_LABELS[method] }}
            </option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ counterpartyLabel }}</label>
        <input v-model="form.counterparty" type="text" class="input-field w-full" :placeholder="counterpartyPlaceholder" />
      </div>

      <template v-if="form.category === 'platform_payout'">
        <div class="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-3">
          <p class="text-sm font-medium text-gray-800">ช่วงยอดขายที่โอนนี้ครอบคลุม</p>
          <div class="grid sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">จากวันที่</label>
              <DatePicker v-model="form.periodFrom" placeholder="จากวันที่" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">ถึงวันที่</label>
              <DatePicker v-model="form.periodTo" align="right" placeholder="ถึงวันที่" />
            </div>
          </div>
          <div class="grid sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">ยอดขายบนแอป</label>
              <input v-model.number="form.grossAmount" type="number" min="0" step="0.01" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">ค่าธรรมเนียมที่หัก</label>
              <input v-model.number="form.feeAmount" type="number" min="0" step="0.01" class="input-field w-full" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">ยอดปรับปรุง +/−</label>
              <input v-model.number="form.adjustmentAmount" type="number" step="0.01" class="input-field w-full" />
            </div>
          </div>
          <p v-if="statementNet != null" class="text-xs text-gray-500">
            จากตัวเลขสเตทเมนต์ ควรได้เงินเข้า {{ formatCurrency(statementNet) }}
          </p>
          <div v-if="payoutLoading" class="text-xs text-gray-500">กำลังเทียบกับยอดขายที่บันทึก...</div>
          <div v-else-if="estimate && estimate.qty > 0" class="text-sm rounded-lg bg-white border border-gray-200 px-3 py-2">
            <p class="font-medium text-gray-800">
              ยอดขายที่บันทึก {{ formatNumber(estimate.qty, 0) }} จาน · ประมาณการเงินเข้า
              {{ formatCurrency(estimate.net) }}
            </p>
            <p class="mt-1 text-xs" :class="varianceClass">{{ varianceLabel }}</p>
          </div>
          <p v-else-if="form.periodFrom && form.periodTo" class="text-xs text-gray-500">
            ยังไม่มีบันทึกยอดขายในช่วงนี้ — เทียบไม่ได้จนกว่าจะบันทึกจำนวนจาน
          </p>
        </div>
      </template>

      <template v-if="form.category === 'ingredient' || form.category === 'packaging'">
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ itemSelectLabel }}</label>
            <select v-model="form.ingredientId" class="input-field w-full" @change="onIngredientChange">
              <option value="">ไม่ผูกกับรายการในระบบ</option>
              <option v-for="item in itemOptions" :key="item.id" :value="item.id">
                {{ item.name }} ({{ formatCurrency(item.pricePerUnit) }}/{{ item.unit }})
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">แผนซื้อ</label>
            <select v-model="form.planId" class="input-field w-full">
              <option value="">ไม่ผูกแผน</option>
              <option v-for="plan in plans" :key="plan.id" :value="plan.id">
                {{ planOptionLabel(plan) }}
              </option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">ปริมาณที่ซื้อ</label>
            <input v-model.number="form.quantity" type="number" min="0" step="0.01" class="input-field w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">หน่วย</label>
            <input v-model="form.unit" type="text" class="input-field w-full" placeholder="เช่น kg, ใบ" />
          </div>
        </div>
        <label v-if="priceSuggestion != null && form.ingredientId" class="flex items-start gap-2 text-sm text-gray-700">
          <input v-model="updateIngredientPrice" type="checkbox" class="mt-0.5 rounded border-gray-300 text-primary-600" />
          <span>
            อัปเดตราคาต่อหน่วยเป็น {{ formatCurrency(priceSuggestion) }}/{{ form.unit || 'หน่วย' }}
          </span>
        </label>
      </template>

      <label v-if="form.category === 'equipment'" class="flex items-start gap-2 text-sm text-gray-700">
        <input v-model="form.isAsset" type="checkbox" class="mt-0.5 rounded border-gray-300 text-primary-600" />
        <span>เป็นสินทรัพย์ (ไม่หักในกำไรดำเนินงานเดือนนี้ เช่น ตู้เย็น เตา)</span>
      </label>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
        <textarea v-model="form.note" rows="2" class="input-field w-full" placeholder="เช่น สลิปโอน, ของที่ซื้อ" />
      </div>

      <div class="flex gap-3 pt-2">
        <button type="submit" class="btn-primary flex-1" :disabled="saving || !canSave">
          {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
        </button>
        <button type="button" class="btn-secondary flex-1" @click="$emit('close')">ยกเลิก</button>
      </div>
    </form>
  </Modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Modal from '@/components/common/Modal.vue'
import DatePicker from '@/components/common/DatePicker.vue'
import {
  CASH_CATEGORY_LABELS,
  CASH_ENTRY_TYPE_LABELS,
  CASH_PAYMENT_METHOD_LABELS,
  CASH_PAYMENT_METHODS,
  type CashCategory,
  type CashEntry,
  type CashEntryPayload,
  type CashEntryType,
  type Ingredient,
  type PurchasePlan,
} from '@/types/models'
import { useCashEntries } from '@/composables/useCashEntries'
import {
  categoriesForType,
  defaultCategoryForType,
  defaultIsAsset,
  defaultPaymentMethod,
  estimatePlatformPayout,
  payoutVariance,
  suggestedPayoutNet,
  suggestedPricePerUnit,
  type PlatformPayoutEstimate,
} from '@/utils/cashbook'
import { formatCurrency, formatNumber, formatSaleDateRange, normalizeDateRange, toDateInputValue } from '@/utils/format'

const props = defineProps<{
  isOpen: boolean
  entry?: CashEntry | null
  initialType?: CashEntryType
  initialCategory?: CashCategory
  defaultPeriod?: { from: string; to: string }
  platformName?: string
  platformFeePercent?: number
  ingredients: Ingredient[]
  plans: PurchasePlan[]
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [payload: CashEntryPayload, options: { updateIngredientPrice: boolean }]
}>()

const { fetchPayoutEstimate } = useCashEntries()

const typeOptions: Array<{ value: CashEntryType; label: string; activeClass: string }> = [
  { value: 'income', label: CASH_ENTRY_TYPE_LABELS.income, activeClass: 'border-green-500 bg-green-50 text-green-800' },
  { value: 'expense', label: CASH_ENTRY_TYPE_LABELS.expense, activeClass: 'border-red-500 bg-red-50 text-red-800' },
  { value: 'transfer', label: 'ถอนส่วนตัว', activeClass: 'border-gray-400 bg-gray-100 text-gray-800' },
]

const form = reactive({
  type: 'expense' as CashEntryType,
  category: 'ingredient' as CashCategory,
  amount: 0 as number,
  occurredAt: toDateInputValue(),
  paymentMethod: defaultPaymentMethod('ingredient'),
  counterparty: '',
  note: '',
  periodFrom: '',
  periodTo: '',
  grossAmount: undefined as number | undefined,
  feeAmount: undefined as number | undefined,
  adjustmentAmount: undefined as number | undefined,
  ingredientId: '',
  quantity: undefined as number | undefined,
  unit: '',
  isAsset: false,
  planId: '',
})

const updateIngredientPrice = ref(true)
const estimate = ref<PlatformPayoutEstimate | null>(null)
const payoutLoading = ref(false)
const lastSuggestedNet = ref<number | null>(null)

const heading = computed(() => {
  if (props.entry) return `แก้ไข${CASH_ENTRY_TYPE_LABELS[form.type]}`
  if (form.category === 'platform_payout') return `รับโอนจาก ${props.platformName || 'แพลตฟอร์ม'}`
  return `บันทึก${CASH_ENTRY_TYPE_LABELS[form.type]}`
})

const categoryOptions = computed(() => categoriesForType(form.type))
const categoryLabel = (category: CashCategory) =>
  category === 'platform_payout' && props.platformName
    ? `รับโอน ${props.platformName}`
    : CASH_CATEGORY_LABELS[category]

const counterpartyLabel = computed(() => {
  if (form.type === 'income') return 'แหล่งเงิน'
  if (form.category === 'equipment') return 'ร้านค้า'
  return 'ร้านค้า / ซัพพลายเออร์'
})

const counterpartyPlaceholder = computed(() => {
  if (form.category === 'platform_payout') return props.platformName || 'LINE MAN'
  if (form.category === 'ingredient') return 'เช่น ตลาดนัด, แม็คโคร'
  return ''
})

const itemSelectLabel = computed(() =>
  form.category === 'packaging' ? 'บรรจุภัณฑ์ในระบบ' : 'วัตถุดิบในระบบ',
)

const itemOptions = computed(() =>
  props.ingredients.filter((item) =>
    form.category === 'packaging' ? item.type === 'packaging' : item.type === 'ingredient',
  ),
)

const selectedItem = computed(() => itemOptions.value.find((item) => item.id === form.ingredientId))

const priceSuggestion = computed(() => suggestedPricePerUnit(Number(form.amount) || 0, Number(form.quantity) || 0))

const statementNet = computed(() =>
  suggestedPayoutNet(form.grossAmount, form.feeAmount, form.adjustmentAmount),
)

const variance = computed(() => {
  const actual = Number(form.amount) || 0
  const estimated = estimate.value?.net ?? 0
  return payoutVariance(actual, estimated)
})

const varianceClass = computed(() => {
  if (variance.value.status === 'match') return 'text-green-700'
  if (variance.value.status === 'under') return 'text-red-700'
  if (variance.value.status === 'over') return 'text-amber-700'
  return 'text-gray-500'
})

const varianceLabel = computed(() => {
  if (!estimate.value) return ''
  const formatted = formatCurrency(Math.abs(variance.value.diff))
  if (variance.value.status === 'match') return `ใกล้เคียงประมาณการ (ต่าง ${formatted})`
  if (variance.value.status === 'over') return `โอนมาสูงกว่าประมาณการ ${formatted}`
  if (variance.value.status === 'under') return `โอนมาต่ำกว่าประมาณการ ${formatted}`
  return ''
})

const canSave = computed(() => Number(form.amount) > 0 && Boolean(form.occurredAt))

const planOptionLabel = (plan: PurchasePlan) => {
  const range = formatSaleDateRange(plan.saleStartDate, plan.saleEndDate)
  return range ? `${plan.name} (${range})` : plan.name
}

const emptyToUndef = (value: number | undefined) =>
  value == null || value === ('' as unknown) || !Number.isFinite(Number(value)) ? undefined : Number(value)

const resetFromEntry = (entry: CashEntry) => {
  form.type = entry.type
  form.category = entry.category
  form.amount = entry.amount
  form.occurredAt = entry.occurredAt
  form.paymentMethod = entry.paymentMethod
  form.counterparty = entry.counterparty ?? ''
  form.note = entry.note ?? ''
  form.periodFrom = entry.periodFrom ?? ''
  form.periodTo = entry.periodTo ?? ''
  form.grossAmount = entry.grossAmount
  form.feeAmount = entry.feeAmount
  form.adjustmentAmount = entry.adjustmentAmount
  form.ingredientId = entry.ingredientId ?? ''
  form.quantity = entry.quantity
  form.unit = entry.unit ?? ''
  form.isAsset = entry.isAsset
  form.planId = entry.planId ?? ''
  updateIngredientPrice.value = false
  lastSuggestedNet.value = null
}

const resetNew = (type: CashEntryType, category: CashCategory) => {
  form.type = type
  form.category = category
  form.amount = 0
  form.occurredAt = toDateInputValue()
  form.paymentMethod = defaultPaymentMethod(category)
  form.counterparty = category === 'platform_payout' ? (props.platformName ?? '') : ''
  form.note = ''
  form.periodFrom = category === 'platform_payout' ? (props.defaultPeriod?.from ?? '') : ''
  form.periodTo = category === 'platform_payout' ? (props.defaultPeriod?.to ?? '') : ''
  form.grossAmount = undefined
  form.feeAmount = undefined
  form.adjustmentAmount = undefined
  form.ingredientId = ''
  form.quantity = undefined
  form.unit = ''
  form.isAsset = defaultIsAsset(category)
  form.planId = ''
  updateIngredientPrice.value = true
  lastSuggestedNet.value = null
  estimate.value = null
}

const setType = (type: CashEntryType) => {
  if (form.type === type) return
  form.type = type
  const nextCategory = categoryOptions.value.includes(form.category)
    ? form.category
    : defaultCategoryForType(type)
  form.category = nextCategory
  onCategoryChange()
}

const onCategoryChange = () => {
  form.paymentMethod = defaultPaymentMethod(form.category)
  form.isAsset = defaultIsAsset(form.category)
  if (form.category !== 'ingredient' && form.category !== 'packaging') {
    form.ingredientId = ''
    form.planId = ''
    form.quantity = undefined
    form.unit = ''
  }
  if (form.category === 'platform_payout') {
    form.counterparty = form.counterparty || (props.platformName ?? '')
    form.periodFrom = form.periodFrom || props.defaultPeriod?.from || ''
    form.periodTo = form.periodTo || props.defaultPeriod?.to || ''
  } else {
    form.periodFrom = ''
    form.periodTo = ''
    form.grossAmount = undefined
    form.feeAmount = undefined
    form.adjustmentAmount = undefined
    estimate.value = null
  }
}

const onIngredientChange = () => {
  if (selectedItem.value) form.unit = selectedItem.value.unit
}

watch(
  () => [props.isOpen, props.entry, props.initialType, props.initialCategory] as const,
  ([open]) => {
    if (!open) return
    if (props.entry) {
      resetFromEntry(props.entry)
      return
    }
    const type = props.initialType ?? 'expense'
    const category = props.initialCategory ?? defaultCategoryForType(type)
    resetNew(type, category)
  },
)

watch(
  () => [form.grossAmount, form.feeAmount, form.adjustmentAmount, form.category],
  () => {
    if (form.category !== 'platform_payout') return
    const net = statementNet.value
    if (net == null || net <= 0) return
    const rounded = Math.round(net * 100) / 100
    if (!form.amount || form.amount === lastSuggestedNet.value) {
      form.amount = rounded
      lastSuggestedNet.value = rounded
    }
  },
)

watch(
  () => [props.isOpen, form.periodFrom, form.periodTo, form.category, props.platformFeePercent] as const,
  async () => {
    if (!props.isOpen || form.category !== 'platform_payout') {
      estimate.value = null
      return
    }
    const range = normalizeDateRange(form.periodFrom, form.periodTo)
    if (!range) {
      estimate.value = null
      return
    }
    payoutLoading.value = true
    try {
      estimate.value = await fetchPayoutEstimate(range, props.platformFeePercent ?? 30)
    } catch {
      estimate.value = estimatePlatformPayout([], props.platformFeePercent ?? 30)
    } finally {
      payoutLoading.value = false
    }
  },
)

const submit = () => {
  if (!canSave.value) return
  const payload: CashEntryPayload = {
    type: form.type,
    category: form.category,
    amount: Number(form.amount),
    occurredAt: form.occurredAt,
    paymentMethod: form.paymentMethod,
    counterparty: form.counterparty.trim() || undefined,
    note: form.note.trim() || undefined,
    periodFrom: form.category === 'platform_payout' ? form.periodFrom || undefined : undefined,
    periodTo: form.category === 'platform_payout' ? form.periodTo || undefined : undefined,
    grossAmount: form.category === 'platform_payout' ? emptyToUndef(form.grossAmount) : undefined,
    feeAmount: form.category === 'platform_payout' ? emptyToUndef(form.feeAmount) : undefined,
    adjustmentAmount: form.category === 'platform_payout' ? emptyToUndef(form.adjustmentAmount) : undefined,
    ingredientId:
      form.category === 'ingredient' || form.category === 'packaging'
        ? form.ingredientId || undefined
        : undefined,
    quantity:
      form.category === 'ingredient' || form.category === 'packaging'
        ? emptyToUndef(form.quantity)
        : undefined,
    unit:
      form.category === 'ingredient' || form.category === 'packaging'
        ? form.unit.trim() || undefined
        : undefined,
    isAsset: form.category === 'equipment' ? form.isAsset : false,
    planId:
      form.category === 'ingredient' || form.category === 'packaging'
        ? form.planId || undefined
        : undefined,
  }
  emit('save', payload, { updateIngredientPrice: updateIngredientPrice.value })
}
</script>
