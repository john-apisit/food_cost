<template>
  <Modal :is-open="isOpen" :title="routine ? 'แก้ไขงานประจำ' : 'เพิ่มงานประจำ'" xl @close="emit('close')">
    <form class="space-y-4" @submit.prevent="submit">
      <div>
        <label class="block text-sm font-medium mb-1">ชื่องาน</label>
        <input v-model="form.name" class="input-field w-full" required placeholder="เช่น เตรียมห้องครัว" />
      </div>

      <div>
        <label class="block text-sm font-medium mb-2">ประเภท</label>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="kind in ROUTINE_KINDS"
            :key="kind"
            type="button"
            class="rounded-lg border px-3 py-2 text-sm font-medium"
            :class="form.kind === kind
              ? 'border-primary-500 bg-primary-50 text-primary-800'
              : 'border-gray-200 text-gray-700 hover:border-primary-300'"
            @click="form.kind = kind"
          >
            {{ ROUTINE_KIND_LABELS[kind] }}
          </button>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">รายละเอียด</label>
        <textarea
          v-model="form.description"
          rows="2"
          class="input-field w-full"
          placeholder="อธิบายว่าต้องทำอะไรในงานนี้"
        />
      </div>

      <div>
        <label class="block text-sm font-medium mb-2">วันที่ทำ</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="day in WEEKDAYS"
            :key="day"
            type="button"
            class="min-w-[3.25rem] px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"
            :class="form.days.includes(day)
              ? 'bg-primary-500 text-white border-primary-500'
              : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300'"
            @click="toggleDay(day)"
          >
            {{ WEEKDAY_LABELS[day] }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium mb-1">เริ่ม</label>
          <input v-model="form.startTime" type="time" required class="input-field w-full" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">ถึง</label>
          <input v-model="form.endTime" type="time" required class="input-field w-full" />
        </div>
      </div>

      <label v-if="form.kind === 'stock_check'" class="flex items-center gap-2 text-sm text-gray-700">
        <input v-model="form.includePackaging" type="checkbox" class="rounded border-gray-300 text-primary-600" />
        รวมบรรจุภัณฑ์ในรายการเช็ค
      </label>

      <div v-if="form.kind === 'stock_check'" class="space-y-2">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-sm font-medium">วัตถุดิบที่ต้องเช็ค</p>
            <p class="text-xs text-gray-500">ย้ายไปกล่องขวาเพื่อเช็ค · ไม่เลือกเลย = เช็คทุกวัตถุดิบที่ใช้งานอยู่</p>
          </div>
          <input v-model="ingredientQuery" class="input-field w-full sm:w-44" placeholder="ค้นหา" />
        </div>

        <div class="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
          <div class="min-w-0">
            <div class="mb-1 flex items-center justify-between gap-2">
              <p class="text-xs font-medium text-gray-600">ยังไม่เช็ค · {{ availableIngredients.length }}</p>
              <button
                type="button"
                class="text-xs font-medium text-primary-600 disabled:opacity-40"
                :disabled="!availableIngredients.length"
                @click="moveAllToSelected"
              >
                {{ ingredientQuery.trim() ? 'เลือกที่ค้นหา' : 'เลือกทั้งหมด' }}
              </button>
            </div>
            <div
              class="h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-100"
              role="listbox"
              aria-label="วัตถุดิบที่ยังไม่เช็ค"
              aria-multiselectable="true"
            >
              <div
                v-for="ingredient in availableIngredients"
                :key="ingredient.id"
                role="option"
                tabindex="0"
                class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm"
                :class="highlightedAvailable.has(ingredient.id) ? 'bg-primary-50 text-primary-900' : 'hover:bg-gray-100'"
                :aria-selected="highlightedAvailable.has(ingredient.id)"
                @click="toggleHighlight('available', ingredient.id)"
                @dblclick="moveToSelected([ingredient.id])"
                @keydown.enter.prevent="toggleHighlight('available', ingredient.id)"
              >
                <span class="min-w-0 flex-1 truncate">{{ ingredient.name }}</span>
                <span class="shrink-0 text-xs text-gray-400">{{ ingredient.unit }}</span>
                <button
                  type="button"
                  class="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-primary-700"
                  aria-label="ย้ายไปต้องเช็ค"
                  @click.stop="moveToSelected([ingredient.id])"
                >
                  <ChevronRight class="h-4 w-4" />
                </button>
              </div>
              <p v-if="!availableIngredients.length" class="px-3 py-4 text-sm text-gray-500">
                {{ ingredientQuery.trim() ? 'ไม่พบวัตถุดิบ' : 'ย้ายครบแล้ว' }}
              </p>
            </div>
          </div>

          <div class="flex justify-center gap-1 sm:flex-col">
            <button
              type="button"
              class="rounded-lg border border-gray-300 bg-white p-1.5 text-gray-600 hover:border-primary-400 hover:text-primary-700 disabled:opacity-40"
              :disabled="!highlightedAvailable.size"
              aria-label="ย้ายรายการที่เลือกไปต้องเช็ค"
              @click="moveToSelected([...highlightedAvailable])"
            >
              <ChevronRight class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="rounded-lg border border-gray-300 bg-white p-1.5 text-gray-600 hover:border-primary-400 hover:text-primary-700 disabled:opacity-40"
              :disabled="!availableIngredients.length"
              aria-label="ย้ายทั้งหมดไปต้องเช็ค"
              @click="moveAllToSelected"
            >
              <ChevronsRight class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="rounded-lg border border-gray-300 bg-white p-1.5 text-gray-600 hover:border-primary-400 hover:text-primary-700 disabled:opacity-40"
              :disabled="!highlightedSelected.size"
              aria-label="ย้ายรายการที่เลือกกลับยังไม่เช็ค"
              @click="moveToAvailable([...highlightedSelected])"
            >
              <ChevronLeft class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="rounded-lg border border-gray-300 bg-white p-1.5 text-gray-600 hover:border-primary-400 hover:text-primary-700 disabled:opacity-40"
              :disabled="!selectedIngredients.length"
              aria-label="ย้ายทั้งหมดกลับยังไม่เช็ค"
              @click="moveAllToAvailable"
            >
              <ChevronsLeft class="h-4 w-4" />
            </button>
          </div>

          <div class="min-w-0">
            <div class="mb-1 flex items-center justify-between gap-2">
              <p class="text-xs font-medium text-gray-600">ต้องเช็ค · {{ selectedIngredientIds.length }}</p>
              <button
                type="button"
                class="text-xs font-medium text-primary-600 disabled:opacity-40"
                :disabled="!selectedIngredients.length"
                @click="moveAllToAvailable"
              >
                {{ ingredientQuery.trim() ? 'เอาที่ค้นหาออก' : 'ล้างรายการ' }}
              </button>
            </div>
            <div
              class="h-52 overflow-y-auto rounded-lg border border-primary-200 bg-primary-50/40 divide-y divide-primary-100"
              role="listbox"
              aria-label="วัตถุดิบที่ต้องเช็ค"
              aria-multiselectable="true"
            >
              <div
                v-for="ingredient in selectedIngredients"
                :key="ingredient.id"
                role="option"
                tabindex="0"
                class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm"
                :class="highlightedSelected.has(ingredient.id) ? 'bg-primary-100 text-primary-900' : 'hover:bg-primary-50'"
                :aria-selected="highlightedSelected.has(ingredient.id)"
                @click="toggleHighlight('selected', ingredient.id)"
                @dblclick="moveToAvailable([ingredient.id])"
                @keydown.enter.prevent="toggleHighlight('selected', ingredient.id)"
              >
                <button
                  type="button"
                  class="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-primary-700"
                  aria-label="ย้ายกลับยังไม่เช็ค"
                  @click.stop="moveToAvailable([ingredient.id])"
                >
                  <ChevronLeft class="h-4 w-4" />
                </button>
                <span class="min-w-0 flex-1 truncate">{{ ingredient.name }}</span>
                <span class="shrink-0 text-xs text-gray-400">{{ ingredient.unit }}</span>
              </div>
              <p v-if="!selectedIngredients.length" class="px-3 py-4 text-sm text-gray-500">
                {{ ingredientQuery.trim() ? 'ไม่พบในรายการที่เช็ค' : 'ยังไม่ได้เลือก — จะเช็คทุกวัตถุดิบ' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="form.kind !== 'stock_check'" class="space-y-2">
        <p class="text-sm font-medium">
          {{ form.kind === 'kitchen_prep' ? 'รายการเพิ่มเติม' : 'Checklist' }}
        </p>
        <p v-if="form.kind === 'kitchen_prep'" class="text-xs text-gray-500">
          ขั้นตอนจากเมนู (เช่น หุงข้าว รวนหมู) จะถูกเติมให้อัตโนมัติตอนทำรายการวันนี้
        </p>
        <div v-for="(step, index) in extraItems" :key="step.id" class="flex gap-2">
          <input v-model="step.title" class="input-field flex-1" :placeholder="`รายการที่ ${index + 1}`" />
          <button type="button" class="text-red-600 text-sm" @click="extraItems.splice(index, 1)">ลบ</button>
        </div>
        <button type="button" class="text-sm font-medium text-primary-600" @click="addExtra">+ เพิ่มรายการ</button>
      </div>

      <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>

      <div class="flex justify-end gap-2 pt-2">
        <button type="button" class="btn-secondary" @click="emit('close')">ยกเลิก</button>
        <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}</button>
      </div>
    </form>
  </Modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next'
import Modal from '@/components/common/Modal.vue'
import {
  ROUTINE_KINDS,
  ROUTINE_KIND_LABELS,
  WEEKDAY_LABELS,
  WEEKDAYS,
  type Ingredient,
  type Routine,
  type RoutineKind,
  type RoutinePayload,
  type Weekday,
} from '@/types/models'

const props = defineProps<{
  isOpen: boolean
  routine?: Routine | null
  ingredients: Ingredient[]
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [payload: RoutinePayload]
}>()

type ExtraDraft = { id: number; title: string }

const form = reactive({
  name: '',
  description: '',
  kind: 'kitchen_prep' as RoutineKind,
  days: ['mon', 'tue', 'wed', 'thu', 'fri'] as Weekday[],
  startTime: '09:00',
  endTime: '10:00',
  includePackaging: false,
})
const extraItems = ref<ExtraDraft[]>([{ id: 1, title: '' }])
const selectedIngredientIds = ref<string[]>([])
const highlightedAvailable = ref(new Set<string>())
const highlightedSelected = ref(new Set<string>())
const ingredientQuery = ref('')
const formError = ref('')
let extraSeq = 1

const catalog = computed(() =>
  props.ingredients.filter((item) =>
    form.includePackaging ? true : item.type === 'ingredient',
  ),
)

const matchesQuery = (item: Ingredient) => {
  const query = ingredientQuery.value.trim().toLocaleLowerCase('th')
  return !query || item.name.toLocaleLowerCase('th').includes(query)
}

const availableIngredients = computed(() => {
  const selected = new Set(selectedIngredientIds.value)
  return catalog.value
    .filter((item) => !selected.has(item.id) && matchesQuery(item))
    .sort((a, b) => a.name.localeCompare(b.name, 'th'))
})

const selectedIngredients = computed(() => {
  const byId = new Map(props.ingredients.map((item) => [item.id, item]))
  return selectedIngredientIds.value
    .map((id) => byId.get(id))
    .filter((item): item is Ingredient => Boolean(item))
    .filter(matchesQuery)
})

const toggleDay = (day: Weekday) => {
  const index = form.days.indexOf(day)
  if (index >= 0) form.days.splice(index, 1)
  else form.days.push(day)
}

const toggleHighlight = (side: 'available' | 'selected', id: string) => {
  if (side === 'available') {
    const next = new Set(highlightedAvailable.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    highlightedAvailable.value = next
    highlightedSelected.value = new Set()
    return
  }
  const next = new Set(highlightedSelected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  highlightedSelected.value = next
  highlightedAvailable.value = new Set()
}

const moveToSelected = (ids: string[]) => {
  const existing = new Set(selectedIngredientIds.value)
  selectedIngredientIds.value = [
    ...selectedIngredientIds.value,
    ...ids.filter((id) => !existing.has(id)),
  ]
  highlightedAvailable.value = new Set()
}

const moveToAvailable = (ids: string[]) => {
  const remove = new Set(ids)
  selectedIngredientIds.value = selectedIngredientIds.value.filter((id) => !remove.has(id))
  highlightedSelected.value = new Set()
}

const moveAllToSelected = () => {
  moveToSelected(availableIngredients.value.map((item) => item.id))
}

const moveAllToAvailable = () => {
  moveToAvailable(selectedIngredients.value.map((item) => item.id))
}

const addExtra = () => {
  extraItems.value.push({ id: ++extraSeq, title: '' })
}

const resetFromRoutine = () => {
  formError.value = ''
  ingredientQuery.value = ''
  const routine = props.routine
  if (!routine) {
    form.name = ''
    form.description = ''
    form.kind = 'kitchen_prep'
    form.days = ['mon', 'tue', 'wed', 'thu', 'fri']
    form.startTime = '09:00'
    form.endTime = '10:00'
    form.includePackaging = false
    extraItems.value = [{ id: ++extraSeq, title: '' }]
    selectedIngredientIds.value = []
    highlightedAvailable.value = new Set()
    highlightedSelected.value = new Set()
    return
  }
  form.name = routine.name
  form.description = routine.description ?? ''
  form.kind = routine.kind
  form.days = [...routine.days]
  form.startTime = routine.startTime
  form.endTime = routine.endTime
  form.includePackaging = routine.includePackaging
  extraItems.value = routine.items
    .filter((item) => item.source !== 'ingredient')
    .map((item) => ({ id: ++extraSeq, title: item.title }))
  if (!extraItems.value.length) extraItems.value = [{ id: ++extraSeq, title: '' }]
  selectedIngredientIds.value = routine.items
    .filter((item) => item.source === 'ingredient' && item.sourceId)
    .map((item) => item.sourceId!)
  highlightedAvailable.value = new Set()
  highlightedSelected.value = new Set()
}

watch(
  () => [props.isOpen, props.routine?.id],
  () => {
    if (props.isOpen) resetFromRoutine()
  },
)

const submit = () => {
  formError.value = ''
  if (!form.days.length) {
    formError.value = 'เลือกวันที่ต้องทำอย่างน้อย 1 วัน'
    return
  }
  if (form.endTime <= form.startTime) {
    formError.value = 'เวลาสิ้นสุดต้องหลังเวลาเริ่ม'
    return
  }

  const items: RoutinePayload['items'] =
    form.kind === 'stock_check'
      ? selectedIngredientIds.value.map((id) => {
          const ingredient = props.ingredients.find((row) => row.id === id)
          return {
            title: ingredient?.name || 'วัตถุดิบ',
            source: 'ingredient' as const,
            sourceId: id,
          }
        })
      : extraItems.value
          .map((item) => ({ title: item.title.trim(), source: 'manual' as const }))
          .filter((item) => item.title)

  emit('save', {
    name: form.name,
    description: form.description,
    kind: form.kind,
    days: WEEKDAYS.filter((day) => form.days.includes(day)),
    startTime: form.startTime,
    endTime: form.endTime,
    includePackaging: form.includePackaging,
    items,
  })
}
</script>
