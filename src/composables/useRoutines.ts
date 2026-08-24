import { ref } from 'vue'
import { supabase } from '@/config/supabase'
import type { Ingredient, MenuItem, Routine, RoutinePayload, RoutineRun, StockStatus } from '@/types/models'
import type { Database } from '@/types/database.types'
import { mapRoutine, mapRoutineRun } from '@/types/mappers'
import {
  addDaysIso,
  buildRunSnapshot,
  isRoutineScheduledOn,
  restockFromRunItems,
  restockPlanName,
  SUGGESTED_ROUTINES,
  weekdayFromDate,
} from '@/utils/routines'
import { useAuth } from './useAuth'
import { useCurrentStore } from './useCurrentStore'
import { usePurchasePlans } from './usePurchasePlans'

const ROUTINE_SELECT = `
  *,
  routine_items (*)
`

const RUN_SELECT = `
  *,
  routine:routines (id, name, kind, description, days, start_time, end_time),
  routine_run_items (*)
`

const routines = ref<Routine[]>([])
const runs = ref<RoutineRun[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

type RunItemUpdate = Database['public']['Tables']['routine_run_items']['Update']

export function useRoutines() {
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()
  const { plans, fetchPlans, upsertRestockPlan } = usePurchasePlans()

  const fetchRoutines = async () => {
    if (!user.value || !currentStoreId.value) return
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('routines')
        .select(ROUTINE_SELECT)
        .eq('store_id', currentStoreId.value)
        .order('sort_order')
        .order('start_time')

      if (fetchError) throw fetchError
      routines.value = (data || []).map((row) => mapRoutine(row as Record<string, unknown>))
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'โหลดงานประจำไม่สำเร็จ'
    } finally {
      loading.value = false
    }
  }

  const fetchRuns = async (runDate: string) => {
    if (!user.value || !currentStoreId.value) return
    const { data, error: fetchError } = await supabase
      .from('routine_runs')
      .select(RUN_SELECT)
      .eq('store_id', currentStoreId.value)
      .eq('run_date', runDate)
      .order('created_at')

    if (fetchError) throw fetchError
    runs.value = (data || []).map((row) => mapRoutineRun(row as Record<string, unknown>))
  }

  const insertRunItems = async (runId: string, snapshot: ReturnType<typeof buildRunSnapshot>) => {
    if (!snapshot.length) return
    const { error: insertError } = await supabase.from('routine_run_items').insert(
      snapshot.map((item, index) => ({
        run_id: runId,
        template_item_id: item.templateItemId ?? null,
        title: item.title,
        notes: item.notes ?? null,
        source: item.source,
        source_id: item.sourceId ?? null,
        sort_order: index,
      })),
    )
    if (insertError) throw insertError
  }

  const reloadRunFromTemplate = async (
    runId: string,
    routine: Routine,
    menus: MenuItem[],
    ingredients: Ingredient[],
  ) => {
    const run = runs.value.find((row) => row.id === runId)
    if (!run) return

    const { error: deleteError } = await supabase.from('routine_run_items').delete().eq('run_id', runId)
    if (deleteError) throw deleteError

    await insertRunItems(runId, buildRunSnapshot(routine, menus, ingredients))

    const { error: updateError } = await supabase
      .from('routine_runs')
      .update({
        status: 'pending',
        completed_at: null,
        completed_by: null,
      })
      .eq('id', runId)
    if (updateError) throw updateError

    await fetchRuns(run.runDate)
  }

  const ensureRunsForDate = async (
    runDate: string,
    menus: MenuItem[],
    ingredients: Ingredient[],
  ) => {
    if (!user.value || !currentStoreId.value) return
    try {
      const weekday = weekdayFromDate(runDate)
      const scheduled = routines.value.filter((routine) => isRoutineScheduledOn(routine, weekday))

      for (const routine of scheduled) {
        if (runs.value.some((run) => run.routineId === routine.id && run.runDate === runDate)) continue

        const { data: inserted, error: insertError } = await supabase
          .from('routine_runs')
          .insert({
            routine_id: routine.id,
            store_id: currentStoreId.value,
            user_id: user.value.id,
            run_date: runDate,
            status: 'pending',
          })
          .select('id')
          .single()

        if (insertError) {
          if (insertError.code === '23505') continue
          throw insertError
        }

        await insertRunItems(inserted.id, buildRunSnapshot(routine, menus, ingredients))
      }

      await fetchRuns(runDate)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'สร้างรายการวันนี้ไม่สำเร็จ'
      throw e
    }
  }

  const replaceRoutineItems = async (routineId: string, items: RoutinePayload['items']) => {
    const { error: deleteError } = await supabase.from('routine_items').delete().eq('routine_id', routineId)
    if (deleteError) throw deleteError
    const cleaned = items
      .map((item) => ({
        title: item.title.trim(),
        notes: item.notes?.trim() || null,
        source: item.source,
        sourceId: item.sourceId,
      }))
      .filter((item) => item.title || item.source === 'ingredient')
    if (!cleaned.length) return
    const { error: insertError } = await supabase.from('routine_items').insert(
      cleaned.map((item, index) => ({
        routine_id: routineId,
        title: item.title || 'วัตถุดิบ',
        notes: item.notes,
        source: item.source,
        source_id: item.sourceId ?? null,
        sort_order: index,
      })),
    )
    if (insertError) throw insertError
  }

  const saveRoutine = async (payload: RoutinePayload, id?: string) => {
    if (!user.value || !currentStoreId.value) return
    const row = {
      user_id: user.value.id,
      store_id: currentStoreId.value,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      kind: payload.kind,
      days: payload.days,
      start_time: payload.startTime,
      end_time: payload.endTime,
      include_packaging: payload.includePackaging ?? false,
      is_active: payload.isActive ?? true,
      sort_order: payload.sortOrder ?? 0,
    }

    if (id) {
      const { error: updateError } = await supabase.from('routines').update(row).eq('id', id)
      if (updateError) throw updateError
      await replaceRoutineItems(id, payload.items)
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('routines')
        .insert(row)
        .select('id')
        .single()
      if (insertError) throw insertError
      await replaceRoutineItems(inserted.id, payload.items)
    }

    await fetchRoutines()
  }

  const createSuggestedRoutines = async () => {
    for (const [index, suggested] of SUGGESTED_ROUTINES.entries()) {
      await saveRoutine({
        name: suggested.name,
        description: suggested.description,
        kind: suggested.kind,
        days: suggested.days,
        startTime: suggested.startTime,
        endTime: suggested.endTime,
        sortOrder: index,
        items: suggested.items.map((item) => ({ title: item.title, source: item.source })),
      })
    }
  }

  const deleteRoutine = async (id: string) => {
    const { error: deleteError } = await supabase.from('routines').delete().eq('id', id)
    if (deleteError) throw deleteError
    routines.value = routines.value.filter((routine) => routine.id !== id)
    runs.value = runs.value.filter((run) => run.routineId !== id)
  }

  const patchRunLocal = (runId: string, update: (run: RoutineRun) => RoutineRun) => {
    runs.value = runs.value.map((run) => (run.id === runId ? update(run) : run))
  }

  const updateRunItem = async (
    runId: string,
    itemId: string,
    patch: {
      isDone?: boolean
      stockStatus?: StockStatus | null
      restockQuantity?: number | null
      itemNote?: string | null
    },
  ) => {
    if (!user.value) return
    const now = new Date().toISOString()
    const isDone =
      patch.stockStatus !== undefined ? patch.stockStatus != null : patch.isDone
    const row: RunItemUpdate = {}
    if (patch.isDone !== undefined || patch.stockStatus !== undefined) {
      row.is_done = Boolean(isDone)
      row.done_at = isDone ? now : null
      row.done_by = isDone ? user.value.id : null
    }
    if (patch.stockStatus !== undefined) row.stock_status = patch.stockStatus
    if (patch.restockQuantity !== undefined) row.restock_quantity = patch.restockQuantity
    if (patch.itemNote !== undefined) row.item_note = patch.itemNote?.trim() || null

    const { error: updateError } = await supabase.from('routine_run_items').update(row).eq('id', itemId)
    if (updateError) throw updateError

    const previous = runs.value.find((current) => current.id === runId)
    const shouldStart = previous?.status === 'pending'
    patchRunLocal(runId, (run) => ({
      ...run,
      status: run.status === 'pending' ? 'in_progress' : run.status,
      items: run.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              isDone: row.is_done ?? item.isDone,
              doneAt: row.done_at ?? undefined,
              doneBy: row.done_by ?? undefined,
              stockStatus: patch.stockStatus === null ? undefined : (patch.stockStatus ?? item.stockStatus),
              restockQuantity:
                patch.restockQuantity === null
                  ? undefined
                  : (patch.restockQuantity ?? item.restockQuantity),
              itemNote: patch.itemNote === null ? undefined : (patch.itemNote ?? item.itemNote),
            }
          : item,
      ),
    }))

    if (shouldStart) {
      await supabase.from('routine_runs').update({ status: 'in_progress' }).eq('id', runId)
    }
  }

  const markRemainingOk = async (runId: string) => {
    if (!user.value) return
    const run = runs.value.find((row) => row.id === runId)
    if (!run) return
    const pending = run.items.filter((item) => !item.stockStatus)
    if (!pending.length) return
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('routine_run_items')
      .update({
        stock_status: 'ok',
        is_done: true,
        done_at: now,
        done_by: user.value.id,
      })
      .in(
        'id',
        pending.map((item) => item.id),
      )
    if (updateError) throw updateError

    const shouldStart = run.status === 'pending'
    patchRunLocal(runId, (current) => ({
      ...current,
      status: shouldStart ? 'in_progress' : current.status,
      items: current.items.map((item) =>
        item.stockStatus
          ? item
          : { ...item, stockStatus: 'ok', isDone: true, doneAt: now, doneBy: user.value?.id },
      ),
    }))
    if (shouldStart) {
      await supabase.from('routine_runs').update({ status: 'in_progress' }).eq('id', runId)
    }
  }

  const setRunStatus = async (runId: string, status: RoutineRun['status'], note?: string | null) => {
    if (!user.value) return
    const completed = status === 'done' || status === 'skipped'
    const { error: updateError } = await supabase
      .from('routine_runs')
      .update({
        status,
        note: note?.trim() || null,
        completed_at: completed ? new Date().toISOString() : null,
        completed_by: completed ? user.value.id : null,
      })
      .eq('id', runId)
    if (updateError) throw updateError

    patchRunLocal(runId, (run) => ({
      ...run,
      status,
      note: note?.trim() || run.note,
      completedAt: completed ? new Date().toISOString() : undefined,
      completedBy: completed ? user.value?.id : undefined,
    }))
  }

  const completeStockCheck = async (runId: string, ingredients: Ingredient[]) => {
    const run = runs.value.find((row) => row.id === runId)
    if (!run) return { plan: null, restockCount: 0 }

    await setRunStatus(runId, 'done')
    const restock = restockFromRunItems(run.items, ingredients)
    if (!restock.length) return { plan: null, restockCount: 0 }

    await fetchPlans()
    const latestWithMenus = plans.value.find((plan) => (plan.lines || []).length)
    const purchaseDate = addDaysIso(run.runDate, 1)
    const plan = await upsertRestockPlan({
      planId: run.purchasePlanId,
      name: restockPlanName(purchaseDate),
      purchaseDate,
      days: 1,
      saleStartDate: purchaseDate,
      saleEndDate: purchaseDate,
      menuLines: run.purchasePlanId
        ? undefined
        : (latestWithMenus?.lines || []).map((line) => ({
            menuItemId: line.menuItemId,
            targetQuantity: line.targetQuantity,
          })),
      restockLines: restock.map((row) => ({
        ingredientId: row.ingredient.id,
        quantity: row.quantity ?? null,
        stockStatus: row.stockStatus,
        note: row.note,
      })),
    })

    if (plan) {
      const { error: linkError } = await supabase
        .from('routine_runs')
        .update({ purchase_plan_id: plan.id })
        .eq('id', runId)
      if (linkError) throw linkError
      patchRunLocal(runId, (current) => ({ ...current, purchasePlanId: plan.id }))
    }

    return { plan, restockCount: restock.length }
  }

  return {
    routines,
    runs,
    loading,
    error,
    fetchRoutines,
    fetchRuns,
    ensureRunsForDate,
    reloadRunFromTemplate,
    saveRoutine,
    createSuggestedRoutines,
    deleteRoutine,
    updateRunItem,
    markRemainingOk,
    setRunStatus,
    completeStockCheck,
  }
}
