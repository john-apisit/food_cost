<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="input-field w-full border rounded-lg bg-white px-3 py-2 text-left flex items-center justify-between gap-2"
      :class="disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''"
      :aria-expanded="open"
      :aria-haspopup="true"
      :disabled="disabled"
      @click="toggle"
    >
      <span class="truncate" :class="modelValue ? 'text-gray-900' : 'text-gray-400'">
        {{ displayLabel }}
      </span>
      <Calendar class="h-4 w-4 shrink-0 text-gray-400" />
    </button>

    <div
      v-if="open"
      class="absolute z-30 mt-1 w-[17.5rem] rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
      :class="align === 'right' ? 'right-0' : 'left-0'"
    >
      <div class="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          aria-label="เดือนก่อนหน้า"
          @click="shiftMonth(-1)"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <p class="text-sm font-medium text-gray-900">{{ formatMonthYear(viewMonth) }}</p>
        <button
          type="button"
          class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          aria-label="เดือนถัดไป"
          @click="shiftMonth(1)"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>

      <div class="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-gray-400">
        <span v-for="label in CALENDAR_WEEKDAY_LABELS" :key="label" class="py-1">{{ label }}</span>
      </div>

      <div class="grid grid-cols-7 gap-0.5">
        <button
          v-for="day in days"
          :key="day.iso"
          type="button"
          class="h-8 rounded-lg text-sm transition-colors"
          :class="dayButtonClass(day)"
          :disabled="isDisabled(day.iso)"
          @click="select(day.iso)"
        >
          {{ dayNumber(day.iso) }}
        </button>
      </div>

      <div class="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
        <button type="button" class="text-xs font-medium text-primary-600 hover:text-primary-700" @click="selectToday">
          วันนี้
        </button>
        <button
          v-if="clearable && modelValue"
          type="button"
          class="text-xs text-gray-500 hover:text-gray-700"
          @click="clear"
        >
          ล้าง
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import {
  CALENDAR_WEEKDAY_LABELS,
  addMonthsToDate,
  formatMonthYear,
  formatWeekdayDate,
  monthCalendarDays,
  parseLocalDate,
  toDateInputValue,
} from '@/utils/format'

const props = withDefaults(
  defineProps<{
    placeholder?: string
    min?: string
    max?: string
    disabled?: boolean
    clearable?: boolean
    align?: 'left' | 'right'
  }>(),
  {
    placeholder: 'เลือกวันที่',
    disabled: false,
    clearable: false,
    align: 'left',
  },
)

const modelValue = defineModel<string>({ default: '' })
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const viewMonth = ref(parseLocalDate(modelValue.value) ?? new Date())

const displayLabel = computed(() =>
  modelValue.value && parseLocalDate(modelValue.value)
    ? formatWeekdayDate(modelValue.value)
    : props.placeholder,
)

const days = computed(() => monthCalendarDays(viewMonth.value))
const today = computed(() => toDateInputValue())

watch(modelValue, (value) => {
  const date = parseLocalDate(value)
  if (date) viewMonth.value = date
})

const toggle = () => {
  if (props.disabled) return
  open.value = !open.value
}

const shiftMonth = (amount: number) => {
  viewMonth.value = addMonthsToDate(viewMonth.value, amount)
}

const isDisabled = (iso: string) => {
  if (props.min && iso < props.min) return true
  if (props.max && iso > props.max) return true
  return false
}

const dayNumber = (iso: string) => Number(iso.slice(8, 10))

const dayButtonClass = (day: { iso: string; inMonth: boolean }) => {
  if (isDisabled(day.iso)) return 'text-gray-300 cursor-not-allowed'
  if (day.iso === modelValue.value) return 'bg-primary-500 text-white font-medium'
  if (day.iso === today.value) return 'bg-primary-50 text-primary-700 font-medium hover:bg-primary-100'
  if (!day.inMonth) return 'text-gray-300 hover:bg-gray-50'
  return 'text-gray-700 hover:bg-gray-100'
}

const select = (iso: string) => {
  if (isDisabled(iso)) return
  modelValue.value = iso
  open.value = false
}

const selectToday = () => {
  if (isDisabled(today.value)) {
    viewMonth.value = new Date()
    return
  }
  select(today.value)
}

const clear = () => {
  modelValue.value = ''
  open.value = false
}

const onDocumentClick = (event: MouseEvent) => {
  if (!root.value?.contains(event.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('mousedown', onDocumentClick))
onUnmounted(() => document.removeEventListener('mousedown', onDocumentClick))
</script>
