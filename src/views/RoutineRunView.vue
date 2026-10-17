<template>
  <MainLayout>
    <div v-if="!routine && !loading" class="space-y-4">
      <router-link to="/routines" class="text-sm font-medium text-primary-600">← งานประจำวัน</router-link>
      <EmptyState title="ไม่พบงานนี้" description="งานอาจถูกลบ หรือไม่ได้อยู่ในร้านนี้" />
    </div>

    <div v-else-if="routine && !scheduledToday" class="space-y-4">
      <router-link to="/routines" class="text-sm font-medium text-primary-600">← งานประจำวัน</router-link>
      <EmptyState
        :title="`${routine.name} ไม่ได้ตั้งไว้วันนี้`"
        :description="`${formatRoutineDays(routine.days)} · ${formatTimeRange(routine.startTime, routine.endTime)}`"
      />
    </div>

    <div v-else-if="routine" class="space-y-6">
      <div>
        <router-link to="/routines" class="text-sm font-medium text-primary-600">← งานประจำวัน</router-link>
        <div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="text-xs font-medium text-primary-700">{{ ROUTINE_KIND_LABELS[routine.kind] }}</p>
            <h1 class="page-title mt-1">{{ routine.name }}</h1>
            <p class="mt-1 text-sm text-gray-500">
              {{ formatWeekdayDate(today) }} · {{ formatTimeRange(routine.startTime, routine.endTime) }}
            </p>
            <p v-if="routine.description" class="mt-2 text-sm text-gray-600 whitespace-pre-line">
              {{ routine.description }}
            </p>
          </div>
          <span
            class="self-start rounded-full px-3 py-1 text-xs font-medium"
            :class="windowBadgeClass(windowStatus)"
          >
            {{ ROUTINE_WINDOW_STATUS_LABELS[windowStatus] }}
          </span>
        </div>
      </div>

      <div class="card p-4 flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-gray-600">{{ progress.done }}/{{ progress.total }} รายการ</p>
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-if="run"
            type="button"
            class="btn-secondary text-sm px-3 py-1.5"
            :disabled="busy"
            @click="reloadTemplate"
          >
            โหลดแม่แบบใหม่
          </button>
          <p v-if="run?.purchasePlanId" class="text-sm">
            <router-link :to="{ path: '/planning', query: { plan: run.purchasePlanId } }" class="font-medium text-primary-700">
              เปิดแผนซื้อ
            </router-link>
          </p>
        </div>
      </div>

      <div v-if="!run?.items.length" class="card p-6">
        <EmptyState
          :title="routine.kind === 'stock_check' ? 'ยังไม่มีวัตถุดิบให้เช็ค' : 'ยังไม่มีรายการ'"
          :description="routine.kind === 'stock_check' ? 'เพิ่มวัตถุดิบในร้าน หรือเลือกวัตถุดิบในแม่แบบงานนี้ แล้วกดโหลดแม่แบบใหม่' : 'เพิ่ม checklist ในแม่แบบงานนี้ แล้วกดโหลดแม่แบบใหม่'"
        />
      </div>

      <div v-else class="space-y-3">
        <article
          v-for="item in run.items"
          :key="item.id"
          class="card p-4"
          :class="itemDone(item) ? 'border-green-200 bg-green-50/40' : ''"
        >
          <div v-if="routine.kind === 'stock_check'" class="space-y-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-medium text-gray-900">{{ item.title }}</p>
                <p v-if="item.notes" class="text-xs text-gray-500 mt-0.5">{{ item.notes }}</p>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="status in STOCK_STATUSES"
                :key="status"
                type="button"
                class="rounded-lg border px-2 py-2 text-sm font-medium"
                :class="stockButtonClass(item.stockStatus, status)"
                @click="setStock(item.id, status)"
              >
                {{ STOCK_STATUS_LABELS[status] }}
              </button>
            </div>
            <div v-if="item.stockStatus === 'low' || item.stockStatus === 'out'" class="grid sm:grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">
                  จำนวนที่ควรซื้อ{{ ingredientUnit(item.sourceId) ? ` (${ingredientUnit(item.sourceId)})` : '' }}
                </label>
                <input
                  :value="item.restockQuantity ?? ''"
                  type="number"
                  min="0"
                  step="any"
                  class="input-field w-full"
                  placeholder="ไม่ระบุก็ได้"
                  @change="onQtyChange(item.id, $event)"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">หมายเหตุ</label>
                <input
                  :value="item.itemNote ?? ''"
                  class="input-field w-full"
                  placeholder="เช่น เหลือครึ่งกิโล"
                  @change="onNoteChange(item.id, $event)"
                />
              </div>
            </div>
          </div>

          <label v-else class="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              class="mt-1 rounded border-gray-300 text-primary-600"
              :checked="item.isDone"
              @change="toggleDone(item.id, !item.isDone)"
            />
            <span>
              <span class="font-medium text-gray-900" :class="item.isDone ? 'line-through text-gray-500' : ''">
                {{ item.title }}
              </span>
              <span v-if="item.notes" class="mt-0.5 block text-xs text-gray-500">{{ item.notes }}</span>
            </span>
          </label>
        </article>
      </div>

      <div class="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 sticky bottom-4">
        <button
          v-if="run && run.status !== 'skipped'"
          type="button"
          class="btn-secondary"
          :disabled="busy"
          @click="skip"
        >
          ข้ามวันนี้
        </button>
        <div class="flex flex-col sm:flex-row gap-2 sm:ml-auto">
          <button
            v-if="routine.kind === 'stock_check' && run"
            type="button"
            class="btn-secondary"
            :disabled="busy"
            @click="markOk"
          >
            ที่ยังไม่เช็คเป็นพอใช้
          </button>
          <button
            v-if="routine.kind === 'stock_check' && run"
            type="button"
            class="btn-secondary"
            :disabled="busy || run.status === 'skipped'"
            @click="complete"
          >
            {{ completeLabel }}
          </button>
          <button
            v-if="run"
            type="button"
            class="btn-primary"
            :disabled="busy || run.status === 'skipped'"
            @click="routine.kind === 'stock_check' ? saveOnly() : complete()"
          >
            {{ routine.kind === 'stock_check' ? 'บันทึก' : completeLabel }}
          </button>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useIngredients } from '@/composables/useIngredients'
import { useMenu } from '@/composables/useMenu'
import { useRoutines } from '@/composables/useRoutines'
import { useToast } from '@/composables/useToast'
import {
  ROUTINE_KIND_LABELS,
  ROUTINE_WINDOW_STATUS_LABELS,
  STOCK_STATUS_LABELS,
  STOCK_STATUSES,
  type StockStatus,
} from '@/types/models'
import { formatWeekdayDate, toDateInputValue } from '@/utils/format'
import {
  currentTimeHm,
  formatRoutineDays,
  formatTimeRange,
  isRoutineScheduledOn,
  restockFromRunItems,
  routineWindowStatus,
  runProgress,
  weekdayFromDate,
} from '@/utils/routines'

const route = useRoute()
const router = useRouter()
const { ingredients, fetchIngredients } = useIngredients()
const { menuItems, fetchMenuItems } = useMenu()
const {
  routines,
  runs,
  loading,
  fetchRoutines,
  fetchRuns,
  ensureRunsForDate,
  reloadRunFromTemplate,
  updateRunItem,
  markRemainingOk,
  setRunStatus,
  completeStockCheck,
} = useRoutines()
const { success, error } = useToast()

const today = toDateInputValue()
const nowHm = ref(currentTimeHm())
const busy = ref(false)
let timer: number | undefined

const routineId = computed(() => String(route.params.id || ''))
const routine = computed(() => routines.value.find((row) => row.id === routineId.value))
const run = computed(() => runs.value.find((row) => row.routineId === routineId.value))
const scheduledToday = computed(() =>
  routine.value ? isRoutineScheduledOn(routine.value, weekdayFromDate(today)) : false,
)
const progress = computed(() =>
  runProgress(routine.value?.kind || 'custom', run.value?.items || []),
)
const windowStatus = computed(() =>
  routine.value
    ? routineWindowStatus(routine.value.startTime, routine.value.endTime, run.value?.status, nowHm.value)
    : 'upcoming',
)

const completeLabel = computed(() => {
  if (routine.value?.kind !== 'stock_check') return run.value?.status === 'done' ? 'ทำเสร็จแล้ว' : 'ทำเสร็จ'
  if (run.value?.purchasePlanId) return 'อัปเดตแผนซื้อ'
  return 'บันทึกและสร้างแผนซื้อ'
})

const itemDone = (item: { isDone: boolean; stockStatus?: StockStatus }) =>
  Boolean(item.stockStatus) || item.isDone

const ingredientUnit = (id?: string) => ingredients.value.find((row) => row.id === id)?.unit

const windowBadgeClass = (status: string) => {
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

const stockButtonClass = (current: StockStatus | undefined, status: StockStatus) => {
  if (current !== status) return 'border-gray-200 text-gray-700 hover:border-primary-300'
  if (status === 'ok') return 'border-green-600 bg-green-50 text-green-800'
  if (status === 'low') return 'border-amber-500 bg-amber-50 text-amber-800'
  return 'border-red-500 bg-red-50 text-red-800'
}

const toggleDone = async (itemId: string, isDone: boolean) => {
  if (!run.value) return
  try {
    await updateRunItem(run.value.id, itemId, { isDone })
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
  }
}

const setStock = async (itemId: string, status: StockStatus) => {
  if (!run.value) return
  try {
    await updateRunItem(run.value.id, itemId, { stockStatus: status, isDone: true })
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
  }
}

const onQtyChange = async (itemId: string, event: Event) => {
  if (!run.value) return
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  const raw = target.value.trim()
  const quantity = raw === '' ? null : Number(raw)
  try {
    await updateRunItem(run.value.id, itemId, {
      restockQuantity: quantity != null && Number.isFinite(quantity) ? quantity : null,
    })
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'บันทึกจำนวนไม่สำเร็จ')
  }
}

const onNoteChange = async (itemId: string, event: Event) => {
  if (!run.value) return
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  try {
    await updateRunItem(run.value.id, itemId, { itemNote: target.value })
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'บันทึกหมายเหตุไม่สำเร็จ')
  }
}

const markOk = async () => {
  if (!run.value) return
  busy.value = true
  try {
    await markRemainingOk(run.value.id)
    success('ตั้งรายการที่เหลือเป็นพอใช้แล้ว')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
  } finally {
    busy.value = false
  }
}

const reloadTemplate = async () => {
  const currentRun = run.value
  if (!currentRun || !routine.value) return
  if (!confirm('โหลดแม่แบบใหม่? รายการที่ทำไว้วันนี้จะถูกล้างออก')) return
  busy.value = true
  try {
    await Promise.all([fetchRoutines(), fetchMenuItems(), fetchIngredients()])
    const latest = routines.value.find((row) => row.id === routineId.value)
    if (!latest) throw new Error('ไม่พบแม่แบบงานนี้')
    await reloadRunFromTemplate(currentRun.id, latest, menuItems.value, ingredients.value)
    success('โหลดแม่แบบใหม่แล้ว')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'โหลดแม่แบบไม่สำเร็จ')
  } finally {
    busy.value = false
  }
}

const skip = async () => {
  if (!run.value || !confirm('ข้ามงานนี้วันนี้?')) return
  busy.value = true
  try {
    await setRunStatus(run.value.id, 'skipped')
    success('ข้ามงานวันนี้แล้ว')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'ข้ามไม่สำเร็จ')
  } finally {
    busy.value = false
  }
}

const saveOnly = async () => {
  if (!run.value) return
  busy.value = true
  try {
    await setRunStatus(run.value.id, 'done')
    success('บันทึกแล้ว')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
  } finally {
    busy.value = false
  }
}

const complete = async () => {
  if (!run.value || !routine.value) return
  busy.value = true
  try {
    if (routine.value.kind === 'stock_check') {
      const restockCount = restockFromRunItems(run.value.items, ingredients.value).length
      const result = await completeStockCheck(run.value.id, ingredients.value)
      if (!result.plan) {
        success(restockCount ? 'บันทึกงานแล้ว' : 'เช็คเสร็จ — ไม่มีของที่ต้องซื้อ')
        return
      }
      success(`สร้างแผนซื้อ ${result.restockCount} รายการแล้ว`)
      await router.push({ path: '/planning', query: { plan: result.plan.id } })
      return
    }
    await setRunStatus(run.value.id, 'done')
    success('ทำเสร็จแล้ว')
  } catch (e: unknown) {
    error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
  } finally {
    busy.value = false
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
    /* shown via empty/error states */
  }
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})
</script>
