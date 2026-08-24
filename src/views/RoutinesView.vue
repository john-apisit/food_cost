<template>
  <MainLayout>
    <div class="space-y-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="page-title">งานประจำวัน</h1>
          <p class="mt-1 text-sm text-gray-500">
            Checklist ตามเวลา — งานเช็ควัตถุดิบจะสร้างแผนซื้อให้อัตโนมัติ
          </p>
        </div>
        <button type="button" class="btn-primary" @click="openCreate">+ เพิ่มงานประจำ</button>
      </div>

      <p v-if="loadError" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {{ loadError }}
      </p>

      <div v-if="loading && !routines.length" class="text-gray-500">กำลังโหลด...</div>

      <section class="space-y-3">
        <h2 class="text-lg font-semibold">วันนี้ · {{ formatWeekdayDate(today) }}</h2>

        <EmptyState
          v-if="!loading && !todayCards.length && !routines.length"
          title="ยังไม่มีงานประจำ"
          description="สร้างงานแนะนำ เตรียมครัวช่วงเช้า และเช็ควัตถุดิบช่วงค่ำ ได้ในคลิกเดียว"
        >
          <button type="button" class="btn-primary" :disabled="savingSuggested" @click="createSuggested">
            {{ savingSuggested ? 'กำลังสร้าง...' : 'สร้างงานแนะนำ จ.–ศ.' }}
          </button>
        </EmptyState>

        <EmptyState
          v-else-if="!loading && !todayCards.length"
          title="วันนี้ไม่มีงานตามตาราง"
          description="งานที่ตั้งไว้ไม่ตรงกับวันนี้ หรือยังไม่ได้เปิดใช้งาน"
        />

        <div v-else class="grid gap-3 sm:grid-cols-2">
          <router-link
            v-for="card in todayCards"
            :key="card.routine.id"
            :to="`/routines/${card.routine.id}`"
            class="card p-5 hover:border-primary-200 transition-colors"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-medium text-primary-700">{{ ROUTINE_KIND_LABELS[card.routine.kind] }}</p>
                <h3 class="mt-1 font-semibold text-gray-900">{{ card.routine.name }}</h3>
                <p class="mt-1 text-sm text-gray-500">{{ formatTimeRange(card.routine.startTime, card.routine.endTime) }}</p>
              </div>
              <span
                class="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
                :class="windowBadgeClass(card.window)"
              >
                {{ ROUTINE_WINDOW_STATUS_LABELS[card.window] }}
              </span>
            </div>
            <p v-if="card.routine.description" class="mt-3 text-sm text-gray-600 line-clamp-2">
              {{ card.routine.description }}
            </p>
            <div class="mt-4 flex items-center justify-between text-sm">
              <span class="text-gray-600">{{ card.progress.done }}/{{ card.progress.total }} รายการ</span>
              <span v-if="card.run?.purchasePlanId" class="text-primary-700">มีแผนซื้อแล้ว</span>
            </div>
            <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                class="h-full bg-primary-500"
                :style="{ width: `${card.progress.total ? (card.progress.done / card.progress.total) * 100 : 0}%` }"
              />
            </div>
          </router-link>
        </div>
      </section>

      <section v-if="routines.length" class="card p-5 space-y-3">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold">แม่แบบงาน</h2>
        </div>
        <ul class="divide-y divide-gray-100">
          <li v-for="routine in routines" :key="routine.id" class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <p class="font-medium text-gray-900">
                {{ routine.name }}
                <span v-if="!routine.isActive" class="ml-2 text-xs font-normal text-gray-400">ปิดไว้</span>
              </p>
              <p class="text-sm text-gray-500">
                {{ ROUTINE_KIND_LABELS[routine.kind] }} ·
                {{ routine.days.map((day) => WEEKDAY_LABELS[day]).join(' ') }} ·
                {{ formatTimeRange(routine.startTime, routine.endTime) }}
              </p>
            </div>
            <div class="flex gap-2">
              <button type="button" class="btn-secondary px-3 py-1.5 text-sm" @click="openEdit(routine)">แก้ไข</button>
              <button type="button" class="text-sm text-red-600 px-2" @click="remove(routine)">ลบ</button>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <RoutineFormModal
      :is-open="formOpen"
      :routine="editing"
      :ingredients="ingredients"
      :saving="savingForm"
      @close="formOpen = false"
      @save="save"
    />
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import RoutineFormModal from '@/components/routines/RoutineFormModal.vue'
import { useIngredients } from '@/composables/useIngredients'
import { useMenu } from '@/composables/useMenu'
import { useRoutines } from '@/composables/useRoutines'
import { useToast } from '@/composables/useToast'
import {
  ROUTINE_KIND_LABELS,
  ROUTINE_WINDOW_STATUS_LABELS,
  WEEKDAY_LABELS,
  type Routine,
  type RoutinePayload,
  type RoutineWindowStatus,
} from '@/types/models'
import { formatWeekdayDate, toDateInputValue } from '@/utils/format'
import {
  currentTimeHm,
  formatTimeRange,
  isRoutineScheduledOn,
  routineWindowStatus,
  runProgress,
  weekdayFromDate,
} from '@/utils/routines'

const { ingredients, fetchIngredients } = useIngredients()
const { menuItems, fetchMenuItems } = useMenu()
const {
  routines,
  runs,
  loading,
  error: loadError,
  fetchRoutines,
  fetchRuns,
  ensureRunsForDate,
  saveRoutine,
  createSuggestedRoutines,
  deleteRoutine,
} = useRoutines()
const { success, error } = useToast()

const today = toDateInputValue()
const nowHm = ref(currentTimeHm())
const formOpen = ref(false)
const editing = ref<Routine | null>(null)
const savingForm = ref(false)
const savingSuggested = ref(false)
let timer: number | undefined

const todayCards = computed(() => {
  const weekday = weekdayFromDate(today)
  return routines.value
    .filter((routine) => isRoutineScheduledOn(routine, weekday))
    .map((routine) => {
      const run = runs.value.find((row) => row.routineId === routine.id)
      const window = routineWindowStatus(routine.startTime, routine.endTime, run?.status, nowHm.value)
      return {
        routine,
        run,
        window,
        progress: runProgress(routine.kind, run?.items || []),
      }
    })
})

const windowBadgeClass = (status: RoutineWindowStatus) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'overdue':
      return 'bg-red-100 text-red-800'
    case 'done':
      return 'bg-gray-100 text-gray-600'
    case 'skipped':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-primary-50 text-primary-800'
  }
}

const openCreate = () => {
  editing.value = null
  formOpen.value = true
}

const openEdit = (routine: Routine) => {
  editing.value = routine
  formOpen.value = true
}

const save = async (payload: RoutinePayload) => {
  savingForm.value = true
  try {
    await saveRoutine(payload, editing.value?.id)
    await ensureRunsForDate(today, menuItems.value, ingredients.value)
    formOpen.value = false
    success('บันทึกงานประจำแล้ว')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
  } finally {
    savingForm.value = false
  }
}

const createSuggested = async () => {
  savingSuggested.value = true
  try {
    await createSuggestedRoutines()
    await ensureRunsForDate(today, menuItems.value, ingredients.value)
    success('สร้างงานแนะนำแล้ว')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'สร้างงานแนะนำไม่สำเร็จ')
  } finally {
    savingSuggested.value = false
  }
}

const remove = async (routine: Routine) => {
  if (!confirm(`ลบงาน ${routine.name}?`)) return
  try {
    await deleteRoutine(routine.id)
    success('ลบงานแล้ว')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
  }
}

onMounted(async () => {
  timer = window.setInterval(() => {
    nowHm.value = currentTimeHm()
  }, 30_000)
  await Promise.all([fetchRoutines(), fetchMenuItems(), fetchIngredients(), fetchRuns(today)])
  try {
    await ensureRunsForDate(today, menuItems.value, ingredients.value)
  } catch {
    /* loadError is set by the composable */
  }
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})
</script>
